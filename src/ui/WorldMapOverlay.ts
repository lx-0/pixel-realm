/**
 * WorldMapOverlay — full-screen world map toggled with M.
 *
 * Shows all five zones laid out in a horizontal path with directional
 * connectors. Undiscovered zones are fogged (dark overlay). The current
 * zone is highlighted. Quest markers appear on the active zone if the
 * player has a quest. Zoom controls (+/-) let the player scale the view.
 *
 * Close with M or Escape.
 */

import Phaser from 'phaser';
import { CANVAS, ZONES, ZoneConfig } from '../config/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const DEPTH        = 75;
const BG_ALPHA     = 0.93;

// Zone card dimensions (at zoom 1)
const CARD_W       = 44;
const CARD_H       = 28;
const CARD_GAP     = 18; // gap between cards (connector space)
// Total layout width
const TOTAL_ZONES  = ZONES.length; // 5
const TOTAL_W      = TOTAL_ZONES * CARD_W + (TOTAL_ZONES - 1) * CARD_GAP;

const ZOOM_STEP    = 0.25;
const ZOOM_MIN     = 0.6;
const ZOOM_MAX     = 2.0;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorldMapState {
  currentZoneId:   string;
  unlockedZoneIds: string[];
  hasActiveQuest:  boolean;
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class WorldMapOverlay {
  private scene:   Phaser.Scene;
  private visible  = false;
  private zoom     = 1;
  private state:   WorldMapState;

  private container!: Phaser.GameObjects.Container;
  private bg!:        Phaser.GameObjects.Rectangle;
  private title!:     Phaser.GameObjects.Text;
  private hint!:      Phaser.GameObjects.Text;
  private zoomLabel!: Phaser.GameObjects.Text;
  private btnPlus!:   Phaser.GameObjects.Text;
  private btnMinus!:  Phaser.GameObjects.Text;
  private mapGfx!:    Phaser.GameObjects.Graphics;
  private labels:     Phaser.GameObjects.Text[] = [];

  private mKey!:   Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, initialState: WorldMapState) {
    this.scene = scene;
    this.state = { ...initialState };
    this._build();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    this._redraw();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  get isVisible(): boolean { return this.visible; }

  /** Call each frame with fresh state. */
  update(state: WorldMapState): void {
    // Check toggle keys
    if (Phaser.Input.Keyboard.JustDown(this.mKey) ||
        (this.visible && Phaser.Input.Keyboard.JustDown(this.escKey))) {
      this.toggle();
    }

    // Refresh only when visible
    if (!this.visible) return;

    const changed =
      state.currentZoneId   !== this.state.currentZoneId   ||
      state.hasActiveQuest  !== this.state.hasActiveQuest   ||
      state.unlockedZoneIds.join() !== this.state.unlockedZoneIds.join();

    this.state = { ...state };
    if (changed) this._redraw();
  }

  /** Close if open; returns true if it was open (for ESC priority chain). */
  closeIfOpen(): boolean {
    if (!this.visible) return false;
    this.hide();
    return true;
  }

  destroy(): void {
    this.container.destroy();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private _build(): void {
    const W = CANVAS.WIDTH;
    const H = CANVAS.HEIGHT;

    this.container = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    // Semi-transparent full-screen background
    this.bg = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x050510, BG_ALPHA)
      .setScrollFactor(0);
    this.container.add(this.bg);

    // Title
    this.title = this.scene.add.text(W / 2, 8, 'WORLD MAP', {
      fontSize: '7px',
      color: '#aaccff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0);
    this.container.add(this.title);

    // Hint bar
    this.hint = this.scene.add.text(W / 2, H - 6, '[M] / [ESC] close  |  [+] zoom in  [-] zoom out', {
      fontSize: '4px',
      color: '#445566',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0);
    this.container.add(this.hint);

    // Zoom label
    this.zoomLabel = this.scene.add.text(W / 2, H - 12, '', {
      fontSize: '4px',
      color: '#667788',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0);
    this.container.add(this.zoomLabel);

    // Zoom buttons
    this.btnPlus = this.scene.add.text(W / 2 + 30, H - 12, '[+]', {
      fontSize: '5px',
      color: '#88aacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.btnPlus.on('pointerdown', () => this._zoomIn());
    this.container.add(this.btnPlus);

    this.btnMinus = this.scene.add.text(W / 2 - 30, H - 12, '[-]', {
      fontSize: '5px',
      color: '#88aacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.btnMinus.on('pointerdown', () => this._zoomOut());
    this.container.add(this.btnMinus);

    // Graphics object for zone cards + connectors
    this.mapGfx = this.scene.add.graphics().setScrollFactor(0);
    this.container.add(this.mapGfx);

    // Key bindings
    this.mKey   = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.escKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Mouse wheel zoom
    this.scene.input.on('wheel', (_p: unknown, _gos: unknown, _dx: unknown, dy: number) => {
      if (!this.visible) return;
      if (dy < 0) this._zoomIn();
      else if (dy > 0) this._zoomOut();
    });
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private _redraw(): void {
    this.mapGfx.clear();
    // Destroy previous text labels
    this.labels.forEach(t => t.destroy());
    this.labels = [];

    const z   = this.zoom;
    const ox  = CANVAS.WIDTH  / 2 - (TOTAL_W * z) / 2;
    const oy  = CANVAS.HEIGHT / 2 - (CARD_H  * z) / 2;

    for (let i = 0; i < ZONES.length; i++) {
      const zone = ZONES[i];
      const cx   = ox + i * (CARD_W + CARD_GAP) * z;
      const cy   = oy;
      const cw   = CARD_W * z;
      const ch   = CARD_H * z;

      const unlocked = this.state.unlockedZoneIds.includes(zone.id);
      const isCurrent = zone.id === this.state.currentZoneId;

      this._drawZoneCard(zone, cx, cy, cw, ch, unlocked, isCurrent, i);

      // Connector arrow to next zone
      if (i < ZONES.length - 1) {
        const arrowX = cx + cw;
        const arrowMidY = cy + ch / 2;
        const arrowLen  = CARD_GAP * z;
        const nextUnlocked = this.state.unlockedZoneIds.includes(ZONES[i + 1].id);
        const connColor = nextUnlocked ? 0x446688 : 0x222233;
        this._drawConnector(arrowX, arrowMidY, arrowLen, connColor);
      }
    }

    this.zoomLabel.setText(`zoom ${Math.round(this.zoom * 100)}%`);
  }

  private _drawZoneCard(
    zone:      ZoneConfig,
    cx:        number,
    cy:        number,
    cw:        number,
    ch:        number,
    unlocked:  boolean,
    isCurrent: boolean,
    _index:    number,
  ): void {
    const z = this.zoom;

    // Card background
    const bgColor = unlocked ? 0x0a1a2e : 0x08080f;
    this.mapGfx.fillStyle(bgColor, 1);
    this.mapGfx.fillRect(cx, cy, cw, ch);

    // Biome accent band at top of card
    if (unlocked) {
      this.mapGfx.fillStyle(zone.accentColor, 0.25);
      this.mapGfx.fillRect(cx, cy, cw, 4 * z);
    }

    // Card border
    const borderColor = isCurrent ? zone.accentColor : (unlocked ? 0x334455 : 0x1a1a2a);
    const borderThick = isCurrent ? 1.5 : 0.75;
    this.mapGfx.lineStyle(borderThick, borderColor, 1);
    this.mapGfx.strokeRect(cx, cy, cw, ch);

    // Fog overlay on locked zones
    if (!unlocked) {
      this.mapGfx.fillStyle(0x000000, 0.65);
      this.mapGfx.fillRect(cx, cy, cw, ch);
      // Lock icon (simple padlock shape using rects)
      const lx = cx + cw / 2;
      const ly = cy + ch / 2;
      this.mapGfx.lineStyle(1 * z, 0x334455, 0.9);
      this.mapGfx.strokeCircle(lx, ly - 3 * z, 3 * z);
      this.mapGfx.fillStyle(0x334455, 0.9);
      this.mapGfx.fillRect(lx - 3 * z, ly - 1 * z, 6 * z, 5 * z);
    }

    // Zone name
    const nameColor = unlocked
      ? `#${zone.accentColor.toString(16).padStart(6, '0')}`
      : '#333344';
    const nameTxt = this.scene.add.text(
      cx + cw / 2,
      cy + (unlocked ? 7 : 5) * z,
      unlocked ? zone.name : '???',
      {
        fontSize: `${Math.max(3, Math.round(4 * z))}px`,
        color: nameColor,
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5, 0).setScrollFactor(0);
    this.container.add(nameTxt);
    this.labels.push(nameTxt);

    if (unlocked) {
      // Biome
      const biomeTxt = this.scene.add.text(
        cx + cw / 2,
        cy + 14 * z,
        zone.biome,
        {
          fontSize: `${Math.max(3, Math.round(3 * z))}px`,
          color: '#556677',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5, 0).setScrollFactor(0);
      this.container.add(biomeTxt);
      this.labels.push(biomeTxt);
    }

    // "YOU ARE HERE" marker
    if (isCurrent) {
      const markerY = cy + ch - 8 * z;

      // Player dot
      this.mapGfx.fillStyle(0xffee44, 1);
      this.mapGfx.fillCircle(cx + cw / 2, markerY, 2 * z);

      const youTxt = this.scene.add.text(
        cx + cw / 2,
        cy + ch - 3 * z,
        'YOU',
        {
          fontSize: `${Math.max(3, Math.round(3 * z))}px`,
          color: '#ffee44',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5, 1).setScrollFactor(0);
      this.container.add(youTxt);
      this.labels.push(youTxt);

      // Quest marker
      if (this.state.hasActiveQuest) {
        const qx = cx + cw - 5 * z;
        const qy = cy + 5 * z;
        this.mapGfx.fillStyle(0xffdd00, 1);
        this.mapGfx.fillTriangle(qx, qy - 3 * z, qx + 2.5 * z, qy, qx, qy + 3 * z);
        this.mapGfx.fillTriangle(qx, qy - 3 * z, qx - 2.5 * z, qy, qx, qy + 3 * z);
      }
    }
  }

  private _drawConnector(
    startX:  number,
    midY:    number,
    len:     number,
    color:   number,
  ): void {
    const endX = startX + len;
    const tipX = endX;
    const arrowSize = Math.max(2, 3 * this.zoom);

    this.mapGfx.lineStyle(Math.max(0.5, this.zoom), color, 0.8);
    this.mapGfx.beginPath();
    this.mapGfx.moveTo(startX, midY);
    this.mapGfx.lineTo(endX - arrowSize, midY);
    this.mapGfx.strokePath();

    // Arrow head
    this.mapGfx.fillStyle(color, 0.8);
    this.mapGfx.fillTriangle(
      tipX,            midY,
      tipX - arrowSize, midY - arrowSize / 2,
      tipX - arrowSize, midY + arrowSize / 2,
    );
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  private _zoomIn(): void {
    this.zoom = Math.min(ZOOM_MAX, parseFloat((this.zoom + ZOOM_STEP).toFixed(2)));
    if (this.visible) this._redraw();
  }

  private _zoomOut(): void {
    this.zoom = Math.max(ZOOM_MIN, parseFloat((this.zoom - ZOOM_STEP).toFixed(2)));
    if (this.visible) this._redraw();
  }
}

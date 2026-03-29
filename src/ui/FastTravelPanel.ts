/**
 * FastTravelPanel — Waystone zone-select dialog.
 *
 * Opened when the player interacts with the Waystone (press E near the waystone,
 * or via FastTravelPanel.open()). Displays all unlocked zones, their travel cost
 * (an economy gold sink), and lets the player teleport to any of them.
 *
 * Uses the ui_panel_fasttravel art asset (160×96) as the panel background and
 * ui_btn_fasttravel / ui_btn_fasttravel_disabled (48×16) for action buttons.
 *
 * Travel cost: 25 gold × zone tier (tier = index + 1).
 * The current zone is shown but disabled (already there).
 * Locked zones are greyed out.
 */

import Phaser from 'phaser';
import { CANVAS, ZONES } from '../config/constants';

// Panel art is 160×96
const PANEL_W = 160;
const PANEL_H = 96;
const PANEL_X = Math.floor((CANVAS.WIDTH  - PANEL_W) / 2);
const PANEL_Y = Math.floor((CANVAS.HEIGHT - PANEL_H) / 2);
const DEPTH   = 82;
const PAD     = 5;

// Button art is 48×16
const BTN_W = 48;
const BTN_H = 16;

const COST_PER_TIER = 25; // gold per zone tier

export class FastTravelPanel {
  private scene:      Phaser.Scene;
  private container:  Phaser.GameObjects.Container;
  private dynObjects: Phaser.GameObjects.GameObject[] = [];

  private _visible      = false;
  private selectedIdx   = -1;

  /** Current zone id — set before opening. */
  currentZoneId = 'zone1';
  /** IDs of zones the player has unlocked. */
  unlockedZoneIds: string[] = ['zone1'];
  /** Player's current gold. Updated before opening. */
  playerGold = 0;

  /** Called when player confirms travel: passes (zoneId, cost). */
  onTravel?: (zoneId: string, cost: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene     = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.rebuild();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  open(): void {
    this._visible   = true;
    this.selectedIdx = -1;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.hide();
    return true;
  }

  destroy(): void {
    this.clearDyn();
    this.container.destroy();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private clearDyn(): void {
    this.dynObjects.forEach(o => o.destroy());
    this.dynObjects = [];
    this.container.removeAll(false);
  }

  private addText(
    x: number, y: number, text: string,
    color = '#cccccc', size = '4px',
  ): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size, color, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(t);
    this.container.add(t);
    return t;
  }

  private addImage(
    x: number, y: number, key: string,
    originX = 0, originY = 0,
  ): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, key)
      .setOrigin(originX, originY).setScrollFactor(0).setDepth(DEPTH);
    this.dynObjects.push(img);
    this.container.add(img);
    return img;
  }

  private addRect(
    x: number, y: number, w: number, h: number,
    fill: number, alpha = 1,
    stroke?: number,
  ): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(x, y, w, h, fill, alpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    if (stroke !== undefined) r.setStrokeStyle(1, stroke, 0.8);
    this.dynObjects.push(r);
    this.container.add(r);
    return r;
  }

  private rebuild(): void {
    this.clearDyn();

    // ── Panel background (art asset, 160×96) ──────────────────────────────
    const panelBg = this.addImage(PANEL_X, PANEL_Y, 'ui_panel_fasttravel');
    panelBg.setDepth(DEPTH - 1);

    // Header text
    this.addText(PANEL_X + PAD,                PANEL_Y + PAD,     'Waystone',      '#ffd700', '5px');
    this.addText(PANEL_X + PANEL_W - PAD - 12, PANEL_Y + PAD,     '[Esc]',         '#445566', '3px');
    this.addText(PANEL_X + PAD,                PANEL_Y + PAD + 8,  'Fast travel to any activated waystone.', '#889988', '3px');
    this.addText(PANEL_X + PAD,                PANEL_Y + PAD + 13, `Gold: ${this.playerGold}g`, '#ffdd88', '4px');

    const listY = PANEL_Y + PAD + 22;
    const rowH  = 14;

    // Scrollable zone list (up to 4 visible at a time before overflow)
    const visibleZones = ZONES.slice(0, Math.floor((PANEL_H - 44) / rowH));

    visibleZones.forEach((zone, i) => {
      const rowY      = listY + i * rowH;
      const isUnlocked = this.unlockedZoneIds.includes(zone.id);
      const isCurrent  = zone.id === this.currentZoneId;
      const cost       = (ZONES.indexOf(zone) + 1) * COST_PER_TIER;
      const canAfford  = this.playerGold >= cost;
      const isSelected = this.selectedIdx === i;

      // Row background
      const rowBg = this.addRect(
        PANEL_X + PAD, rowY, PANEL_W - PAD * 2, rowH - 1,
        isSelected ? 0x3a2200 : (isCurrent ? 0x112211 : 0x0a0a12), 0.80,
        isSelected ? 0xffaa33 : (isCurrent ? 0x336633 : undefined),
      );

      // Zone name
      const nameColor = isCurrent
        ? '#88ff88'
        : (!isUnlocked ? '#444455' : (canAfford ? '#ddddff' : '#886655'));
      this.addText(PANEL_X + PAD + 3, rowY + 2, zone.name, nameColor, '4px');

      // Level / biome hint
      this.addText(
        PANEL_X + PAD + 3, rowY + 7,
        `Lv.${zone.minPlayerLevel}+`,
        isCurrent ? '#557755' : '#445566', '3px',
      );

      // Cost / status on right
      const rightX = PANEL_X + PANEL_W - PAD - 2;
      if (isCurrent) {
        this.addText(rightX - 20, rowY + 3, '(here)', '#557755', '3px');
      } else if (!isUnlocked) {
        this.addText(rightX - 8, rowY + 3, '[?]', '#444455', '4px');
      } else {
        const costColor = canAfford ? '#ffd700' : '#884444';
        this.addText(rightX, rowY + 3, `${cost}g`, costColor, '4px').setOrigin(1, 0);
      }

      // Make unlocked non-current rows interactive
      if (isUnlocked && !isCurrent) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerup', () => {
          this.selectedIdx = (this.selectedIdx === i) ? -1 : i;
          this.rebuild();
        });
      }
    });

    // ── Confirm travel button (art asset) ─────────────────────────────────
    if (this.selectedIdx >= 0 && this.selectedIdx < ZONES.length) {
      const zone      = ZONES[this.selectedIdx]!;
      const cost      = (ZONES.indexOf(zone) + 1) * COST_PER_TIER;
      const canAfford = this.playerGold >= cost;
      const btnX      = PANEL_X + PAD;
      const btnY      = PANEL_Y + PANEL_H - BTN_H - PAD;

      const btnKey = canAfford ? 'ui_btn_fasttravel' : 'ui_btn_fasttravel_disabled';
      const btnImg = this.addImage(btnX, btnY, btnKey);
      btnImg.setDepth(DEPTH);

      if (canAfford) {
        // Invisible hitbox matching button art size
        const hitbox = this.addRect(btnX, btnY, BTN_W, BTN_H, 0x000000, 0);
        hitbox.setInteractive({ useHandCursor: true });
        hitbox.on('pointerup', () => {
          this.hide();
          this.onTravel?.(zone.id, cost);
        });
        this.addText(btnX + 3, btnY + 4, `Go → ${zone.name}`, '#88ff88', '3px').setDepth(DEPTH + 2);
      } else {
        this.addText(btnX + 3, btnY + 4, `Need ${cost}g`, '#884444', '3px').setDepth(DEPTH + 2);
      }
    }

    // ── Close button ────────────────────────────────────────────────────────
    const closeBtnX = PANEL_X + PANEL_W - PAD - BTN_W;
    const closeBtnY = PANEL_Y + PANEL_H - BTN_H - PAD;
    const closeBtnImg = this.addImage(closeBtnX, closeBtnY, 'ui_btn_fasttravel_disabled');
    closeBtnImg.setDepth(DEPTH);
    const closeHit = this.addRect(closeBtnX, closeBtnY, BTN_W, BTN_H, 0x000000, 0);
    closeHit.setInteractive({ useHandCursor: true });
    closeHit.on('pointerup', () => this.hide());
    this.addText(closeBtnX + 12, closeBtnY + 4, 'Close', '#aaaacc', '3px').setDepth(DEPTH + 2);
  }
}

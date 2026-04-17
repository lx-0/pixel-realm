/**
 * WorldMapOverlay — full-screen world map toggled with M.
 *
 * Uses the worldmap_bg art asset as the base, with biome icons for each zone,
 * fog-of-war tiles over undiscovered areas, an animated player position marker,
 * and a quest marker on the active zone. Zoom (+/-/wheel) scales the map content.
 *
 * Close with M or Escape.
 */

import Phaser from 'phaser';
import { CANVAS, ZONES, getLandPlotMapPos, type LandParcelInfo } from '../config/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const DEPTH        = 75;
const BG_ALPHA     = 0.95;
const ZOOM_STEP    = 0.25;
const ZOOM_MIN     = 0.6;
const ZOOM_MAX     = 2.0;

// Zone icon positions on the 320×180 worldmap_bg (centre of each 16×16 icon).
// Arranged as a snake path following game progression zones 1→19.
const ZONE_POS: Record<string, { x: number; y: number }> = {
  zone1:  { x: 44,  y: 50  },
  zone2:  { x: 100, y: 50  },
  zone3:  { x: 156, y: 50  },
  zone4:  { x: 212, y: 50  },
  zone5:  { x: 268, y: 50  },

  zone6:  { x: 268, y: 90  },
  zone7:  { x: 212, y: 90  },
  zone8:  { x: 156, y: 90  },
  zone9:  { x: 100, y: 90  },
  zone10: { x: 44,  y: 90  },

  zone11: { x: 44,  y: 128 },
  zone12: { x: 100, y: 128 },
  zone13: { x: 156, y: 128 },
  zone14: { x: 212, y: 128 },
  zone15: { x: 268, y: 128 },

  zone16: { x: 268, y: 160 },
  zone17: { x: 212, y: 160 },
  zone18: { x: 156, y: 160 },
  zone19: { x: 100, y: 160 },
};

// Snake-path connections for path-line rendering
const ZONE_PATH: string[] = [
  'zone1','zone2','zone3','zone4','zone5',
  'zone6','zone7','zone8','zone9','zone10',
  'zone11','zone12','zone13','zone14','zone15',
  'zone16','zone17','zone18','zone19',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function biomeToIconKey(biome: string): string {
  const b = biome.toLowerCase();
  if (b.includes('forest'))                                   return 'icon_zone_forest';
  if (b.includes('desert') || b.includes('plain'))           return 'icon_zone_desert';
  if (b.includes('dungeon'))                                  return 'icon_zone_dungeon';
  if (b.includes('ocean') || b.includes('coastal') || b.includes('sea') || b.includes('deep'))
                                                              return 'icon_zone_ocean';
  if (b.includes('ice') || b.includes('frost') || b.includes('cave') || b.includes('mountain'))
                                                              return 'icon_zone_ice';
  if (b.includes('volcanic') || b.includes('lava') || b.includes('fire') || b.includes('primordial'))
                                                              return 'icon_zone_volcanic';
  if (b.includes('swamp') || b.includes('marsh') || b.includes('mire') || b.includes('bog'))
                                                              return 'icon_zone_swamp';
  if (b.includes('astral') || b.includes('sky') || b.includes('celestial') || b.includes('twilight'))
                                                              return 'icon_zone_astral';
  if (b.includes('eclipsed') || b.includes('eclipse'))       return 'icon_zone_eclipsed';
  if (b.includes('ethereal') || b.includes('nexus'))         return 'icon_zone_ethereal';
  return 'icon_zone_oblivion'; // void, bone, shattered, oblivion
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorldMapState {
  currentZoneId:   string;
  unlockedZoneIds: string[];
  hasActiveQuest:  boolean;
  /** Player's owned land parcels — shown as green markers on the map. */
  ownedParcels?:   LandParcelInfo[];
}

// Per-zone display objects
interface ZoneDisplay {
  icon:        Phaser.GameObjects.Image;
  fogCenter:   Phaser.GameObjects.TileSprite;
  fogEdgeN:    Phaser.GameObjects.Image;
  fogEdgeS:    Phaser.GameObjects.Image;
  fogEdgeE:    Phaser.GameObjects.Image;
  fogEdgeW:    Phaser.GameObjects.Image;
  fogCornerNE: Phaser.GameObjects.Image;
  fogCornerNW: Phaser.GameObjects.Image;
  fogCornerSE: Phaser.GameObjects.Image;
  fogCornerSW: Phaser.GameObjects.Image;
  nameLabel:   Phaser.GameObjects.Text;
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class WorldMapOverlay {
  private scene:   Phaser.Scene;
  private visible  = false;
  private zoom     = 1;
  private state:   WorldMapState;

  private container!:    Phaser.GameObjects.Container;
  private mapContent!:   Phaser.GameObjects.Container;
  private pathGfx!:      Phaser.GameObjects.Graphics;
  private landGfx!:      Phaser.GameObjects.Graphics;
  private playerMarker!: Phaser.GameObjects.Sprite;
  private questMarker!:  Phaser.GameObjects.Image;
  private zoomLabel!:    Phaser.GameObjects.Text;
  private zoneDisplays:  Map<string, ZoneDisplay> = new Map();

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
    this._refresh();
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

  update(state: WorldMapState): void {
    if (Phaser.Input.Keyboard.JustDown(this.mKey) ||
        (this.visible && Phaser.Input.Keyboard.JustDown(this.escKey))) {
      this.toggle();
    }

    if (!this.visible) return;

    const changed =
      state.currentZoneId   !== this.state.currentZoneId   ||
      state.hasActiveQuest  !== this.state.hasActiveQuest   ||
      state.unlockedZoneIds.join() !== this.state.unlockedZoneIds.join() ||
      (state.ownedParcels ?? []).map(p => p.tokenId).join() !==
        (this.state.ownedParcels ?? []).map(p => p.tokenId).join();

    this.state = { ...state };
    if (changed) this._refresh();
  }

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

    // Full-screen dimming layer
    const dimBg = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, BG_ALPHA)
      .setScrollFactor(0);
    this.container.add(dimBg);

    // Title
    const title = this.scene.add.text(W / 2, 6, 'WORLD MAP', {
      fontSize: '7px', color: '#aaccff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0);
    this.container.add(title);

    // Hint bar
    const hint = this.scene.add.text(W / 2, H - 5, '[M] / [ESC] close  |  [+] zoom in  [-] zoom out', {
      fontSize: '4px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0);
    this.container.add(hint);

    // Zoom label
    this.zoomLabel = this.scene.add.text(W / 2, H - 11, '', {
      fontSize: '4px', color: '#667788', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0);
    this.container.add(this.zoomLabel);

    // Zoom buttons
    const btnPlus = this.scene.add.text(W / 2 + 30, H - 11, '[+]', {
      fontSize: '5px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
    btnPlus.on('pointerdown', () => this._zoomIn());
    this.container.add(btnPlus);

    const btnMinus = this.scene.add.text(W / 2 - 30, H - 11, '[-]', {
      fontSize: '5px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
    btnMinus.on('pointerdown', () => this._zoomOut());
    this.container.add(btnMinus);

    // ── Map content container (zoomable, centred on canvas) ─────────────────
    this.mapContent = this.scene.add.container(W / 2, H / 2).setScrollFactor(0);
    this.container.add(this.mapContent);

    // worldmap_bg image centred in mapContent (origin 0.5)
    const mapBg = this.scene.add.image(0, 0, 'worldmap_bg')
      .setOrigin(0.5, 0.5).setScrollFactor(0);
    this.mapContent.add(mapBg);

    // Path graphics drawn underneath icons
    this.pathGfx = this.scene.add.graphics().setScrollFactor(0);
    this.mapContent.add(this.pathGfx);

    // Land ownership graphics drawn above paths but below zone icons
    this.landGfx = this.scene.add.graphics().setScrollFactor(0);
    this.mapContent.add(this.landGfx);

    // Build zone displays
    const halfW = W / 2;
    const halfH = H / 2;

    for (const zone of ZONES) {
      const pos = ZONE_POS[zone.id];
      if (!pos) continue;

      // Offset from mapContent centre (bg is W×H centred at origin)
      const ox = pos.x - halfW;
      const oy = pos.y - halfH;

      // Biome icon
      const iconKey = biomeToIconKey(zone.biome);
      const icon = this.scene.add.image(ox, oy, iconKey)
        .setOrigin(0.5, 0.5).setScrollFactor(0);
      this.mapContent.add(icon);

      // Fog overlay — centre tile + 8 edge/corner tiles (each 16×16)
      const fogCenter = this.scene.add.tileSprite(ox, oy, 16, 16, 'fog_tile')
        .setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.92);
      const fogEdgeN   = this.scene.add.image(ox,      oy - 16, 'fog_edge_n').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.85);
      const fogEdgeS   = this.scene.add.image(ox,      oy + 16, 'fog_edge_s').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.85);
      const fogEdgeE   = this.scene.add.image(ox + 16, oy,      'fog_edge_e').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.85);
      const fogEdgeW   = this.scene.add.image(ox - 16, oy,      'fog_edge_w').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.85);
      const fogCornerNE = this.scene.add.image(ox + 16, oy - 16, 'fog_corner_ne').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.80);
      const fogCornerNW = this.scene.add.image(ox - 16, oy - 16, 'fog_corner_nw').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.80);
      const fogCornerSE = this.scene.add.image(ox + 16, oy + 16, 'fog_corner_se').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.80);
      const fogCornerSW = this.scene.add.image(ox - 16, oy + 16, 'fog_corner_sw').setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0.80);
      this.mapContent.add([fogCenter, fogEdgeN, fogEdgeS, fogEdgeE, fogEdgeW, fogCornerNE, fogCornerNW, fogCornerSE, fogCornerSW]);

      // Zone name label below icon
      const nameLabel = this.scene.add.text(ox, oy + 10, '', {
        fontSize: '3px', color: '#aaccee', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 0).setScrollFactor(0);
      this.mapContent.add(nameLabel);

      this.zoneDisplays.set(zone.id, {
        icon, fogCenter, fogEdgeN, fogEdgeS, fogEdgeE, fogEdgeW,
        fogCornerNE, fogCornerNW, fogCornerSE, fogCornerSW, nameLabel,
      });
    }

    // Animated player marker (drawn above fog)
    const markerAnim = this.scene.anims.exists('marker-player-pulse') ? 'marker-player-pulse' : undefined;
    this.playerMarker = this.scene.add.sprite(0, 0, markerAnim ? 'marker_player_anim' : 'marker_player')
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1);
    if (markerAnim) this.playerMarker.play(markerAnim);
    this.mapContent.add(this.playerMarker);

    // Quest marker (shown above player marker when quest active)
    this.questMarker = this.scene.add.image(0, -14, 'marker_quest')
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(1);
    this.mapContent.add(this.questMarker);

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

  // ── Refresh ────────────────────────────────────────────────────────────────

  private _refresh(): void {
    const halfW = CANVAS.WIDTH  / 2;
    const halfH = CANVAS.HEIGHT / 2;

    // Draw path lines between consecutive zones
    this._drawPaths();

    // Draw owned land parcel markers
    this._drawLandMarkers(halfW, halfH);

    for (const zone of ZONES) {
      const disp = this.zoneDisplays.get(zone.id);
      if (!disp) continue;

      const pos     = ZONE_POS[zone.id];
      if (!pos) continue;

      const unlocked  = this.state.unlockedZoneIds.includes(zone.id);
      const isCurrent = zone.id === this.state.currentZoneId;

      // Icon appearance
      if (unlocked) {
        disp.icon.setAlpha(1).clearTint();
        if (isCurrent) {
          disp.icon.setTint(0xffffff); // full brightness for current zone
        }
      } else {
        disp.icon.setAlpha(0.3).setTint(0x334455); // dark fog tint
      }

      // Fog visibility: show for undiscovered zones
      const fogVisible = !unlocked;
      disp.fogCenter.setVisible(fogVisible);
      disp.fogEdgeN.setVisible(fogVisible);
      disp.fogEdgeS.setVisible(fogVisible);
      disp.fogEdgeE.setVisible(fogVisible);
      disp.fogEdgeW.setVisible(fogVisible);
      disp.fogCornerNE.setVisible(fogVisible);
      disp.fogCornerNW.setVisible(fogVisible);
      disp.fogCornerSE.setVisible(fogVisible);
      disp.fogCornerSW.setVisible(fogVisible);

      // Name label
      const ox = pos.x - halfW;
      const oy = pos.y - halfH;
      disp.nameLabel.setText(unlocked ? zone.name : '???');
      disp.nameLabel.setColor(isCurrent ? '#ffee44' : (unlocked ? '#aaccee' : '#334455'));
      disp.nameLabel.setPosition(ox, oy + 10);
    }

    // Player marker position
    const curPos = ZONE_POS[this.state.currentZoneId];
    if (curPos) {
      const mx = curPos.x - halfW;
      const my = curPos.y - halfH;
      this.playerMarker.setPosition(mx, my).setVisible(true);
      this.questMarker.setPosition(mx, my - 10).setVisible(this.state.hasActiveQuest);
    } else {
      this.playerMarker.setVisible(false);
      this.questMarker.setVisible(false);
    }

    this.zoomLabel.setText(`zoom ${Math.round(this.zoom * 100)}%`);
  }

  private _drawLandMarkers(halfW: number, halfH: number): void {
    this.landGfx.clear();
    const parcels = this.state.ownedParcels;
    if (!parcels || parcels.length === 0) return;

    for (const parcel of parcels) {
      const plotIdx = parseInt(parcel.plotIndex, 10);
      if (isNaN(plotIdx)) continue;

      const pos = getLandPlotMapPos(parcel.zoneId, plotIdx);
      if (!pos) continue;

      const mx = pos.x - halfW;
      const my = pos.y - halfH;

      // Green filled square marker for owned plot
      this.landGfx.fillStyle(0x50fa7b, 0.85);
      this.landGfx.fillRect(mx - 1, my - 1, 3, 3);

      // Subtle bright border
      this.landGfx.lineStyle(0.5, 0x88ffaa, 0.6);
      this.landGfx.strokeRect(mx - 1, my - 1, 3, 3);
    }
  }

  private _drawPaths(): void {
    this.pathGfx.clear();

    const halfW = CANVAS.WIDTH  / 2;
    const halfH = CANVAS.HEIGHT / 2;

    for (let i = 0; i < ZONE_PATH.length - 1; i++) {
      const aId = ZONE_PATH[i]!;
      const bId = ZONE_PATH[i + 1]!;
      const aPos = ZONE_POS[aId];
      const bPos = ZONE_POS[bId];
      if (!aPos || !bPos) continue;

      const ax = aPos.x - halfW;
      const ay = aPos.y - halfH;
      const bx = bPos.x - halfW;
      const by = bPos.y - halfH;

      const aUnlocked = this.state.unlockedZoneIds.includes(aId);
      const bUnlocked = this.state.unlockedZoneIds.includes(bId);
      const color = (aUnlocked && bUnlocked) ? 0x446688 : (aUnlocked ? 0x2a3a4a : 0x1a1a2a);
      const alpha = (aUnlocked && bUnlocked) ? 0.7 : 0.35;

      this.pathGfx.lineStyle(1, color, alpha);
      this.pathGfx.beginPath();
      this.pathGfx.moveTo(ax, ay);
      this.pathGfx.lineTo(bx, by);
      this.pathGfx.strokePath();

      // Arrow head pointing toward bPos
      if (aUnlocked) {
        const angle = Math.atan2(by - ay, bx - ax);
        const tip   = { x: (ax + bx) / 2, y: (ay + by) / 2 }; // mid-point arrow
        const sz    = 2;
        this.pathGfx.fillStyle(color, alpha);
        this.pathGfx.fillTriangle(
          tip.x + Math.cos(angle) * sz,       tip.y + Math.sin(angle) * sz,
          tip.x + Math.cos(angle + 2.4) * sz, tip.y + Math.sin(angle + 2.4) * sz,
          tip.x + Math.cos(angle - 2.4) * sz, tip.y + Math.sin(angle - 2.4) * sz,
        );
      }
    }
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  private _applyZoom(): void {
    this.mapContent.setScale(this.zoom);
    this.zoomLabel.setText(`zoom ${Math.round(this.zoom * 100)}%`);
  }

  private _zoomIn(): void {
    this.zoom = Math.min(ZOOM_MAX, parseFloat((this.zoom + ZOOM_STEP).toFixed(2)));
    this._applyZoom();
  }

  private _zoomOut(): void {
    this.zoom = Math.max(ZOOM_MIN, parseFloat((this.zoom - ZOOM_STEP).toFixed(2)));
    this._applyZoom();
  }
}

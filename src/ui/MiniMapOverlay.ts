/**
 * MiniMapOverlay — always-visible top-right HUD mini-map.
 *
 * Renders a scaled-down view of the current zone showing:
 *  - Playable area boundary
 *  - Local player (yellow directional arrow)
 *  - NPC positions (teal dots)
 *  - Enemies (red dots)
 *  - Remote players (blue dots, multiplayer only)
 *  - Quest markers (yellow diamond) at NPC locations when a quest is active
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { RemotePlayer } from '../systems/MultiplayerClient';

// ── Layout constants ───────────────────────────────────────────────────────────

const MAP_W = 56;
const MAP_H = 32; // 16:9 of 640×360 world → 56:31.5, rounded up
const MAP_X = CANVAS.WIDTH - 4 - MAP_W; // 260
const MAP_Y = 24;
const DEPTH = 50;

// World size (matches GameScene: CANVAS.WIDTH*2 × CANVAS.HEIGHT*2)
const WORLD_W = CANVAS.WIDTH  * 2; // 640
const WORLD_H = CANVAS.HEIGHT * 2; // 360

// Scale: world px → mini-map px (base, before zoom)
const SCALE_X = MAP_W / WORLD_W; // ≈0.0875
const SCALE_Y = MAP_H / WORLD_H; // ≈0.0889

const ZOOM_MIN    = 1.0;   // no zoom-out below base scale
const ZOOM_MAX    = 3.0;
const ZOOM_STEP   = 0.003; // px of pinch distance per zoom unit

// Wall thickness in world px (matches buildWorld border walls)
const WALL_PX = 32;

export interface NpcMarker {
  x: number;
  y: number;
  hasQuest: boolean;
}

export class MiniMapOverlay {
  private gfx:        Phaser.GameObjects.Graphics;
  private maskGfx:    Phaser.GameObjects.Graphics;
  private header:     Phaser.GameObjects.Text;
  private biomeColor: number;
  private zoomScale   = 1.0;   // pinch-to-zoom multiplier

  /**
   * @param scene       The active Phaser scene.
   * @param biomeName   Short biome label shown above the mini-map (e.g. 'Forest').
   * @param biomeColor  Accent hex color for the biome border strip (e.g. 0x44dd44).
   */
  constructor(scene: Phaser.Scene, biomeName = 'Zone', biomeColor = 0x667788) {
    this.biomeColor = biomeColor;

    this.gfx = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // Persistent mask graphics — created once, reused every frame
    this.maskGfx = scene.add.graphics()
      .setScrollFactor(0)
      .fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
    this.gfx.setMask(this.maskGfx.createGeometryMask());

    // Biome label above the mini-map (replaces generic "MAP")
    const shortLabel = biomeName.length > 10 ? biomeName.slice(0, 10) : biomeName;
    const labelHex = '#' + biomeColor.toString(16).padStart(6, '0');
    this.header = scene.add.text(MAP_X + MAP_W / 2, MAP_Y - 1, shortLabel.toUpperCase(), {
      fontSize: '3px',
      color: labelHex,
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(
    player:             Phaser.Physics.Arcade.Sprite,
    enemies:            Phaser.Physics.Arcade.Group,
    remotePlayers:      Map<string, RemotePlayer>,
    remoteEnemySprites: Map<string, Phaser.Physics.Arcade.Sprite>,
    npcMarkers:         NpcMarker[] = [],
    deathMarker:        { x: number; y: number } | null = null,
    partySessionIds:    Set<string> = new Set(),
  ): void {
    this.gfx.clear();

    // ── Background ───────────────────────────────────────────────────────────
    this.gfx.fillStyle(0x000000, 0.65);
    this.gfx.fillRect(MAP_X - 1, MAP_Y - 1, MAP_W + 2, MAP_H + 2);

    // Biome color strip — 2px left-edge accent indicating current biome
    this.gfx.fillStyle(this.biomeColor, 0.8);
    this.gfx.fillRect(MAP_X - 1, MAP_Y - 1, 2, MAP_H + 2);

    // Outer border
    this.gfx.lineStyle(1, 0x445566, 0.9);
    this.gfx.strokeRect(MAP_X - 1, MAP_Y - 1, MAP_W + 2, MAP_H + 2);

    // Effective scale with zoom — the map shows a smaller world window when
    // zoomed in, centred on the player's world position.
    const sx = SCALE_X * this.zoomScale;
    const sy = SCALE_Y * this.zoomScale;

    // Pan offset: shift origin so player stays centred in the minimap.
    const px   = player.active ? player.x : WORLD_W / 2;
    const py   = player.active ? player.y : WORLD_H / 2;
    const offX = MAP_X + MAP_W  / 2 - px * sx;
    const offY = MAP_Y + MAP_H  / 2 - py * sy;

    // Helper to convert world coords → minimap screen coords
    const toMX = (wx: number) => offX + wx * sx;
    const toMY = (wy: number) => offY + wy * sy;

    // ── Playable-area boundary (inside the wall) ──────────────────────────
    const wx = WALL_PX * sx;
    const wy = WALL_PX * sy;
    this.gfx.lineStyle(0.5, 0x334455, 0.6);
    this.gfx.strokeRect(
      offX + wx,
      offY + wy,
      WORLD_W * sx - wx * 2,
      WORLD_H * sy - wy * 2,
    );

    // ── NPC markers ──────────────────────────────────────────────────────────
    for (const npc of npcMarkers) {
      const mx = toMX(npc.x);
      const my = toMY(npc.y);

      if (npc.hasQuest) {
        // Quest marker: yellow diamond
        this.gfx.fillStyle(0xffdd00, 1);
        this.gfx.fillTriangle(mx, my - 2.5, mx + 2, my, mx, my + 2.5);
        this.gfx.fillTriangle(mx, my - 2.5, mx - 2, my, mx, my + 2.5);
      } else {
        // Plain NPC dot (teal)
        this.gfx.fillStyle(0x22ddcc, 0.9);
        this.gfx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    // ── Enemies (red) ────────────────────────────────────────────────────────
    this.gfx.fillStyle(0xff3333, 0.9);
    enemies.getChildren().forEach((go) => {
      const sp = go as Phaser.Physics.Arcade.Sprite;
      if (!sp.active) return;
      const mx = toMX(sp.x);
      const my = toMY(sp.y);
      this.gfx.fillRect(mx - 1, my - 1, 2, 2);
    });

    // Remote enemies (multiplayer, also red)
    remoteEnemySprites.forEach((sp) => {
      if (!sp.active) return;
      const mx = toMX(sp.x);
      const my = toMY(sp.y);
      this.gfx.fillRect(mx - 1, my - 1, 2, 2);
    });

    // ── Remote players: party members (green) vs others (blue) ───────────
    remotePlayers.forEach((rp) => {
      const mx = toMX(rp.x);
      const my = toMY(rp.y);
      if (partySessionIds.has(rp.sessionId)) {
        this.gfx.fillStyle(0x44ff88, 1.0);
        // Slightly larger dot for party members
        this.gfx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      } else {
        this.gfx.fillStyle(0x88aaff, 0.9);
        this.gfx.fillRect(mx - 1, my - 1, 2, 2);
      }
    });

    // ── Death marker — white skull cross ─────────────────────────────────
    if (deathMarker) {
      const dmx = toMX(deathMarker.x);
      const dmy = toMY(deathMarker.y);
      // Draw an X cross in white
      this.gfx.lineStyle(1, 0xffffff, 0.9);
      this.gfx.lineBetween(dmx - 2, dmy - 2, dmx + 2, dmy + 2);
      this.gfx.lineBetween(dmx + 2, dmy - 2, dmx - 2, dmy + 2);
    }

    // ── Local player — directional arrow (bright yellow) ─────────────────
    // Always drawn at map centre when zoomed
    if (player.active) {
      const mx = this.zoomScale > 1 ? MAP_X + MAP_W / 2 : toMX(player.x);
      const my = this.zoomScale > 1 ? MAP_Y + MAP_H / 2 : toMY(player.y);

      // Determine facing from velocity; default to up if idle
      const vx = (player.body as Phaser.Physics.Arcade.Body)?.velocity.x ?? 0;
      const vy = (player.body as Phaser.Physics.Arcade.Body)?.velocity.y ?? 0;
      const angle = (vx === 0 && vy === 0) ? -Math.PI / 2 : Math.atan2(vy, vx);

      this.gfx.fillStyle(0xffee44, 1);
      this._drawArrow(mx, my, angle, 2.5);
    }

  }

  /** Draw a small filled directional arrow centred on (cx, cy). */
  private _drawArrow(cx: number, cy: number, angle: number, r: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Tip of arrow
    const tx = cx + cos * r;
    const ty = cy + sin * r;
    // Left base point (90° left of direction)
    const lx = cx + Math.cos(angle + Math.PI * 0.75) * r;
    const ly = cy + Math.sin(angle + Math.PI * 0.75) * r;
    // Right base point (90° right of direction)
    const rx2 = cx + Math.cos(angle - Math.PI * 0.75) * r;
    const ry2 = cy + Math.sin(angle - Math.PI * 0.75) * r;

    this.gfx.fillTriangle(tx, ty, lx, ly, rx2, ry2);
  }

  // ── Pinch-to-zoom ──────────────────────────────────────────────────────────

  /**
   * Apply accumulated pinch delta (pixels of finger distance change).
   * Positive = fingers spreading = zoom in; negative = zoom out.
   */
  applyPinchDelta(delta: number): void {
    this.zoomScale = Phaser.Math.Clamp(
      this.zoomScale + delta * ZOOM_STEP,
      ZOOM_MIN,
      ZOOM_MAX,
    );
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.gfx.destroy();
    this.maskGfx.destroy();
    this.header.destroy();
  }
}

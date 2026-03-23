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

// Scale: world px → mini-map px
const SCALE_X = MAP_W / WORLD_W; // ≈0.0875
const SCALE_Y = MAP_H / WORLD_H; // ≈0.0889

// Wall thickness in world px (matches buildWorld border walls)
const WALL_PX = 32;

export interface NpcMarker {
  x: number;
  y: number;
  hasQuest: boolean;
}

export class MiniMapOverlay {
  private gfx:    Phaser.GameObjects.Graphics;
  private header: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // Tiny "MAP" label above the mini-map
    this.header = scene.add.text(MAP_X + MAP_W / 2, MAP_Y - 1, 'MAP', {
      fontSize: '3px',
      color: '#667788',
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
  ): void {
    this.gfx.clear();

    // ── Background ───────────────────────────────────────────────────────────
    this.gfx.fillStyle(0x000000, 0.65);
    this.gfx.fillRect(MAP_X - 1, MAP_Y - 1, MAP_W + 2, MAP_H + 2);

    // Outer border
    this.gfx.lineStyle(1, 0x445566, 0.9);
    this.gfx.strokeRect(MAP_X - 1, MAP_Y - 1, MAP_W + 2, MAP_H + 2);

    // ── Playable-area boundary (inside the wall) ──────────────────────────
    const wx = WALL_PX * SCALE_X;
    const wy = WALL_PX * SCALE_Y;
    this.gfx.lineStyle(0.5, 0x334455, 0.6);
    this.gfx.strokeRect(
      MAP_X + wx,
      MAP_Y + wy,
      MAP_W - wx * 2,
      MAP_H - wy * 2,
    );

    // ── NPC markers ──────────────────────────────────────────────────────────
    for (const npc of npcMarkers) {
      const mx = MAP_X + npc.x * SCALE_X;
      const my = MAP_Y + npc.y * SCALE_Y;

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
      const mx = MAP_X + sp.x * SCALE_X;
      const my = MAP_Y + sp.y * SCALE_Y;
      this.gfx.fillRect(mx - 1, my - 1, 2, 2);
    });

    // Remote enemies (multiplayer, also red)
    remoteEnemySprites.forEach((sp) => {
      if (!sp.active) return;
      const mx = MAP_X + sp.x * SCALE_X;
      const my = MAP_Y + sp.y * SCALE_Y;
      this.gfx.fillRect(mx - 1, my - 1, 2, 2);
    });

    // ── Remote players (blue) ─────────────────────────────────────────────
    this.gfx.fillStyle(0x88aaff, 0.9);
    remotePlayers.forEach((rp) => {
      const mx = MAP_X + rp.x * SCALE_X;
      const my = MAP_Y + rp.y * SCALE_Y;
      this.gfx.fillRect(mx - 1, my - 1, 2, 2);
    });

    // ── Death marker — white skull cross ─────────────────────────────────
    if (deathMarker) {
      const dx = MAP_X + deathMarker.x * SCALE_X;
      const dy = MAP_Y + deathMarker.y * SCALE_Y;
      // Draw an X cross in white
      this.gfx.lineStyle(1, 0xffffff, 0.9);
      this.gfx.lineBetween(dx - 2, dy - 2, dx + 2, dy + 2);
      this.gfx.lineBetween(dx + 2, dy - 2, dx - 2, dy + 2);
    }

    // ── Local player — directional arrow (bright yellow) ─────────────────
    if (player.active) {
      const mx = MAP_X + player.x * SCALE_X;
      const my = MAP_Y + player.y * SCALE_Y;

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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.gfx.destroy();
    this.header.destroy();
  }
}

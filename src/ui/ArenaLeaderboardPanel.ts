/**
 * ArenaLeaderboardPanel — ranked arena player list with tier icons and W/L records.
 *
 * Shows:
 *   - Top 50 players sorted by rating
 *   - Tier bracket icon per row (Bronze/Silver/Gold/Platinum/Diamond)
 *   - W/L/KD stats per player
 *   - Current player's rank highlighted
 *
 * Shortcut: [B] to toggle.
 * Press Escape / B to close.
 *
 * Uses 'ui_panel_arena_leaderboard' background image.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import {
  ArenaManager,
  type ArenaLeaderboardEntry,
} from '../systems/ArenaManager';

const PANEL_W = 220;
const PANEL_H = 160;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 70;
const PAD     = 5;
const ITEM_H  = 11;

const TIER_COLORS: Record<string, string> = {
  BRONZE:   '#cd7f32',
  SILVER:   '#c0c0c0',
  GOLD:     '#ffd700',
  PLATINUM: '#aaeeff',
  DIAMOND:  '#88aaff',
};

export class ArenaLeaderboardPanel {
  private scene:         Phaser.Scene;
  private localPlayerId: string;
  private _visible       = false;
  private scrollOffset   = 0;
  private entries:       ArenaLeaderboardEntry[] = [];

  private container:  Phaser.GameObjects.Container;
  private dynObjects: Phaser.GameObjects.GameObject[] = [];
  private bKey!:      Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, localPlayerId: string) {
    this.scene         = scene;
    this.localPlayerId = localPlayerId;
    this.container     = scene.add.container(PANEL_X, PANEL_Y).setDepth(DEPTH).setScrollFactor(0);
    this.container.setVisible(false);
    this.bKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this._visible ? this.hide() : this.show();
    }
  }

  show(): void {
    this._visible    = true;
    this.scrollOffset = 0;
    this.container.setVisible(true);
    this.loadAndRebuild();
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
    this.scene.input.off('wheel', this.onWheel, this);
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.hide();
    return true;
  }

  destroy(): void {
    this.hide();
    this.clearDyn();
    this.container.destroy();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private loadAndRebuild(): void {
    this.entries = ArenaManager.getInstance().getLeaderboard(50);
    this.rebuild();
  }

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

  private addRect(
    x: number, y: number, w: number, h: number,
    fill: number, alpha = 1, stroke?: number,
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

    // Panel background (use asset or fallback)
    if (this.scene.textures.exists('ui_panel_arena_leaderboard')) {
      const img = this.scene.add.image(PANEL_W / 2, PANEL_H / 2, 'ui_panel_arena_leaderboard')
        .setScrollFactor(0).setDepth(DEPTH - 1);
      this.dynObjects.push(img);
      this.container.add(img);
    } else {
      this.addRect(0, 0, PANEL_W, PANEL_H, 0x000000, 0.90, 0x4466aa);
    }

    // Header
    this.addText(PAD, PAD, '⚔ Arena Leaderboard', '#ffd700', '6px');
    this.addText(PANEL_W - PAD - 16, PAD, '[B/Esc]', '#445566', '4px');

    // My rank
    const myRank = ArenaManager.getInstance().getPlayerRank(this.localPlayerId);
    if (myRank > 0) {
      this.addText(PAD, 15, `Your rank: #${myRank}`, '#88ddff', '4px');
    }

    // Column headers
    const listY = 24;
    this.addText(PAD,            listY, '#',      '#445566', '4px');
    this.addText(PAD + 14,       listY, 'Tier',   '#445566', '4px');
    this.addText(PAD + 30,       listY, 'Player', '#445566', '4px');
    this.addText(PAD + 105,      listY, 'Rating', '#445566', '4px');
    this.addText(PAD + 138,      listY, 'W',      '#445566', '4px');
    this.addText(PAD + 153,      listY, 'L',      '#445566', '4px');
    this.addText(PAD + 168,      listY, 'KDA',    '#445566', '4px');

    const entryY     = listY + 8;
    const listHeight = PANEL_H - entryY - PAD;

    if (this.entries.length === 0) {
      this.addText(PAD, entryY + 10, 'No ranked players yet.', '#556677', '4px');
      return;
    }

    // Clip mask
    const maskGfx = this.scene.add.graphics()
      .fillStyle(0xffffff)
      .fillRect(PANEL_X + PAD, PANEL_Y + entryY, PANEL_W - PAD * 2, listHeight);
    const mask = maskGfx.createGeometryMask();
    this.dynObjects.push(maskGfx);

    this.entries.forEach((entry) => {
      const rowY  = entryY + (entry.rank - 1) * ITEM_H - this.scrollOffset;
      if (rowY + ITEM_H < entryY || rowY > entryY + listHeight) return;

      const isMe  = entry.player.id === this.localPlayerId;
      const rowBg = this.scene.add.rectangle(PAD, rowY, PANEL_W - PAD * 2, ITEM_H - 1,
        isMe ? 0x1a2a44 : (entry.rank % 2 === 0 ? 0x0d1220 : 0x080e18), 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      if (isMe) rowBg.setStrokeStyle(1, 0x4488cc, 0.8);
      rowBg.setMask(mask);
      this.dynObjects.push(rowBg);
      this.container.add(rowBg);

      const rankColor = entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#445566';
      const rankT = this.scene.add.text(PAD + 1, rowY + 1, `${entry.rank}`, {
        fontSize: '4px', color: rankColor, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
      }).setScrollFactor(0).setDepth(DEPTH + 1);
      rankT.setMask(mask);
      this.dynObjects.push(rankT);
      this.container.add(rankT);

      const tierCol  = TIER_COLORS[entry.tier] ?? '#aaaacc';
      const tierAbbr = entry.tier.slice(0, 2);
      const tierT    = this.scene.add.text(PAD + 14, rowY + 1, tierAbbr, {})
        .setStyle({ fontSize: '4px', color: tierCol, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
        .setScrollFactor(0).setDepth(DEPTH + 1);
      tierT.setMask(mask);
      this.dynObjects.push(tierT);
      this.container.add(tierT);

      const nameCol = isMe ? '#88ddff' : '#aaaacc';
      const nameT   = this.scene.add.text(PAD + 30, rowY + 1, entry.player.name.slice(0, 12), {})
        .setStyle({ fontSize: '4px', color: nameCol, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
        .setScrollFactor(0).setDepth(DEPTH + 1);
      nameT.setMask(mask);
      this.dynObjects.push(nameT);
      this.container.add(nameT);

      const ratT = this.scene.add.text(PAD + 105, rowY + 1, `${entry.player.rating}`, {})
        .setStyle({ fontSize: '4px', color: '#ccddff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
        .setScrollFactor(0).setDepth(DEPTH + 1);
      ratT.setMask(mask);
      this.dynObjects.push(ratT);
      this.container.add(ratT);

      const wT = this.scene.add.text(PAD + 138, rowY + 1, `${entry.player.wins}`, {})
        .setStyle({ fontSize: '4px', color: '#66dd66', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
        .setScrollFactor(0).setDepth(DEPTH + 1);
      wT.setMask(mask);
      this.dynObjects.push(wT);
      this.container.add(wT);

      const lT = this.scene.add.text(PAD + 153, rowY + 1, `${entry.player.losses}`, {})
        .setStyle({ fontSize: '4px', color: '#dd6666', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
        .setScrollFactor(0).setDepth(DEPTH + 1);
      lT.setMask(mask);
      this.dynObjects.push(lT);
      this.container.add(lT);

      const deaths  = entry.player.deaths || 1;
      const kda     = (entry.player.kills / deaths).toFixed(1);
      const kdaT    = this.scene.add.text(PAD + 168, rowY + 1, kda, {})
        .setStyle({ fontSize: '4px', color: '#aaaacc', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 })
        .setScrollFactor(0).setDepth(DEPTH + 1);
      kdaT.setMask(mask);
      this.dynObjects.push(kdaT);
      this.container.add(kdaT);
    });

    // Scroll indicators
    const totalH   = this.entries.length * ITEM_H;
    if (totalH > listHeight) {
      if (this.scrollOffset > 0)                    this.addText(PANEL_W - PAD - 6, listY + 3, '▲', '#556677', '5px');
      if (this.scrollOffset < totalH - listHeight)  this.addText(PANEL_W - PAD - 6, PANEL_H - PAD - 5, '▼', '#556677', '5px');
      this.scene.input.off('wheel', this.onWheel, this);
      this.scene.input.on('wheel', this.onWheel, this);
    }
  }

  private onWheel = (_p: unknown, _g: unknown, _dx: number, dy: number): void => {
    if (!this._visible) return;
    const listH   = PANEL_H - 32 - PAD;
    const totalH  = this.entries.length * ITEM_H;
    const maxScr  = Math.max(0, totalH - listH);
    this.scrollOffset = Math.max(0, Math.min(maxScr, this.scrollOffset + (dy > 0 ? ITEM_H : -ITEM_H)));
    this.rebuild();
  };
}

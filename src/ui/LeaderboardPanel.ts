/**
 * LeaderboardPanel — displays top 100 players across 5 categories with
 * daily/weekly/all-time period tabs. The current player's rank is highlighted.
 *
 * Press L to toggle. Escape to close.
 *
 * Data source: GET /leaderboard/:category?period=<period>
 * Falls back to empty state when the server is unavailable.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const PANEL_W = 230;
const PANEL_H = 165;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 65;
const PAD     = 5;

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

export type LeaderboardCategory = 'xp' | 'achievements' | 'prestige' | 'pvp_wins' | 'guild' | 'hardcore';
export type LeaderboardPeriod   = 'all' | 'weekly' | 'daily';

export interface LeaderboardEntry {
  rank:     number;
  playerId: string;
  username: string;
  score:    number;
}

const CATEGORY_LABELS: Record<LeaderboardCategory, string> = {
  xp:           'Level',
  achievements: 'Points',
  prestige:     'Prestige',
  pvp_wins:     'PvP',
  guild:        'Guild',
  hardcore:     'HC Level',
};

const CATEGORY_ICONS: Record<LeaderboardCategory, string> = {
  xp:           '⭐',
  achievements: '🏆',
  prestige:     '♦',
  pvp_wins:     '⚔',
  guild:        '🛡',
  hardcore:     '☠',
};

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  all:    'All Time',
  weekly: 'Weekly',
  daily:  'Daily',
};

const CATEGORIES: LeaderboardCategory[] = ['xp', 'achievements', 'prestige', 'pvp_wins', 'guild', 'hardcore'];
const PERIODS:    LeaderboardPeriod[]   = ['all', 'weekly', 'daily'];

export class LeaderboardPanel {
  private scene:     Phaser.Scene;
  private _visible   = false;
  private lKey!:     Phaser.Input.Keyboard.Key;
  private container: Phaser.GameObjects.Container;
  private dynObjects: Phaser.GameObjects.GameObject[] = [];

  userId?:   string;
  username?: string;

  private activeCategory: LeaderboardCategory = 'xp';
  private activePeriod:   LeaderboardPeriod   = 'all';
  private entries:        LeaderboardEntry[]  = [];
  private playerRank      = 0;
  private scrollOffset    = 0;
  private loading         = false;

  constructor(scene: Phaser.Scene) {
    this.scene     = scene;
    this.container = scene.add.container(PANEL_X, PANEL_Y)
      .setDepth(DEPTH)
      .setScrollFactor(0);
    this.container.setVisible(false);
    this.lKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.lKey)) {
      this._visible ? this.hide() : this.show();
    }
  }

  show(): void {
    this._visible = true;
    this.container.setVisible(true);
    this.fetchAndRebuild();
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

  private async fetchAndRebuild(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.scrollOffset = 0;
    this.rebuild(); // show loading state

    try {
      const url = `${SERVER_HTTP}/leaderboard/${this.activeCategory}?period=${this.activePeriod}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json() as { entries: LeaderboardEntry[] };
      this.entries = data.entries ?? [];
      this.playerRank = this.userId
        ? (this.entries.find(e => e.playerId === this.userId)?.rank ?? 0)
        : 0;
    } catch {
      this.entries    = [];
      this.playerRank = 0;
    } finally {
      this.loading = false;
      if (this._visible) this.rebuild();
    }
  }

  private clearDyn(): void {
    this.dynObjects.forEach(o => o.destroy());
    this.dynObjects = [];
    this.container.removeAll(false);
  }

  private addText(
    x: number, y: number, text: string,
    color = '#cccccc', size = '5px',
    maxWidth?: number,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size,
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 1,
      wordWrap: maxWidth ? { width: maxWidth } : undefined,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(t);
    this.container.add(t);
    return t;
  }

  private addRect(
    x: number, y: number, w: number, h: number,
    fillColor: number, fillAlpha = 1,
    strokeColor?: number,
  ): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(x, y, w, h, fillColor, fillAlpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    if (strokeColor !== undefined) r.setStrokeStyle(1, strokeColor, 0.8);
    this.dynObjects.push(r);
    this.container.add(r);
    return r;
  }

  private rebuild(): void {
    this.clearDyn();

    // Background
    this.addRect(0, 0, PANEL_W, PANEL_H, 0x000000, 0.88, 0x334466);

    // Header
    this.addText(PAD, PAD, '🏆 Leaderboard', '#ffd700', '6px');
    this.addText(PANEL_W - PAD - 16, PAD, '[L/Esc]', '#445566', '4px');

    // Player rank hint
    if (this.playerRank > 0) {
      this.addText(PAD, 13, `Your rank: #${this.playerRank}`, '#88ddff', '4px');
    } else if (!this.loading && this.userId && this.entries.length > 0) {
      this.addText(PAD, 13, 'Not ranked yet', '#556677', '4px');
    }

    // ── Category tabs ──────────────────────────────────────────────────────
    const catTabY = 21;
    const catTabW = Math.floor((PANEL_W - PAD * 2) / CATEGORIES.length);
    CATEGORIES.forEach((cat, i) => {
      const tx     = PAD + i * catTabW;
      const active = cat === this.activeCategory;
      const bg = this.scene.add.rectangle(tx, catTabY, catTabW - 1, 10, active ? 0x334488 : 0x111122, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      if (active) bg.setStrokeStyle(1, 0x6688cc, 1);
      this.dynObjects.push(bg);
      this.container.add(bg);

      const label = `${CATEGORY_ICONS[cat]}${CATEGORY_LABELS[cat].slice(0, 4)}`;
      const col   = active ? '#ffdd88' : '#667788';
      const t = this.addText(tx + 2, catTabY + 1, label, col, '4px');

      const onClick = () => {
        if (this.activeCategory !== cat) {
          this.activeCategory = cat;
          this.fetchAndRebuild();
        }
      };
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
      t.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    });

    // ── Period tabs ────────────────────────────────────────────────────────
    const perTabY = catTabY + 12;
    const perTabW = Math.floor((PANEL_W - PAD * 2) / PERIODS.length);
    PERIODS.forEach((period, i) => {
      const tx     = PAD + i * perTabW;
      const active = period === this.activePeriod;
      const bg = this.scene.add.rectangle(tx, perTabY, perTabW - 1, 9, active ? 0x223344 : 0x0d0d18, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      if (active) bg.setStrokeStyle(1, 0x445588, 1);
      this.dynObjects.push(bg);
      this.container.add(bg);

      const col = active ? '#aaccff' : '#445566';
      const t   = this.addText(tx + 2, perTabY + 1, PERIOD_LABELS[period], col, '4px');

      const onClick = () => {
        if (this.activePeriod !== period) {
          this.activePeriod = period;
          this.fetchAndRebuild();
        }
      };
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
      t.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    });

    // ── Entry list ────────────────────────────────────────────────────────
    const listY      = perTabY + 11;
    const listHeight = PANEL_H - listY - PAD;
    const itemH      = 12;

    if (this.loading) {
      this.addText(PAD, listY + 10, 'Loading...', '#556677', '5px');
      return;
    }

    if (this.entries.length === 0) {
      this.addText(PAD, listY + 10, 'No data yet. Start playing!', '#556677', '4px');
      return;
    }

    // Column header
    this.addText(PAD,            listY, '#',       '#445566', '4px');
    this.addText(PAD + 14,       listY, 'Player',  '#445566', '4px');
    this.addText(PANEL_W - PAD - 22, listY, 'Score', '#445566', '4px');

    const entryY  = listY + 8;
    const visible = this.entries.filter((_e) => {
      const y = entryY + (_e.rank - 1) * itemH - this.scrollOffset;
      return y + itemH > entryY && y < entryY + listHeight;
    });

    // Clipping mask
    const maskGfx = this.scene.add.graphics()
      .fillStyle(0xffffff)
      .fillRect(PANEL_X + PAD, PANEL_Y + entryY, PANEL_W - PAD * 2, listHeight);
    const mask = maskGfx.createGeometryMask();
    this.dynObjects.push(maskGfx);

    visible.forEach((entry) => {
      const idx  = entry.rank - 1;
      const rowY = entryY + idx * itemH - this.scrollOffset;
      const isMe = this.userId && entry.playerId === this.userId;

      const rowBg = this.scene.add.rectangle(PAD, rowY, PANEL_W - PAD * 2, itemH - 1,
        isMe ? 0x1a2a44 : (idx % 2 === 0 ? 0x0d1220 : 0x080e18), 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      if (isMe) rowBg.setStrokeStyle(1, 0x4488cc, 0.8);
      rowBg.setMask(mask);
      this.dynObjects.push(rowBg);
      this.container.add(rowBg);

      // Rank medal for top 3
      const rankColor = entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#445566';
      const rankT = this.addText(PAD + 1, rowY + 1, `${entry.rank}`, rankColor, '4px');
      rankT.setMask(mask);

      const nameColor = isMe ? '#88ddff' : '#aaaacc';
      const nameT     = this.addText(PAD + 14, rowY + 1, entry.username.slice(0, 14), nameColor, '4px');
      nameT.setMask(mask);

      const scoreT = this.addText(PANEL_W - PAD - 22, rowY + 1,
        formatScore(entry.score), isMe ? '#88eeff' : '#ccccaa', '4px');
      scoreT.setMask(mask);
    });

    // Scroll arrows
    const totalH = this.entries.length * itemH;
    if (totalH > listHeight) {
      if (this.scrollOffset > 0) {
        this.addText(PANEL_W - PAD - 6, listY + 3, '▲', '#556677', '5px');
      }
      if (this.scrollOffset < totalH - listHeight) {
        this.addText(PANEL_W - PAD - 6, PANEL_H - PAD - 5, '▼', '#556677', '5px');
      }
      this.scene.input.off('wheel', this.onWheel, this);
      this.scene.input.on('wheel', this.onWheel, this);
    }
  }

  private onWheel = (_ptr: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number): void => {
    if (!this._visible) return;
    const itemH      = 12;
    const listY      = 21 + 10 + 12 + 11 + 8; // catTabY + catH + perTabY + perH + entryY offset
    const listHeight = PANEL_H - listY - PAD;
    const totalH     = this.entries.length * itemH;
    const maxScroll  = Math.max(0, totalH - listHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + (dy > 0 ? itemH : -itemH)));
    this.rebuild();
  };
}

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
  if (score >= 1_000)     return `${(score / 1_000).toFixed(1)}k`;
  return String(score);
}

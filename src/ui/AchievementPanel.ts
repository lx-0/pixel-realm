/**
 * AchievementPanel — displays all achievements with progress bars, unlock state,
 * and total achievement points.
 *
 * Press H to toggle. Escape to close.
 *
 * Data source:
 *   - Multiplayer/auth mode: fetches from GET /achievements/:userId
 *   - Solo mode (no userId): reads from AchievementTracker static data
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { AchievementTracker } from '../systems/AchievementTracker';

const PANEL_W = 210;
const PANEL_H = 160;
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

export type AchievementCategory = 'combat' | 'exploration' | 'crafting' | 'social' | 'questing';

export interface AchievementData {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  goal: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

const CATEGORY_COLORS: Record<AchievementCategory, string> = {
  combat:      '#ff6666',
  exploration: '#88ddff',
  crafting:    '#ffdd88',
  social:      '#aaffaa',
  questing:    '#cc99ff',
};

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  combat:      'Combat',
  exploration: 'Explore',
  crafting:    'Crafting',
  social:      'Social',
  questing:    'Questing',
};

const CATEGORIES: AchievementCategory[] = ['combat', 'exploration', 'crafting', 'social', 'questing'];

export class AchievementPanel {
  private scene:     Phaser.Scene;
  private _visible   = false;
  private hKey!:     Phaser.Input.Keyboard.Key;
  private container: Phaser.GameObjects.Container;
  private dynObjects: Phaser.GameObjects.GameObject[] = [];

  userId?: string;

  private achievements: AchievementData[] = [];
  private totalPoints  = 0;
  private activeCategory: AchievementCategory = 'combat';
  private scrollOffset = 0;

  constructor(scene: Phaser.Scene) {
    this.scene     = scene;
    this.container = scene.add.container(PANEL_X, PANEL_Y)
      .setDepth(DEPTH)
      .setScrollFactor(0);
    this.container.setVisible(false);
    this.hKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.hKey)) {
      this._visible ? this.hide() : this.show();
    }
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.hide();
    return true;
  }

  show(): void {
    this._visible = true;
    this.container.setVisible(true);
    this.refresh().catch(() => {/* non-fatal */});
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
  }

  destroy(): void {
    this.clearDyn();
    this.container.destroy();
  }

  /** Refresh from server (multiplayer) or from local tracker (solo). */
  async refresh(): Promise<void> {
    if (this.userId) {
      try {
        const res = await fetch(`${SERVER_HTTP}/achievements/${this.userId}`);
        if (res.ok) {
          const data = await res.json() as { achievements: AchievementData[]; points: number };
          this.achievements = data.achievements;
          this.totalPoints  = data.points;
        }
      } catch {
        // Fallback to local on network error
        this.loadLocal();
      }
    } else {
      this.loadLocal();
    }
    this.scrollOffset = 0;
    if (this._visible) this.rebuild();
  }

  /** Update a single achievement from an unlock event (avoids a full re-fetch). */
  notifyUnlock(achievement: AchievementData): void {
    const idx = this.achievements.findIndex(a => a.id === achievement.id);
    if (idx >= 0) {
      this.achievements[idx] = achievement;
    } else {
      this.achievements.push(achievement);
    }
    this.totalPoints = this.achievements
      .filter(a => a.unlocked)
      .reduce((s, a) => s + a.points, 0);
    if (this._visible) this.rebuild();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private loadLocal(): void {
    const local = AchievementTracker.getAll();
    this.achievements = local;
    this.totalPoints  = local.filter(a => a.unlocked).reduce((s, a) => s + a.points, 0);
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
    const pointsStr = `${this.totalPoints} pts`;
    this.addText(PAD, PAD, '🏆 Achievements', '#ffd700', '6px');
    this.addText(PANEL_W - PAD - 30, PAD, pointsStr, '#ffdd88', '5px');
    this.addText(PANEL_W - PAD - 14, PAD, '[H/Esc]', '#445566', '4px');

    // Category tabs
    const tabY = 14;
    const tabW = Math.floor((PANEL_W - PAD * 2) / CATEGORIES.length);
    CATEGORIES.forEach((cat, i) => {
      const tx = PAD + i * tabW;
      const isActive = cat === this.activeCategory;
      const bg = this.scene.add.rectangle(tx, tabY, tabW - 1, 9, isActive ? 0x334488 : 0x111122, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      if (isActive) bg.setStrokeStyle(1, 0x6688cc, 1);
      this.dynObjects.push(bg);
      this.container.add(bg);

      const label = CATEGORY_LABELS[cat].slice(0, 5);
      const color = isActive ? CATEGORY_COLORS[cat] : '#666688';
      const t = this.addText(tx + 2, tabY + 1, label, color, '4px');

      // Make tab interactive
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.activeCategory = cat;
        this.scrollOffset   = 0;
        this.rebuild();
      });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.activeCategory = cat;
        this.scrollOffset   = 0;
        this.rebuild();
      });
    });

    // Achievement list for active category
    const listY      = tabY + 11;
    const listHeight = PANEL_H - listY - PAD;
    const itemH      = 22;

    const filtered = this.achievements.filter(a => a.category === this.activeCategory);

    // Clipping mask for scroll area
    const maskRect = this.scene.add.graphics()
      .fillStyle(0xffffff)
      .fillRect(PANEL_X + PAD, PANEL_Y + listY, PANEL_W - PAD * 2, listHeight);
    const mask = maskRect.createGeometryMask();
    this.dynObjects.push(maskRect);

    filtered.forEach((ach, idx) => {
      const baseY = listY + idx * itemH - this.scrollOffset;
      if (baseY + itemH < listY || baseY > listY + listHeight) return;

      const rowBg = this.scene.add.rectangle(PAD, baseY, PANEL_W - PAD * 2, itemH - 2,
        ach.unlocked ? 0x223322 : 0x111120, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
      if (ach.unlocked) rowBg.setStrokeStyle(1, 0x336633, 0.6);
      rowBg.setMask(mask);
      this.dynObjects.push(rowBg);
      this.container.add(rowBg);

      // Icon + title
      const iconColor = ach.unlocked ? CATEGORY_COLORS[ach.category] : '#444455';
      const titleColor = ach.unlocked ? '#ffffff' : '#888899';
      const iText = this.addText(PAD + 2, baseY + 1, ach.icon, iconColor, '6px');
      iText.setMask(mask);
      const tText = this.addText(PAD + 12, baseY + 1, ach.title, titleColor, '5px');
      tText.setMask(mask);

      // Points badge
      const ptColor = ach.unlocked ? '#ffdd88' : '#555566';
      const ptText = this.addText(PANEL_W - PAD - 14, baseY + 1, `+${ach.points}`, ptColor, '4px');
      ptText.setMask(mask);

      // Description
      const descColor = ach.unlocked ? '#aaaaaa' : '#555566';
      const dText = this.addText(PAD + 12, baseY + 8, ach.description, descColor, '4px', PANEL_W - PAD * 2 - 25);
      dText.setMask(mask);

      // Progress bar
      const barX = PAD + 12;
      const barY = baseY + 16;
      const barW = PANEL_W - PAD * 2 - 25;
      const barH = 3;
      const pct  = Math.min(1, ach.goal > 0 ? ach.progress / ach.goal : 0);

      const barBg = this.scene.add.rectangle(barX, barY, barW, barH, 0x222233, 1)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
      barBg.setMask(mask);
      this.dynObjects.push(barBg);
      this.container.add(barBg);

      if (pct > 0) {
        const barFill = this.scene.add.rectangle(barX, barY, Math.max(1, Math.floor(barW * pct)), barH,
          ach.unlocked ? 0x44cc44 : 0x4488cc, 1)
          .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2);
        barFill.setMask(mask);
        this.dynObjects.push(barFill);
        this.container.add(barFill);
      }

      // Progress text
      const progStr = ach.unlocked ? '✓' : `${ach.progress}/${ach.goal}`;
      const pText = this.addText(PANEL_W - PAD - 14, baseY + 14, progStr,
        ach.unlocked ? '#44cc44' : '#555577', '4px');
      pText.setMask(mask);
    });

    // Scroll hint if list overflows
    const totalHeight = filtered.length * itemH;
    if (totalHeight > listHeight) {
      const canScrollDown = this.scrollOffset < totalHeight - listHeight;
      const canScrollUp   = this.scrollOffset > 0;
      if (canScrollDown) this.addText(PANEL_W - PAD - 6, PANEL_H - PAD - 5, '▼', '#555577', '5px');
      if (canScrollUp)   this.addText(PANEL_W - PAD - 6, listY, '▲', '#555577', '5px');

      // Mouse wheel scroll
      this.scene.input.off('wheel', this.onWheel, this);
      this.scene.input.on('wheel', this.onWheel, this);
    }

    // Empty state
    if (filtered.length === 0) {
      this.addText(PAD, listY + 10, 'No achievements in this category.', '#555577', '4px');
    }
  }

  private onWheel = (_ptr: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number): void => {
    if (!this._visible) return;
    const filtered  = this.achievements.filter(a => a.category === this.activeCategory);
    const tabY      = 14;
    const listY     = tabY + 11;
    const listHeight = PANEL_H - listY - PAD;
    const totalH    = filtered.length * 22;
    const maxScroll = Math.max(0, totalH - listHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + (dy > 0 ? 22 : -22)));
    this.rebuild();
  };
}

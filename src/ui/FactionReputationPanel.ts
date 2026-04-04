/**
 * FactionReputationPanel — shows current standings with all factions.
 *
 * Press R to toggle. Escape to close.
 * Accessible from the character menu (R key).
 *
 * Styled consistently with QuestLogPanel and other UI panels.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { FactionRepEntry, FactionDailyTask } from '../systems/MultiplayerClient';

const PANEL_W  = 220;
const PANEL_H  = 160;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 70;
const PAD      = 5;

/** Standing → display label and colour. */
const STANDING_META: Record<string, { label: string; color: string; barColor: number }> = {
  hostile:    { label: 'Hostile',    color: '#ff4444', barColor: 0xcc2222 },
  unfriendly: { label: 'Unfriendly', color: '#ff8844', barColor: 0xcc5522 },
  neutral:    { label: 'Neutral',    color: '#aabbcc', barColor: 0x445566 },
  friendly:   { label: 'Friendly',   color: '#88ee88', barColor: 0x336633 },
  honored:    { label: 'Honored',    color: '#44ddff', barColor: 0x226688 },
  exalted:    { label: 'Exalted',    color: '#ffd700', barColor: 0x886600 },
};

/** Faction display order + colour swatches. */
const FACTION_META: Record<string, { displayName: string; swatchColor: number }> = {
  nature_wardens:  { displayName: 'Nature Wardens',  swatchColor: 0x44cc66 },
  merchants_guild: { displayName: 'Merchants Guild', swatchColor: 0xffcc44 },
  mages_circle:    { displayName: 'Mages Circle',    swatchColor: 0x8844ff },
  shadow_clan:     { displayName: 'Shadow Clan',     swatchColor: 0x884488 },
};

const FACTION_ORDER = ['nature_wardens', 'merchants_guild', 'mages_circle', 'shadow_clan'];

export class FactionReputationPanel {
  private scene:       Phaser.Scene;
  private visible      = false;
  private rKey!:       Phaser.Input.Keyboard.Key;
  private escKey!:     Phaser.Input.Keyboard.Key;
  private container:   Phaser.GameObjects.Container;
  private reputations: FactionRepEntry[] = [];
  private dailyTasks:  FactionDailyTask[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.rKey  = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.escKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.rebuild();
  }

  // ── Update (called from GameScene.update) ─────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.toggle();
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && this.visible) {
      this.hide();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setReputations(reps: FactionRepEntry[]): void {
    this.reputations = reps;
    if (this.visible) this.rebuild();
  }

  setDailyTasks(tasks: FactionDailyTask[]): void {
    this.dailyTasks = tasks;
    if (this.visible) this.rebuild();
  }

  updateEntry(factionId: string, reputation: number, standing: string): void {
    const idx = this.reputations.findIndex((r) => r.factionId === factionId);
    if (idx >= 0) {
      this.reputations[idx] = { factionId, reputation, standing: standing as FactionRepEntry['standing'] };
    } else {
      this.reputations.push({ factionId, reputation, standing: standing as FactionRepEntry['standing'] });
    }
    if (this.visible) this.rebuild();
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  // ── Show / Hide ───────────────────────────────────────────────────────────

  private toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  show(): void {
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0);

    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // Header
    const header = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + PAD,
      'Faction Standings',
      { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);

    // Divider
    const div = this.scene.add.graphics().setScrollFactor(0);
    div.lineStyle(1, 0x334466, 0.7);
    div.lineBetween(PANEL_X + 2, PANEL_Y + 15, PANEL_X + PANEL_W - 2, PANEL_Y + 15);

    this.container.add([bg, border, header, div]);

    // Reputation bar width constants
    const BAR_MAX_W = PANEL_W - PAD * 2 - 8;
    const BAR_H     = 4;
    const ROW_H     = 28;

    let y = PANEL_Y + 19;

    const repMap = new Map(this.reputations.map((r) => [r.factionId, r]));

    for (const factionId of FACTION_ORDER) {
      const entry   = repMap.get(factionId);
      const meta    = FACTION_META[factionId];
      if (!meta) continue;

      const rep      = entry?.reputation ?? 0;
      const standing = entry?.standing   ?? 'neutral';
      const sm       = STANDING_META[standing] ?? STANDING_META['neutral'];

      // Faction colour swatch
      const swatch = this.scene.add
        .rectangle(PANEL_X + PAD, y + 1, 6, 6, meta.swatchColor, 1)
        .setOrigin(0, 0).setScrollFactor(0);

      // Faction name
      const nameText = this.scene.add.text(
        PANEL_X + PAD + 9, y,
        meta.displayName,
        { fontSize: '4px', color: '#ccddff', fontFamily: 'monospace' },
      ).setScrollFactor(0);

      // Standing label (right-aligned)
      const standingText = this.scene.add.text(
        PANEL_X + PANEL_W - PAD, y,
        sm.label,
        { fontSize: '4px', color: sm.color, fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);

      // Rep bar background
      const barBg = this.scene.add
        .rectangle(PANEL_X + PAD, y + 10, BAR_MAX_W, BAR_H, 0x1a1a2e, 1)
        .setOrigin(0, 0).setScrollFactor(0);

      // Rep bar fill — rep is -100..+100, map to 0..BAR_MAX_W
      const fillFraction = (rep + 100) / 200; // 0.0 at -100, 0.5 at 0, 1.0 at +100
      const fillW = Math.max(1, Math.round(fillFraction * BAR_MAX_W));
      const barFill = this.scene.add
        .rectangle(PANEL_X + PAD, y + 10, fillW, BAR_H, sm.barColor, 1)
        .setOrigin(0, 0).setScrollFactor(0);

      // Neutral tick at centre of bar
      const tickX = PANEL_X + PAD + Math.round(BAR_MAX_W / 2);
      const tick = this.scene.add.graphics().setScrollFactor(0);
      tick.lineStyle(1, 0x556677, 0.8);
      tick.lineBetween(tickX, y + 9, tickX, y + 15);

      // Rep number
      const repLabel = this.scene.add.text(
        PANEL_X + PAD, y + 16,
        `${rep > 0 ? '+' : ''}${rep}`,
        { fontSize: '3px', color: '#667788', fontFamily: 'monospace' },
      ).setScrollFactor(0);

      // Vendor access indicator (shown at Friendly+)
      const hasVendor = standing === 'friendly' || standing === 'honored' || standing === 'exalted';
      const vendorIcon = this.scene.add.text(
        PANEL_X + PAD + 20, y + 16,
        hasVendor ? '[Vendor]' : '',
        { fontSize: '3px', color: '#ffcc44', fontFamily: 'monospace' },
      ).setScrollFactor(0);

      // Daily task status
      const dailyTask = this.dailyTasks.find((t) => t.factionId === factionId);
      const dailyText = dailyTask
        ? (dailyTask.completed ? '[Daily: Done]' : '[Daily: Available]')
        : '';
      const dailyColor = dailyTask?.completed ? '#446644' : '#88ee88';
      const dailyLabel = this.scene.add.text(
        PANEL_X + PANEL_W - PAD, y + 16,
        dailyText,
        { fontSize: '3px', color: dailyColor, fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);

      this.container.add([swatch, nameText, standingText, barBg, barFill, tick, repLabel, vendorIcon, dailyLabel]);

      y += ROW_H;
    }

    // Footer hint
    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 5,
      '[R/Esc]',
      { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(0);
    this.container.add(hint);

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.container.destroy(true);
  }
}

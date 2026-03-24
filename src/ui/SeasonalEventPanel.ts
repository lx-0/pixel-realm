/**
 * SeasonalEventPanel — seasonal event progress tracker UI.
 *
 * Shows:
 *   - Active event name + description + time remaining
 *   - Player's accumulated event points
 *   - Reward tiers with claimed/unclaimed state + "Claim" buttons
 *
 * Press G to toggle open/close (or open it programmatically from GameScene).
 * Layout (within 320×180 canvas, scroll-factor 0): 240×130 centred.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const PANEL_W  = 240;
const PANEL_H  = 130;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 80;
const PAD      = 8;
const LINE_H   = 9;
const HEADER_H = 14;

// ── Colours ───────────────────────────────────────────────────────────────────

const COL_BG      = 0x0d1a0d;
const COL_BORDER  = 0x44cc88;
const COL_HEADER  = 0x0a1a10;
const COL_GREEN   = '#44cc88';
const COL_WHITE   = '#ffffff';
const COL_GREY    = '#888888';
const COL_GOLD    = '#ffd700';
const COL_WARN    = '#ff8844';
const COL_AVAIL   = 0x226622;

// ── Reward tier shape ─────────────────────────────────────────────────────────

export interface RewardTier {
  points:  number;
  itemId:  string;
  label:   string;
  title?:  string;
}

// ── EventState ────────────────────────────────────────────────────────────────

export interface SeasonalEventState {
  id:          string;
  name:        string;
  description: string;
  endsAt:      string; // ISO timestamp
  rewardTiers: RewardTier[];
  points:         number;
  claimedRewards: string[];
}

export class SeasonalEventPanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible    = false;
  private gKey!:     Phaser.Input.Keyboard.Key;

  private state: SeasonalEventState | null = null;

  /** Called when player clicks Claim on a reward tier. */
  public onClaimReward?: (itemId: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.gKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this.visible; }

  /** Feed updated server state into the panel. */
  setEventState(state: SeasonalEventState): void {
    this.state = state;
    if (this.visible) this.rebuild();
  }

  /** Update just the points + claimed rewards (after events). */
  updateParticipation(points: number, claimedRewards: string[]): void {
    if (this.state) {
      this.state.points         = points;
      this.state.claimedRewards = claimedRewards;
      if (this.visible) this.rebuild();
    }
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.gKey)) this.toggle();
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  show(): void {
    if (!this.state) return;
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  private toggle(): void { this.visible ? this.hide() : this.show(); }

  // ── Build ───────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);
    if (!this.state) return;

    const s = this.state;

    // Panel bg
    const bg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, PANEL_W, PANEL_H, COL_BG, 0.97,
    ).setStrokeStyle(2, COL_BORDER);
    this.container.add(bg);

    // Header
    const headerBg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2, PANEL_W, HEADER_H, COL_HEADER,
    );
    this.container.add(headerBg);

    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2,
      `\u2665 ${s.name} \u2665`,
      { fontSize: '6px', color: COL_GREEN, fontFamily: 'monospace' },
    ).setOrigin(0.5));

    // Time remaining
    const endsAt     = new Date(s.endsAt).getTime();
    const msLeft     = Math.max(0, endsAt - Date.now());
    const daysLeft   = Math.floor(msLeft / 86_400_000);
    const hoursLeft  = Math.floor((msLeft % 86_400_000) / 3_600_000);
    const timeLabel  = daysLeft > 0
      ? `Ends in ${daysLeft}d ${hoursLeft}h`
      : hoursLeft > 0
        ? `Ends in ${hoursLeft}h`
        : 'Ends soon!';

    let y = PANEL_Y + HEADER_H + PAD;

    this.container.add(this.scene.add.text(
      PANEL_X + PAD, y, s.description.slice(0, 80),
      { fontSize: '4px', color: COL_WHITE, fontFamily: 'monospace', wordWrap: { width: PANEL_W - PAD * 2 } },
    ).setOrigin(0, 0));
    y += LINE_H + 2;

    this.container.add(this.scene.add.text(
      PANEL_X + PAD, y, timeLabel,
      { fontSize: '4px', color: COL_WARN, fontFamily: 'monospace' },
    ).setOrigin(0, 0));

    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W - PAD, y, `Points: ${s.points}`,
      { fontSize: '4px', color: COL_GOLD, fontFamily: 'monospace' },
    ).setOrigin(1, 0));
    y += LINE_H + 2;

    // Reward tiers
    this.container.add(this.scene.add.text(
      PANEL_X + PAD, y, 'Rewards:',
      { fontSize: '4px', color: COL_GREY, fontFamily: 'monospace' },
    ).setOrigin(0, 0));
    y += LINE_H;

    const maxVisible = 4;
    for (let i = 0; i < Math.min(s.rewardTiers.length, maxVisible); i++) {
      const tier    = s.rewardTiers[i];
      const claimed = s.claimedRewards.includes(tier.itemId);
      const canClaim = !claimed && s.points >= tier.points;

      const tierColor = claimed ? COL_GREY : (canClaim ? COL_GOLD : COL_WHITE);

      const checkMark = claimed ? '✓' : (canClaim ? '!' : '·');
      this.container.add(this.scene.add.text(
        PANEL_X + PAD, y,
        `${checkMark} ${tier.label} (${tier.points} pts)`,
        { fontSize: '4px', color: tierColor, fontFamily: 'monospace' },
      ).setOrigin(0, 0));

      if (canClaim) {
        const BTN_W = 32; const BTN_H = 8;
        const btnX  = PANEL_X + PANEL_W - PAD - BTN_W / 2;
        const claimBg = this.scene.add.rectangle(btnX, y + BTN_H / 2 - 1, BTN_W, BTN_H, COL_AVAIL)
          .setStrokeStyle(1, 0x44aa66).setInteractive({ useHandCursor: true });
        const claimTxt = this.scene.add.text(btnX, y + BTN_H / 2 - 1, 'Claim', {
          fontSize: '4px', color: '#ffffff', fontFamily: 'monospace',
        }).setOrigin(0.5);
        claimBg.on('pointerdown', () => this.onClaimReward?.(tier.itemId));
        claimBg.on('pointerover',  () => claimBg.setFillStyle(0x338833));
        claimBg.on('pointerout',   () => claimBg.setFillStyle(COL_AVAIL));
        this.container.add(claimBg);
        this.container.add(claimTxt);
      } else if (claimed) {
        const claimedTxt = this.scene.add.text(
          PANEL_X + PANEL_W - PAD, y, 'Claimed',
          { fontSize: '4px', color: COL_GREY, fontFamily: 'monospace' },
        ).setOrigin(1, 0);
        this.container.add(claimedTxt);
      } else {
        const lockTxt = this.scene.add.text(
          PANEL_X + PANEL_W - PAD, y, `${tier.points - s.points} pts needed`,
          { fontSize: '4px', color: COL_GREY, fontFamily: 'monospace' },
        ).setOrigin(1, 0);
        this.container.add(lockTxt);
      }

      y += LINE_H;
    }

    // Footer hint
    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 4,
      '[G] close',
      { fontSize: '4px', color: COL_GREY, fontFamily: 'monospace' },
    ).setOrigin(0.5, 1));
  }
}

/**
 * PrestigePanel — New Game+ prestige confirmation dialog.
 *
 * Shown when the player reaches level 50 and presses the Prestige button.
 * Displays current prestige tier, the bonus they'll gain, and a confirm/cancel flow.
 *
 * Layout (within 320×180 canvas, scroll-factor 0):
 *   - Panel bg: 180×90 centred
 *   - Header: "✦ PRESTIGE RESET ✦"
 *   - Body: current tier, next bonus preview, warning
 *   - Footer: [Confirm] and [Cancel] buttons
 */

import Phaser from 'phaser';
import { CANVAS, PRESTIGE } from '../config/constants';

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_W = 180;
const PANEL_H = 90;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 90;

// ── Colour palette ────────────────────────────────────────────────────────────

const COL_BG       = 0x0d0d1a;
const COL_BORDER   = 0xffd700;
const COL_HEADER   = 0x1a1400;
const COL_GOLD     = '#ffd700';
const COL_WHITE    = '#ffffff';
const COL_WARN     = '#ff8844';
const COL_CONFIRM  = 0x226622;
const COL_CANCEL   = 0x662222;
const COL_BTN_TEXT = '#ffffff';

export class PrestigePanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible    = false;

  private prestigeLevel = 0;
  private maxPrestige: number = PRESTIGE.MAX_PRESTIGE;

  // Callbacks
  public onConfirm?: () => void;
  public onCancel?:  () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this.visible; }

  /** Show the panel for the given prestige state. */
  show(prestigeLevel: number, maxPrestige: number): void {
    this.prestigeLevel = prestigeLevel;
    this.maxPrestige   = maxPrestige;
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  // ── Build ───────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    const nextTier        = this.prestigeLevel + 1;
    const nextMultiplier  = nextTier * PRESTIGE.BONUS_PER_LEVEL * 100; // as %
    const borderColor     = PRESTIGE.BORDER_COLORS[this.prestigeLevel] ?? COL_BORDER;
    const tierColorHex    = `#${borderColor.toString(16).padStart(6, '0')}`;

    // ── Panel background ─────────────────────────────────────────────────────
    const bg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, PANEL_W, PANEL_H, COL_BG, 0.97,
    ).setStrokeStyle(2, borderColor);
    this.container.add(bg);

    // ── Header ───────────────────────────────────────────────────────────────
    const HEADER_H = 14;
    const headerBg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2, PANEL_W, HEADER_H, COL_HEADER,
    );
    this.container.add(headerBg);

    const title = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2,
      '\u2736 PRESTIGE RESET \u2736',
      { fontSize: '6px', color: COL_GOLD, fontFamily: 'monospace' },
    ).setOrigin(0.5);
    this.container.add(title);

    // ── Body ─────────────────────────────────────────────────────────────────
    const PAD  = 8;
    const lineH = 9;
    let  textY  = PANEL_Y + HEADER_H + PAD;

    const tierLabel = this.scene.add.text(
      PANEL_X + PANEL_W / 2, textY,
      `Current Tier: P${this.prestigeLevel}  →  P${nextTier}`,
      { fontSize: '5px', color: tierColorHex, fontFamily: 'monospace' },
    ).setOrigin(0.5, 0);
    this.container.add(tierLabel);
    textY += lineH;

    const bonusLabel = this.scene.add.text(
      PANEL_X + PANEL_W / 2, textY,
      `New bonus: +${nextMultiplier.toFixed(0)}% to HP, Damage & Speed`,
      { fontSize: '5px', color: COL_WHITE, fontFamily: 'monospace' },
    ).setOrigin(0.5, 0);
    this.container.add(bonusLabel);
    textY += lineH;

    const warnLabel = this.scene.add.text(
      PANEL_X + PANEL_W / 2, textY,
      'Resets level, XP and skill points to 1.',
      { fontSize: '4px', color: COL_WARN, fontFamily: 'monospace' },
    ).setOrigin(0.5, 0);
    this.container.add(warnLabel);
    textY += lineH;

    if (nextTier >= this.maxPrestige) {
      const capLabel = this.scene.add.text(
        PANEL_X + PANEL_W / 2, textY,
        '(This is the final prestige tier.)',
        { fontSize: '4px', color: COL_GOLD, fontFamily: 'monospace' },
      ).setOrigin(0.5, 0);
      this.container.add(capLabel);
      textY += lineH;
    }

    // ── Buttons ──────────────────────────────────────────────────────────────
    const BTN_W  = 60;
    const BTN_H  = 11;
    const BTN_Y  = PANEL_Y + PANEL_H - BTN_H - 6;
    const GAP    = 8;
    const midX   = PANEL_X + PANEL_W / 2;

    // Confirm button
    const confirmBg = this.scene.add.rectangle(
      midX - GAP / 2 - BTN_W / 2, BTN_Y, BTN_W, BTN_H, COL_CONFIRM,
    ).setStrokeStyle(1, 0x44aa44).setInteractive({ useHandCursor: true });
    const confirmText = this.scene.add.text(
      midX - GAP / 2 - BTN_W / 2, BTN_Y,
      'Confirm',
      { fontSize: '5px', color: COL_BTN_TEXT, fontFamily: 'monospace' },
    ).setOrigin(0.5);
    confirmBg.on('pointerdown', () => {
      this.hide();
      this.onConfirm?.();
    });
    confirmBg.on('pointerover',  () => confirmBg.setFillStyle(0x338833));
    confirmBg.on('pointerout',   () => confirmBg.setFillStyle(COL_CONFIRM));
    this.container.add(confirmBg);
    this.container.add(confirmText);

    // Cancel button
    const cancelBg = this.scene.add.rectangle(
      midX + GAP / 2 + BTN_W / 2, BTN_Y, BTN_W, BTN_H, COL_CANCEL,
    ).setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true });
    const cancelText = this.scene.add.text(
      midX + GAP / 2 + BTN_W / 2, BTN_Y,
      'Cancel',
      { fontSize: '5px', color: COL_BTN_TEXT, fontFamily: 'monospace' },
    ).setOrigin(0.5);
    cancelBg.on('pointerdown', () => {
      this.hide();
      this.onCancel?.();
    });
    cancelBg.on('pointerover',  () => cancelBg.setFillStyle(0x883333));
    cancelBg.on('pointerout',   () => cancelBg.setFillStyle(COL_CANCEL));
    this.container.add(cancelBg);
    this.container.add(cancelText);
  }
}

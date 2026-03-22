/**
 * NpcDialogueOverlay — pixel-art speech-bubble panel for NPC quest dialogue.
 *
 * Triggered by player interacting with an NPC (E key in multiplayer).
 * Shows:
 *   • NPC name banner
 *   • LLM-generated greeting / dialogue text
 *   • [Accept] and [Decline] response buttons
 *
 * Styled consistently with ChatOverlay and PlayerListPanel.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { ClientQuest } from '../systems/MultiplayerClient';

const PANEL_W = 240;
const PANEL_H = 68;
const PANEL_X = (CANVAS.WIDTH - PANEL_W) / 2;
const PANEL_Y = CANVAS.HEIGHT - PANEL_H - 8;
const DEPTH   = 75;
const PAD     = 5;

export class NpcDialogueOverlay {
  private scene:    Phaser.Scene;
  private visible   = false;
  private container: Phaser.GameObjects.Container;

  private currentQuest: ClientQuest | null = null;

  /** Called when player accepts the quest. */
  onAccept?: (quest: ClientQuest) => void;

  /** Called when player declines. */
  onDecline?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  show(quest: ClientQuest): void {
    this.currentQuest = quest;
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.currentQuest = null;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    const q = this.currentQuest;
    const npcName = q ? `Quest Giver` : 'NPC';
    const dialogueLine = q
      ? q.dialogue.greeting
      : 'Well met, adventurer.';

    // ── Background ──────────────────────────────────────────────────────────

    const bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0);

    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // Accent line below header
    border.lineStyle(1, 0x4466aa, 0.6);
    border.lineBetween(PANEL_X + 2, PANEL_Y + 14, PANEL_X + PANEL_W - 2, PANEL_Y + 14);

    // ── NPC name ────────────────────────────────────────────────────────────

    const nameBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, 70, 14, 0x1a2a44, 1)
      .setOrigin(0, 0).setScrollFactor(0);

    const nameTxt = this.scene.add.text(PANEL_X + PAD, PANEL_Y + 4, npcName, {
      fontSize: '5px', color: '#aaddff', fontFamily: 'monospace',
    }).setScrollFactor(0);

    // ── Quest title ─────────────────────────────────────────────────────────

    const questTitle = q ? q.title : '';
    const titleTxt = this.scene.add.text(PANEL_X + 74, PANEL_Y + 4, questTitle, {
      fontSize: '4px', color: '#ffd700', fontFamily: 'monospace',
      wordWrap: { width: PANEL_W - 78 },
    }).setScrollFactor(0);

    // ── Dialogue text ───────────────────────────────────────────────────────

    const maxLineWidth = PANEL_W - PAD * 2;
    const truncated = dialogueLine.length > 120
      ? dialogueLine.slice(0, 117) + '...'
      : dialogueLine;

    const dialogueTxt = this.scene.add.text(PANEL_X + PAD, PANEL_Y + 18, `"${truncated}"`, {
      fontSize: '4px', color: '#ddeeff', fontFamily: 'monospace',
      wordWrap: { width: maxLineWidth, useAdvancedWrap: false },
    }).setScrollFactor(0);

    // ── Buttons ─────────────────────────────────────────────────────────────

    const btnY = PANEL_Y + PANEL_H - 16;

    // Accept button
    const acceptBg = this.scene.add
      .rectangle(PANEL_X + PAD, btnY, 55, 12, 0x224422, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const acceptBorder = this.scene.add.graphics().setScrollFactor(0);
    acceptBorder.lineStyle(1, 0x44aa44, 0.8);
    acceptBorder.strokeRect(PANEL_X + PAD, btnY, 55, 12);
    const acceptTxt = this.scene.add.text(
      PANEL_X + PAD + 27, btnY + 6,
      '[E] Accept',
      { fontSize: '4px', color: '#88ee88', fontFamily: 'monospace' },
    ).setOrigin(0.5).setScrollFactor(0);

    acceptBg.on('pointerover',  () => acceptBg.setFillStyle(0x336633, 0.9));
    acceptBg.on('pointerout',   () => acceptBg.setFillStyle(0x224422, 0.9));
    acceptBg.on('pointerdown',  () => this.accept());

    // Decline button
    const declineBg = this.scene.add
      .rectangle(PANEL_X + PAD + 62, btnY, 55, 12, 0x442222, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const declineBorder = this.scene.add.graphics().setScrollFactor(0);
    declineBorder.lineStyle(1, 0xaa4444, 0.8);
    declineBorder.strokeRect(PANEL_X + PAD + 62, btnY, 55, 12);
    const declineTxt = this.scene.add.text(
      PANEL_X + PAD + 89, btnY + 6,
      '[Esc] Decline',
      { fontSize: '4px', color: '#ee8888', fontFamily: 'monospace' },
    ).setOrigin(0.5).setScrollFactor(0);

    declineBg.on('pointerover',  () => declineBg.setFillStyle(0x663333, 0.9));
    declineBg.on('pointerout',   () => declineBg.setFillStyle(0x442222, 0.9));
    declineBg.on('pointerdown',  () => this.decline());

    // Hint about E key
    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 6,
      '[Tab] players',
      { fontSize: '3px', color: '#334455', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(0);

    this.container.add([
      bg, border, nameBg, nameTxt, titleTxt,
      dialogueTxt,
      acceptBg, acceptBorder, acceptTxt,
      declineBg, declineBorder, declineTxt,
      hint,
    ]);

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Player accepted the quest. */
  accept(): void {
    if (this.currentQuest) {
      this.onAccept?.(this.currentQuest);
    }
    this.hide();
  }

  /** Player declined. */
  decline(): void {
    this.onDecline?.();
    this.hide();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.container.destroy(true);
  }
}

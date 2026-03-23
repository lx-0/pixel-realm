/**
 * NpcDialogueOverlay — pixel-art speech-bubble panel for NPC quest dialogue.
 *
 * Triggered by player interacting with an NPC (E key in multiplayer).
 *
 * When the quest includes branching choices, the overlay shows a two-phase flow:
 *   Phase 1 — Greeting: NPC opening line + 2-3 player response choice buttons.
 *   Phase 2 — Response: NPC's follow-up based on the choice, then resolves outcome.
 *
 * When no choices are present (legacy / fallback), falls back to the original
 * [Accept] / [Decline] layout.
 *
 * Styled consistently with ChatOverlay and PlayerListPanel.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { ClientQuest, ClientDialogueChoice } from '../systems/MultiplayerClient';

const PANEL_W   = 240;
const BASE_H    = 68;   // height without choices
const CHOICE_H  = 96;   // height when 3 choices are shown
const PANEL_X   = (CANVAS.WIDTH - PANEL_W) / 2;
const DEPTH     = 75;
const PAD       = 5;

/** How long (ms) the NPC response is shown before auto-resolving the outcome. */
const RESPONSE_DISPLAY_MS = 2200;

export class NpcDialogueOverlay {
  private scene:     Phaser.Scene;
  private visible    = false;
  private container: Phaser.GameObjects.Container;

  private currentQuest: ClientQuest | null = null;
  /** Timer used to auto-resolve after showing the NPC response. */
  private responseTimer: Phaser.Time.TimerEvent | null = null;

  /** Called when player accepts the quest (after choice or direct accept). */
  onAccept?: (quest: ClientQuest) => void;

  /** Called when player declines. */
  onDecline?: () => void;

  /**
   * Called when a dialogue choice is selected.
   * Provides the choice so the caller can send it to the server for rep delta.
   */
  onChoiceSelected?: (quest: ClientQuest, choice: ClientDialogueChoice) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  show(quest: ClientQuest): void {
    this.cancelResponseTimer();
    this.currentQuest = quest;
    this.visible = true;
    this.rebuildGreeting();
    this.container.setVisible(true);
  }

  hide(): void {
    this.cancelResponseTimer();
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

  // ── Greeting phase ────────────────────────────────────────────────────────

  private rebuildGreeting(): void {
    this.container.removeAll(true);

    const q = this.currentQuest;
    const choices = q?.dialogue.choices;
    const hasChoices = choices && choices.length >= 2;
    const panelH = hasChoices ? CHOICE_H : BASE_H;
    const panelY = CANVAS.HEIGHT - panelH - 8;

    const dialogueLine = q ? q.dialogue.greeting : 'Well met, adventurer.';
    const npcName = 'Quest Giver';
    const questTitle = q ? q.title : '';

    // ── Background ──────────────────────────────────────────────────────────

    const bg = this.scene.add
      .rectangle(PANEL_X, panelY, PANEL_W, panelH, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0);

    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, panelY, PANEL_W, panelH);
    border.lineStyle(1, 0x4466aa, 0.6);
    border.lineBetween(PANEL_X + 2, panelY + 14, PANEL_X + PANEL_W - 2, panelY + 14);

    // ── NPC name ────────────────────────────────────────────────────────────

    const nameBg = this.scene.add
      .rectangle(PANEL_X, panelY, 70, 14, 0x1a2a44, 1)
      .setOrigin(0, 0).setScrollFactor(0);

    const nameTxt = this.scene.add.text(PANEL_X + PAD, panelY + 4, npcName, {
      fontSize: '5px', color: '#aaddff', fontFamily: 'monospace',
    }).setScrollFactor(0);

    // ── Quest title ─────────────────────────────────────────────────────────

    const titleTxt = this.scene.add.text(PANEL_X + 74, panelY + 4, questTitle, {
      fontSize: '4px', color: '#ffd700', fontFamily: 'monospace',
      wordWrap: { width: PANEL_W - 78 },
    }).setScrollFactor(0);

    // ── Dialogue text ───────────────────────────────────────────────────────

    const maxLineWidth = PANEL_W - PAD * 2;
    const truncated = dialogueLine.length > 120
      ? dialogueLine.slice(0, 117) + '...'
      : dialogueLine;

    const dialogueTxt = this.scene.add.text(PANEL_X + PAD, panelY + 18, `"${truncated}"`, {
      fontSize: '4px', color: '#ddeeff', fontFamily: 'monospace',
      wordWrap: { width: maxLineWidth, useAdvancedWrap: false },
    }).setScrollFactor(0);

    // ── Buttons ─────────────────────────────────────────────────────────────

    const objects: Phaser.GameObjects.GameObject[] = [
      bg, border, nameBg, nameTxt, titleTxt, dialogueTxt,
    ];

    if (hasChoices && choices) {
      this.buildChoiceButtons(panelY, panelH, choices, objects);
    } else {
      this.buildAcceptDeclineButtons(panelY, panelH, objects);
    }

    this.container.add(objects);
    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  private buildChoiceButtons(
    panelY: number,
    panelH: number,
    choices: ClientDialogueChoice[],
    objects: Phaser.GameObjects.GameObject[],
  ): void {
    // Three choice buttons stacked vertically in the lower portion of the panel
    const btnAreaTop = panelY + 36;
    const btnH       = 14;
    const btnGap     = 3;
    const btnW       = PANEL_W - PAD * 2;

    choices.slice(0, 3).forEach((choice, idx) => {
      const btnY = btnAreaTop + idx * (btnH + btnGap);

      // Colour scheme: accept = green-tinted, decline = red-tinted, others = neutral
      let fillColor   = 0x1a2233;
      let borderColor = 0x445566;
      let hoverColor  = 0x223344;
      let textColor   = '#cce0ff';
      if (choice.outcome === 'accept' || choice.outcome === 'rep_bonus') {
        fillColor = 0x1a2e1a; borderColor = 0x3a7a3a; hoverColor = 0x234023; textColor = '#88ee88';
      } else if (choice.outcome === 'decline') {
        fillColor = 0x2e1a1a; borderColor = 0x7a3a3a; hoverColor = 0x402323; textColor = '#ee8888';
      }

      const prefix = `[${idx + 1}] `;
      const label = (prefix + choice.label).slice(0, 52); // keep within button width

      const btnBg = this.scene.add
        .rectangle(PANEL_X + PAD, btnY, btnW, btnH, fillColor, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      const btnBorder = this.scene.add.graphics().setScrollFactor(0);
      btnBorder.lineStyle(1, borderColor, 0.8);
      btnBorder.strokeRect(PANEL_X + PAD, btnY, btnW, btnH);
      const btnTxt = this.scene.add.text(
        PANEL_X + PAD + 4, btnY + btnH / 2,
        label,
        { fontSize: '4px', color: textColor, fontFamily: 'monospace' },
      ).setOrigin(0, 0.5).setScrollFactor(0);

      btnBg.on('pointerover',  () => btnBg.setFillStyle(hoverColor, 0.9));
      btnBg.on('pointerout',   () => btnBg.setFillStyle(fillColor, 0.9));
      btnBg.on('pointerdown',  () => this.selectChoice(choice));

      objects.push(btnBg, btnBorder, btnTxt);
    });

    // Small hint
    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, panelY + panelH - 5,
      '[1/2/3] choose',
      { fontSize: '3px', color: '#334455', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(0);
    objects.push(hint);
  }

  private buildAcceptDeclineButtons(
    panelY: number,
    panelH: number,
    objects: Phaser.GameObjects.GameObject[],
  ): void {
    const btnY = panelY + panelH - 16;

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

    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, panelY + panelH - 6,
      '[Tab] players',
      { fontSize: '3px', color: '#334455', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(0);

    objects.push(acceptBg, acceptBorder, acceptTxt, declineBg, declineBorder, declineTxt, hint);
  }

  // ── Choice selection ──────────────────────────────────────────────────────

  private selectChoice(choice: ClientDialogueChoice): void {
    if (!this.currentQuest) return;
    const quest = this.currentQuest;

    // Notify caller (for server-side rep delta)
    this.onChoiceSelected?.(quest, choice);

    // Show NPC response phase
    this.rebuildResponse(choice, quest);

    // Auto-resolve after delay
    this.responseTimer = this.scene.time.delayedCall(RESPONSE_DISPLAY_MS, () => {
      this.resolveChoice(choice, quest);
    });
  }

  /** Keyboard shortcut: select choice by 1-indexed position. */
  selectChoiceByIndex(index: number): void {
    const choices = this.currentQuest?.dialogue.choices;
    if (!choices || index < 0 || index >= choices.length) return;
    this.selectChoice(choices[index]);
  }

  // ── Response phase ────────────────────────────────────────────────────────

  private rebuildResponse(choice: ClientDialogueChoice, quest: ClientQuest): void {
    this.container.removeAll(true);

    const panelH = BASE_H;
    const panelY = CANVAS.HEIGHT - panelH - 8;
    const npcName = 'Quest Giver';

    const bg = this.scene.add
      .rectangle(PANEL_X, panelY, PANEL_W, panelH, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0);

    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, panelY, PANEL_W, panelH);
    border.lineStyle(1, 0x4466aa, 0.6);
    border.lineBetween(PANEL_X + 2, panelY + 14, PANEL_X + PANEL_W - 2, panelY + 14);

    const nameBg = this.scene.add
      .rectangle(PANEL_X, panelY, 70, 14, 0x1a2a44, 1)
      .setOrigin(0, 0).setScrollFactor(0);
    const nameTxt = this.scene.add.text(PANEL_X + PAD, panelY + 4, npcName, {
      fontSize: '5px', color: '#aaddff', fontFamily: 'monospace',
    }).setScrollFactor(0);

    const titleTxt = this.scene.add.text(PANEL_X + 74, panelY + 4, quest.title, {
      fontSize: '4px', color: '#ffd700', fontFamily: 'monospace',
      wordWrap: { width: PANEL_W - 78 },
    }).setScrollFactor(0);

    const response = choice.response.length > 120
      ? choice.response.slice(0, 117) + '...'
      : choice.response;

    const responseTxt = this.scene.add.text(
      PANEL_X + PAD, panelY + 18, `"${response}"`, {
        fontSize: '4px', color: '#ddeeff', fontFamily: 'monospace',
        wordWrap: { width: PANEL_W - PAD * 2, useAdvancedWrap: false },
      },
    ).setScrollFactor(0);

    // Outcome indicator
    let outcomeLabel = '...';
    let outcomeColor = '#556677';
    if (choice.outcome === 'accept' || choice.outcome === 'rep_bonus') {
      outcomeLabel = '✓ Quest accepted!';
      outcomeColor = '#88ee88';
    } else if (choice.outcome === 'decline') {
      outcomeLabel = '— Goodbye';
      outcomeColor = '#ee8888';
    }

    const outcomeTxt = this.scene.add.text(
      PANEL_X + PAD, panelY + panelH - 8,
      outcomeLabel,
      { fontSize: '4px', color: outcomeColor, fontFamily: 'monospace' },
    ).setScrollFactor(0);

    this.container.add([bg, border, nameBg, nameTxt, titleTxt, responseTxt, outcomeTxt]);
    this.container.setVisible(true).setDepth(DEPTH);
  }

  private resolveChoice(choice: ClientDialogueChoice, quest: ClientQuest): void {
    if (choice.outcome === 'accept' || choice.outcome === 'rep_bonus') {
      this.onAccept?.(quest);
    } else if (choice.outcome === 'decline') {
      this.onDecline?.();
    }
    // 'neutral' — just close without accept/decline
    this.hide();
  }

  // ── Legacy accept / decline ───────────────────────────────────────────────

  /** Direct accept (used when no choices are present, or E key shortcut). */
  accept(): void {
    if (!this.currentQuest) return;
    // If choices exist, default to the first 'accept' outcome choice
    const choices = this.currentQuest.dialogue.choices;
    if (choices && choices.length > 0) {
      const acceptChoice = choices.find(c => c.outcome === 'accept') ?? choices[0];
      this.selectChoice(acceptChoice);
      return;
    }
    this.onAccept?.(this.currentQuest);
    this.hide();
  }

  /** Direct decline. */
  decline(): void {
    this.onDecline?.();
    this.hide();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private cancelResponseTimer(): void {
    if (this.responseTimer) {
      this.responseTimer.remove(false);
      this.responseTimer = null;
    }
  }

  destroy(): void {
    this.cancelResponseTimer();
    this.container.destroy(true);
  }
}

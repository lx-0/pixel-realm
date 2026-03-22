/**
 * QuestLogPanel — shows active and completed quests.
 *
 * Press Q to toggle. Escape to close.
 * Styled consistently with ChatOverlay and PlayerListPanel.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { ClientQuest } from '../systems/MultiplayerClient';

const PANEL_W = 200;
const PANEL_H = 110;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 70;
const PAD     = 4;

export class QuestLogPanel {
  private scene:   Phaser.Scene;
  private visible  = false;
  private qKey!:   Phaser.Input.Keyboard.Key;

  private container: Phaser.GameObjects.Container;

  private activeQuests:    ClientQuest[] = [];
  private completedTitles: string[]      = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.qKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.rebuild();
  }

  // ── Update (called from GameScene.update) ─────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.toggle();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Returns true and closes if the panel is visible. */
  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  setActiveQuest(quest: ClientQuest): void {
    const idx = this.activeQuests.findIndex(q => q.id === quest.id);
    if (idx >= 0) {
      this.activeQuests[idx] = quest;
    } else {
      this.activeQuests.push(quest);
    }
    if (this.visible) this.rebuild();
  }

  markCompleted(questId: string, title: string): void {
    this.activeQuests = this.activeQuests.filter(q => q.id !== questId);
    if (!this.completedTitles.includes(title)) {
      this.completedTitles.push(title);
    }
    if (this.visible) this.rebuild();
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
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.85)
      .setOrigin(0, 0).setScrollFactor(0);

    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // Header
    const header = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + 5,
      'Quest Log',
      { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);

    // Divider
    const div = this.scene.add.graphics().setScrollFactor(0);
    div.lineStyle(1, 0x334466, 0.7);
    div.lineBetween(PANEL_X + 2, PANEL_Y + 14, PANEL_X + PANEL_W - 2, PANEL_Y + 14);

    this.container.add([bg, border, header, div]);

    let y = PANEL_Y + 18;
    const maxY = PANEL_Y + PANEL_H - 14;

    if (this.activeQuests.length === 0 && this.completedTitles.length === 0) {
      const empty = this.scene.add.text(
        PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2,
        'No active quests.\nSpeak with an NPC to begin.',
        { fontSize: '4px', color: '#888899', fontFamily: 'monospace', align: 'center' },
      ).setOrigin(0.5).setScrollFactor(0);
      this.container.add(empty);
    }

    // Active quests
    for (const q of this.activeQuests.slice(0, 2)) {
      if (y >= maxY) break;

      const title = this.scene.add.text(PANEL_X + PAD, y, `▸ ${q.title}`, {
        fontSize: '4px', color: '#ffd700', fontFamily: 'monospace',
        wordWrap: { width: PANEL_W - PAD * 2 },
      }).setScrollFactor(0);
      y += 7;

      if (y < maxY) {
        const desc = q.description.length > 80
          ? q.description.slice(0, 77) + '...'
          : q.description;
        const descTxt = this.scene.add.text(PANEL_X + PAD + 3, y, desc, {
          fontSize: '4px', color: '#ccddff', fontFamily: 'monospace',
          wordWrap: { width: PANEL_W - PAD * 2 - 3 },
        }).setScrollFactor(0);
        y += Math.min(descTxt.height + 1, 14);
        this.container.add(descTxt);
      }

      for (const obj of q.objectives.slice(0, 2)) {
        if (y >= maxY) break;
        const objTxt = this.scene.add.text(PANEL_X + PAD + 4, y, `• ${obj.description}`, {
          fontSize: '4px', color: '#aabbcc', fontFamily: 'monospace',
          wordWrap: { width: PANEL_W - PAD * 2 - 4 },
        }).setScrollFactor(0);
        y += 7;
        this.container.add(objTxt);
      }

      if (y < maxY) {
        const reward = this.scene.add.text(
          PANEL_X + PAD, y,
          `Reward: ${q.rewards.gold}g  ${q.rewards.xp}xp`,
          { fontSize: '4px', color: '#88cc88', fontFamily: 'monospace' },
        ).setScrollFactor(0);
        y += 8;
        this.container.add(reward);
      }

      this.container.add(title);
    }

    // Completed count footer
    if (this.completedTitles.length > 0) {
      const fy = PANEL_Y + PANEL_H - 13;
      const footDiv = this.scene.add.graphics().setScrollFactor(0);
      footDiv.lineStyle(1, 0x334466, 0.5);
      footDiv.lineBetween(PANEL_X + 2, fy - 3, PANEL_X + PANEL_W - 2, fy - 3);
      const compTxt = this.scene.add.text(
        PANEL_X + PAD, fy,
        `✓ ${this.completedTitles.length} completed`,
        { fontSize: '4px', color: '#668866', fontFamily: 'monospace' },
      ).setScrollFactor(0);
      this.container.add([footDiv, compTxt]);
    }

    // Close hint
    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 6,
      '[Q/Esc]',
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

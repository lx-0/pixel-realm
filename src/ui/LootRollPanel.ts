/**
 * LootRollPanel — party need/greed/pass loot roll HUD.
 *
 * Shown when the server starts a loot roll (`loot_roll_start`).
 * Displays items up for roll, Need / Greed / Pass buttons, and a countdown bar.
 * Collapses to a result toast after `loot_roll_result` is received.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const DEPTH = 110;
const PANEL_W = 160;
const PANEL_H = 80;
const PANEL_X = CANVAS.WIDTH / 2;
const PANEL_Y = CANVAS.HEIGHT - 54;

export class LootRollPanel {
  private scene: Phaser.Scene;

  // Roll state
  private activeRollId: string | null = null;
  private voted = false;
  private timeoutMs = 15_000;
  private startedAt = 0;
  private timerEvent?: Phaser.Time.TimerEvent;

  // UI elements
  private bg!:          Phaser.GameObjects.Rectangle;
  private titleText!:   Phaser.GameObjects.Text;
  private itemsText!:   Phaser.GameObjects.Text;
  private timerBar!:    Phaser.GameObjects.Rectangle;
  private timerBarBg!:  Phaser.GameObjects.Rectangle;
  private needBtn!:     Phaser.GameObjects.Text;
  private greedBtn!:    Phaser.GameObjects.Text;
  private passBtn!:     Phaser.GameObjects.Text;
  private resultText!:  Phaser.GameObjects.Text;

  /** Called with the chosen vote when the player clicks a button. */
  onVote?: (rollId: string, choice: 'need' | 'greed' | 'pass') => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setVisible(false);
  }

  private createUI(): void {
    const cx = PANEL_X;
    const cy = PANEL_Y;

    this.bg = this.scene.add
      .rectangle(cx, cy, PANEL_W, PANEL_H, 0x111122, 0.92)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setStrokeStyle(1, 0x5588cc);

    this.titleText = this.scene.add
      .text(cx, cy - 30, 'LOOT ROLL', {
        fontSize: '7px', color: '#ffdd55', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.itemsText = this.scene.add
      .text(cx, cy - 19, '', {
        fontSize: '6px', color: '#ccddff', fontFamily: 'monospace',
        align: 'center', wordWrap: { width: PANEL_W - 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Timer bar background
    this.timerBarBg = this.scene.add
      .rectangle(cx, cy - 7, PANEL_W - 10, 3, 0x333344)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Timer bar fill (full width = timeoutMs remaining)
    this.timerBar = this.scene.add
      .rectangle(cx - (PANEL_W - 10) / 2, cy - 7, PANEL_W - 10, 3, 0x44aaff)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2);

    // Buttons
    const btnY = cy + 6;
    const btnStyle = { fontSize: '7px', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };

    this.needBtn = this.scene.add
      .text(cx - 44, btnY, '[ NEED ]', { ...btnStyle, color: '#ff6666' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.voted) this.needBtn.setColor('#ff9999'); })
      .on('pointerout',  () => { if (!this.voted) this.needBtn.setColor('#ff6666'); })
      .on('pointerdown', () => this.vote('need'));

    this.greedBtn = this.scene.add
      .text(cx, btnY, '[ GREED ]', { ...btnStyle, color: '#ffaa33' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.voted) this.greedBtn.setColor('#ffcc77'); })
      .on('pointerout',  () => { if (!this.voted) this.greedBtn.setColor('#ffaa33'); })
      .on('pointerdown', () => this.vote('greed'));

    this.passBtn = this.scene.add
      .text(cx + 46, btnY, '[ PASS ]', { ...btnStyle, color: '#888899' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.voted) this.passBtn.setColor('#aaaaaa'); })
      .on('pointerout',  () => { if (!this.voted) this.passBtn.setColor('#888899'); })
      .on('pointerdown', () => this.vote('pass'));

    // Result text (shown after roll resolves)
    this.resultText = this.scene.add
      .text(cx, cy + 22, '', {
        fontSize: '6px', color: '#88ff88', fontFamily: 'monospace',
        align: 'center', wordWrap: { width: PANEL_W - 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  /** Start a new loot roll UI. */
  show(rollId: string, items: string[], timeoutMs: number): void {
    this.activeRollId = rollId;
    this.voted = false;
    this.timeoutMs = timeoutMs;
    this.startedAt = Date.now();

    const itemLabels = items.map(id => id.replace('mat_', '').replace(/_/g, ' ')).join(', ');
    this.itemsText.setText(itemLabels);
    this.resultText.setText('');
    this.timerBar.setScale(1, 1);

    this.setButtonsEnabled(true);
    this.setVisible(true);

    // Animate the timer bar shrinking
    this.timerEvent?.destroy();
    this.timerEvent = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: this.tickTimer,
      callbackScope: this,
    });
  }

  private tickTimer(): void {
    const elapsed = Date.now() - this.startedAt;
    const pct = Math.max(0, 1 - elapsed / this.timeoutMs);
    this.timerBar.setScale(pct, 1);
    if (pct <= 0) {
      this.timerEvent?.destroy();
    }
  }

  /** Show the roll result and auto-hide after a few seconds. */
  showResult(items: string[], winnerName: string | null, _rolls: Record<string, { choice: string; roll: number }>): void {
    this.timerEvent?.destroy();
    this.timerBar.setScale(0, 1);
    this.setButtonsEnabled(false);

    const itemLabels = items.map(id => id.replace('mat_', '').replace(/_/g, ' ')).join(', ');
    this.itemsText.setText(itemLabels);

    if (winnerName) {
      this.resultText.setColor('#88ff88').setText(`${winnerName} wins!`);
    } else {
      this.resultText.setColor('#888888').setText('All passed — loot lost.');
    }

    // Auto-hide after 3 s
    this.scene.time.delayedCall(3000, () => this.setVisible(false));
  }

  private vote(choice: 'need' | 'greed' | 'pass'): void {
    if (this.voted || !this.activeRollId) return;
    this.voted = true;
    this.setButtonsEnabled(false);

    // Highlight the chosen button
    const colors: Record<string, string> = { need: '#ff6666', greed: '#ffaa33', pass: '#888899' };
    const btns: Record<string, Phaser.GameObjects.Text> = {
      need: this.needBtn, greed: this.greedBtn, pass: this.passBtn,
    };
    Object.entries(btns).forEach(([k, btn]) => {
      btn.setColor(k === choice ? colors[k] : '#444455');
    });

    this.resultText.setColor('#aaccff').setText('Waiting for others…');
    this.onVote?.(this.activeRollId, choice);
  }

  private setButtonsEnabled(enabled: boolean): void {
    [this.needBtn, this.greedBtn, this.passBtn].forEach(btn => {
      if (enabled) {
        btn.setInteractive();
      } else {
        btn.disableInteractive();
      }
    });
  }

  private setVisible(visible: boolean): void {
    [
      this.bg, this.titleText, this.itemsText, this.timerBarBg,
      this.timerBar, this.needBtn, this.greedBtn, this.passBtn, this.resultText,
    ].forEach(obj => obj.setVisible(visible));
  }

  destroy(): void {
    this.timerEvent?.destroy();
    [
      this.bg, this.titleText, this.itemsText, this.timerBarBg,
      this.timerBar, this.needBtn, this.greedBtn, this.passBtn, this.resultText,
    ].forEach(obj => obj.destroy());
  }
}

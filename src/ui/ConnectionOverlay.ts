/**
 * ConnectionOverlay — full-screen UI for disconnect/reconnect feedback.
 *
 * States:
 *  - Reconnecting: dark overlay + spinner + countdown
 *  - Reconnected:  brief "Reconnected!" flash, then auto-hides
 *  - Failed:       "Could not reconnect" message, then auto-hides
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const DEPTH = 200;
const SPINNER_FRAMES = ['|', '/', '-', '\\'];

export class ConnectionOverlay {
  private scene: Phaser.Scene;

  private bg!:            Phaser.GameObjects.Rectangle;
  private titleText!:     Phaser.GameObjects.Text;
  private statusText!:    Phaser.GameObjects.Text;
  private spinnerText!:   Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;

  private spinnerFrame = 0;
  private spinnerTimer?: Phaser.Time.TimerEvent;
  private countdownTimer?: Phaser.Time.TimerEvent;
  private countdownValue = 0;

  isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setAllVisible(false);
  }

  private createUI(): void {
    const W = CANVAS.WIDTH;
    const H = CANVAS.HEIGHT;

    // Blocker overlay so player input is swallowed while disconnected
    this.bg = this.scene.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.78)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive(); // consume pointer events

    this.titleText = this.scene.add
      .text(W / 2, H / 2 - 18, 'Connection Lost', {
        fontSize: '10px', color: '#ff5555', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.statusText = this.scene.add
      .text(W / 2, H / 2 - 4, 'Reconnecting…', {
        fontSize: '7px', color: '#dddddd', fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.spinnerText = this.scene.add
      .text(W / 2, H / 2 + 9, SPINNER_FRAMES[0], {
        fontSize: '10px', color: '#88ccff', fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.countdownText = this.scene.add
      .text(W / 2, H / 2 + 22, '', {
        fontSize: '5px', color: '#667788', fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  /** Show the reconnecting overlay with a countdown (seconds). */
  show(totalSeconds: number): void {
    this.isVisible = true;
    this.setAllVisible(true);

    // Reset text state
    this.titleText.setText('Connection Lost').setColor('#ff5555');
    this.statusText.setText('Reconnecting…').setColor('#dddddd');
    this.spinnerText.setColor('#88ccff');
    this.countdownText.setVisible(true);

    this.countdownValue = totalSeconds;
    this.refreshCountdown();

    // Countdown tick every second
    this.countdownTimer?.remove();
    this.countdownTimer = this.scene.time.addEvent({
      delay: 1000,
      repeat: totalSeconds - 1,
      callback: () => {
        this.countdownValue = Math.max(0, this.countdownValue - 1);
        this.refreshCountdown();
      },
    });

    // Spinner tick
    this.spinnerTimer?.remove();
    this.spinnerFrame = 0;
    this.spinnerTimer = this.scene.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
        this.spinnerText.setText(SPINNER_FRAMES[this.spinnerFrame]);
      },
    });
  }

  /** Transition to "Reconnected!" state, then auto-hide after 1.5 s. */
  showReconnected(): void {
    this.stopTimers();
    this.titleText.setText('Reconnected!').setColor('#44ee88');
    this.statusText.setText('Restoring game state…').setColor('#aaffcc');
    this.spinnerText.setText('✓').setColor('#44ee88');
    this.countdownText.setVisible(false);

    this.scene.time.delayedCall(1500, () => this.hide());
  }

  /** Transition to "Failed" state, then auto-hide after 2.5 s. */
  showFailed(): void {
    this.stopTimers();
    this.titleText.setText('Disconnected').setColor('#ff5555');
    this.statusText.setText('Could not reconnect — running in solo mode.').setColor('#ff9999');
    this.spinnerText.setText('✗').setColor('#ff4444');
    this.countdownText.setVisible(false);

    this.scene.time.delayedCall(2500, () => this.hide());
  }

  hide(): void {
    this.isVisible = false;
    this.stopTimers();
    this.setAllVisible(false);
  }

  destroy(): void {
    this.stopTimers();
    this.bg.destroy();
    this.titleText.destroy();
    this.statusText.destroy();
    this.spinnerText.destroy();
    this.countdownText.destroy();
  }

  private refreshCountdown(): void {
    this.countdownText.setText(`Retrying in ${this.countdownValue}s…`);
  }

  private stopTimers(): void {
    this.countdownTimer?.remove();
    this.countdownTimer = undefined;
    this.spinnerTimer?.remove();
    this.spinnerTimer = undefined;
  }

  private setAllVisible(v: boolean): void {
    this.bg.setVisible(v);
    this.titleText.setVisible(v);
    this.statusText.setVisible(v);
    this.spinnerText.setVisible(v);
    this.countdownText.setVisible(v);
  }
}

import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

/**
 * PauseScene — overlay that runs in parallel with (paused) GameScene.
 * Launched via scene.launch(); resumes GameScene on dismiss.
 */
export class PauseScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.PAUSE);
  }

  create(): void {
    this.sfx = new SoundManager();
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Semi-transparent overlay ─────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x000000, 0.65).setDepth(0);

    // ── Panel ────────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, 100, 80, 0x0a0a2e, 0.9).setDepth(1);
    this.add.rectangle(cx, cy, 100, 80, 0x50a8e8, 0).setDepth(1); // border tint placeholder

    // Panel border lines
    const border = this.add.graphics().setDepth(2);
    border.lineStyle(1, 0x50a8e8, 0.8);
    border.strokeRect(cx - 50, cy - 40, 100, 80);

    // ── Title ────────────────────────────────────────────────────────────────
    this.add
      .text(cx, cy - 28, '— PAUSED —', {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    // ── Buttons ──────────────────────────────────────────────────────────────
    const resumeBtn = this.makeButton(cx, cy, 'Resume  (ESC)', '#ffe040');
    const menuBtn = this.makeButton(cx, cy + 18, 'Main Menu', '#90d0f8');

    resumeBtn.on('pointerdown', () => this.resume());
    menuBtn.on('pointerdown', () => this.goMenu());

    // ── ESC to resume ─────────────────────────────────────────────────────────
    this.input.keyboard!.once('keydown-ESC', () => this.resume());

    // Fade in overlay
    this.cameras.main.fadeIn(120, 0, 0, 0);
  }

  private makeButton(x: number, y: number, label: string, color: string): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '7px',
        color,
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    btn.on('pointerover', () => {
      btn.setColor('#ffffff');
      btn.setScale(1.06);
    });
    btn.on('pointerout', () => {
      btn.setColor(color);
      btn.setScale(1);
    });

    return btn;
  }

  private resume(): void {
    this.sfx.playMenuClick();
    this.scene.resume(SCENES.GAME);
    this.scene.stop();
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.scene.stop(SCENES.GAME);
    this.scene.start(SCENES.LEVEL_SELECT);
  }
}

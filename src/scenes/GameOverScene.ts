import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

export interface GameOverData {
  wave: number;
  kills: number;
  level: number;
  timeSecs: number;
}

/**
 * GameOverScene — full-screen game over with stats, restart, and menu options.
 */
export class GameOverScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.GAME_OVER);
  }

  create(data: GameOverData): void {
    this.sfx = new SoundManager();
    const { wave = 1, kills = 0, level = 1, timeSecs = 0 } = data ?? {};
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Background ───────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x0d0d0d);

    // Floating dark particles for atmosphere
    this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: CANVAS.WIDTH },
      y: CANVAS.HEIGHT + 4,
      speedY: { min: -10, max: -3 },
      speedX: { min: -2, max: 2 },
      scale: { start: 0.3, end: 0 },
      lifespan: { min: 5000, max: 8000 },
      tint: [0xd42020, 0x5a0a0a, 0x888888],
      alpha: { start: 0.5, end: 0 },
      frequency: 400,
      quantity: 1,
    }).setDepth(1);

    // ── Title ────────────────────────────────────────────────────────────────
    const title = this.add
      .text(cx, cy - 58, 'GAME OVER', {
        fontSize: '20px',
        color: '#d42020',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    // ── Panel ────────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy + 2, 130, 72, 0x0a0a1e, 0.9).setDepth(5);
    const borderGfx = this.add.graphics().setDepth(6);
    borderGfx.lineStyle(1, 0x5a0a0a, 0.8);
    borderGfx.strokeRect(cx - 65, cy - 34, 130, 72);

    // ── Stats ────────────────────────────────────────────────────────────────
    const mins = Math.floor(timeSecs / 60);
    const secs = String(timeSecs % 60).padStart(2, '0');
    const stats: [string, string][] = [
      ['Wave Reached', String(wave)],
      ['Enemies Slain', String(kills)],
      ['Level Reached', String(level)],
      ['Time Survived', `${mins}:${secs}`],
    ];

    stats.forEach(([label, value], i) => {
      const y = cy - 22 + i * 14;
      this.add
        .text(cx - 55, y, label, {
          fontSize: '6px',
          color: '#888899',
          fontFamily: 'monospace',
        })
        .setDepth(10);
      this.add
        .text(cx + 55, y, value, {
          fontSize: '6px',
          color: '#ffffff',
          fontFamily: 'monospace',
        })
        .setOrigin(1, 0)
        .setDepth(10);
    });

    // ── Separator ─────────────────────────────────────────────────────────────
    const sep = this.add.graphics().setDepth(7);
    sep.lineStyle(1, 0x333344, 0.8);
    sep.lineBetween(cx - 55, cy + 35, cx + 55, cy + 35);

    // ── Buttons ───────────────────────────────────────────────────────────────
    const tryAgainBtn = this.makeButton(cx, cy + 48, '▶  Try Again', '#ffe040');
    const menuBtn     = this.makeButton(cx, cy + 62, 'Main Menu',    '#90d0f8');

    tryAgainBtn.on('pointerdown', () => this.restart());
    menuBtn.on('pointerdown', () => this.goMenu());

    // SPACE to restart
    this.input.keyboard?.once('keydown-SPACE', () => this.restart());

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
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
      .setDepth(10);

    btn.on('pointerover', () => { btn.setColor('#ffffff'); btn.setScale(1.07); });
    btn.on('pointerout',  () => { btn.setColor(color);    btn.setScale(1); });

    return btn;
  }

  private restart(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.GAME));
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.MENU));
  }
}

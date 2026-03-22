import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import type { GameOverData } from './GameScene';

/**
 * GameOverScene — full-screen result screen.
 * Shows victory or defeat depending on GameOverData.victory.
 * Routes back to LevelSelectScene instead of directly replaying.
 */
export class GameOverScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.GAME_OVER);
  }

  create(data: GameOverData): void {
    this.sfx = SoundManager.getInstance();
    const {
      kills = 0, level = 1, timeSecs = 0,
      zoneName = '', victory = false, score = 0, zoneId = '',
    } = data ?? {};

    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Background ───────────────────────────────────────────────────────────
    const bgColor = victory ? 0x050f05 : 0x0d0d0d;
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, bgColor);

    const tint = victory
      ? [0xffd700, 0xffe040, 0xffaa00, 0x44ff88]
      : [0xd42020, 0x5a0a0a, 0x888888];
    this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: CANVAS.WIDTH },
      y: CANVAS.HEIGHT + 4,
      speedY: { min: -12, max: -4 },
      speedX: { min: -2, max: 2 },
      scale: { start: 0.35, end: 0 },
      lifespan: { min: 5000, max: 8000 },
      tint,
      alpha: { start: 0.55, end: 0 },
      frequency: 380,
      quantity: 1,
    }).setDepth(1);

    // ── Title ─────────────────────────────────────────────────────────────────
    const titleStr = victory ? 'ZONE CLEARED!' : 'GAME OVER';
    const titleCol = victory ? '#ffd700'       : '#d42020';

    const title = this.add.text(cx, cy - 60, titleStr, {
      fontSize: '16px', color: titleCol, fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600, ease: 'Power2' });

    if (zoneName) {
      this.add.text(cx, cy - 45, zoneName, {
        fontSize: '6px', color: '#aaaacc', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(10);
    }

    // ── Panel ─────────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy + 5, 140, 76, 0x0a0a1e, 0.9).setDepth(5);
    const border = this.add.graphics().setDepth(6);
    border.lineStyle(1, victory ? 0xffd700 : 0x5a0a0a, 0.8);
    border.strokeRect(cx - 70, cy - 33, 140, 76);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const mins = Math.floor(timeSecs / 60);
    const secs = String(timeSecs % 60).padStart(2, '0');
    const stats: [string, string][] = [
      ['Score',         String(score)],
      ['Enemies Slain', String(kills)],
      ['Level Reached', String(level)],
      ['Time',          `${mins}:${secs}`],
    ];

    stats.forEach(([label, value], i) => {
      const y = cy - 24 + i * 14;
      this.add.text(cx - 60, y, label, { fontSize: '6px', color: '#888899', fontFamily: 'monospace' }).setDepth(10);
      this.add.text(cx + 60, y, value, { fontSize: '6px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(10);
    });

    const sep = this.add.graphics().setDepth(7);
    sep.lineStyle(1, 0x333344, 0.8);
    sep.lineBetween(cx - 60, cy + 36, cx + 60, cy + 36);

    // ── Buttons ───────────────────────────────────────────────────────────────
    const primaryLabel = victory ? '▶  Level Select' : '▶  Try Again';
    const primaryColor = victory ? '#44ff88'         : '#ffe040';

    const primaryBtn = this.makeButton(cx, cy + 48, primaryLabel, primaryColor);
    const menuBtn    = this.makeButton(cx, cy + 62, 'Main Menu', '#90d0f8');

    primaryBtn.on('pointerdown', () => {
      if (victory) this.goLevelSelect();
      else this.retry(zoneId);
    });
    menuBtn.on('pointerdown', () => this.goMenu());

    this.input.keyboard?.once('keydown-SPACE', () => {
      if (victory) this.goLevelSelect();
      else this.retry(zoneId);
    });
    this.input.keyboard?.once('keydown-ESC', () => this.goLevelSelect());

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private makeButton(x: number, y: number, label: string, color: string): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: '7px', color, fontFamily: 'monospace', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    btn.on('pointerover', () => { btn.setColor('#ffffff'); btn.setScale(1.07); });
    btn.on('pointerout',  () => { btn.setColor(color);    btn.setScale(1); });
    return btn;
  }

  private retry(zoneId: string): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.GAME, { zoneId }));
  }

  private goLevelSelect(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.LEVEL_SELECT));
  }

  private goMenu(): void {
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start(SCENES.MENU));
  }
}

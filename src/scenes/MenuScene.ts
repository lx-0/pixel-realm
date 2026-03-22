import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

/**
 * MenuScene — title screen with animated particle background and play prompt.
 */
export class MenuScene extends Phaser.Scene {
  private sfx!: SoundManager;

  constructor() {
    super(SCENES.MENU);
  }

  create(): void {
    this.sfx = SoundManager.getInstance();
    this.sfx.startZoneMusic('menu');
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x0a0a2e);

    // Subtle vignette (darker edges)
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x0a0a2e, 0x0a0a2e, 0.8, 0.8, 0, 0);
    vignette.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT / 2);

    // ── Floating particle background ────────────────────────────────────────
    this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: CANVAS.WIDTH },
      y: CANVAS.HEIGHT + 4,
      speedY: { min: -18, max: -6 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 4000, max: 7000 },
      tint: [0x50a8e8, 0x9050e0, 0xffe040, 0xffffff, 0xd090ff],
      alpha: { start: 0.7, end: 0 },
      frequency: 300,
      quantity: 1,
    }).setDepth(1);

    // ── Title ───────────────────────────────────────────────────────────────
    const title = this.add
      .text(cx, cy - 46, 'PixelRealm', {
        fontSize: '22px',
        color: '#ffd700',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Title pulse animation
    this.tweens.add({
      targets: title,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Subtitle ─────────────────────────────────────────────────────────────
    this.add
      .text(cx, cy - 22, 'A Living MMORPG World', {
        fontSize: '7px',
        color: '#90d0f8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // ── Feature tags ─────────────────────────────────────────────────────────
    const features = ['Explore  •  Fight  •  Loot  •  Upgrade'];
    features.forEach((f, i) => {
      this.add
        .text(cx, cy - 6 + i * 9, f, {
          fontSize: '5px',
          color: '#888899',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setDepth(10);
    });

    // ── Play prompt ───────────────────────────────────────────────────────────
    const playText = this.add
      .text(cx, cy + 22, '▶  Press SPACE or Click to Play  ◀', {
        fontSize: '6px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: playText,
      alpha: 0.1,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Controls ──────────────────────────────────────────────────────────────
    this.add
      .text(cx, cy + 50, 'WASD: Move  |  SPACE: Attack  |  ESC: Pause', {
        fontSize: '4px',
        color: '#444466',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // ── Version ───────────────────────────────────────────────────────────────
    this.add
      .text(CANVAS.WIDTH - 2, CANVAS.HEIGHT - 2, 'v0.2.0 — Vertical Slice', {
        fontSize: '4px',
        color: '#333344',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 1)
      .setDepth(10);

    // ── Input ─────────────────────────────────────────────────────────────────
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  private startGame(): void {
    this.sfx.unlock();
    this.sfx.playMenuClick();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start(SCENES.LEVEL_SELECT));
  }
}

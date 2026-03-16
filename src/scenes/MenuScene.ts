import Phaser from 'phaser';
import { CANVAS, SCENES } from '../config/constants';

/**
 * MenuScene — title screen with a "Play" prompt.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create(): void {
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // Background
    this.add.rectangle(cx, cy, CANVAS.WIDTH, CANVAS.HEIGHT, 0x0a0a2e);

    // Title
    this.add
      .text(cx, cy - 40, 'PixelRealm', {
        fontSize: '20px',
        color: '#ffd700',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Sub-title
    this.add
      .text(cx, cy - 18, 'A Living MMORPG World', {
        fontSize: '7px',
        color: '#aaaaff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // Play prompt — blinks
    const playText = this.add
      .text(cx, cy + 20, 'Press SPACE or Click to Play', {
        fontSize: '6px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: playText,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Version
    this.add
      .text(CANVAS.WIDTH - 2, CANVAS.HEIGHT - 2, 'v0.1.0', {
        fontSize: '5px',
        color: '#555555',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 1);

    // Input to start game
    this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);
  }

  private startGame(): void {
    this.scene.start(SCENES.GAME);
  }
}

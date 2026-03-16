import Phaser from 'phaser';
import { SCENES } from '../config/constants';

/**
 * BootScene — first scene; generates placeholder assets and transitions to Menu.
 * In production, this loads a minimal loading bar then hands off to PreloadScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create(): void {
    // Generate placeholder colored rectangles as stand-in spritesheets
    // until real pixel-art assets are added.
    this.generatePlaceholderTextures();
    this.scene.start(SCENES.MENU);
  }

  private generatePlaceholderTextures(): void {
    // Player — cyan 16×24 rectangle
    const playerGfx = this.make.graphics({ x: 0, y: 0 });
    playerGfx.fillStyle(0x00ffff, 1);
    playerGfx.fillRect(0, 0, 16, 24);
    playerGfx.generateTexture('player', 16, 24);
    playerGfx.destroy();

    // Ground tile — brown 16×16 rectangle
    const groundGfx = this.make.graphics({ x: 0, y: 0 });
    groundGfx.fillStyle(0x8b6914, 1);
    groundGfx.fillRect(0, 0, 16, 16);
    groundGfx.lineStyle(1, 0x5a4010, 1);
    groundGfx.strokeRect(0, 0, 16, 16);
    groundGfx.generateTexture('ground', 16, 16);
    groundGfx.destroy();

    // Enemy — red 16×24 rectangle
    const enemyGfx = this.make.graphics({ x: 0, y: 0 });
    enemyGfx.fillStyle(0xff4444, 1);
    enemyGfx.fillRect(0, 0, 16, 24);
    enemyGfx.generateTexture('enemy', 16, 24);
    enemyGfx.destroy();
  }
}

import Phaser from 'phaser';
import { CANVAS } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
  zoom: CANVAS.SCALE,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  pixelArt: true,  // enables pixel-perfect rendering
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env.DEV,
    },
  },
  scene: [BootScene, MenuScene, GameScene],
};

new Phaser.Game(config);

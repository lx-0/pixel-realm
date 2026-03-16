import Phaser from 'phaser';
import { CANVAS } from './config/constants';
import { BootScene }    from './scenes/BootScene';
import { MenuScene }    from './scenes/MenuScene';
import { GameScene }    from './scenes/GameScene';
import { PauseScene }   from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
  zoom: CANVAS.SCALE,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  pixelArt: true,  // enables pixel-perfect rendering (nearest-neighbor scaling)
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // keep off even in DEV to avoid visual clutter
    },
  },
  scene: [BootScene, MenuScene, GameScene, PauseScene, GameOverScene],
};

new Phaser.Game(config);

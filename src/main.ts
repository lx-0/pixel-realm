import Phaser from 'phaser';
import { CANVAS } from './config/constants';
import { BootScene }        from './scenes/BootScene';
import { MenuScene }        from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene }        from './scenes/GameScene';
import { PauseScene }       from './scenes/PauseScene';
import { SettingsScene }    from './scenes/SettingsScene';
import { GameOverScene }    from './scenes/GameOverScene';
import { CreditsScene }     from './scenes/CreditsScene';
import { ArenaScene }       from './scenes/ArenaScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
  zoom: CANVAS.SCALE,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, PauseScene, SettingsScene, GameOverScene, CreditsScene, ArenaScene],
};

new Phaser.Game(config);

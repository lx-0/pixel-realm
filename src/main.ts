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
import { HousingScene }     from './scenes/HousingScene';
import { DungeonScene }     from './scenes/DungeonScene';
import { WorldBossScene }        from './scenes/WorldBossScene';
import { ZoneTransitionScene }   from './scenes/ZoneTransitionScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS.WIDTH,
    height: CANVAS.HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, LevelSelectScene, ZoneTransitionScene, GameScene, PauseScene, SettingsScene, GameOverScene, CreditsScene, ArenaScene, HousingScene, DungeonScene, WorldBossScene],
};

new Phaser.Game(config);

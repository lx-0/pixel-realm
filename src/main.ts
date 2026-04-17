import Phaser from 'phaser';
import { CANVAS } from './config/constants';
import { initI18n } from './i18n';
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
import { KeybindOverlay }        from './ui/KeybindOverlay';

import { TelemetryClient } from './systems/TelemetryClient';

// Restore saved language preference before any scenes are created
initI18n();

// Initialise telemetry (sets up global error handlers, opt-out support)
TelemetryClient.init();

// Force Canvas2D renderer when the E2E test harness requests it.
// Tests set window.__pixelrealm_force_canvas = true via page.addInitScript()
// so it is already present before this module executes.
const rendererType =
  (typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).__pixelrealm_force_canvas)
    ? Phaser.CANVAS
    : Phaser.AUTO;

const config: Phaser.Types.Core.GameConfig = {
  type: rendererType,
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
  scene: [BootScene, MenuScene, LevelSelectScene, ZoneTransitionScene, GameScene, PauseScene, SettingsScene, GameOverScene, CreditsScene, ArenaScene, HousingScene, DungeonScene, WorldBossScene, KeybindOverlay],
};

const game = new Phaser.Game(config);

// Expose game instance for E2E test hooks (no-op in production builds
// where test code strips dead references, but harmless to leave in).
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__pixelrealm = game;
}

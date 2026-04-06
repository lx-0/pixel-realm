import Phaser from 'phaser';
import { SCENES, ALL_ZONES, CANVAS } from '../config/constants';

/**
 * ZoneTransitionScene — brief loading overlay shown when entering a zone.
 *
 * Receives the same data payload as GameScene { zoneId, ...rest } and forwards
 * it to GameScene after the transition animation completes.
 *
 * Display sequence: fade-in (500ms) → hold (800ms) → fade-out (500ms) → GameScene
 */
export class ZoneTransitionScene extends Phaser.Scene {
  constructor() {
    super(SCENES.ZONE_TRANSITION);
  }

  create(data: Record<string, unknown>): void {
    const { zoneId, ...gameData } = data as { zoneId: string } & Record<string, unknown>;
    const zone = ALL_ZONES.find(z => z.id === zoneId);
    const num  = zoneId.replace('zone', '');
    const bgKey = `bg_loading_zone${num}`;

    const W  = CANVAS.WIDTH;
    const H  = CANVAS.HEIGHT;
    const cx = W / 2;

    // Background: zone art or solid colour fallback
    if (this.textures.exists(bgKey)) {
      this.add.image(0, 0, bgKey).setOrigin(0, 0);
    } else {
      this.add.rectangle(0, 0, W, H, zone?.bgColor ?? 0x0a0a0a).setOrigin(0, 0);
    }

    if (zone) {
      // Dark band for text legibility (art director specified text at y=70)
      this.add.rectangle(cx, 70, W, 30, 0x000000, 0.55).setOrigin(0.5, 0.5);

      // Zone name — 2× pixel font
      this.add.text(cx, 64, zone.name, {
        fontSize:        '16px',
        color:           '#ffffff',
        fontFamily:      'monospace',
        stroke:          '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);

      // Level range — 1× pixel font
      this.add.text(cx, 78, `Lv. ${zone.minPlayerLevel}+`, {
        fontSize:        '8px',
        color:           '#cccccc',
        fontFamily:      'monospace',
        stroke:          '#000000',
        strokeThickness: 1,
      }).setOrigin(0.5, 0.5);
    }

    // Fade in → hold → fade out → hand off to GameScene
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => this.scene.start(SCENES.GAME, { zoneId, ...gameData }),
      );
    });
  }
}

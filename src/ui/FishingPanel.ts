/**
 * FishingPanel — HUD overlay for the fishing mini-game.
 *
 * Shows:
 *  - Cast power bar (fills while holding F)
 *  - "Waiting for bite…" indicator with idle float animation
 *  - BITE! alert when a fish bites
 *  - Tension bar during reel phase (safe zone + progress indicator)
 *  - Catch popup on success (fish sprite, name, rarity, weight, XP)
 *  - Fail message on escape
 *  - Journal tab (F/J while idle to open catch log)
 *
 * Driven by FishingSystem state machine.
 * GameScene owns FishingSystem and calls panel methods each frame.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { FishingSystem, FishingResult, FishRarity } from '../systems/FishingSystem';

const CX     = CANVAS.WIDTH / 2;
const DEPTH  = 85;
const BAR_W  = 100;
const BAR_H  = 8;
const BAR_X  = CX - BAR_W / 2;

const RARITY_COLOR: Record<FishRarity, number> = {
  common:    0xaaaaaa,
  uncommon:  0x44cc44,
  rare:      0x4488ff,
  legendary: 0xff8800,
  junk:      0x886644,
};

const RARITY_LABEL: Record<FishRarity, string> = {
  common:    'Common',
  uncommon:  'Uncommon',
  rare:      'Rare',
  legendary: 'LEGENDARY',
  junk:      'Junk',
};

export class FishingPanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sys:       FishingSystem;

  // Internal state
  private catchPopupTimer?: Phaser.Time.TimerEvent;
  private bobTween?: Phaser.Tweens.Tween;
  private floatIcon?: Phaser.GameObjects.Text;
  private lastState = '';

  constructor(scene: Phaser.Scene, sys: FishingSystem) {
    this.scene = scene;
    this.sys   = sys;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(): void {
    if (this.sys.state === 'idle') {
      this.container.setVisible(false);
      return;
    }
    this.container.setVisible(true);
    if (this.sys.state !== this.lastState) {
      this.lastState = this.sys.state;
      this.rebuild();
    } else if (this.sys.state === 'casting' || this.sys.state === 'reeling') {
      this.updateDynamic();
    }
  }

  showCatchPopup(result: FishingResult): void {
    this.container.removeAll(true);
    this.container.setVisible(true);

    const popY  = CANVAS.HEIGHT / 2 - 30;
    const rcHex = RARITY_COLOR[result.fish.rarity];

    // Popup background
    const bg = this.scene.add.rectangle(CX, popY, 130, 55, 0x0a0a14, 0.94)
      .setOrigin(0.5).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(2, rcHex, 0.9);
    border.strokeRect(CX - 65, popY - 27, 130, 55);
    this.container.add([bg, border]);

    // Fish sprite
    if (this.scene.textures.exists(result.fish.assetKey)) {
      this.container.add(
        this.scene.add.image(CX - 44, popY, result.fish.assetKey)
          .setDisplaySize(32, 32).setScrollFactor(0),
      );
    } else {
      this.container.add(
        this.scene.add.circle(CX - 44, popY, 14, rcHex, 0.8).setScrollFactor(0),
      );
    }

    // Rarity label
    this.container.add(
      this.scene.add.text(CX - 10, popY - 20, RARITY_LABEL[result.fish.rarity],
        { fontSize: '3px', color: `#${rcHex.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );

    // Fish name
    this.container.add(
      this.scene.add.text(CX - 10, popY - 13, result.fish.name,
        { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );

    // Weight + description
    this.container.add(
      this.scene.add.text(CX - 10, popY - 4, `${result.weight}kg — ${result.fish.description.slice(0, 35)}`,
        { fontSize: '3px', color: '#bbccdd', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );

    // XP + gold reward
    this.container.add(
      this.scene.add.text(CX - 10, popY + 6, `+${result.xp}xp  +${result.gold}g`,
        { fontSize: '4px', color: '#88ff88', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );

    if (result.isNew) {
      this.container.add(
        this.scene.add.text(CX - 10, popY + 14, '★ New catch!',
          { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
    }

    // Dismiss hint
    this.container.add(
      this.scene.add.text(CX, popY + 24, '[any key to dismiss]',
        { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0),
    );

    // Particle burst
    this.scene.tweens.add({
      targets: bg,
      scaleX: { from: 0.6, to: 1 },
      scaleY: { from: 0.6, to: 1 },
      alpha:  { from: 0, to: 0.94 },
      duration: 250,
      ease: 'Back.easeOut',
    });

    // Auto-dismiss after 3.5s
    this.catchPopupTimer?.remove(false);
    this.catchPopupTimer = this.scene.time.delayedCall(3500, () => {
      this.container.setVisible(false);
      this.lastState = '';
    });
  }

  showFailMessage(): void {
    this.container.removeAll(true);
    this.container.setVisible(true);
    this.container.add(
      this.scene.add.text(CX, CANVAS.HEIGHT / 2,
        'The fish got away!',
        { fontSize: '5px', color: '#ff8888', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0),
    );
    this.scene.time.delayedCall(1500, () => {
      this.container.setVisible(false);
      this.lastState = '';
    });
  }

  destroy(): void {
    this.catchPopupTimer?.remove(false);
    this.bobTween?.remove();
    this.container.destroy(true);
  }

  // ── Rebuild for state changes ─────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);
    this.bobTween?.remove();
    this.bobTween = undefined;
    this.floatIcon = undefined;

    switch (this.sys.state) {
      case 'casting':   this.buildCastBar(); break;
      case 'waiting':   this.buildWaitingIndicator(); break;
      case 'biting':    this.buildBiteAlert(); break;
      case 'reeling':   this.buildReelBar(); break;
    }
  }

  // ── Cast bar (casting phase) ──────────────────────────────────────────────

  private buildCastBar(): void {
    const barY = CANVAS.HEIGHT - 30;

    // Background
    if (this.scene.textures.exists('ui_fishing_cast_bar_bg')) {
      this.container.add(
        this.scene.add.image(CX, barY, 'ui_fishing_cast_bar_bg').setScrollFactor(0).setOrigin(0.5),
      );
    } else {
      this.container.add(
        this.scene.add.rectangle(BAR_X, barY, BAR_W, BAR_H, 0x222233, 0.9)
          .setOrigin(0, 0.5).setScrollFactor(0),
      );
    }

    this.container.add(
      this.scene.add.text(CX, barY - 8, 'Hold [F] to charge cast…',
        { fontSize: '4px', color: '#88aaff', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0),
    );
  }

  // ── Waiting indicator ─────────────────────────────────────────────────────

  private buildWaitingIndicator(): void {
    const bobY = CANVAS.HEIGHT - 40;
    this.floatIcon = this.scene.add.text(CX, bobY, '🎣',
      { fontSize: '10px', fontFamily: 'monospace' },
    ).setOrigin(0.5).setScrollFactor(0);
    this.container.add(this.floatIcon);

    this.container.add(
      this.scene.add.text(CX, bobY + 14, 'Waiting for a bite…',
        { fontSize: '4px', color: '#aabbcc', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0),
    );

    this.bobTween = this.scene.tweens.add({
      targets: this.floatIcon,
      y: bobY + 4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── Bite alert ────────────────────────────────────────────────────────────

  private buildBiteAlert(): void {
    const alertY = CANVAS.HEIGHT - 40;
    const biteText = this.scene.add.text(CX, alertY, '!! BITE !! — Press [F]',
      { fontSize: '6px', color: '#ff4444', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2 },
    ).setOrigin(0.5).setScrollFactor(0);
    this.container.add(biteText);

    this.scene.tweens.add({
      targets: biteText,
      scaleX: { from: 1.0, to: 1.2 },
      scaleY: { from: 1.0, to: 1.2 },
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Reel bar (reeling phase) ──────────────────────────────────────────────

  private buildReelBar(): void {
    const barY = CANVAS.HEIGHT - 30;
    this.container.add(
      this.scene.add.text(CX, barY - 12, 'Press [F] to reel — stay in the zone!',
        { fontSize: '3px', color: '#88aaff', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0),
    );
  }

  // ── Dynamic updates (each frame during cast/reel) ─────────────────────────

  private updateDynamic(): void {
    this.container.removeAll(true);

    if (this.sys.state === 'casting') {
      this.buildCastBar();
      const barY  = CANVAS.HEIGHT - 30;
      const fillW = Math.round(BAR_W * this.sys.castPower);
      if (fillW > 0) {
        const fillColor = this.sys.castPower > 0.8 ? 0xff4444 : 0x4488ff;
        if (this.scene.textures.exists('ui_fishing_cast_bar_fill')) {
          this.container.add(
            this.scene.add.image(BAR_X, barY, 'ui_fishing_cast_bar_fill')
              .setDisplaySize(fillW, BAR_H).setOrigin(0, 0.5).setScrollFactor(0),
          );
        } else {
          this.container.add(
            this.scene.add.rectangle(BAR_X, barY, fillW, BAR_H, fillColor, 0.9)
              .setOrigin(0, 0.5).setScrollFactor(0),
          );
        }
      }
    } else if (this.sys.state === 'reeling') {
      this.buildReelBar();
      const barY = CANVAS.HEIGHT - 30;

      // Tension bar background
      if (this.scene.textures.exists('ui_fishing_tension_bar_bg')) {
        this.container.add(
          this.scene.add.image(CX, barY, 'ui_fishing_tension_bar_bg')
            .setDisplaySize(BAR_W, BAR_H).setOrigin(0.5).setScrollFactor(0),
        );
      } else {
        this.container.add(
          this.scene.add.rectangle(BAR_X, barY, BAR_W, BAR_H, 0x112233, 0.9)
            .setOrigin(0, 0.5).setScrollFactor(0),
        );
      }

      // Safe zone (tension zone)
      const zoneW   = BAR_W * 0.30;
      const zoneX   = BAR_X + this.sys.tensionZonePos * BAR_W - zoneW / 2;
      this.container.add(
        this.scene.add.rectangle(zoneX, barY, zoneW, BAR_H, 0x44aa44, 0.7)
          .setOrigin(0, 0.5).setScrollFactor(0),
      );

      // Reel progress indicator (arrow / marker)
      const markerX = BAR_X + this.sys.reelProgress * BAR_W;
      if (this.scene.textures.exists('ui_fishing_tension_arrow')) {
        this.container.add(
          this.scene.add.image(markerX, barY, 'ui_fishing_tension_arrow')
            .setDisplaySize(6, BAR_H + 2).setOrigin(0.5).setScrollFactor(0),
        );
      } else {
        this.container.add(
          this.scene.add.rectangle(markerX, barY, 3, BAR_H + 2, 0xffffff, 0.95)
            .setOrigin(0.5, 0.5).setScrollFactor(0),
        );
      }

      // Progress label
      this.container.add(
        this.scene.add.text(CX, barY - 12, `Reeling… ${Math.round(this.sys.reelProgress * 100)}%`,
          { fontSize: '3px', color: '#88ffaa', fontFamily: 'monospace' },
        ).setOrigin(0.5).setScrollFactor(0),
      );
    }
  }
}

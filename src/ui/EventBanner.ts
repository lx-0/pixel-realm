/**
 * EventBanner — animated world event announcement overlay.
 *
 * Slides in from the top of the screen when a new world event is received.
 * Shows the event name, description, event type icon, and a live countdown timer.
 * Auto-dismisses when the countdown reaches zero or after MAX_DISPLAY_MS.
 *
 * Uses PIX-323 art: ui_banner_world_event (background) and ui_icon_event_* icons.
 *
 * Usage:
 *   const banner = new EventBanner(scene);
 *   banner.showEvent(worldEvent);
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const BANNER_W   = 220;
const BANNER_H   = 36;
const BANNER_X   = (CANVAS.WIDTH - BANNER_W) / 2;
const BANNER_Y_HIDDEN  = -BANNER_H - 4;
const BANNER_Y_VISIBLE = 4;
const DEPTH       = 90;
const PAD         = 5;
const MAX_DISPLAY_MS = 30_000; // auto-dismiss after 30s if still showing

/** Maps world event type keywords to icon asset keys. */
const EVENT_ICON_MAP: [RegExp, string][] = [
  [/boss|dragon|demon|raid/i,       'ui_icon_event_boss_spawn'],
  [/discovery|found|ruin|ancient/i, 'ui_icon_event_discovery'],
  [/festival|celebrat|holiday/i,    'ui_icon_event_festival'],
  [/invasion|attack|siege|horde/i,  'ui_icon_event_invasion'],
  [/storm|flood|blizzard|disaster/i,'ui_icon_event_storm'],
];

function iconForEvent(name: string, description: string): string {
  const combined = `${name} ${description}`.toLowerCase();
  for (const [pattern, key] of EVENT_ICON_MAP) {
    if (pattern.test(combined)) return key;
  }
  return 'ui_icon_event_festival'; // default
}

export interface WorldEventData {
  id: string;
  name: string;
  description: string;
  endsAt: string | null;
  zoneId?: string;
}

export class EventBanner {
  private scene:      Phaser.Scene;
  private container:  Phaser.GameObjects.Container;
  private timerText?: Phaser.GameObjects.Text;
  private slideIn?:   Phaser.Tweens.Tween;

  private activeEvent:    WorldEventData | null = null;
  private dismissTimer?:  Phaser.Time.TimerEvent;
  private countdownTick?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, BANNER_Y_HIDDEN)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  showEvent(event: WorldEventData): void {
    this.activeEvent = event;
    this.clearTimers();
    this.rebuild();
    this.container.setVisible(true);
    this.animateIn();

    this.dismissTimer = this.scene.time.delayedCall(MAX_DISPLAY_MS, () => this.dismiss());
    if (event.endsAt) {
      this.countdownTick = this.scene.time.addEvent({
        delay: 1000,
        loop: true,
        callback: this.updateCountdown,
        callbackScope: this,
      });
    }
  }

  dismiss(): void {
    this.clearTimers();
    this.animateOut();
  }

  destroy(): void {
    this.clearTimers();
    this.container.destroy(true);
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);
    this.timerText = undefined;

    if (!this.activeEvent) return;
    const ev = this.activeEvent;

    // Background banner
    if (this.scene.textures.exists('ui_banner_world_event')) {
      const bannerBg = this.scene.add.image(BANNER_X + BANNER_W / 2, BANNER_H / 2, 'ui_banner_world_event')
        .setDisplaySize(BANNER_W, BANNER_H).setScrollFactor(0).setOrigin(0.5);
      this.container.add(bannerBg);
    } else {
      const bannerBg = this.scene.add.rectangle(BANNER_X, 0, BANNER_W, BANNER_H, 0x110022, 0.92)
        .setOrigin(0, 0).setScrollFactor(0);
      const bannerBorder = this.scene.add.graphics().setScrollFactor(0);
      bannerBorder.lineStyle(1, 0xaa44ff, 0.9);
      bannerBorder.strokeRect(BANNER_X, 0, BANNER_W, BANNER_H);
      this.container.add([bannerBg, bannerBorder]);
    }

    // Event type icon
    const iconKey = iconForEvent(ev.name, ev.description);
    const iconX   = BANNER_X + PAD + 8;
    const iconY   = BANNER_H / 2;
    if (this.scene.textures.exists(iconKey)) {
      this.container.add(
        this.scene.add.image(iconX, iconY, iconKey)
          .setDisplaySize(16, 16).setScrollFactor(0).setOrigin(0.5),
      );
    } else {
      this.container.add(
        this.scene.add.circle(iconX, iconY, 7, 0xaa44ff, 0.8).setScrollFactor(0),
      );
    }

    // "WORLD EVENT" label
    this.container.add(
      this.scene.add.text(BANNER_X + PAD + 18, 3, '⚡ WORLD EVENT', {
        fontSize: '3px', color: '#cc88ff', fontFamily: 'monospace',
      }).setScrollFactor(0),
    );

    // Event name
    this.container.add(
      this.scene.add.text(BANNER_X + PAD + 18, 9, ev.name.slice(0, 40), {
        fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
      }).setScrollFactor(0),
    );

    // Description snippet
    const desc = ev.description.slice(0, 55) + (ev.description.length > 55 ? '…' : '');
    this.container.add(
      this.scene.add.text(BANNER_X + PAD + 18, 18, desc, {
        fontSize: '3px', color: '#ccbbff', fontFamily: 'monospace',
      }).setScrollFactor(0),
    );

    // Countdown timer (right-aligned, if endsAt set)
    if (ev.endsAt) {
      this.timerText = this.scene.add.text(BANNER_X + BANNER_W - PAD, 10,
        this.getCountdownString(),
        { fontSize: '4px', color: '#ffcc44', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);
      this.container.add(this.timerText);
    }

    // Close button
    const closeBtn = this.scene.add.text(BANNER_X + BANNER_W - PAD, 2, '[✕]', {
      fontSize: '3px', color: '#886699', fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.dismiss());
    this.container.add(closeBtn);
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  private updateCountdown(): void {
    if (!this.timerText || !this.activeEvent?.endsAt) return;
    const s = this.getCountdownString();
    this.timerText.setText(s);
    if (s === 'Ended') {
      this.dismiss();
    }
  }

  private getCountdownString(): string {
    const event = this.activeEvent;
    if (!event?.endsAt) return '';
    const msLeft = new Date(event.endsAt).getTime() - Date.now();
    if (msLeft <= 0) return 'Ended';
    const h = Math.floor(msLeft / 3_600_000);
    const m = Math.floor((msLeft % 3_600_000) / 60_000);
    const s = Math.floor((msLeft % 60_000) / 1_000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  private animateIn(): void {
    this.slideIn?.remove();
    this.container.y = BANNER_Y_HIDDEN;
    this.slideIn = this.scene.tweens.add({
      targets: this.container,
      y: BANNER_Y_VISIBLE,
      duration: 350,
      ease: 'Back.easeOut',
    });
  }

  private animateOut(): void {
    this.scene.tweens.add({
      targets: this.container,
      y: BANNER_Y_HIDDEN,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
        this.activeEvent = null;
      },
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private clearTimers(): void {
    this.dismissTimer?.remove(false);
    this.dismissTimer = undefined;
    this.countdownTick?.remove(false);
    this.countdownTick = undefined;
  }
}

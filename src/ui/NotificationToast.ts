/**
 * NotificationToast — brief overlay toasts for in-game events.
 *
 * Shows stacked toasts (max 4) in the top-right corner. Each fades out after
 * TOAST_TTL ms. Also polls the server for new persistent notifications and
 * displays them as toasts on login / periodically.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const DEPTH         = 90;
const TOAST_W       = 160;
const TOAST_H       = 22;
const TOAST_PAD     = 3;
const TOAST_TTL     = 5000;     // ms visible
const TOAST_FADE    = 600;      // ms fade-out
const MAX_TOASTS    = 4;
const POLL_INTERVAL = 30_000;   // ms between server polls

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

// ── Toast kind colour map ──────────────────────────────────────────────────────
const KIND_COLOR: Record<string, number> = {
  mail:           0x2255aa,
  friend_request: 0x226622,
  guild_invite:   0x664422,
  event_start:    0x664488,
  auction_sold:   0x226644,
  auction_expired:0x553333,
  system:         0x334455,
};

interface ToastEntry {
  container: Phaser.GameObjects.Container;
  createdAt: number;
  fading: boolean;
}

export class NotificationToast {
  private scene:  Phaser.Scene;
  private toasts: ToastEntry[] = [];
  private userId?: string;
  private pollTimer?: ReturnType<typeof setInterval>;
  /** Callback invoked when unread notification count changes (for badge). */
  onUnreadCountChanged?: (count: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setUserId(userId: string): void {
    this.userId = userId;
    this.startPolling();
  }

  /**
   * Show a toast immediately (called from game events without waiting for poll).
   * kind: 'mail' | 'friend_request' | 'guild_invite' | 'event_start' | 'auction_sold' | 'system'
   */
  show(title: string, body: string, kind = 'system'): void {
    // Evict oldest if at max
    if (this.toasts.length >= MAX_TOASTS) {
      this.evict(this.toasts[0]);
    }

    const slotIndex = this.toasts.length;
    const x = CANVAS.WIDTH  - TOAST_W - 4;
    const y = 28 + slotIndex * (TOAST_H + 2);

    const container = this.scene.add
      .container(x, y)
      .setDepth(DEPTH)
      .setScrollFactor(0)
      .setAlpha(0);

    const bg = this.scene.add
      .rectangle(0, 0, TOAST_W, TOAST_H, KIND_COLOR[kind] ?? 0x334455, 0.92)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    const border = this.scene.add
      .rectangle(0, 0, TOAST_W, TOAST_H, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setStrokeStyle(1, 0x6688aa, 0.8);

    const titleTxt = this.scene.add
      .text(TOAST_PAD, TOAST_PAD, title.slice(0, 26), {
        fontSize: '5px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 1,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    const bodyTxt = this.scene.add
      .text(TOAST_PAD, TOAST_PAD + 9, body.slice(0, 36), {
        fontSize: '4px',
        color: '#bbccdd',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    container.add([bg, border, titleTxt, bodyTxt]);

    // Fade in
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
    });

    const entry: ToastEntry = { container, createdAt: Date.now(), fading: false };
    this.toasts.push(entry);

    // Schedule fade-out
    this.scene.time.delayedCall(TOAST_TTL, () => this.startFade(entry));
  }

  update(): void {
    // Nothing needed — tweens handle animations
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.toasts.forEach((t) => t.container.destroy());
    this.toasts = [];
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    // Initial fetch
    this.fetchAndDisplay().catch(() => {/* non-fatal */});
    this.pollTimer = setInterval(() => {
      this.fetchAndDisplay().catch(() => {/* non-fatal */});
    }, POLL_INTERVAL);
  }

  private async fetchAndDisplay(): Promise<void> {
    if (!this.userId) return;
    try {
      const res = await fetch(`${SERVER_HTTP}/notifications/${this.userId}/unread-count`);
      if (!res.ok) return;
      const { count } = await res.json() as { count: number };
      if (this.onUnreadCountChanged) this.onUnreadCountChanged(count);
    } catch { /* network error — ignore */ }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private startFade(entry: ToastEntry): void {
    if (entry.fading) return;
    entry.fading = true;
    this.scene.tweens.add({
      targets: entry.container,
      alpha: 0,
      duration: TOAST_FADE,
      onComplete: () => this.remove(entry),
    });
  }

  private evict(entry: ToastEntry): void {
    entry.container.destroy();
    this.toasts = this.toasts.filter((t) => t !== entry);
    this.restack();
  }

  private remove(entry: ToastEntry): void {
    entry.container.destroy();
    this.toasts = this.toasts.filter((t) => t !== entry);
    this.restack();
  }

  /** Slide remaining toasts up smoothly after one is removed. */
  private restack(): void {
    this.toasts.forEach((t, i) => {
      const targetY = 28 + i * (TOAST_H + 2);
      this.scene.tweens.add({
        targets: t.container,
        y: targetY,
        duration: 150,
      });
    });
  }
}

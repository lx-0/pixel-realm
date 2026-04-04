/**
 * EventLogPanel — shows recent and ongoing world events.
 *
 * Press L to toggle. Lists events with their type icon, name, status, and
 * time remaining (or completion time). Scrollable with UP/DOWN keys.
 *
 * Records up to MAX_LOG_ENTRIES events in-memory across the session.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { WorldEventStartPayload, WorldEventEndPayload } from '../systems/MultiplayerClient';

const PANEL_W   = 220;
const PANEL_H   = 160;
const PANEL_X   = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y   = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH     = 70;
const PAD       = 6;
const ROW_H     = 24;
const MAX_LOG_ENTRIES = 20;
const ROWS_VISIBLE    = 5;

// Event type → display metadata
const EVENT_META: Record<string, { label: string; icon: string; color: string }> = {
  monster_invasion: { label: 'Invasion',     icon: '⚔',  color: '#ff6644' },
  treasure_hunt:    { label: 'Treasure',     icon: '✦',  color: '#ffdd44' },
  boss_spawn:       { label: 'Elite Boss',   icon: '☠',  color: '#ff44ff' },
  resource_surge:   { label: 'Surge',        icon: '✦',  color: '#44ffcc' },
  faction_conflict: { label: 'Conflict',     icon: '⚡',  color: '#ff9944' },
};

function metaFor(type: string) {
  return EVENT_META[type] ?? { label: type, icon: '•', color: '#aabbcc' };
}

interface LogEntry {
  type:        string;
  name:        string;
  description: string;
  startedAt:   number;   // epoch ms
  endsAt:      number;   // epoch ms
  status:      'active' | 'completed';
  participants?: number;
}

export class EventLogPanel {
  private scene:     Phaser.Scene;
  private visible    = false;
  private container: Phaser.GameObjects.Container;
  private lKey!:     Phaser.Input.Keyboard.Key;
  private upKey!:    Phaser.Input.Keyboard.Key;
  private downKey!:  Phaser.Input.Keyboard.Key;

  private log: LogEntry[] = [];
  private scrollOffset = 0;

  // For live countdown refresh
  private countdownTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.lKey     = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.upKey    = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey  = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.rebuild();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this.visible; }

  show(): void {
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
    this.countdownTimer = this.scene.time.addEvent({
      delay: 1000, loop: true, callback: this.rebuild, callbackScope: this,
    });
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.countdownTimer?.remove(false);
    this.countdownTimer = undefined;
  }

  /** Called when a new dynamic event starts. */
  onEventStart(ev: WorldEventStartPayload): void {
    // Remove any previous entry for the same event id (if reconnected mid-event)
    this.log = this.log.filter((e) => e.name !== ev.name || e.status === 'completed');
    this.log.unshift({
      type:        ev.type,
      name:        ev.name,
      description: ev.description,
      startedAt:   new Date(ev.startsAt).getTime(),
      endsAt:      new Date(ev.endsAt).getTime(),
      status:      'active',
    });
    if (this.log.length > MAX_LOG_ENTRIES) this.log.length = MAX_LOG_ENTRIES;
    if (this.visible) this.rebuild();
  }

  /** Called when an event ends (completed). */
  onEventEnd(ev: WorldEventEndPayload): void {
    const entry = this.log.find((e) => e.name === ev.name && e.status === 'active');
    if (entry) {
      entry.status       = 'completed';
      entry.participants = ev.participantCount;
    }
    if (this.visible) this.rebuild();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.lKey)) {
      this.visible ? this.hide() : this.show();
    }
    if (!this.visible) return;

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      this.rebuild();
    }
    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      const maxOffset = Math.max(0, this.log.length - ROWS_VISIBLE);
      this.scrollOffset = Math.min(maxOffset, this.scrollOffset + 1);
      this.rebuild();
    }
  }

  destroy(): void {
    this.countdownTimer?.remove(false);
    this.container.destroy(true);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    // Panel background
    const bg = this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x0a0a1a, 0.92)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x4422aa, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    this.container.add([bg, border]);

    // Title
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PAD, '⚡ WORLD EVENTS', {
        fontSize: '5px', color: '#cc88ff', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setScrollFactor(0),
    );

    // Close hint
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + PAD, '[L] close', {
        fontSize: '3px', color: '#554466', fontFamily: 'monospace',
      }).setOrigin(1, 0).setScrollFactor(0),
    );

    // Divider
    const div = this.scene.add.graphics().setScrollFactor(0);
    div.lineStyle(0.5, 0x4422aa, 0.5);
    div.lineBetween(PANEL_X + PAD, PANEL_Y + 14, PANEL_X + PANEL_W - PAD, PANEL_Y + 14);
    this.container.add(div);

    const listY = PANEL_Y + 18;

    if (this.log.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, listY + 20, 'No events yet this session.', {
          fontSize: '4px', color: '#556677', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
      return;
    }

    const visibleEntries = this.log.slice(this.scrollOffset, this.scrollOffset + ROWS_VISIBLE);

    visibleEntries.forEach((entry, i) => {
      const rowY  = listY + i * ROW_H;
      const meta  = metaFor(entry.type);
      const isActive = entry.status === 'active';
      const rowBg = this.scene.add.rectangle(
        PANEL_X + PAD, rowY,
        PANEL_W - PAD * 2, ROW_H - 2,
        isActive ? 0x1a1030 : 0x0e0e1e, 0.85,
      ).setOrigin(0, 0).setScrollFactor(0);
      this.container.add(rowBg);

      // Status indicator strip
      const stripColor = isActive ? 0x9944ff : 0x445566;
      const strip = this.scene.add.rectangle(PANEL_X + PAD, rowY, 2, ROW_H - 2, stripColor, 0.9)
        .setOrigin(0, 0).setScrollFactor(0);
      this.container.add(strip);

      // Icon
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 5, rowY + 3, meta.icon, {
          fontSize: '6px', color: meta.color, fontFamily: 'monospace',
        }).setScrollFactor(0),
      );

      // Event name
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 14, rowY + 2, entry.name.slice(0, 28), {
          fontSize: '4px', color: isActive ? '#ffffff' : '#888899', fontFamily: 'monospace',
        }).setScrollFactor(0),
      );

      // Status line
      let statusText: string;
      if (isActive) {
        const msLeft = entry.endsAt - Date.now();
        statusText = msLeft > 0 ? `Active — ${this.formatMs(msLeft)} left` : 'Ending…';
      } else {
        const count = entry.participants ?? 0;
        statusText = `Completed · ${count} participant${count !== 1 ? 's' : ''}`;
      }
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 14, rowY + 10, statusText, {
          fontSize: '3px', color: isActive ? '#aa88ff' : '#556677', fontFamily: 'monospace',
        }).setScrollFactor(0),
      );
    });

    // Scroll indicators
    if (this.scrollOffset > 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, listY - 2, '▲', {
          fontSize: '3px', color: '#6655aa', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
    }
    if (this.scrollOffset + ROWS_VISIBLE < this.log.length) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - PAD, '▼', {
          fontSize: '3px', color: '#6655aa', fontFamily: 'monospace',
        }).setOrigin(0.5, 1).setScrollFactor(0),
      );
    }
  }

  private formatMs(ms: number): string {
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}

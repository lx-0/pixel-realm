/**
 * ArenaQueuePanel — lets players queue for 1v1 or 2v2 arena matches.
 *
 * Shows:
 *   - Mode tabs (1v1 / 2v2)
 *   - Player's current rating and tier icon
 *   - Estimated wait time
 *   - Queue / Cancel button
 *   - Active matches list (click to spectate)
 *
 * Shortcut: [V] to toggle.
 *
 * Usage:
 *   panel = new ArenaQueuePanel(scene, localPlayer);
 *   panel.onQueue    = (mode) => { ... enqueue and launch ArenaScene ... };
 *   panel.onDequeue  = () => { ... };
 *   panel.onSpectate = (instanceId) => { ... launch ArenaScene as spectator ... };
 */

import Phaser from 'phaser';
import { CANVAS, type ArenaMode } from '../config/constants';
import { ArenaManager, getTier, getTierLabel, type ArenaPlayer } from '../systems/ArenaManager';

const PANEL_W = 200;
const PANEL_H = 160;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 75;
const PAD     = 6;

const MODES: ArenaMode[] = ['1v1', '2v2'];

export class ArenaQueuePanel {
  private scene:        Phaser.Scene;
  private localPlayer:  ArenaPlayer;
  private _visible      = false;
  private queued        = false;
  private activeMode:   ArenaMode = '1v1';
  private waitEstimate  = 0;
  private waitInterval: ReturnType<typeof setInterval> | null = null;

  private container:   Phaser.GameObjects.Container;
  private dynObjects:  Phaser.GameObjects.GameObject[] = [];
  private vKey!:       Phaser.Input.Keyboard.Key;

  // Callbacks
  onQueue?:    (mode: ArenaMode) => void;
  onDequeue?:  () => void;
  onSpectate?: (instanceId: string) => void;

  constructor(scene: Phaser.Scene, localPlayer: ArenaPlayer) {
    this.scene       = scene;
    this.localPlayer = localPlayer;
    this.container   = scene.add.container(PANEL_X, PANEL_Y).setDepth(DEPTH).setScrollFactor(0);
    this.container.setVisible(false);
    this.vKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.V);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.vKey)) {
      this._visible ? this.hide() : this.show();
    }
  }

  show(): void {
    this._visible = true;
    this.container.setVisible(true);
    this.rebuild();
    this.startWaitPoll();
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
    this.stopWaitPoll();
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.hide();
    return true;
  }

  setQueued(queued: boolean): void {
    this.queued = queued;
    if (this._visible) this.rebuild();
  }

  destroy(): void {
    this.hide();
    this.clearDyn();
    this.container.destroy();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private startWaitPoll(): void {
    this.stopWaitPoll();
    this.updateWaitEstimate();
    this.waitInterval = setInterval(() => {
      this.updateWaitEstimate();
      if (this._visible) this.rebuild();
    }, 2000);
  }

  private stopWaitPoll(): void {
    if (this.waitInterval) { clearInterval(this.waitInterval); this.waitInterval = null; }
  }

  private updateWaitEstimate(): void {
    this.waitEstimate = ArenaManager.getInstance().estimatedWait(this.activeMode);
  }

  private clearDyn(): void {
    this.dynObjects.forEach(o => o.destroy());
    this.dynObjects = [];
    this.container.removeAll(false);
  }

  private addText(
    x: number, y: number, text: string,
    color = '#cccccc', size = '5px',
  ): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: size, color, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.dynObjects.push(t);
    this.container.add(t);
    return t;
  }

  private addRect(
    x: number, y: number, w: number, h: number,
    fill: number, alpha = 1, stroke?: number,
  ): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(x, y, w, h, fill, alpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    if (stroke !== undefined) r.setStrokeStyle(1, stroke, 0.9);
    this.dynObjects.push(r);
    this.container.add(r);
    return r;
  }

  private rebuild(): void {
    this.clearDyn();

    const mgr  = ArenaManager.getInstance();
    const tier = getTier(this.localPlayer.rating);

    // Background
    this.addRect(0, 0, PANEL_W, PANEL_H, 0x000000, 0.90, 0x664422);

    // Header
    this.addText(PAD, PAD, '⚔ PvP Arena Queue', '#ffcc44', '6px');
    this.addText(PANEL_W - PAD - 16, PAD, '[V/Esc]', '#445566', '4px');

    // Player rating row
    const tierLabel = getTierLabel(tier);
    const ratingStr = `${this.localPlayer.name.slice(0, 10)}  ${tierLabel} ${this.localPlayer.rating}`;
    this.addText(PAD, 14, ratingStr, '#aaddff', '4px');
    const wr = this.localPlayer.wins + this.localPlayer.losses > 0
      ? `W:${this.localPlayer.wins} L:${this.localPlayer.losses}`
      : 'No matches yet';
    this.addText(PAD, 21, wr, '#778899', '4px');

    // ── Mode tabs ─────────────────────────────────────────────────────────
    const tabY = 30;
    const tabW = (PANEL_W - PAD * 2) / MODES.length;
    MODES.forEach((mode, i) => {
      const tx     = PAD + i * tabW;
      const active = mode === this.activeMode;
      const bg = this.addRect(tx, tabY, tabW - 2, 12, active ? 0x443300 : 0x1a1100, 1, active ? 0xffcc44 : 0x332200);
      const col = active ? '#ffdd88' : '#665533';
      const lbl = this.addText(tx + tabW / 2 - 6, tabY + 2, mode, col, '5px');
      if (!this.queued) {
        bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.activeMode = mode; this.rebuild(); });
        lbl.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.activeMode = mode; this.rebuild(); });
      }
    });

    // ── Wait estimate ─────────────────────────────────────────────────────
    const statusY = 46;
    if (this.queued) {
      this.addText(PAD, statusY, `Searching for match...`, '#ffcc44', '4px');
    } else {
      this.addText(PAD, statusY, `Est. wait: ~${this.waitEstimate}s`, '#aaaacc', '4px');
    }

    // ── Queue / Cancel button ─────────────────────────────────────────────
    const btnY = statusY + 12;
    const btnW = 60;
    const btnH = 12;
    const btnX = PANEL_W / 2 - btnW / 2;
    const btnColor    = this.queued ? 0x660000 : 0x004400;
    const btnStroke   = this.queued ? 0xdd2222 : 0x44bb44;
    const btnLabel    = this.queued ? 'Cancel Queue' : `Queue (${this.activeMode})`;
    const btnTextColor = this.queued ? '#ff6666' : '#66ff66';

    const btnBg = this.addRect(btnX, btnY, btnW, btnH, btnColor, 1, btnStroke);
    const btnT  = this.addText(btnX + btnW / 2 - btnLabel.length * 1.4, btnY + 2, btnLabel, btnTextColor, '4px');

    const onBtnClick = () => {
      if (this.queued) {
        this.queued = false;
        ArenaManager.getInstance().dequeue(this.localPlayer.id);
        this.onDequeue?.();
      } else {
        this.queued = true;
        const instance = ArenaManager.getInstance().enqueue(this.localPlayer, this.activeMode);
        if (instance) {
          this.queued = false;
          this.hide();
          this.onQueue?.(this.activeMode);
        } else {
          this.onQueue?.(this.activeMode);
        }
      }
      this.rebuild();
    };
    btnBg.setInteractive({ useHandCursor: true }).on('pointerdown', onBtnClick);
    btnT.setInteractive({ useHandCursor: true }).on('pointerdown', onBtnClick);

    // ── Active matches (spectate) ─────────────────────────────────────────
    const listY = btnY + btnH + 6;
    this.addText(PAD, listY, 'Live Matches:', '#88aacc', '4px');

    const active = mgr.getActiveInstances();
    if (active.length === 0) {
      this.addText(PAD, listY + 9, 'No active matches.', '#445566', '4px');
    } else {
      active.slice(0, 4).forEach((inst, idx) => {
        const iy = listY + 9 + idx * 11;
        const names = inst.players.map(p => p.name.slice(0, 6)).join(' vs ');
        const rowBg = this.addRect(PAD, iy, PANEL_W - PAD * 2, 10, 0x0d1a2a, 1, 0x224466);
        const rowT  = this.addText(PAD + 2, iy + 1, `${inst.mode} ${names}`, '#88ccff', '4px');
        const watchT = this.addText(PANEL_W - PAD - 20, iy + 1, 'Watch', '#44aaff', '4px');

        const onWatch = () => {
          this.hide();
          this.onSpectate?.(inst.id);
        };
        rowBg.setInteractive({ useHandCursor: true }).on('pointerdown', onWatch);
        rowT.setInteractive({ useHandCursor: true }).on('pointerdown', onWatch);
        watchT.setInteractive({ useHandCursor: true }).on('pointerdown', onWatch);
      });
    }
  }
}

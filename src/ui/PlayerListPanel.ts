/**
 * PlayerListPanel — shows who is in the current zone.
 *
 * Press Tab to toggle visibility.
 * Lists each player's name, level, and HP percentage.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { RemotePlayer } from '../systems/MultiplayerClient';

const PANEL_W = 90;
const ROW_H   = 9;
const PANEL_X = CANVAS.WIDTH - PANEL_W - 4;
const PANEL_Y = 24;
const MAX_ROWS = 12;

export class PlayerListPanel {
  private scene:   Phaser.Scene;
  private visible  = false;
  private tabKey!: Phaser.Input.Keyboard.Key;

  // Container rebuilt on each refresh() call
  private container: Phaser.GameObjects.Container;

  /** Called when the local player clicks Report on another player. */
  onReport?: (playerName: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(60).setVisible(false);
    this.build();
    this.tabKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private build(): void {
    // Panel content is built dynamically in refresh() — nothing static needed.
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      this.visible = !this.visible;
      this.container.setVisible(this.visible);
    }
  }

  /** Refresh the player list with current data. */
  refresh(
    localName: string,
    localHp: number,
    localMaxHp: number,
    localLevel: number,
    remotePlayers: Map<string, RemotePlayer>,
  ): void {
    if (!this.visible) return;

    // Destroy previous rows
    this.container.removeAll(true);

    const rows: { name: string; level: number; hpPct: number; isLocal: boolean }[] = [];

    // Local player first
    rows.push({
      name:    localName || 'Hero',
      level:   localLevel,
      hpPct:   localMaxHp > 0 ? Math.max(0, localHp / localMaxHp) : 0,
      isLocal: true,
    });

    // Remote players
    remotePlayers.forEach(rp => {
      rows.push({
        name:    rp.name,
        level:   rp.level,
        hpPct:   rp.maxHp > 0 ? Math.max(0, rp.hp / rp.maxHp) : 0,
        isLocal: false,
      });
    });

    const displayRows = rows.slice(0, MAX_ROWS);
    const panelH = 10 + displayRows.length * ROW_H + 4;

    // Background
    const bg = this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, panelH, 0x000000, 0.82)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, panelH);

    // Header
    const header = this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + 5, 'Zone Players', {
      fontSize: '4px', color: '#aaddff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    this.container.add([bg, border, header]);

    displayRows.forEach((row, i) => {
      const y = PANEL_Y + 12 + i * ROW_H;

      // Bullet
      const bullet = this.scene.add.text(PANEL_X + 3, y, '•', {
        fontSize: '5px',
        color: row.isLocal ? '#ffe040' : '#88aaff',
        fontFamily: 'monospace',
      }).setScrollFactor(0);

      // Name + level
      const nameText = this.scene.add.text(PANEL_X + 10, y, `${row.name} Lv${row.level}`, {
        fontSize: '4px',
        color: row.isLocal ? '#ffe040' : '#ccddff',
        fontFamily: 'monospace',
      }).setScrollFactor(0);

      // HP bar (mini)
      const barW = 18;
      const barX = row.isLocal ? PANEL_X + PANEL_W - barW - 3 : PANEL_X + PANEL_W - barW - 12;
      const barBg = this.scene.add.rectangle(barX, y + 2, barW, 3, 0x440000, 0.8)
        .setOrigin(0, 0).setScrollFactor(0);
      const hpColor = row.hpPct > 0.5 ? 0x00ee44 : row.hpPct > 0.25 ? 0xffaa00 : 0xff2222;
      const barFill = this.scene.add.rectangle(barX, y + 2, barW * row.hpPct, 3, hpColor)
        .setOrigin(0, 0).setScrollFactor(0);

      this.container.add([bullet, nameText, barBg, barFill]);

      // Report button — only for remote players
      if (!row.isLocal && this.onReport) {
        const reportBtn = this.scene.add.text(PANEL_X + PANEL_W - 9, y, '!', {
          fontSize: '5px',
          color: '#ff6644',
          fontFamily: 'monospace',
          backgroundColor: '#331111',
        })
          .setScrollFactor(0)
          .setInteractive({ useHandCursor: true });

        reportBtn.on('pointerdown', () => {
          this.onReport?.(row.name);
        });
        reportBtn.on('pointerover', () => reportBtn.setColor('#ff9977'));
        reportBtn.on('pointerout',  () => reportBtn.setColor('#ff6644'));

        this.container.add(reportBtn);
      }
    });

    if (rows.length > MAX_ROWS) {
      const more = this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + panelH - 4, `+${rows.length - MAX_ROWS} more`, {
        fontSize: '3px', color: '#666688', fontFamily: 'monospace',
      }).setOrigin(0.5, 1).setScrollFactor(0);
      this.container.add(more);
    }

    this.container.setVisible(this.visible).setDepth(60);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.container.destroy(true);
  }
}

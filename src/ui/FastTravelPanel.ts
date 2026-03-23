/**
 * FastTravelPanel — Transport NPC zone-select dialog.
 *
 * Opened when the player interacts with the Transport NPC (press T near the NPC,
 * or via FastTravelPanel.open()). Displays all unlocked zones, their travel cost
 * (an economy gold sink), and lets the player teleport to any of them.
 *
 * Travel cost: 25 gold × zone tier (tier = index + 1).
 * The current zone is shown but disabled (already there).
 * Locked zones are greyed out.
 */

import Phaser from 'phaser';
import { CANVAS, ZONES } from '../config/constants';

const PANEL_W = 180;
const PANEL_H = 145;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 82;
const PAD     = 5;

const COST_PER_TIER = 25; // gold per zone tier

export class FastTravelPanel {
  private scene:      Phaser.Scene;
  private container:  Phaser.GameObjects.Container;
  private dynObjects: Phaser.GameObjects.GameObject[] = [];

  private _visible      = false;
  private selectedIdx   = -1;

  /** Current zone id — set before opening. */
  currentZoneId = 'zone1';
  /** IDs of zones the player has unlocked. */
  unlockedZoneIds: string[] = ['zone1'];
  /** Player's current gold. Updated before opening. */
  playerGold = 0;

  /** Called when player confirms travel: passes (zoneId, cost). */
  onTravel?: (zoneId: string, cost: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene     = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.rebuild();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  open(): void {
    this._visible   = true;
    this.selectedIdx = -1;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.hide();
    return true;
  }

  destroy(): void {
    this.clearDyn();
    this.container.destroy();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private clearDyn(): void {
    this.dynObjects.forEach(o => o.destroy());
    this.dynObjects = [];
    this.container.removeAll(false);
  }

  private addText(
    x: number, y: number, text: string,
    color = '#cccccc', size = '4px',
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
    fill: number, alpha = 1,
    stroke?: number,
  ): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(x, y, w, h, fill, alpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    if (stroke !== undefined) r.setStrokeStyle(1, stroke, 0.8);
    this.dynObjects.push(r);
    this.container.add(r);
    return r;
  }

  private rebuild(): void {
    this.clearDyn();

    // Background
    this.addRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.9, 0x664400);

    // Header
    this.addText(PANEL_X + PAD,              PANEL_Y + PAD,     '🚂 Transport NPC',  '#ffd700', '5px');
    this.addText(PANEL_X + PANEL_W - PAD - 12, PANEL_Y + PAD,   '[Esc]',             '#445566', '3px');
    this.addText(PANEL_X + PAD,              PANEL_Y + PAD + 8,  'Fast travel to any unlocked zone.', '#889988', '3px');
    this.addText(PANEL_X + PAD,              PANEL_Y + PAD + 13, `Gold: ${this.playerGold}g`, '#ffdd88', '4px');

    const listY = PANEL_Y + PAD + 22;
    const rowH  = 18;

    ZONES.forEach((zone, i) => {
      const rowY      = listY + i * rowH;
      const isUnlocked = this.unlockedZoneIds.includes(zone.id);
      const isCurrent  = zone.id === this.currentZoneId;
      const cost       = (i + 1) * COST_PER_TIER;
      const canAfford  = this.playerGold >= cost;
      const isSelected = this.selectedIdx === i;

      const rowBg = this.addRect(
        PANEL_X + PAD, rowY, PANEL_W - PAD * 2, rowH - 2,
        isSelected ? 0x3a2200 : (isCurrent ? 0x112211 : 0x111111), 0.85,
        isSelected ? 0xffaa33 : (isCurrent ? 0x336633 : undefined),
      );

      // Zone name
      const nameColor = isCurrent
        ? '#88ff88'
        : (!isUnlocked ? '#444455' : (canAfford ? '#ddddff' : '#886655'));
      this.addText(
        PANEL_X + PAD + 3, rowY + 2,
        `${zone.name}`,
        nameColor, '4px',
      );

      // Biome label
      this.addText(
        PANEL_X + PAD + 3, rowY + 8,
        `Lv.${zone.minPlayerLevel}+ ${zone.biome}`,
        isCurrent ? '#557755' : '#445566', '3px',
      );

      // Cost / status on the right
      const rightX = PANEL_X + PANEL_W - PAD - 2;
      if (isCurrent) {
        this.addText(rightX - 20, rowY + 4, '(here)', '#557755', '3px');
      } else if (!isUnlocked) {
        this.addText(rightX - 12, rowY + 4, '🔒', '#444455', '4px');
      } else {
        const costColor = canAfford ? '#ffd700' : '#884444';
        this.addText(rightX, rowY + 4, `${cost}g`, costColor, '4px').setOrigin(1, 0);
      }

      // Make unlocked non-current rows interactive
      if (isUnlocked && !isCurrent) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerup', () => {
          this.selectedIdx = (this.selectedIdx === i) ? -1 : i;
          this.rebuild();
        });
      }
    });

    // Confirm button — shown when a zone is selected
    if (this.selectedIdx >= 0 && this.selectedIdx < ZONES.length) {
      const zone     = ZONES[this.selectedIdx]!;
      const cost     = (this.selectedIdx + 1) * COST_PER_TIER;
      const canAfford = this.playerGold >= cost;
      const btnY     = PANEL_Y + PANEL_H - 14;

      if (canAfford) {
        const btn = this.addRect(PANEL_X + PAD, btnY, PANEL_W - PAD * 2 - 40, 10, 0x224422, 0.9, 0x336633);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerup', () => {
          this.hide();
          this.onTravel?.(zone.id, cost);
        });
        this.addText(
          PANEL_X + PAD + 2, btnY + 2,
          `Travel to ${zone.name} (-${cost}g)`,
          '#88ff88', '3px',
        );
      } else {
        this.addRect(PANEL_X + PAD, btnY, PANEL_W - PAD * 2 - 40, 10, 0x221111, 0.9);
        this.addText(PANEL_X + PAD + 2, btnY + 2, `Not enough gold (need ${cost}g)`, '#884444', '3px');
      }
    }

    // Close button
    const closeBtnX = PANEL_X + PANEL_W - PAD - 35;
    const closeBtnY = PANEL_Y + PANEL_H - 14;
    const closeBtn = this.addRect(closeBtnX, closeBtnY, 35, 10, 0x221122, 0.9, 0x554466);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.addText(closeBtnX + 2, closeBtnY + 2, 'Close', '#aaaacc', '3px');
  }
}

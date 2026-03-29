/**
 * MountPanel — Stable NPC mount collection and management UI.
 *
 * Opened when the player interacts with the Stable NPC (press E near stable).
 * Displays all 6 mounts with their rarity, speed bonus, source, and price.
 * Owned mounts can be selected as the active mount; purchasable mounts show
 * a "Buy" button deducting gold from the player.
 *
 * Uses ui_panel_mount_collection (160×120) as background, icon_mount_* (16×16)
 * for mount thumbnails, and rarity glow borders for visual quality tier.
 */

import Phaser from 'phaser';
import { CANVAS, MOUNTS, type MountDef } from '../config/constants';

const PANEL_W = 160;
const PANEL_H = 120;
const PANEL_X = Math.floor((CANVAS.WIDTH  - PANEL_W) / 2);
const PANEL_Y = Math.floor((CANVAS.HEIGHT - PANEL_H) / 2);
const DEPTH   = 82;
const PAD     = 6;

const RARITY_COLORS: Record<MountDef['rarity'], number> = {
  common:    0xaaaaaa,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xffd700,
};

export class MountPanel {
  private scene:        Phaser.Scene;
  private container:    Phaser.GameObjects.Container;
  private dynObjects:   Phaser.GameObjects.GameObject[] = [];

  private _visible = false;

  /** Mounts the player has unlocked (mount IDs). Set before opening. */
  unlockedMountIds: string[] = [];
  /** Currently active mount ID. Set before opening. */
  activeMountId = '';
  /** Player's current gold. Updated before opening. */
  playerGold = 0;

  /** Called when player purchases a mount: passes (mountId, cost). */
  onPurchase?: (mountId: string, cost: number) => void;
  /** Called when player selects/deselects active mount: passes mountId ('' = none). */
  onSelectMount?: (mountId: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene     = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.rebuild();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this._visible; }

  open(): void {
    this._visible = true;
    this.container.setVisible(true);
    this.rebuild();
  }

  close(): void {
    this._visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (!this._visible) return false;
    this.close();
    return true;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private rebuild(): void {
    // Remove previously built dynamic objects
    this.dynObjects.forEach(o => o.destroy());
    this.dynObjects = [];

    const c = this.container;

    // Background panel
    const bg = this.scene.textures.exists('ui_panel_mount_collection')
      ? this.scene.add.image(PANEL_X, PANEL_Y, 'ui_panel_mount_collection').setOrigin(0, 0)
      : this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x111122, 0.95).setOrigin(0, 0);
    c.add(bg);
    this.dynObjects.push(bg);

    // Title
    const title = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + PAD,
      'STABLE — MOUNT COLLECTION',
      { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 1 },
    ).setOrigin(0.5, 0);
    c.add(title);
    this.dynObjects.push(title);

    // Close hint
    const closeHint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + PAD,
      '[ESC] Close',
      { fontSize: '3px', color: '#888888', fontFamily: 'monospace' },
    ).setOrigin(1, 0);
    c.add(closeHint);
    this.dynObjects.push(closeHint);

    // Separator line
    const sep = this.scene.add.rectangle(PANEL_X + PAD, PANEL_Y + 14, PANEL_W - PAD * 2, 1, 0x555577).setOrigin(0, 0);
    c.add(sep);
    this.dynObjects.push(sep);

    // Mount list — 6 mounts in a grid (3 per row)
    const SLOT_W  = (PANEL_W - PAD * 2) / 3;
    const SLOT_H  = 40;
    const GRID_Y0 = PANEL_Y + 18;

    MOUNTS.forEach((mount, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const sx  = PANEL_X + PAD + col * SLOT_W;
      const sy  = GRID_Y0 + row * SLOT_H;

      const owned   = this.unlockedMountIds.includes(mount.id);
      const isActive = mount.id === this.activeMountId;
      const canBuy  = !owned && mount.goldCost > 0 && this.playerGold >= mount.goldCost;
      const tooExp  = !owned && mount.goldCost > 0 && this.playerGold < mount.goldCost;

      // Slot background
      const slotBg = this.scene.add.rectangle(sx + 1, sy + 1, SLOT_W - 2, SLOT_H - 2, isActive ? 0x2255aa : (owned ? 0x223322 : 0x111122), 0.9).setOrigin(0, 0);
      c.add(slotBg);
      this.dynObjects.push(slotBg);

      // Rarity border
      const rarityColor = RARITY_COLORS[mount.rarity];
      const border = this.scene.add.rectangle(sx + 1, sy + 1, SLOT_W - 2, SLOT_H - 2, rarityColor, 0).setOrigin(0, 0);
      border.setStrokeStyle(owned ? 1 : 0.3, rarityColor, owned ? 1 : 0.3);
      c.add(border);
      this.dynObjects.push(border);

      // Mount icon
      const iconX = sx + 10;
      const iconY = sy + SLOT_H / 2;
      if (this.scene.textures.exists(mount.iconKey)) {
        const icon = this.scene.add.image(iconX, iconY, mount.iconKey).setDisplaySize(12, 12);
        if (!owned) icon.setTint(0x444444);
        c.add(icon);
        this.dynObjects.push(icon);
      } else {
        const iconFb = this.scene.add.rectangle(iconX, iconY, 12, 12, owned ? rarityColor : 0x333333).setOrigin(0.5, 0.5);
        c.add(iconFb);
        this.dynObjects.push(iconFb);
      }

      // Mount name
      const nameColor = owned ? `#${rarityColor.toString(16).padStart(6, '0')}` : '#555555';
      const nameText = this.scene.add.text(
        sx + 18, sy + 5,
        mount.name,
        { fontSize: '3px', color: nameColor, fontFamily: 'monospace' },
      ).setOrigin(0, 0);
      c.add(nameText);
      this.dynObjects.push(nameText);

      // Speed bonus
      const speedPct = Math.round((mount.speedMult - 1) * 100);
      const speedText = this.scene.add.text(
        sx + 18, sy + 11,
        `+${speedPct}% speed`,
        { fontSize: '3px', color: owned ? '#88ff88' : '#444444', fontFamily: 'monospace' },
      ).setOrigin(0, 0);
      c.add(speedText);
      this.dynObjects.push(speedText);

      // Source / rarity label
      const rarityText = this.scene.add.text(
        sx + 18, sy + 17,
        mount.rarity.toUpperCase(),
        { fontSize: '3px', color: owned ? `#${rarityColor.toString(16).padStart(6, '0')}` : '#333333', fontFamily: 'monospace' },
      ).setOrigin(0, 0);
      c.add(rarityText);
      this.dynObjects.push(rarityText);

      // Active indicator
      if (isActive) {
        const activeLabel = this.scene.add.text(
          sx + SLOT_W / 2, sy + 25,
          '✓ ACTIVE',
          { fontSize: '3px', color: '#44ffaa', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0);
        c.add(activeLabel);
        this.dynObjects.push(activeLabel);
      }

      // Button area (interactive)
      const btnY = sy + SLOT_H - 10;
      if (owned && !isActive) {
        // "Select" button
        const btn = this.scene.add.text(
          sx + SLOT_W / 2, btnY,
          '[Select]',
          { fontSize: '3px', color: '#aaddff', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.activeMountId = mount.id;
          this.onSelectMount?.(mount.id);
          this.rebuild();
        });
        c.add(btn);
        this.dynObjects.push(btn);
      } else if (owned && isActive) {
        // "Dismiss" button — deselect
        const btn = this.scene.add.text(
          sx + SLOT_W / 2, btnY,
          '[Dismiss]',
          { fontSize: '3px', color: '#ff8888', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.activeMountId = '';
          this.onSelectMount?.('');
          this.rebuild();
        });
        c.add(btn);
        this.dynObjects.push(btn);
      } else if (canBuy) {
        // "Buy" button
        const btn = this.scene.add.text(
          sx + SLOT_W / 2, btnY,
          `[Buy ${mount.goldCost}g]`,
          { fontSize: '3px', color: '#ffd700', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.unlockedMountIds = [...this.unlockedMountIds, mount.id];
          this.activeMountId   = mount.id;
          this.onPurchase?.(mount.id, mount.goldCost);
          this.rebuild();
        });
        c.add(btn);
        this.dynObjects.push(btn);
      } else if (tooExp) {
        // Not enough gold
        const notAfford = this.scene.add.text(
          sx + SLOT_W / 2, btnY,
          `${mount.goldCost}g`,
          { fontSize: '3px', color: '#884444', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0);
        c.add(notAfford);
        this.dynObjects.push(notAfford);
      } else if (!owned) {
        // Not for sale — show source hint
        const src = this.scene.add.text(
          sx + 1, btnY,
          mount.source,
          { fontSize: '3px', color: '#555555', fontFamily: 'monospace', wordWrap: { width: SLOT_W - 2, useAdvancedWrap: true } },
        ).setOrigin(0, 0);
        c.add(src);
        this.dynObjects.push(src);
      }
    });

    // Gold display at the bottom
    const goldLabel = this.scene.add.text(
      PANEL_X + PAD, PANEL_Y + PANEL_H - 8,
      `Gold: ${this.playerGold}`,
      { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
    ).setOrigin(0, 0);
    c.add(goldLabel);
    this.dynObjects.push(goldLabel);
  }
}

/**
 * InventoryPanel — shows the player's items in a grid.
 *
 * Press I to toggle. Escape to close.
 * Fetches inventory from the game server REST API on show.
 *
 * Styled consistently with ChatOverlay and PlayerListPanel.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

const PANEL_W  = 180;
const PANEL_H  = 120;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 70;
const PAD      = 4;
const COLS     = 5;
const CELL     = 16;   // px per grid cell
const CELL_PAD = 2;

// ── Item data shape (mirrors server InventoryEntry) ───────────────────────────

export interface InventoryItem {
  id: string;
  quantity: number;
  equipped: boolean;
  item: {
    id: string;
    name: string;
    type: string;
    rarity: string;
    description: string;
    /** Minimum player level required to equip this item. */
    requiredLevel?: number;
  };
}

// HTTP base for REST calls — mirrors MultiplayerClient's server URL
const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

// Rarity colours (pixel-art palette)
const RARITY_COLOR: Record<string, number> = {
  common:    0xaaaaaa,
  uncommon:  0x44cc44,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xff8800,
};

export class InventoryPanel {
  private scene:   Phaser.Scene;
  private visible  = false;
  private iKey!:   Phaser.Input.Keyboard.Key;

  private container:   Phaser.GameObjects.Container;
  private items:       InventoryItem[] = [];
  private loading      = false;
  private selectedIdx  = -1;

  /** Set by GameScene so the panel can enforce level requirements. */
  playerLevel = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.iKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.rebuild();
  }

  // ── Update (called from GameScene.update) ─────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
      this.toggle();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  // ── Show / Hide ───────────────────────────────────────────────────────────

  private toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  show(): void {
    this.visible = true;
    this.selectedIdx = -1;
    this.rebuild();
    this.container.setVisible(true);
    this.fetchInventory();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  private fetchInventory(): void {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) {
      this.items = [];
      this.rebuild();
      return;
    }

    if (this.loading) return;
    this.loading = true;

    fetch(`${SERVER_HTTP}/inventory/${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: InventoryItem[]) => {
        this.items = data;
        this.loading = false;
        if (this.visible) this.rebuild();
      })
      .catch(() => {
        this.loading = false;
        // Keep showing whatever we had (or empty)
        if (this.visible) this.rebuild();
      });
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.85)
      .setOrigin(0, 0).setScrollFactor(0);

    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x334466, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // Header
    const header = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + 5,
      'Inventory',
      { fontSize: '5px', color: '#aaddff', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);

    const div = this.scene.add.graphics().setScrollFactor(0);
    div.lineStyle(1, 0x334466, 0.7);
    div.lineBetween(PANEL_X + 2, PANEL_Y + 14, PANEL_X + PANEL_W - 2, PANEL_Y + 14);

    this.container.add([bg, border, header, div]);

    // Loading indicator
    if (this.loading) {
      const loadTxt = this.scene.add.text(
        PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2,
        'Loading...',
        { fontSize: '4px', color: '#888899', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0);
      this.container.add(loadTxt);
      this.container.setVisible(this.visible).setDepth(DEPTH);
      return;
    }

    if (this.items.length === 0) {
      const emptyTxt = this.scene.add.text(
        PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2,
        this.loading ? 'Loading...' : 'Inventory is empty.',
        { fontSize: '4px', color: '#888899', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0);
      this.container.add(emptyTxt);
    }

    // Grid origin
    const gridX = PANEL_X + PAD;
    const gridY = PANEL_Y + 18;

    // Draw grid cells and items
    for (let i = 0; i < Math.min(this.items.length, COLS * 4); i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = gridX + col * (CELL + CELL_PAD);
      const cy  = gridY + row * (CELL + CELL_PAD);

      const entry = this.items[i];
      const rarityCol = RARITY_COLOR[entry?.item.rarity ?? 'common'] ?? RARITY_COLOR.common;
      const isSelected = i === this.selectedIdx;

      // Cell background
      const cell = this.scene.add.graphics().setScrollFactor(0);
      cell.fillStyle(isSelected ? 0x223366 : 0x111122, 0.9);
      cell.fillRect(cx, cy, CELL, CELL);
      cell.lineStyle(1, isSelected ? 0x8888ff : rarityCol, isSelected ? 1.0 : 0.5);
      cell.strokeRect(cx, cy, CELL, CELL);
      this.container.add(cell);

      if (entry) {
        // Item type icon (first char of type, coloured)
        const icon = this.scene.add.text(
          cx + CELL / 2, cy + CELL / 2 - 2,
          entry.item.name.slice(0, 1).toUpperCase(),
          { fontSize: '5px', color: `#${rarityCol.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
        ).setOrigin(0.5).setScrollFactor(0);

        // Quantity badge (bottom-right)
        if (entry.quantity > 1) {
          const qty = this.scene.add.text(
            cx + CELL - 1, cy + CELL - 1,
            String(entry.quantity),
            { fontSize: '3px', color: '#ffffff', fontFamily: 'monospace' },
          ).setOrigin(1, 1).setScrollFactor(0);
          this.container.add(qty);
        }

        // Equipped indicator (top-right star)
        if (entry.equipped) {
          const eq = this.scene.add.text(cx + CELL - 1, cy + 1, '★', {
            fontSize: '3px', color: '#ffd700', fontFamily: 'monospace',
          }).setOrigin(1, 0).setScrollFactor(0);
          this.container.add(eq);
        }

        this.container.add(icon);
      }
    }

    // Selected item detail (below grid)
    const detailY = gridY + Math.ceil(Math.min(this.items.length, COLS * 4) / COLS) * (CELL + CELL_PAD) + 4;
    if (this.selectedIdx >= 0 && this.selectedIdx < this.items.length) {
      const entry = this.items[this.selectedIdx];
      const nameStr = `${entry.item.name}`;
      const typeStr = `${entry.item.type}  ×${entry.quantity}${entry.equipped ? '  [equipped]' : ''}`;

      const nameTxt = this.scene.add.text(PANEL_X + PAD, detailY, nameStr, {
        fontSize: '4px', color: '#eeeeff', fontFamily: 'monospace',
      }).setScrollFactor(0);
      const typeTxt = this.scene.add.text(PANEL_X + PAD, detailY + 6, typeStr, {
        fontSize: '4px', color: '#aabbcc', fontFamily: 'monospace',
      }).setScrollFactor(0);
      this.container.add([nameTxt, typeTxt]);

      // Level requirement display
      const reqLvl = entry.item.requiredLevel ?? 0;
      if (reqLvl > 0) {
        const canEquip = this.playerLevel >= reqLvl;
        const lvlStr   = `Requires Lv.${reqLvl}${canEquip ? '' : '  (too low)'}`;
        const lvlTxt   = this.scene.add.text(PANEL_X + PAD, detailY + 13, lvlStr, {
          fontSize: '4px',
          color: canEquip ? '#88cc88' : '#ff4444',
          fontFamily: 'monospace',
        }).setScrollFactor(0);
        this.container.add(lvlTxt);
      }
    } else if (this.items.length > 0) {
      const hintTxt = this.scene.add.text(
        PANEL_X + PAD, Math.min(detailY, PANEL_Y + PANEL_H - 18),
        `${this.items.length} item(s)`,
        { fontSize: '4px', color: '#667788', fontFamily: 'monospace' },
      ).setScrollFactor(0);
      this.container.add(hintTxt);
    }

    // Overflow indicator: items beyond the visible grid cap
    if (this.items.length > COLS * 4) {
      const overflow = this.items.length - COLS * 4;
      const overflowTxt = this.scene.add.text(
        PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 16,
        `+${overflow} more`,
        { fontSize: '3px', color: '#ff9944', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);
      this.container.add(overflowTxt);
    }

    // Close hint
    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 6,
      '[I/Esc]',
      { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(0);
    this.container.add(hint);

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.container.destroy(true);
  }
}

/**
 * CraftingPanel — browse recipes, see required materials, and craft items.
 *
 * Press F (or interact with crafting station) to toggle.
 * Fetches recipes from the server and checks player inventory to highlight
 * craftable recipes. Sends a craft request on confirmation.
 *
 * Styled consistently with InventoryPanel and QuestLogPanel.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

const PANEL_W  = 220;
const PANEL_H  = 150;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 70;
const PAD      = 5;

// HTTP base mirrors MultiplayerClient URL
const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

// ── Data types ────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: RecipeIngredient[];
  craftingTime: number;
  description: string;
}

interface InventoryItem {
  id: string;
  quantity: number;
  item: { id: string; name: string; type: string; rarity: string };
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export class CraftingPanel {
  private scene:   Phaser.Scene;
  private visible  = false;
  private fKey!:   Phaser.Input.Keyboard.Key;

  private container: Phaser.GameObjects.Container;

  private recipes:   CraftingRecipe[] = [];
  private inventory: InventoryItem[]  = [];
  private selectedIdx = 0;

  private loading  = false;
  private crafting = false;
  private statusMsg = '';
  private statusColor = '#88ee88';

  /** Called with the crafted item id on success so GameScene can show feedback. */
  onCraftSuccess?: (itemId: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.fKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.rebuild();
  }

  // ── Update (called from GameScene.update) ──────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
      this.toggle();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  get isVisible(): boolean { return this.visible; }

  show(): void {
    this.visible    = true;
    this.statusMsg  = '';
    this.selectedIdx = 0;
    this.rebuild();
    this.container.setVisible(true);
    this.fetchData();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  // ── Navigation keys (called from GameScene when panel is open) ─────────────

  handleUp(): void {
    if (this.recipes.length === 0) return;
    this.selectedIdx = (this.selectedIdx - 1 + this.recipes.length) % this.recipes.length;
    this.statusMsg = '';
    this.rebuild();
  }

  handleDown(): void {
    if (this.recipes.length === 0) return;
    this.selectedIdx = (this.selectedIdx + 1) % this.recipes.length;
    this.statusMsg = '';
    this.rebuild();
  }

  handleCraft(): void {
    if (!this.visible || this.crafting) return;
    const recipe = this.recipes[this.selectedIdx];
    if (!recipe) return;
    if (!this.canCraft(recipe)) {
      this.statusMsg   = 'Not enough materials.';
      this.statusColor = '#ff8888';
      this.rebuild();
      return;
    }
    this.doCraft(recipe);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  private toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  private fetchData(): void {
    if (this.loading) return;
    this.loading = true;
    const userId = localStorage.getItem('pr_userId') ?? '';

    Promise.all([
      fetch(`${SERVER_HTTP}/crafting/recipes`).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      userId
        ? fetch(`${SERVER_HTTP}/inventory/${userId}`).then(r => r.ok ? r.json() : Promise.reject(r.status))
        : Promise.resolve([]),
    ])
      .then(([recipes, inv]: [CraftingRecipe[], InventoryItem[]]) => {
        this.recipes   = recipes;
        this.inventory = inv;
        this.loading   = false;
        if (this.visible) this.rebuild();
      })
      .catch(() => {
        this.loading = false;
        if (this.visible) this.rebuild();
      });
  }

  // ── Craft ──────────────────────────────────────────────────────────────────

  private canCraft(recipe: CraftingRecipe): boolean {
    return recipe.ingredients.every(({ itemId, quantity }) => {
      const owned = this.inventory
        .filter(e => e.item.id === itemId)
        .reduce((s, e) => s + e.quantity, 0);
      return owned >= quantity;
    });
  }

  private doCraft(recipe: CraftingRecipe): void {
    const userId = localStorage.getItem('pr_userId') ?? '';
    if (!userId) {
      this.statusMsg   = 'Not connected.';
      this.statusColor = '#ff8888';
      this.rebuild();
      return;
    }

    this.crafting  = true;
    this.statusMsg  = `Crafting ${recipe.name}...`;
    this.statusColor = '#ffee88';
    this.rebuild();

    fetch(`${SERVER_HTTP}/crafting/craft`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, recipeId: recipe.id }),
    })
      .then(r => r.json().then(body => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        this.crafting = false;
        if (ok && body.success) {
          this.statusMsg   = `✓ ${body.message}`;
          this.statusColor = '#88ee88';
          SoundManager.getInstance().playCraft();
          this.onCraftSuccess?.(body.outputItemId);
          // Refresh inventory to reflect consumed materials
          const uid = localStorage.getItem('pr_userId') ?? '';
          if (uid) {
            fetch(`${SERVER_HTTP}/inventory/${uid}`)
              .then(r => r.ok ? r.json() : Promise.reject())
              .then((inv: InventoryItem[]) => { this.inventory = inv; this.rebuild(); })
              .catch(() => {/* keep old inventory */});
          }
        } else {
          this.statusMsg   = body.error ?? 'Craft failed.';
          this.statusColor = '#ff8888';
        }
        if (this.visible) this.rebuild();
      })
      .catch(() => {
        this.crafting    = false;
        this.statusMsg   = 'Server error.';
        this.statusColor = '#ff8888';
        if (this.visible) this.rebuild();
      });
  }

  // ── Build UI ───────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    // Background + border
    const bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.87)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x664422, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    this.container.add([bg, border]);

    // Header
    const header = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + 5,
      '[ Crafting Station ]',
      { fontSize: '5px', color: '#ffcc88', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);
    const div = this.scene.add.graphics().setScrollFactor(0);
    div.lineStyle(1, 0x664422, 0.7);
    div.lineBetween(PANEL_X + 2, PANEL_Y + 14, PANEL_X + PANEL_W - 2, PANEL_Y + 14);
    this.container.add([header, div]);

    if (this.loading) {
      this.container.add(this.scene.add.text(
        PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, 'Loading...',
        { fontSize: '4px', color: '#888899', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0));
      this.container.setVisible(this.visible).setDepth(DEPTH);
      return;
    }

    if (this.recipes.length === 0) {
      this.container.add(this.scene.add.text(
        PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, 'No recipes available.',
        { fontSize: '4px', color: '#888899', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0));
      this.container.setVisible(this.visible).setDepth(DEPTH);
      return;
    }

    // Recipe list (left column, scrolled window of 7)
    const LIST_X   = PANEL_X + PAD;
    const LIST_Y   = PANEL_Y + 18;
    const ROW_H    = 10;
    const LIST_W   = 90;
    const VISIBLE  = 7;
    const startIdx = Math.max(0, Math.min(this.selectedIdx - 3, this.recipes.length - VISIBLE));

    for (let i = 0; i < VISIBLE; i++) {
      const idx = startIdx + i;
      if (idx >= this.recipes.length) break;
      const r       = this.recipes[idx];
      const craftable = this.canCraft(r);
      const isSel   = idx === this.selectedIdx;
      const rowY    = LIST_Y + i * ROW_H;

      if (isSel) {
        const selBg = this.scene.add.graphics().setScrollFactor(0);
        selBg.fillStyle(0x442200, 0.8);
        selBg.fillRect(LIST_X - 1, rowY - 1, LIST_W, ROW_H);
        this.container.add(selBg);
      }

      const nameColor = craftable ? '#ffee88' : '#664444';
      const prefix    = isSel ? '▸ ' : '  ';
      this.container.add(this.scene.add.text(
        LIST_X + 2, rowY,
        prefix + r.name,
        { fontSize: '4px', color: nameColor, fontFamily: 'monospace' },
      ).setScrollFactor(0));
    }

    // Divider between list and detail
    const divX = LIST_X + LIST_W + 2;
    const divLine = this.scene.add.graphics().setScrollFactor(0);
    divLine.lineStyle(1, 0x664422, 0.5);
    divLine.lineBetween(divX, PANEL_Y + 16, divX, PANEL_Y + PANEL_H - 10);
    this.container.add(divLine);

    // Detail panel (right column)
    const recipe = this.recipes[this.selectedIdx];
    const DX = divX + 4;
    let dy   = LIST_Y;

    if (recipe) {
      const craftable = this.canCraft(recipe);

      // Recipe name
      this.container.add(this.scene.add.text(DX, dy, recipe.name, {
        fontSize: '5px', color: '#ffcc88', fontFamily: 'monospace',
        wordWrap: { width: PANEL_W - (DX - PANEL_X) - PAD },
      }).setScrollFactor(0));
      dy += 8;

      // Description
      this.container.add(this.scene.add.text(DX, dy, recipe.description, {
        fontSize: '3px', color: '#999988', fontFamily: 'monospace',
        wordWrap: { width: PANEL_W - (DX - PANEL_X) - PAD },
      }).setScrollFactor(0));
      dy += 14;

      // Ingredients label
      this.container.add(this.scene.add.text(DX, dy, 'Requires:', {
        fontSize: '4px', color: '#aaaacc', fontFamily: 'monospace',
      }).setScrollFactor(0));
      dy += 7;

      for (const ing of recipe.ingredients) {
        const owned = this.inventory
          .filter(e => e.item.id === ing.itemId)
          .reduce((s, e) => s + e.quantity, 0);
        const hasEnough = owned >= ing.quantity;
        const ingColor  = hasEnough ? '#88ee88' : '#ff8888';
        const ingLabel  = `${ing.itemId.replace('mat_', '').replace(/_/g, ' ')} ×${ing.quantity} (${owned})`;
        this.container.add(this.scene.add.text(DX + 2, dy, ingLabel, {
          fontSize: '3px', color: ingColor, fontFamily: 'monospace',
        }).setScrollFactor(0));
        dy += 6;
      }

      dy += 4;

      // Output
      this.container.add(this.scene.add.text(DX, dy, `→ ${recipe.name} ×${recipe.outputQuantity}`, {
        fontSize: '4px', color: '#ffee88', fontFamily: 'monospace',
      }).setScrollFactor(0));
      dy += 8;

      // Craft button / hint
      if (!this.crafting) {
        const btnColor = craftable ? '#88ff88' : '#664444';
        const btnText  = craftable ? '[C] Craft' : '[C] Craft';
        this.container.add(this.scene.add.text(DX, dy, btnText, {
          fontSize: '4px', color: btnColor, fontFamily: 'monospace',
        }).setScrollFactor(0));
      }
    }

    // Status message
    if (this.statusMsg) {
      this.container.add(this.scene.add.text(
        PANEL_X + PAD, PANEL_Y + PANEL_H - 14,
        this.statusMsg,
        { fontSize: '3px', color: this.statusColor, fontFamily: 'monospace',
          wordWrap: { width: PANEL_W - PAD * 2 } },
      ).setScrollFactor(0));
    }

    // Bottom hints
    this.container.add(this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 6,
      '[↑↓] select  [C] craft  [F/Esc] close',
      { fontSize: '3px', color: '#554433', fontFamily: 'monospace' },
    ).setOrigin(1, 0).setScrollFactor(0));

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.container.destroy(true);
  }
}

/**
 * MarketplacePanel — auction house NPC UI.
 *
 * Press M (or interact with marketplace NPC) to open.
 *
 * Tabs:
 *   [Browse]  — see all active listings, click to buy
 *   [My Items] — list an item from inventory, or cancel existing listings
 *
 * All operations go through the server REST API. Persists via PostgreSQL.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { InventoryItem } from './InventoryPanel';

const PANEL_W  = 220;
const PANEL_H  = 160;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 80;
const PAD      = 4;

const LISTING_FEE_RATE = 0.05; // mirrors server constant

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

const RARITY_COLOR: Record<string, number> = {
  common:    0xaaaaaa,
  uncommon:  0x44cc44,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xff8800,
};

// ── Data shapes ───────────────────────────────────────────────────────────────

interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  itemRarity: string;
  itemType: string;
  quantity: number;
  priceGold: number;
  listedAt: string;
  expiresAt: string;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

type Tab = 'browse' | 'myitems';

export class MarketplacePanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private mKey!:     Phaser.Input.Keyboard.Key;

  private visible  = false;
  private tab:     Tab = 'browse';
  private loading  = false;
  private feedback = '';

  // Browse tab
  private listings:    MarketListing[] = [];
  private selectedListingIdx = -1;

  // My items tab
  private inventory:      InventoryItem[] = [];
  private selectedInvIdx  = -1;
  private listPrice       = 0;      // price player is typing

  /** Fired after a successful buy or list so other UI can refresh. */
  onTransactionComplete?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.mKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.rebuild();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      this.toggle();
    }
  }

  get isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    this.visible = true;
    this.tab     = 'browse';
    this.feedback = '';
    this.container.setVisible(true);
    this.fetchListings();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  private toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  private async fetchListings(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/listings`);
      if (r.ok) {
        this.listings = await r.json() as MarketListing[];
      }
    } catch { /* ignore */ }
    this.loading = false;
    if (this.visible) this.rebuild();
  }

  private async fetchInventory(): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) return;
    if (this.loading) return;
    this.loading = true;
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/inventory/${userId}`);
      if (r.ok) {
        this.inventory = await r.json() as InventoryItem[];
      }
    } catch { /* ignore */ }
    this.loading = false;
    if (this.visible) this.rebuild();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private async buyListing(listingId: string): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) { this.feedback = 'Not logged in'; this.rebuild(); return; }
    this.loading = true;
    this.feedback = '';
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/buy/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await r.json() as { success?: boolean; error?: string };
      if (r.ok && data.success) {
        this.feedback = '✦ Purchase successful!';
        this.onTransactionComplete?.();
        await this.fetchListings();
      } else {
        this.feedback = data.error ?? 'Purchase failed';
      }
    } catch { this.feedback = 'Network error'; }
    this.loading = false;
    this.rebuild();
  }

  private async createListing(invItem: InventoryItem, quantity: number, priceGold: number): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) { this.feedback = 'Not logged in'; this.rebuild(); return; }
    this.loading = true;
    this.feedback = '';
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, inventoryId: invItem.id, quantity, priceGold }),
      });
      const data = await r.json() as { listingId?: string; feeCharged?: number; error?: string };
      if (r.ok && data.listingId) {
        this.feedback = `Listed! Fee: ${data.feeCharged}g`;
        this.selectedInvIdx = -1;
        this.listPrice = 0;
        this.onTransactionComplete?.();
        await this.fetchInventory();
      } else {
        this.feedback = data.error ?? 'Listing failed';
      }
    } catch { this.feedback = 'Network error'; }
    this.loading = false;
    this.rebuild();
  }

  private async cancelListing(listingId: string): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) return;
    this.loading = true;
    this.feedback = '';
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await r.json() as { success?: boolean; error?: string };
      if (r.ok && data.success) {
        this.feedback = 'Listing cancelled. Item returned.';
        this.onTransactionComplete?.();
        await this.fetchListings();
      } else {
        this.feedback = data.error ?? 'Cancel failed';
      }
    } catch { this.feedback = 'Network error'; }
    this.loading = false;
    this.rebuild();
  }

  // ── Rebuild ───────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x000000, 0.88)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(1, 0x664422, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // Header
    const header = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + 4,
      '⚖ Marketplace',
      { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);

    this.container.add([bg, border, header]);

    // Tabs
    const tabY = PANEL_Y + 14;
    this.renderTab('Browse', 'browse', PANEL_X + PAD, tabY);
    this.renderTab('My Items', 'myitems', PANEL_X + 70, tabY);

    const divG = this.scene.add.graphics().setScrollFactor(0);
    divG.lineStyle(1, 0x664422, 0.7);
    divG.lineBetween(PANEL_X + 2, tabY + 10, PANEL_X + PANEL_W - 2, tabY + 10);
    this.container.add(divG);

    const contentY = tabY + 14;

    if (this.loading) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, contentY + 10, 'Loading…', {
          fontSize: '4px', color: '#888899', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
    } else if (this.tab === 'browse') {
      this.renderBrowseTab(contentY);
    } else {
      this.renderMyItemsTab(contentY);
    }

    // Feedback / error line
    if (this.feedback) {
      const fColor = this.feedback.startsWith('✦') ? '#88ff88' : '#ffaaaa';
      this.container.add(
        this.scene.add.text(PANEL_X + PAD, PANEL_Y + PANEL_H - 10, this.feedback, {
          fontSize: '3px', color: fColor, fontFamily: 'monospace',
        }).setScrollFactor(0),
      );
    }

    // Close hint
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 5, '[M/Esc]', {
        fontSize: '3px', color: '#445566', fontFamily: 'monospace',
      }).setOrigin(1, 0).setScrollFactor(0),
    );

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  private renderTab(label: string, id: Tab, x: number, y: number): void {
    const isActive = this.tab === id;
    const bg = this.scene.add
      .rectangle(x, y, 60, 10, isActive ? 0x333300 : 0x111111, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const txt = this.scene.add.text(x + 30, y + 5, label, {
      fontSize: '4px',
      color: isActive ? '#ffd700' : '#667788',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    bg.on('pointerup', () => {
      if (this.tab !== id) {
        this.tab = id;
        this.feedback = '';
        if (id === 'browse') {
          this.fetchListings();
        } else {
          this.fetchInventory();
        }
        this.rebuild();
      }
    });
    this.container.add([bg, txt]);
  }

  private renderBrowseTab(y: number): void {
    const myUserId = localStorage.getItem('pr_userId') ?? '';
    const rowH = 14;
    const maxRows = Math.floor((PANEL_H - (y - PANEL_Y) - 20) / rowH);

    if (this.listings.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, y + 10, 'No listings yet.', {
          fontSize: '4px', color: '#667788', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
      return;
    }

    const visibleListings = this.listings.slice(0, maxRows);

    visibleListings.forEach((listing, i) => {
      const rowY  = y + i * rowH;
      const isSelected = this.selectedListingIdx === i;
      const isOwn = listing.sellerId === myUserId;
      const rcHex = RARITY_COLOR[listing.itemRarity] ?? RARITY_COLOR.common;

      // Row background
      const rowBg = this.scene.add.rectangle(PANEL_X + PAD, rowY, PANEL_W - PAD * 2, rowH - 1,
        isSelected ? 0x332200 : 0x111111, 0.7).setOrigin(0, 0).setScrollFactor(0).setInteractive();
      rowBg.on('pointerup', () => {
        this.selectedListingIdx = (this.selectedListingIdx === i) ? -1 : i;
        this.rebuild();
      });

      // Item name (rarity coloured)
      const nameTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 2,
        `${listing.itemName} x${listing.quantity}`,
        { fontSize: '4px', color: `#${rcHex.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
      ).setScrollFactor(0);

      // Price
      const priceTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 2,
        `${listing.priceGold}g`,
        { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);

      // Seller
      const sellerTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 7,
        `by ${listing.sellerName}${isOwn ? ' (you)' : ''}`,
        { fontSize: '3px', color: '#556677', fontFamily: 'monospace' },
      ).setScrollFactor(0);

      this.container.add([rowBg, nameTxt, priceTxt, sellerTxt]);

      // Expanded actions for selected row
      if (isSelected) {
        if (isOwn) {
          // Cancel button
          const btn = this.scene.add.rectangle(PANEL_X + PAD + 2, rowY + rowH - 1, 50, 7, 0x553333, 0.9)
            .setOrigin(0, 0).setScrollFactor(0).setInteractive();
          const btnTxt = this.scene.add.text(PANEL_X + PAD + 27, rowY + rowH + 2, 'Cancel listing', {
            fontSize: '3px', color: '#ffaaaa', fontFamily: 'monospace',
          }).setOrigin(0.5).setScrollFactor(0);
          btn.on('pointerup', () => this.cancelListing(listing.id));
          this.container.add([btn, btnTxt]);
        } else {
          // Buy button
          const btn = this.scene.add.rectangle(PANEL_X + PAD + 2, rowY + rowH - 1, 50, 7, 0x224422, 0.9)
            .setOrigin(0, 0).setScrollFactor(0).setInteractive();
          const btnTxt = this.scene.add.text(PANEL_X + PAD + 27, rowY + rowH + 2, `Buy ${listing.priceGold}g`, {
            fontSize: '3px', color: '#88ff88', fontFamily: 'monospace',
          }).setOrigin(0.5).setScrollFactor(0);
          btn.on('pointerup', () => this.buyListing(listing.id));
          this.container.add([btn, btnTxt]);
        }
      }
    });

    // Refresh button
    const refreshBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 30, PANEL_Y + PANEL_H - 16, 30, 8, 0x223344, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const refreshTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 15, PANEL_Y + PANEL_H - 12, 'Refresh', {
      fontSize: '3px', color: '#aaddff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    refreshBtn.on('pointerup', () => this.fetchListings());
    this.container.add([refreshBtn, refreshTxt]);
  }

  private renderMyItemsTab(y: number): void {
    if (this.inventory.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, y + 10, 'Your inventory is empty.', {
          fontSize: '4px', color: '#667788', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
      return;
    }

    // Inventory list
    const rowH   = 10;
    const maxRows = 7;

    this.inventory.slice(0, maxRows).forEach((inv, i) => {
      const rowY  = y + i * rowH;
      const isSelected = this.selectedInvIdx === i;
      const rcHex = RARITY_COLOR[inv.item.rarity] ?? RARITY_COLOR.common;

      const rowBg = this.scene.add.rectangle(PANEL_X + PAD, rowY, PANEL_W - PAD * 2, rowH - 1, isSelected ? 0x223322 : 0x111111, 0.7)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive();
      rowBg.on('pointerup', () => {
        this.selectedInvIdx = (this.selectedInvIdx === i) ? -1 : i;
        if (this.selectedInvIdx >= 0) this.listPrice = 0;
        this.rebuild();
      });

      const nameTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 1,
        `${inv.item.name} x${inv.quantity}`,
        { fontSize: '4px', color: `#${rcHex.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
      ).setScrollFactor(0);
      const typeTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 1,
        inv.item.type,
        { fontSize: '3px', color: '#556677', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);

      this.container.add([rowBg, nameTxt, typeTxt]);
    });

    // List selected item form
    if (this.selectedInvIdx >= 0 && this.selectedInvIdx < this.inventory.length) {
      const inv       = this.inventory[this.selectedInvIdx];
      const formY     = y + maxRows * rowH + 2;
      const fee       = this.listPrice > 0 ? Math.max(1, Math.round(this.listPrice * LISTING_FEE_RATE)) : 0;
      const youReceive = Math.max(0, this.listPrice - fee);

      this.container.add(
        this.scene.add.text(PANEL_X + PAD, formY,
          `List ${inv.item.name} — set price:`,
          { fontSize: '3px', color: '#aabbcc', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Price buttons (quick set)
      const priceOptions = [10, 50, 100, 500];
      priceOptions.forEach((p, i) => {
        const isActive = this.listPrice === p;
        const btn = this.scene.add.rectangle(PANEL_X + PAD + i * 30, formY + 7, 28, 8,
          isActive ? 0x334433 : 0x222233, 0.9)
          .setOrigin(0, 0).setScrollFactor(0).setInteractive();
        if (isActive) btn.setStrokeStyle(1, 0x88cc88, 0.8);
        const btnTxt = this.scene.add.text(PANEL_X + PAD + i * 30 + 14, formY + 11, `${p}g`, {
          fontSize: '3px', color: isActive ? '#88ff88' : '#aaddff', fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0);
        btn.on('pointerup', () => {
          this.listPrice = p;
          this.rebuild();
        });
        this.container.add([btn, btnTxt]);
      });

      // Fee breakdown — only show when a price is selected
      if (this.listPrice > 0) {
        this.container.add(
          this.scene.add.text(PANEL_X + PAD, formY + 17,
            `Fee: ${fee}g (5%)   You receive: ${youReceive}g`,
            { fontSize: '3px', color: '#ffdd88', fontFamily: 'monospace' },
          ).setScrollFactor(0),
        );

        const listBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 55, formY + 17, 55, 8, 0x224422, 0.9)
          .setOrigin(0, 0).setScrollFactor(0).setInteractive();
        const listTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 27, formY + 21, 'List for sale', {
          fontSize: '3px', color: '#88ff88', fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0);
        listBtn.on('pointerup', () => this.createListing(inv, 1, this.listPrice));
        this.container.add([listBtn, listTxt]);
      }
    }
  }
}

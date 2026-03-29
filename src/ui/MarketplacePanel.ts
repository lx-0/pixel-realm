/**
 * MarketplacePanel — auction house NPC UI.
 *
 * Press J (or interact with Auctioneer NPC) to open.
 *
 * Tabs:
 *   [Browse]   — see active listings, filter by rarity, buy or place bids
 *   [My Items] — list an item from inventory with duration option; cancel existing listings
 *   [History]  — personal transaction log (bought, sold, expired)
 *
 * All operations go through the server REST API. Persists via PostgreSQL.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import type { InventoryItem } from './InventoryPanel';

const PANEL_W  = 220;
const PANEL_H  = 170;
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
  currentBid?: number;
  highBidder?: string;
  durationHours?: number;
  listedAt: string;
  expiresAt: string;
}

interface HistoryEntry {
  id: string;
  itemName: string;
  itemRarity: string;
  quantity: number;
  priceGold: number;
  action: 'bought' | 'sold' | 'expired' | 'bid_won' | 'bid_lost';
  at: string;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

type Tab = 'browse' | 'myitems' | 'history';

const RARITY_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'All',  value: '' },
  { label: 'Rare', value: 'rare' },
  { label: 'Epic', value: 'epic' },
  { label: 'Leg',  value: 'legendary' },
];

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
];

export class MarketplacePanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private mKey!:     Phaser.Input.Keyboard.Key;

  private visible  = false;
  private tab:     Tab = 'browse';
  private loading  = false;
  private feedback = '';

  // Browse tab
  private listings:           MarketListing[] = [];
  private selectedListingIdx  = -1;
  private filterRarity        = '';   // '' = all rarities
  private bidAmount           = 0;

  // My items tab
  private inventory:      InventoryItem[] = [];
  private selectedInvIdx  = -1;
  private listPrice       = 0;
  private listDuration    = 24;   // default: 24h

  // History tab
  private history: HistoryEntry[] = [];

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
      const params = this.filterRarity ? `?rarity=${this.filterRarity}` : '';
      const r = await fetch(`${SERVER_HTTP}/marketplace/listings${params}`);
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

  private async fetchHistory(): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) { this.feedback = 'Not logged in'; this.rebuild(); return; }
    if (this.loading) return;
    this.loading = true;
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/history/${userId}`);
      if (r.ok) {
        this.history = await r.json() as HistoryEntry[];
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
        this.selectedListingIdx = -1;
        this.onTransactionComplete?.();
        await this.fetchListings();
      } else {
        this.feedback = data.error ?? 'Purchase failed';
      }
    } catch { this.feedback = 'Network error'; }
    this.loading = false;
    this.rebuild();
  }

  private async placeBid(listingId: string, bidGold: number): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) { this.feedback = 'Not logged in'; this.rebuild(); return; }
    if (bidGold <= 0) { this.feedback = 'Select a bid amount first'; this.rebuild(); return; }
    this.loading = true;
    this.feedback = '';
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/bid/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bidGold }),
      });
      const data = await r.json() as { success?: boolean; newBid?: number; error?: string };
      if (r.ok && data.success) {
        this.feedback = `✦ Bid of ${data.newBid ?? bidGold}g placed!`;
        this.bidAmount = 0;
        this.selectedListingIdx = -1;
        await this.fetchListings();
      } else {
        this.feedback = data.error ?? 'Bid failed';
      }
    } catch { this.feedback = 'Network error'; }
    this.loading = false;
    this.rebuild();
  }

  private async createListing(invItem: InventoryItem, quantity: number, priceGold: number, durationHours: number): Promise<void> {
    const userId = localStorage.getItem('pr_userId');
    if (!userId) { this.feedback = 'Not logged in'; this.rebuild(); return; }
    this.loading = true;
    this.feedback = '';
    this.rebuild();
    try {
      const r = await fetch(`${SERVER_HTTP}/marketplace/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, inventoryId: invItem.id, quantity, priceGold, durationHours }),
      });
      const data = await r.json() as { listingId?: string; feeCharged?: number; error?: string };
      if (r.ok && data.listingId) {
        this.feedback = `Listed! Fee: ${data.feeCharged}g`;
        this.selectedInvIdx = -1;
        this.listPrice = 0;
        this.listDuration = 24;
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
      '⚖ Auction House',
      { fontSize: '5px', color: '#ffd700', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0).setScrollFactor(0);

    this.container.add([bg, border, header]);

    // Tabs — three tabs evenly spaced
    const tabY   = PANEL_Y + 14;
    const tabW   = 66;
    this.renderTab('Browse',   'browse',   PANEL_X + PAD,         tabY, tabW);
    this.renderTab('My Items', 'myitems',  PANEL_X + PAD + 74,    tabY, tabW);
    this.renderTab('History',  'history',  PANEL_X + PAD + 148,   tabY, tabW);

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
    } else if (this.tab === 'myitems') {
      this.renderMyItemsTab(contentY);
    } else {
      this.renderHistoryTab(contentY);
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
      this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 5, '[J/Esc]', {
        fontSize: '3px', color: '#445566', fontFamily: 'monospace',
      }).setOrigin(1, 0).setScrollFactor(0),
    );

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  private renderTab(label: string, id: Tab, x: number, y: number, w: number): void {
    const isActive = this.tab === id;
    const bg = this.scene.add
      .rectangle(x, y, w, 10, isActive ? 0x333300 : 0x111111, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const txt = this.scene.add.text(x + w / 2, y + 5, label, {
      fontSize: '4px',
      color: isActive ? '#ffd700' : '#667788',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    bg.on('pointerup', () => {
      if (this.tab !== id) {
        this.tab = id;
        this.feedback = '';
        this.selectedListingIdx = -1;
        this.selectedInvIdx = -1;
        if (id === 'browse') {
          this.fetchListings();
        } else if (id === 'myitems') {
          this.fetchInventory();
        } else {
          this.fetchHistory();
        }
        this.rebuild();
      }
    });
    this.container.add([bg, txt]);
  }

  // ── Browse tab ────────────────────────────────────────────────────────────

  private renderBrowseTab(y: number): void {
    const myUserId = localStorage.getItem('pr_userId') ?? '';

    // Rarity filter row
    const filterRowY = y;
    RARITY_FILTER_OPTIONS.forEach((opt, i) => {
      const isActive = this.filterRarity === opt.value;
      const bx = PANEL_X + PAD + i * 40;
      const btn = this.scene.add.rectangle(bx, filterRowY, 38, 8, isActive ? 0x333322 : 0x111111, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive();
      if (isActive) btn.setStrokeStyle(1, 0xaacc44, 0.8);
      const col = opt.value ? `#${(RARITY_COLOR[opt.value] ?? 0xaaaaaa).toString(16).padStart(6, '0')}` : '#aaaaaa';
      const btnTxt = this.scene.add.text(bx + 19, filterRowY + 4, opt.label, {
        fontSize: '3px', color: col, fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0);
      btn.on('pointerup', () => {
        if (this.filterRarity !== opt.value) {
          this.filterRarity = opt.value;
          this.selectedListingIdx = -1;
          this.fetchListings();
        }
      });
      this.container.add([btn, btnTxt]);
    });

    const listY  = y + 11;
    const rowH   = 14;
    const maxRows = Math.floor((PANEL_H - (listY - PANEL_Y) - 22) / rowH);

    const filtered = this.filterRarity
      ? this.listings.filter(l => l.itemRarity === this.filterRarity)
      : this.listings;

    if (filtered.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, listY + 10, 'No listings found.', {
          fontSize: '4px', color: '#667788', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
    } else {
      const visibleListings = filtered.slice(0, maxRows);

      visibleListings.forEach((listing, i) => {
        const rowY  = listY + i * rowH;
        const isSelected = this.selectedListingIdx === i;
        const isOwn = listing.sellerId === myUserId;
        const rcHex = RARITY_COLOR[listing.itemRarity] ?? RARITY_COLOR.common;

        const rowBg = this.scene.add.rectangle(PANEL_X + PAD, rowY, PANEL_W - PAD * 2, rowH - 1,
          isSelected ? 0x332200 : 0x111111, 0.7).setOrigin(0, 0).setScrollFactor(0).setInteractive();
        rowBg.on('pointerup', () => {
          if (this.selectedListingIdx === i) {
            this.selectedListingIdx = -1;
            this.bidAmount = 0;
          } else {
            this.selectedListingIdx = i;
            this.bidAmount = 0;
          }
          this.rebuild();
        });

        const nameTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 2,
          `${listing.itemName} x${listing.quantity}`,
          { fontSize: '4px', color: `#${rcHex.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
        ).setScrollFactor(0);

        const priceTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 2,
          `${listing.priceGold}g`,
          { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
        ).setOrigin(1, 0).setScrollFactor(0);

        const sellerTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 7,
          `by ${listing.sellerName}${isOwn ? ' (you)' : ''}`,
          { fontSize: '3px', color: '#556677', fontFamily: 'monospace' },
        ).setScrollFactor(0);

        // Current bid indicator
        if (listing.currentBid) {
          const bidTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 7,
            `bid:${listing.currentBid}g`,
            { fontSize: '3px', color: '#ff9944', fontFamily: 'monospace' },
          ).setOrigin(1, 0).setScrollFactor(0);
          this.container.add(bidTxt);
        }

        this.container.add([rowBg, nameTxt, priceTxt, sellerTxt]);

        if (isSelected) {
          const actY = rowY + rowH - 1;
          if (isOwn) {
            const btn = this.scene.add.rectangle(PANEL_X + PAD + 2, actY, 50, 7, 0x553333, 0.9)
              .setOrigin(0, 0).setScrollFactor(0).setInteractive();
            const btnTxt = this.scene.add.text(PANEL_X + PAD + 27, actY + 3, 'Cancel listing', {
              fontSize: '3px', color: '#ffaaaa', fontFamily: 'monospace',
            }).setOrigin(0.5).setScrollFactor(0);
            btn.on('pointerup', () => this.cancelListing(listing.id));
            this.container.add([btn, btnTxt]);
          } else {
            // Buy Now button
            const buyBtn = this.scene.add.rectangle(PANEL_X + PAD + 2, actY, 50, 7, 0x224422, 0.9)
              .setOrigin(0, 0).setScrollFactor(0).setInteractive();
            const buyTxt = this.scene.add.text(PANEL_X + PAD + 27, actY + 3, `Buy ${listing.priceGold}g`, {
              fontSize: '3px', color: '#88ff88', fontFamily: 'monospace',
            }).setOrigin(0.5).setScrollFactor(0);
            buyBtn.on('pointerup', () => this.buyListing(listing.id));
            this.container.add([buyBtn, buyTxt]);

            // Bid buttons — quick bid amounts below buy now
            const minBid  = (listing.currentBid ?? 0) + Math.max(1, Math.round(listing.priceGold * 0.05));
            const bidOpts = [minBid, Math.round(minBid * 1.2), Math.round(minBid * 1.5)];
            bidOpts.forEach((amt, bi) => {
              const bx     = PANEL_X + PAD + 56 + bi * 38;
              const isActiveBid = this.bidAmount === amt;
              const bidOptBtn = this.scene.add.rectangle(bx, actY, 35, 7, isActiveBid ? 0x332244 : 0x221133, 0.9)
                .setOrigin(0, 0).setScrollFactor(0).setInteractive();
              if (isActiveBid) bidOptBtn.setStrokeStyle(1, 0x9966ff, 0.8);
              const bidOptTxt = this.scene.add.text(bx + 17, actY + 3, `${amt}g`, {
                fontSize: '3px', color: isActiveBid ? '#cc99ff' : '#8866aa', fontFamily: 'monospace',
              }).setOrigin(0.5).setScrollFactor(0);
              bidOptBtn.on('pointerup', () => {
                this.bidAmount = (this.bidAmount === amt) ? 0 : amt;
                this.rebuild();
              });
              this.container.add([bidOptBtn, bidOptTxt]);
            });

            if (this.bidAmount > 0) {
              const confirmBidBtn = this.scene.add.rectangle(PANEL_X + PAD + 170, actY, 40, 7, 0x332255, 0.9)
                .setOrigin(0, 0).setScrollFactor(0).setInteractive();
              const confirmBidTxt = this.scene.add.text(PANEL_X + PAD + 190, actY + 3, `Bid!`, {
                fontSize: '3px', color: '#cc99ff', fontFamily: 'monospace',
              }).setOrigin(0.5).setScrollFactor(0);
              confirmBidBtn.on('pointerup', () => this.placeBid(listing.id, this.bidAmount));
              this.container.add([confirmBidBtn, confirmBidTxt]);
            }
          }
        }
      });
    }

    // Refresh button
    const refreshBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 30, PANEL_Y + PANEL_H - 16, 30, 8, 0x223344, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const refreshTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 15, PANEL_Y + PANEL_H - 12, 'Refresh', {
      fontSize: '3px', color: '#aaddff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    refreshBtn.on('pointerup', () => this.fetchListings());
    this.container.add([refreshBtn, refreshTxt]);
  }

  // ── My Items tab ──────────────────────────────────────────────────────────

  private renderMyItemsTab(y: number): void {
    if (this.inventory.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, y + 10, 'Your inventory is empty.', {
          fontSize: '4px', color: '#667788', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );
      return;
    }

    const rowH    = 10;
    const maxRows = 6;

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

    if (this.selectedInvIdx >= 0 && this.selectedInvIdx < this.inventory.length) {
      const inv    = this.inventory[this.selectedInvIdx];
      const formY  = y + maxRows * rowH + 2;
      const fee    = this.listPrice > 0 ? Math.max(1, Math.round(this.listPrice * LISTING_FEE_RATE)) : 0;
      const youReceive = Math.max(0, this.listPrice - fee);

      this.container.add(
        this.scene.add.text(PANEL_X + PAD, formY,
          `List: ${inv.item.name}`,
          { fontSize: '3px', color: '#aabbcc', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Price quick-set buttons
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
        btn.on('pointerup', () => { this.listPrice = p; this.rebuild(); });
        this.container.add([btn, btnTxt]);
      });

      // Duration selector row
      const durY = formY + 17;
      this.container.add(
        this.scene.add.text(PANEL_X + PAD, durY,
          'Duration:',
          { fontSize: '3px', color: '#aabbcc', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
      DURATION_OPTIONS.forEach((opt, i) => {
        const isActive = this.listDuration === opt.value;
        const bx = PANEL_X + PAD + 32 + i * 28;
        const btn = this.scene.add.rectangle(bx, durY, 26, 7, isActive ? 0x223344 : 0x111122, 0.9)
          .setOrigin(0, 0).setScrollFactor(0).setInteractive();
        if (isActive) btn.setStrokeStyle(1, 0x4488ff, 0.8);
        const btnTxt = this.scene.add.text(bx + 13, durY + 3, opt.label, {
          fontSize: '3px', color: isActive ? '#88ccff' : '#6688aa', fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0);
        btn.on('pointerup', () => { this.listDuration = opt.value; this.rebuild(); });
        this.container.add([btn, btnTxt]);
      });

      if (this.listPrice > 0) {
        const feeY = durY + 9;
        this.container.add(
          this.scene.add.text(PANEL_X + PAD, feeY,
            `Fee: ${fee}g  You get: ${youReceive}g`,
            { fontSize: '3px', color: '#ffdd88', fontFamily: 'monospace' },
          ).setScrollFactor(0),
        );

        const listBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 55, feeY, 55, 8, 0x224422, 0.9)
          .setOrigin(0, 0).setScrollFactor(0).setInteractive();
        const listTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 27, feeY + 4, 'List for sale', {
          fontSize: '3px', color: '#88ff88', fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0);
        listBtn.on('pointerup', () => this.createListing(inv, 1, this.listPrice, this.listDuration));
        this.container.add([listBtn, listTxt]);
      }
    }
  }

  // ── History tab ───────────────────────────────────────────────────────────

  private renderHistoryTab(y: number): void {
    const ACTION_COLORS: Record<string, string> = {
      bought:   '#88ff88',
      sold:     '#ffd700',
      expired:  '#aa6644',
      bid_won:  '#cc99ff',
      bid_lost: '#886699',
    };

    if (this.history.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, y + 10, 'No transactions yet.', {
          fontSize: '4px', color: '#667788', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0),
      );

      const refreshBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 30, PANEL_Y + PANEL_H - 16, 30, 8, 0x223344, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive();
      const refreshTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 15, PANEL_Y + PANEL_H - 12, 'Load', {
        fontSize: '3px', color: '#aaddff', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0);
      refreshBtn.on('pointerup', () => this.fetchHistory());
      this.container.add([refreshBtn, refreshTxt]);
      return;
    }

    const rowH    = 12;
    const maxRows = Math.floor((PANEL_H - (y - PANEL_Y) - 22) / rowH);

    this.history.slice(0, maxRows).forEach((entry, i) => {
      const rowY   = y + i * rowH;
      const rcHex  = RARITY_COLOR[entry.itemRarity] ?? RARITY_COLOR.common;
      const actCol = ACTION_COLORS[entry.action] ?? '#aaaaaa';
      const dateStr = entry.at ? new Date(entry.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '?';

      const rowBg = this.scene.add.rectangle(PANEL_X + PAD, rowY, PANEL_W - PAD * 2, rowH - 1, 0x111111, 0.6)
        .setOrigin(0, 0).setScrollFactor(0);

      const nameTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 1,
        `${entry.itemName} x${entry.quantity}`,
        { fontSize: '4px', color: `#${rcHex.toString(16).padStart(6, '0')}`, fontFamily: 'monospace' },
      ).setScrollFactor(0);

      const actionTxt = this.scene.add.text(PANEL_X + PAD + 2, rowY + 7,
        entry.action.replace('_', ' ').toUpperCase(),
        { fontSize: '3px', color: actCol, fontFamily: 'monospace' },
      ).setScrollFactor(0);

      const priceTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 1,
        `${entry.priceGold}g`,
        { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);

      const dateTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 7,
        dateStr,
        { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0);

      this.container.add([rowBg, nameTxt, actionTxt, priceTxt, dateTxt]);
    });

    const refreshBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 30, PANEL_Y + PANEL_H - 16, 30, 8, 0x223344, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive();
    const refreshTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 15, PANEL_Y + PANEL_H - 12, 'Refresh', {
      fontSize: '3px', color: '#aaddff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    refreshBtn.on('pointerup', () => this.fetchHistory());
    this.container.add([refreshBtn, refreshTxt]);
  }
}

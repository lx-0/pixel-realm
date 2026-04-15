/**
 * src/ui/NFTMarketplacePanel.ts
 *
 * Phaser UI panel for the on-chain NFT marketplace.
 * Toggle shortcut: N key (or via Auctioneer NPC interaction)
 *
 * Tabs:
 *   Browse   — active on-chain listings, buy with ETH
 *   My NFTs  — player's minted NFTs, list for sale
 *   My Listings — cancel active listings
 *
 * Requires WalletManager to be instantiated with contract addresses.
 * Falls back to a "Connect Wallet" prompt when no wallet is connected.
 */

import Phaser from "phaser";
import { WalletManager, type Listing } from "../systems/WalletManager";

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_W = 340;
const PANEL_H = 300;
const PANEL_DEPTH = 90;
const BG_COLOR = 0x1a1a2e;
const HEADER_COLOR = 0x16213e;
const TAB_ACTIVE_COLOR = 0xe94560;
const TAB_INACTIVE_COLOR = 0x0f3460;
const TEXT_COLOR = "#e0e0e0";
const DIM_COLOR = "#888888";
const PRICE_COLOR = "#f0c040";
const BTN_BUY_COLOR = 0x2d7a2d;
const BTN_CANCEL_COLOR = 0x7a2d2d;
const BTN_LIST_COLOR = 0x0f3460;

type Tab = "browse" | "myNFTs" | "myListings";

interface NFTRow {
  label: string;
  itemTypeId?: number;
  tokenId?: string;
  amount?: number;
  type: "item" | "land";
}

export class NFTMarketplacePanel {
  private scene: Phaser.Scene;
  private wallet: WalletManager;

  private container: Phaser.GameObjects.Container | null = null;
  private scrollY = 0;
  private currentTab: Tab = "browse";

  private listings: Listing[] = [];
  private myNFTs: NFTRow[] = [];
  private myListings: Listing[] = [];

  private loading = false;
  private statusText = "";

  private listPriceInput = "";
  private selectedNFT: NFTRow | null = null;

  constructor(scene: Phaser.Scene, wallet: WalletManager) {
    this.scene = scene;
    this.wallet = wallet;

    // Keyboard shortcut: N to toggle
    scene.input.keyboard?.on("keydown-N", () => {
      this.toggle();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  isOpen(): boolean {
    return this.container !== null;
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.isOpen()) return;
    this.scrollY = 0;
    this.statusText = "";
    this._build();
    this._loadTab();
  }

  close(): void {
    if (!this.container) return;
    this.container.destroy();
    this.container = null;
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  private _build(): void {
    const { width, height } = this.scene.scale;
    const x = (width - PANEL_W) / 2;
    const y = (height - PANEL_H) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(PANEL_DEPTH);

    this._renderAll();
  }

  private _renderAll(): void {
    if (!this.container) return;
    this.container.removeAll(true);

    const panel = this;

    // ── Background ──────────────────────────────────────────────────────────────
    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, BG_COLOR, 0.97)
      .setOrigin(0, 0)
      .setInteractive(); // block click-through
    this.container.add(bg);

    // ── Header ──────────────────────────────────────────────────────────────────
    const header = this.scene.add.rectangle(0, 0, PANEL_W, 28, HEADER_COLOR, 1).setOrigin(0, 0);
    this.container.add(header);

    this.scene.add.text(10, 6, "⬡ NFT Marketplace", {
      fontSize: "13px", color: TEXT_COLOR, fontFamily: "monospace",
    }).setDepth(1);
    this.container.add(this.scene.add.text(10, 6, "⬡ NFT Marketplace", {
      fontSize: "13px", color: TEXT_COLOR, fontFamily: "monospace",
    }));

    // Close button
    const closeBtn = this.scene.add.text(PANEL_W - 20, 6, "✕", {
      fontSize: "13px", color: "#ff6666", fontFamily: "monospace",
    }).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    this.container.add(closeBtn);

    // ── Wallet status bar ────────────────────────────────────────────────────────
    const { connected, address } = this.wallet.state;
    const walletLabel = connected
      ? `🔗 ${address!.slice(0, 6)}…${address!.slice(-4)}`
      : "No wallet connected";
    const walletColor = connected ? "#50fa7b" : "#ff6666";

    this.container.add(
      this.scene.add.text(10, 32, walletLabel, {
        fontSize: "10px", color: walletColor, fontFamily: "monospace",
      }),
    );

    if (!connected) {
      const connectBtn = this.scene.add.text(PANEL_W - 110, 28, "[ Connect Wallet ]", {
        fontSize: "10px", color: "#ffff80", fontFamily: "monospace", backgroundColor: "#333",
        padding: { x: 4, y: 2 },
      }).setInteractive({ useHandCursor: true });
      connectBtn.on("pointerdown", () => this._connectWallet());
      this.container.add(connectBtn);
    }

    // ── Tabs ─────────────────────────────────────────────────────────────────────
    const tabs: { key: Tab; label: string }[] = [
      { key: "browse", label: "Browse" },
      { key: "myNFTs", label: "My NFTs" },
      { key: "myListings", label: "My Listings" },
    ];
    const tabW = PANEL_W / tabs.length;

    tabs.forEach((tab, i) => {
      const isActive = this.currentTab === tab.key;
      const tabBg = this.scene.add
        .rectangle(i * tabW, 48, tabW, 20, isActive ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      tabBg.on("pointerdown", () => {
        panel.currentTab = tab.key;
        panel.scrollY = 0;
        panel.statusText = "";
        panel._loadTab();
      });
      this.container!.add(tabBg);

      this.container!.add(
        this.scene.add.text(i * tabW + tabW / 2, 57, tab.label, {
          fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0.5),
      );
    });

    // ── Content area ─────────────────────────────────────────────────────────────
    const contentY = 72;
    const contentH = PANEL_H - contentY - 30;

    if (this.loading) {
      this.container.add(
        this.scene.add.text(PANEL_W / 2, contentY + 40, "Loading…", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
    } else if (this.currentTab === "browse") {
      this._renderBrowseTab(contentY, contentH);
    } else if (this.currentTab === "myNFTs") {
      this._renderMyNFTsTab(contentY, contentH);
    } else {
      this._renderMyListingsTab(contentY, contentH);
    }

    // ── Status bar ───────────────────────────────────────────────────────────────
    if (this.statusText) {
      this.container.add(
        this.scene.add.text(10, PANEL_H - 20, this.statusText, {
          fontSize: "9px", color: "#ffff80", fontFamily: "monospace",
        }),
      );
    }

    // ── Scroll buttons ────────────────────────────────────────────────────────────
    const upBtn = this.scene.add.text(PANEL_W - 24, 70, "▲", {
      fontSize: "10px", color: DIM_COLOR, fontFamily: "monospace",
    }).setInteractive({ useHandCursor: true });
    upBtn.on("pointerdown", () => {
      if (panel.scrollY > 0) { panel.scrollY -= 22; panel._renderAll(); }
    });
    this.container.add(upBtn);

    const downBtn = this.scene.add.text(PANEL_W - 24, PANEL_H - 32, "▼", {
      fontSize: "10px", color: DIM_COLOR, fontFamily: "monospace",
    }).setInteractive({ useHandCursor: true });
    downBtn.on("pointerdown", () => { panel.scrollY += 22; panel._renderAll(); });
    this.container.add(downBtn);
  }

  // ── Browse tab ───────────────────────────────────────────────────────────────

  private _renderBrowseTab(startY: number, _height: number): void {
    if (this.listings.length === 0) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "No active listings", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    const rowH = 38;
    let y = startY - this.scrollY;

    for (const listing of this.listings) {
      if (y + rowH < startY || y > startY + _height) { y += rowH; continue; }

      const label = listing.tokenType === "ERC1155"
        ? `Item #${listing.tokenId} ×${listing.amount}`
        : `Land #${listing.tokenId}`;

      this.container!.add(
        this.scene.add.text(10, y + 4, label, {
          fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
        }),
      );
      this.container!.add(
        this.scene.add.text(10, y + 18, `${listing.priceEth} ETH`, {
          fontSize: "10px", color: PRICE_COLOR, fontFamily: "monospace",
        }),
      );

      const buyBtn = this.scene.add
        .rectangle(PANEL_W - 64, y + 12, 54, 22, BTN_BUY_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const buyLabel = this.scene.add.text(PANEL_W - 61, y + 14, "Buy", {
        fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
      });

      const capturedListing = listing;
      buyBtn.on("pointerdown", () => this._buyItem(capturedListing));

      this.container!.add([buyBtn, buyLabel]);

      // Divider
      this.container!.add(
        this.scene.add.rectangle(10, y + rowH - 2, PANEL_W - 20, 1, 0x333355, 1).setOrigin(0, 0),
      );

      y += rowH;
    }
  }

  // ── My NFTs tab ──────────────────────────────────────────────────────────────

  private _renderMyNFTsTab(startY: number, _height: number): void {
    if (!this.wallet.state.connected) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "Connect wallet to view NFTs", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    if (this.myNFTs.length === 0) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "No NFTs in your wallet", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    const rowH = 36;
    let y = startY - this.scrollY;

    for (const nft of this.myNFTs) {
      if (y + rowH < startY || y > startY + _height) { y += rowH; continue; }

      const isSelected = this.selectedNFT === nft;
      if (isSelected) {
        this.container!.add(
          this.scene.add.rectangle(6, y, PANEL_W - 12, rowH - 2, 0x0f3460, 0.5).setOrigin(0, 0),
        );
      }

      this.container!.add(
        this.scene.add.text(10, y + 4, nft.label, {
          fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
        }),
      );

      const listBtn = this.scene.add
        .rectangle(PANEL_W - 64, y + 6, 54, 20, BTN_LIST_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const listLabel = this.scene.add.text(PANEL_W - 61, y + 8, "List", {
        fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
      });

      const capturedNft = nft;
      listBtn.on("pointerdown", () => {
        this.selectedNFT = capturedNft;
        this._renderAll();
      });

      this.container!.add([listBtn, listLabel]);
      y += rowH;
    }

    // List form shown when an NFT is selected
    if (this.selectedNFT) {
      const formY = startY + _height - 50;
      this.container!.add(
        this.scene.add.text(10, formY, `Listing: ${this.selectedNFT.label}`, {
          fontSize: "9px", color: PRICE_COLOR, fontFamily: "monospace",
        }),
      );

      // Price input (simplified — uses HTML prompt since Phaser has no native text input)
      const priceDisplay = this.listPriceInput || "0.01";
      const priceBtn = this.scene.add.text(10, formY + 14, `Price: ${priceDisplay} ETH [edit]`, {
        fontSize: "9px", color: TEXT_COLOR, fontFamily: "monospace",
      }).setInteractive({ useHandCursor: true });
      priceBtn.on("pointerdown", () => {
        const val = window.prompt("Enter listing price in ETH (e.g. 0.05):", this.listPriceInput || "0.01");
        if (val !== null) { this.listPriceInput = val; this._renderAll(); }
      });
      this.container!.add(priceBtn);

      const confirmBtn = this.scene.add
        .rectangle(PANEL_W - 84, formY + 10, 74, 20, BTN_BUY_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const confirmLabel = this.scene.add.text(PANEL_W - 81, formY + 12, "Confirm List", {
        fontSize: "9px", color: TEXT_COLOR, fontFamily: "monospace",
      });
      confirmBtn.on("pointerdown", () => this._createListing());
      this.container!.add([confirmBtn, confirmLabel]);
    }
  }

  // ── My Listings tab ──────────────────────────────────────────────────────────

  private _renderMyListingsTab(startY: number, _height: number): void {
    if (!this.wallet.state.connected) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "Connect wallet to view your listings", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    if (this.myListings.length === 0) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "No active listings", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    const rowH = 38;
    let y = startY - this.scrollY;

    for (const listing of this.myListings) {
      if (y + rowH < startY || y > startY + _height) { y += rowH; continue; }

      const label = listing.tokenType === "ERC1155"
        ? `Item #${listing.tokenId} ×${listing.amount}`
        : `Land #${listing.tokenId}`;

      this.container!.add(
        this.scene.add.text(10, y + 4, label, {
          fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
        }),
      );
      this.container!.add(
        this.scene.add.text(10, y + 18, `${listing.priceEth} ETH`, {
          fontSize: "10px", color: PRICE_COLOR, fontFamily: "monospace",
        }),
      );

      const cancelBtn = this.scene.add
        .rectangle(PANEL_W - 74, y + 8, 64, 20, BTN_CANCEL_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const cancelLabel = this.scene.add.text(PANEL_W - 71, y + 10, "Cancel", {
        fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
      });
      const capturedListing = listing;
      cancelBtn.on("pointerdown", () => this._cancelListing(capturedListing));

      this.container!.add([cancelBtn, cancelLabel]);

      this.container!.add(
        this.scene.add.rectangle(10, y + rowH - 2, PANEL_W - 20, 1, 0x333355, 1).setOrigin(0, 0),
      );

      y += rowH;
    }
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  private async _loadTab(): Promise<void> {
    this.loading = true;
    this._renderAll();

    try {
      if (this.currentTab === "browse") {
        this.listings = await this.wallet.getListings();
      } else if (this.currentTab === "myNFTs") {
        await this._loadMyNFTs();
      } else {
        this.myListings = await this.wallet.getMyListings();
      }
    } catch (err) {
      this.statusText = "Failed to load: " + (err instanceof Error ? err.message : String(err));
    }

    this.loading = false;
    this._renderAll();
  }

  private async _loadMyNFTs(): Promise<void> {
    if (!this.wallet.state.address) return;
    const rows: NFTRow[] = [];
    try {
      const resp = await fetch(`/nft/inventory/${this.wallet.state.address}`);
      if (!resp.ok) throw new Error("Server unreachable");
      const data = await resp.json() as {
        items: Array<{ itemTypeId: number; balance: string }>;
        land: Array<{ tokenId: string; zoneId: string; plotIndex: string }>;
      };
      for (const item of data.items) {
        rows.push({
          label: `Item #${item.itemTypeId} ×${item.balance}`,
          itemTypeId: item.itemTypeId,
          amount: parseInt(item.balance, 10) || 0,
          type: "item",
        });
      }
      for (const plot of data.land) {
        rows.push({
          label: `Land: ${plot.zoneId} plot ${plot.plotIndex}`,
          tokenId: plot.tokenId,
          type: "land",
        });
      }
    } catch (err) {
      this.statusText = "Inventory load failed: " + (err instanceof Error ? err.message : String(err));
    }
    this.myNFTs = rows;
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  private async _connectWallet(): Promise<void> {
    this.statusText = "Connecting wallet…";
    this._renderAll();
    try {
      await this.wallet.connect();
      this.statusText = "Wallet connected!";
      this._loadTab();
    } catch (err) {
      this.statusText = err instanceof Error ? err.message : "Connection failed";
      this._renderAll();
    }
  }

  private async _buyItem(listing: Listing): Promise<void> {
    if (!this.wallet.state.connected) {
      this.statusText = "Connect wallet to buy";
      this._renderAll();
      return;
    }
    this.statusText = `Buying listing #${listing.listingId}…`;
    this._renderAll();
    try {
      const { txHash } = await this.wallet.buyItem(listing.listingId, listing.priceWei);
      this.statusText = `Purchased! tx: ${txHash.slice(0, 10)}…`;
      this.listings = await this.wallet.getListings();
    } catch (err) {
      this.statusText = "Buy failed: " + (err instanceof Error ? err.message : String(err));
    }
    this._renderAll();
  }

  private async _createListing(): Promise<void> {
    const nft = this.selectedNFT;
    if (!nft) return;
    if (!this.wallet.state.connected) {
      this.statusText = "Connect wallet first";
      this._renderAll();
      return;
    }
    const price = this.listPriceInput || "0.01";
    this.statusText = `Listing ${nft.label} for ${price} ETH…`;
    this._renderAll();
    try {
      let result: { listingId: string; txHash: string };
      if (nft.type === "item" && nft.itemTypeId !== undefined) {
        result = await this.wallet.listItem(nft.itemTypeId, nft.amount ?? 1, price);
      } else if (nft.tokenId !== undefined) {
        result = await this.wallet.listLand(nft.tokenId, price);
      } else {
        throw new Error("Unknown NFT type");
      }
      this.statusText = `Listed! ID: ${result.listingId}, tx: ${result.txHash.slice(0, 10)}…`;
      this.selectedNFT = null;
      this.listPriceInput = "";
      await this._loadMyNFTs();
    } catch (err) {
      this.statusText = "List failed: " + (err instanceof Error ? err.message : String(err));
    }
    this._renderAll();
  }

  private async _cancelListing(listing: Listing): Promise<void> {
    this.statusText = `Cancelling listing #${listing.listingId}…`;
    this._renderAll();
    try {
      const { txHash } = await this.wallet.cancelListing(listing.listingId);
      this.statusText = `Cancelled! tx: ${txHash.slice(0, 10)}…`;
      this.myListings = await this.wallet.getMyListings();
    } catch (err) {
      this.statusText = "Cancel failed: " + (err instanceof Error ? err.message : String(err));
    }
    this._renderAll();
  }
}

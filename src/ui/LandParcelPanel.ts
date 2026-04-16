/**
 * src/ui/LandParcelPanel.ts
 *
 * Phaser UI panel for managing ERC-721 land parcels.
 * Toggle shortcut: L key
 *
 * Tabs:
 *   My Land    — owned parcels, claim new land, build on owned land
 *   Transfer   — send a parcel to another wallet address
 *
 * Requires WalletManager to be instantiated with contract addresses.
 * Falls back to a "Connect Wallet" prompt when no wallet is connected.
 */

import Phaser from "phaser";
import { WalletManager, type LandParcel } from "../systems/WalletManager";
import { LAND_GRID } from "../config/constants";

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_W = 320;
const PANEL_H = 280;
const PANEL_DEPTH = 91;
const BG_COLOR = 0x0d1b0d;
const HEADER_COLOR = 0x0a1408;
const TAB_ACTIVE_COLOR = 0x2d7a2d;
const TAB_INACTIVE_COLOR = 0x0f3010;
const TEXT_COLOR = "#d4e8d4";
const DIM_COLOR = "#668866";
const ACCENT_COLOR = "#50fa7b";
const WARN_COLOR = "#ff6666";
const GOLD_COLOR = "#f0c040";
const BTN_COLOR = 0x2d7a2d;
const BTN_DANGER_COLOR = 0x7a2d2d;

type Tab = "myLand" | "transfer";

export interface LandParcelPanelCallbacks {
  /** Called when the player wants to build on a parcel (opens HousingScene). */
  onBuild?: (parcel: LandParcel) => void;
  /** Called when a transfer succeeds — caller should refresh world map. */
  onTransferComplete?: (parcel: LandParcel, toAddress: string) => void;
  /** Auth token for /nft/land/claim endpoint. */
  authToken?: string;
}

export class LandParcelPanel {
  private scene: Phaser.Scene;
  private wallet: WalletManager;
  private callbacks: LandParcelPanelCallbacks;

  private container: Phaser.GameObjects.Container | null = null;
  private currentTab: Tab = "myLand";
  private scrollY = 0;

  private parcels: LandParcel[] = [];
  private selectedParcel: LandParcel | null = null;
  private transferAddress = "";
  private loading = false;
  private statusText = "";

  constructor(
    scene: Phaser.Scene,
    wallet: WalletManager,
    callbacks: LandParcelPanelCallbacks = {},
  ) {
    this.scene = scene;
    this.wallet = wallet;
    this.callbacks = callbacks;

    // Keyboard shortcut: L to toggle
    scene.input.keyboard?.on("keydown-L", () => {
      this.toggle();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  isOpen(): boolean {
    return this.container !== null;
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen()) return;
    this.scrollY = 0;
    this.statusText = "";
    this.selectedParcel = null;
    this._build();
    this._loadParcels();
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

    // ── Background ──────────────────────────────────────────────────────────────
    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, BG_COLOR, 0.97)
      .setOrigin(0, 0)
      .setInteractive();
    this.container.add(bg);

    // ── Header ──────────────────────────────────────────────────────────────────
    const header = this.scene.add.rectangle(0, 0, PANEL_W, 28, HEADER_COLOR, 1).setOrigin(0, 0);
    this.container.add(header);

    this.container.add(
      this.scene.add.text(10, 6, "⬡ Land Parcels", {
        fontSize: "13px", color: ACCENT_COLOR, fontFamily: "monospace",
      }),
    );

    const closeBtn = this.scene.add.text(PANEL_W - 20, 6, "✕", {
      fontSize: "13px", color: WARN_COLOR, fontFamily: "monospace",
    }).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    this.container.add(closeBtn);

    // ── Wallet status ────────────────────────────────────────────────────────────
    const { connected, address } = this.wallet.state;
    const walletLabel = connected
      ? `🔗 ${address!.slice(0, 6)}…${address!.slice(-4)}`
      : "No wallet connected";
    this.container.add(
      this.scene.add.text(10, 32, walletLabel, {
        fontSize: "10px",
        color: connected ? ACCENT_COLOR : WARN_COLOR,
        fontFamily: "monospace",
      }),
    );

    if (!connected) {
      const connectBtn = this.scene.add.text(PANEL_W - 120, 28, "[ Connect Wallet ]", {
        fontSize: "10px", color: "#ffff80", fontFamily: "monospace",
        backgroundColor: "#333", padding: { x: 4, y: 2 },
      }).setInteractive({ useHandCursor: true });
      connectBtn.on("pointerdown", () => this._connectWallet());
      this.container.add(connectBtn);
    }

    // ── Tabs ─────────────────────────────────────────────────────────────────────
    const tabs: { key: Tab; label: string }[] = [
      { key: "myLand", label: "My Land" },
      { key: "transfer", label: "Transfer" },
    ];
    const tabW = PANEL_W / tabs.length;

    tabs.forEach((tab, i) => {
      const isActive = this.currentTab === tab.key;
      const tabBg = this.scene.add
        .rectangle(i * tabW, 48, tabW, 20, isActive ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      tabBg.on("pointerdown", () => {
        this.currentTab = tab.key;
        this.scrollY = 0;
        this.statusText = "";
        this._renderAll();
      });
      this.container!.add(tabBg);

      this.container!.add(
        this.scene.add.text(i * tabW + tabW / 2, 57, tab.label, {
          fontSize: "10px", color: TEXT_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0.5),
      );
    });

    // ── Content ──────────────────────────────────────────────────────────────────
    const contentY = 72;
    const contentH = PANEL_H - contentY - 30;

    if (this.loading) {
      this.container.add(
        this.scene.add.text(PANEL_W / 2, contentY + 40, "Loading…", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
    } else if (this.currentTab === "myLand") {
      this._renderMyLandTab(contentY, contentH);
    } else {
      this._renderTransferTab(contentY, contentH);
    }

    // ── Status bar ───────────────────────────────────────────────────────────────
    if (this.statusText) {
      this.container.add(
        this.scene.add.text(10, PANEL_H - 20, this.statusText, {
          fontSize: "9px", color: "#ffff80", fontFamily: "monospace",
          wordWrap: { width: PANEL_W - 20 },
        }),
      );
    }

    // ── Scroll buttons ────────────────────────────────────────────────────────────
    const upBtn = this.scene.add.text(PANEL_W - 24, 70, "▲", {
      fontSize: "10px", color: DIM_COLOR, fontFamily: "monospace",
    }).setInteractive({ useHandCursor: true });
    upBtn.on("pointerdown", () => {
      if (this.scrollY > 0) { this.scrollY -= 22; this._renderAll(); }
    });
    this.container.add(upBtn);

    const downBtn = this.scene.add.text(PANEL_W - 24, PANEL_H - 32, "▼", {
      fontSize: "10px", color: DIM_COLOR, fontFamily: "monospace",
    }).setInteractive({ useHandCursor: true });
    downBtn.on("pointerdown", () => { this.scrollY += 22; this._renderAll(); });
    this.container.add(downBtn);
  }

  // ── My Land tab ──────────────────────────────────────────────────────────────

  private _renderMyLandTab(startY: number, height: number): void {
    if (!this.wallet.state.connected) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "Connect wallet to view owned land", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    if (this.parcels.length === 0) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 20, "No land parcels owned", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );

      // Claim prompt
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 40, "Visit a zone and claim land to start building", {
          fontSize: "9px", color: DIM_COLOR, fontFamily: "monospace",
          wordWrap: { width: PANEL_W - 40 },
        }).setOrigin(0.5, 0),
      );
      return;
    }

    const rowH = 40;
    let y = startY - this.scrollY;

    for (const parcel of this.parcels) {
      if (y + rowH < startY || y > startY + height) { y += rowH; continue; }

      const isSelected = this.selectedParcel?.tokenId === parcel.tokenId;
      if (isSelected) {
        this.container!.add(
          this.scene.add.rectangle(6, y, PANEL_W - 32, rowH - 2, 0x0f3010, 0.7).setOrigin(0, 0),
        );
      }

      const grid = LAND_GRID[parcel.zoneId];
      const maxPlots = grid?.maxPlots ?? "?";
      const zoneName = parcel.zoneId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      this.container!.add(
        this.scene.add.text(10, y + 4, `${zoneName}`, {
          fontSize: "10px", color: ACCENT_COLOR, fontFamily: "monospace",
        }),
      );
      this.container!.add(
        this.scene.add.text(10, y + 16, `Plot ${parcel.plotIndex} / ${typeof maxPlots === "number" ? maxPlots - 1 : maxPlots}  |  Token #${parcel.tokenId.slice(0, 8)}…`, {
          fontSize: "9px", color: DIM_COLOR, fontFamily: "monospace",
        }),
      );

      // Build button
      if (this.callbacks.onBuild) {
        const buildBtn = this.scene.add
          .rectangle(PANEL_W - 120, y + 8, 50, 18, BTN_COLOR, 1)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        const buildLabel = this.scene.add.text(PANEL_W - 118, y + 10, "Build", {
          fontSize: "9px", color: TEXT_COLOR, fontFamily: "monospace",
        });
        const captured = parcel;
        buildBtn.on("pointerdown", () => this.callbacks.onBuild!(captured));
        this.container!.add([buildBtn, buildLabel]);
      }

      // Select for transfer
      const selectBtn = this.scene.add
        .rectangle(PANEL_W - 64, y + 8, 54, 18, isSelected ? 0x5a3a00 : 0x222222, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const selectLabel = this.scene.add.text(PANEL_W - 62, y + 10, "Select", {
        fontSize: "9px", color: isSelected ? GOLD_COLOR : TEXT_COLOR, fontFamily: "monospace",
      });
      const captured = parcel;
      selectBtn.on("pointerdown", () => {
        this.selectedParcel = isSelected ? null : captured;
        this._renderAll();
      });
      this.container!.add([selectBtn, selectLabel]);

      // Divider
      this.container!.add(
        this.scene.add.rectangle(10, y + rowH - 2, PANEL_W - 32, 1, 0x1a3a1a, 1).setOrigin(0, 0),
      );

      y += rowH;
    }
  }

  // ── Transfer tab ─────────────────────────────────────────────────────────────

  private _renderTransferTab(startY: number, _height: number): void {
    if (!this.wallet.state.connected) {
      this.container!.add(
        this.scene.add.text(PANEL_W / 2, startY + 30, "Connect wallet to transfer land", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
      return;
    }

    let y = startY + 6;

    // Selected parcel info
    this.container!.add(
      this.scene.add.text(10, y, "Selected parcel:", {
        fontSize: "10px", color: DIM_COLOR, fontFamily: "monospace",
      }),
    );
    y += 14;

    if (this.selectedParcel) {
      const zoneName = this.selectedParcel.zoneId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      this.container!.add(
        this.scene.add.text(10, y, `${zoneName} — Plot ${this.selectedParcel.plotIndex}`, {
          fontSize: "10px", color: ACCENT_COLOR, fontFamily: "monospace",
        }),
      );
      y += 14;
      this.container!.add(
        this.scene.add.text(10, y, `Token: ${this.selectedParcel.tokenId.slice(0, 16)}…`, {
          fontSize: "9px", color: DIM_COLOR, fontFamily: "monospace",
        }),
      );
    } else {
      this.container!.add(
        this.scene.add.text(10, y, "None — select a parcel from My Land tab", {
          fontSize: "9px", color: DIM_COLOR, fontFamily: "monospace",
        }),
      );
    }

    y += 20;

    // Recipient address input
    this.container!.add(
      this.scene.add.text(10, y, "Recipient address:", {
        fontSize: "10px", color: DIM_COLOR, fontFamily: "monospace",
      }),
    );
    y += 14;

    const addrDisplay = this.transferAddress || "(tap to enter address)";
    const addrBtn = this.scene.add.text(10, y, addrDisplay, {
      fontSize: "9px",
      color: this.transferAddress ? TEXT_COLOR : DIM_COLOR,
      fontFamily: "monospace",
      wordWrap: { width: PANEL_W - 20 },
    }).setInteractive({ useHandCursor: true });
    addrBtn.on("pointerdown", () => {
      const val = window.prompt("Enter recipient wallet address (0x…):", this.transferAddress);
      if (val !== null) { this.transferAddress = val.trim(); this._renderAll(); }
    });
    this.container!.add(addrBtn);
    y += 22;

    // Transfer button
    const canTransfer = !!this.selectedParcel && this.transferAddress.length > 0;
    const xferBtn = this.scene.add
      .rectangle(10, y, 110, 22, canTransfer ? BTN_COLOR : 0x222222, 1)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: canTransfer });
    const xferLabel = this.scene.add.text(13, y + 4, "Transfer Parcel", {
      fontSize: "10px",
      color: canTransfer ? TEXT_COLOR : DIM_COLOR,
      fontFamily: "monospace",
    });
    if (canTransfer) {
      xferBtn.on("pointerdown", () => this._executeTransfer());
    }
    this.container!.add([xferBtn, xferLabel]);

    y += 30;

    // Warning
    this.container!.add(
      this.scene.add.text(10, y, "⚠ Transfers are irreversible on-chain.", {
        fontSize: "8px", color: WARN_COLOR, fontFamily: "monospace",
      }),
    );

    y += 14;

    // Danger zone — clear selection
    if (this.selectedParcel) {
      const clearBtn = this.scene.add
        .rectangle(10, y, 90, 18, BTN_DANGER_COLOR, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      const clearLabel = this.scene.add.text(13, y + 2, "Clear Selection", {
        fontSize: "8px", color: TEXT_COLOR, fontFamily: "monospace",
      });
      clearBtn.on("pointerdown", () => { this.selectedParcel = null; this._renderAll(); });
      this.container!.add([clearBtn, clearLabel]);
    }
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  private async _loadParcels(): Promise<void> {
    if (!this.wallet.state.connected || !this.wallet.state.address) {
      this._renderAll();
      return;
    }
    this.loading = true;
    this._renderAll();
    try {
      this.parcels = await this.wallet.getOwnerParcels(this.wallet.state.address);
    } catch (err) {
      this.statusText = "Failed to load parcels: " + (err instanceof Error ? err.message : String(err));
    }
    this.loading = false;
    this._renderAll();
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  private async _connectWallet(): Promise<void> {
    this.statusText = "Connecting wallet…";
    this._renderAll();
    try {
      await this.wallet.connect();
      this.statusText = "Wallet connected!";
      await this._loadParcels();
    } catch (err) {
      this.statusText = err instanceof Error ? err.message : "Connection failed";
      this._renderAll();
    }
  }

  private async _executeTransfer(): Promise<void> {
    const parcel = this.selectedParcel;
    if (!parcel || !this.transferAddress) return;

    if (!/^0x[0-9a-fA-F]{40}$/.test(this.transferAddress)) {
      this.statusText = "Invalid address format";
      this._renderAll();
      return;
    }

    this.statusText = `Transferring plot ${parcel.plotIndex}…`;
    this._renderAll();
    try {
      const { txHash } = await this.wallet.transferLand(parcel.tokenId, this.transferAddress);
      this.statusText = `Transferred! tx: ${txHash.slice(0, 12)}…`;
      const toAddr = this.transferAddress;
      this.transferAddress = "";
      this.selectedParcel = null;
      this.callbacks.onTransferComplete?.(parcel, toAddr);
      await this._loadParcels();
    } catch (err) {
      this.statusText = "Transfer failed: " + (err instanceof Error ? err.message : String(err));
      this._renderAll();
    }
  }
}

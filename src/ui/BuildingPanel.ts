/**
 * src/ui/BuildingPanel.ts
 *
 * Owner-only UI for placing and removing exterior building structures on an
 * ERC-721 land parcel.  Three types: house, shop, garden.
 *
 * Opens via LandParcelPanel "Place" button → GameScene wires it.
 * Persists placements to /buildings/parcel/:tokenId (server Postgres).
 * Non-owners may open this panel in read-only mode (no place/remove buttons).
 *
 * Interaction stubs (enter house / talk to shop / water garden) log the
 * intended action to the console — full gameplay left for a future milestone.
 */

import Phaser from "phaser";
import type { LandParcel } from "../systems/WalletManager";

// ── Layout ────────────────────────────────────────────────────────────────────

const PANEL_W = 300;
const PANEL_H = 270;
const PANEL_DEPTH = 92;
const BG_COLOR       = 0x0d1b0d;
const HEADER_COLOR   = 0x0a1408;
const TEXT_COLOR     = "#d4e8d4";
const DIM_COLOR      = "#668866";
const ACCENT_COLOR   = "#50fa7b";
const WARN_COLOR     = "#ff6666";
const BTN_COLOR      = 0x2d7a2d;
const BTN_DANGER     = 0x7a2d2d;
const BTN_STUB       = 0x2a3a6a;

// ── Types ─────────────────────────────────────────────────────────────────────

export type BuildingType = "house" | "shop" | "garden";

export interface PlacedBuilding {
  id:           string;
  tokenId:      string;
  zoneId:       string;
  plotIndex:    number;
  buildingType: BuildingType;
  placedAt:     string; // ISO date string from server
}

const BUILDING_DEFS: {
  type:        BuildingType;
  label:       string;
  icon:        string;       // texture key loaded in Preloader
  stubAction:  string;       // log message for interaction stub
}[] = [
  { type: "house",  label: "House",  icon: "building_house",  stubAction: "enter_house"  },
  { type: "shop",   label: "Shop",   icon: "building_shop",   stubAction: "talk_shop_npc" },
  { type: "garden", label: "Garden", icon: "building_garden", stubAction: "water_garden"  },
];

// ── Panel class ───────────────────────────────────────────────────────────────

export class BuildingPanel {
  private scene:     Phaser.Scene;
  private parcel:    LandParcel;
  private isOwner:   boolean;
  private serverUrl: string;
  private walletAddress: string;

  private container:  Phaser.GameObjects.Container | null = null;
  private buildings:  PlacedBuilding[] = [];
  private loading     = false;
  private statusText  = "";

  /**
   * @param scene        Active Phaser scene.
   * @param parcel       The land parcel being viewed.
   * @param isOwner      Whether the current player owns this parcel.
   * @param walletAddress Connected wallet address (required for place/remove).
   * @param serverUrl    Base URL for the game server (e.g., "http://localhost:3000").
   */
  constructor(
    scene:         Phaser.Scene,
    parcel:        LandParcel,
    isOwner:       boolean,
    walletAddress: string,
    serverUrl:     string,
  ) {
    this.scene         = scene;
    this.parcel        = parcel;
    this.isOwner       = isOwner;
    this.walletAddress = walletAddress;
    this.serverUrl     = serverUrl;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  isOpen(): boolean {
    return this.container !== null;
  }

  open(): void {
    if (this.isOpen()) return;
    this._build();
    void this._loadBuildings();
  }

  close(): void {
    if (!this.container) return;
    this.container.destroy();
    this.container = null;
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  private _build(): void {
    const { width, height } = this.scene.scale;
    const x = (width  - PANEL_W) / 2;
    const y = (height - PANEL_H) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(PANEL_DEPTH);
    this._renderAll();
  }

  private _renderAll(): void {
    if (!this.container) return;
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add
      .rectangle(0, 0, PANEL_W, PANEL_H, BG_COLOR, 0.97)
      .setOrigin(0, 0)
      .setInteractive();
    this.container.add(bg);

    // Header
    this.container.add(
      this.scene.add.rectangle(0, 0, PANEL_W, 28, HEADER_COLOR, 1).setOrigin(0, 0),
    );
    const zoneName = this.parcel.zoneId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    this.container.add(
      this.scene.add.text(10, 6, `⬡ Buildings — ${zoneName}`, {
        fontSize: "11px", color: ACCENT_COLOR, fontFamily: "monospace",
      }),
    );

    const closeBtn = this.scene.add
      .text(PANEL_W - 20, 6, "✕", {
        fontSize: "13px", color: WARN_COLOR, fontFamily: "monospace",
      })
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    this.container.add(closeBtn);

    // Ownership badge
    const ownerLabel = this.isOwner ? "[ owner ]" : "[ visitor ]";
    const ownerColor = this.isOwner ? ACCENT_COLOR : DIM_COLOR;
    this.container.add(
      this.scene.add.text(10, 32, `Plot #${this.parcel.plotIndex}  ${ownerLabel}`, {
        fontSize: "9px", color: ownerColor, fontFamily: "monospace",
      }),
    );

    // Token label
    this.container.add(
      this.scene.add.text(PANEL_W - 10, 32, `Token ${this.parcel.tokenId.slice(0, 8)}…`, {
        fontSize: "9px", color: DIM_COLOR, fontFamily: "monospace",
      }).setOrigin(1, 0),
    );

    // Divider
    this.container.add(
      this.scene.add.rectangle(0, 46, PANEL_W, 1, 0x1a3a1a, 1).setOrigin(0, 0),
    );

    if (this.loading) {
      this.container.add(
        this.scene.add.text(PANEL_W / 2, 80, "Loading…", {
          fontSize: "11px", color: DIM_COLOR, fontFamily: "monospace",
        }).setOrigin(0.5, 0),
      );
    } else {
      this._renderBuildingRows();
    }

    // Status bar
    if (this.statusText) {
      this.container.add(
        this.scene.add.text(10, PANEL_H - 18, this.statusText, {
          fontSize: "8px", color: "#ffff80", fontFamily: "monospace",
          wordWrap: { width: PANEL_W - 20 },
        }),
      );
    }
  }

  private _renderBuildingRows(): void {
    if (!this.container) return;

    let y = 52;

    for (const def of BUILDING_DEFS) {
      const placed = this.buildings.find((b) => b.buildingType === def.type);

      // Row background for placed buildings
      if (placed) {
        this.container.add(
          this.scene.add
            .rectangle(6, y, PANEL_W - 12, 52, 0x0f3010, 0.6)
            .setOrigin(0, 0),
        );
      }

      // Building icon
      if (this.scene.textures.exists(def.icon)) {
        this.container.add(
          this.scene.add
            .image(14, y + 10, def.icon)
            .setOrigin(0, 0)
            .setDisplaySize(32, 32),
        );
      } else {
        // Placeholder colored rectangle when sprite not loaded yet
        const PLACEHOLDER_COLORS: Record<BuildingType, number> = {
          house:  0x8b4513,
          shop:   0x4682b4,
          garden: 0x228b22,
        };
        this.container.add(
          this.scene.add
            .rectangle(14, y + 10, 32, 32, PLACEHOLDER_COLORS[def.type], 1)
            .setOrigin(0, 0),
        );
      }

      // Building label
      this.container.add(
        this.scene.add.text(52, y + 6, def.label, {
          fontSize: "11px", color: placed ? ACCENT_COLOR : TEXT_COLOR, fontFamily: "monospace",
        }),
      );

      // Status text
      this.container.add(
        this.scene.add.text(52, y + 22, placed ? "Placed" : "Not placed", {
          fontSize: "9px", color: placed ? ACCENT_COLOR : DIM_COLOR, fontFamily: "monospace",
        }),
      );

      const btnX = PANEL_W - 136;

      if (placed) {
        // Interaction stub button
        const stubLabel = def.type === "house"
          ? "Enter"
          : def.type === "shop"
            ? "Talk"
            : "Water";

        const stubBtn = this.scene.add
          .rectangle(btnX, y + 14, 50, 20, BTN_STUB, 1)
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true });
        const stubText = this.scene.add.text(btnX + 4, y + 14, stubLabel, {
          fontSize: "9px", color: TEXT_COLOR, fontFamily: "monospace",
        }).setOrigin(0, 0.5);

        const capturedDef = def;
        const capturedParcel = this.parcel;
        stubBtn.on("pointerdown", () => {
          console.log(
            `[BuildingPanel] interaction_stub action=${capturedDef.stubAction} tokenId=${capturedParcel.tokenId} zoneId=${capturedParcel.zoneId}`,
          );
          this.statusText = `${capturedDef.label}: ${stubLabel} (stub — full gameplay coming soon)`;
          this._renderAll();
        });
        this.container.add([stubBtn, stubText]);

        // Remove button (owner only)
        if (this.isOwner) {
          const placedBuilding = placed;
          const removeBtn = this.scene.add
            .rectangle(btnX + 58, y + 14, 56, 20, BTN_DANGER, 1)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });
          const removeText = this.scene.add.text(btnX + 62, y + 14, "Remove", {
            fontSize: "9px", color: TEXT_COLOR, fontFamily: "monospace",
          }).setOrigin(0, 0.5);
          removeBtn.on("pointerdown", () => void this._remove(placedBuilding));
          this.container.add([removeBtn, removeText]);
        }
      } else if (this.isOwner) {
        // Place button
        const placeBtn = this.scene.add
          .rectangle(btnX, y + 14, 50, 20, BTN_COLOR, 1)
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true });
        const placeText = this.scene.add.text(btnX + 4, y + 14, "Place", {
          fontSize: "9px", color: TEXT_COLOR, fontFamily: "monospace",
        }).setOrigin(0, 0.5);
        const capturedDef = def;
        placeBtn.on("pointerdown", () => void this._place(capturedDef.type));
        this.container.add([placeBtn, placeText]);
      }

      // Row divider
      this.container.add(
        this.scene.add.rectangle(10, y + 54, PANEL_W - 20, 1, 0x1a3a1a, 1).setOrigin(0, 0),
      );

      y += 56;
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────────────

  private async _loadBuildings(): Promise<void> {
    this.loading = true;
    this._renderAll();
    try {
      const res = await fetch(`${this.serverUrl}/buildings/parcel/${encodeURIComponent(this.parcel.tokenId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.buildings = (await res.json()) as PlacedBuilding[];
    } catch (err) {
      this.statusText = "Failed to load buildings: " + (err instanceof Error ? err.message : String(err));
    }
    this.loading = false;
    this._renderAll();
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  private async _place(buildingType: BuildingType): Promise<void> {
    this.statusText = `Placing ${buildingType}…`;
    this._renderAll();
    try {
      const res = await fetch(
        `${this.serverUrl}/buildings/parcel/${encodeURIComponent(this.parcel.tokenId)}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            buildingType,
            walletAddress: this.walletAddress,
            zoneId:    this.parcel.zoneId,
            plotIndex: Number(this.parcel.plotIndex),
          }),
        },
      );
      if (res.status === 409) {
        this.statusText = "Already placed";
      } else if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        this.statusText = data.error ?? `Error ${res.status}`;
      } else {
        const newBuilding = (await res.json()) as PlacedBuilding;
        this.buildings = [...this.buildings, newBuilding];
        this.statusText = `${buildingType} placed!`;
      }
    } catch (err) {
      this.statusText = "Place failed: " + (err instanceof Error ? err.message : String(err));
    }
    this._renderAll();
  }

  private async _remove(building: PlacedBuilding): Promise<void> {
    this.statusText = `Removing ${building.buildingType}…`;
    this._renderAll();
    try {
      const res = await fetch(
        `${this.serverUrl}/buildings/parcel/${encodeURIComponent(this.parcel.tokenId)}/${encodeURIComponent(building.id)}`,
        {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ walletAddress: this.walletAddress }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        this.statusText = data.error ?? `Error ${res.status}`;
      } else {
        this.buildings = this.buildings.filter((b) => b.id !== building.id);
        this.statusText = `${building.buildingType} removed`;
      }
    } catch (err) {
      this.statusText = "Remove failed: " + (err instanceof Error ? err.message : String(err));
    }
    this._renderAll();
  }
}

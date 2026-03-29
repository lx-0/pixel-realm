/**
 * HousingPanel — furniture palette, placement controls, and house management UI.
 *
 * Rendered as a fixed HUD overlay inside HousingScene.
 * Owner controls: furniture palette, placement mode, save, permission, upgrade.
 * Visitor controls: exit only (permission label shown).
 *
 * Press H to toggle panel visibility.
 */

import Phaser from 'phaser';
import { CANVAS, HOUSING } from '../config/constants';
import { SaveManager } from '../systems/SaveManager';

const PANEL_W = 90;
const PANEL_H = 140;
const PANEL_X = CANVAS.WIDTH - PANEL_W - 4;
const PANEL_Y = 4;
const DEPTH    = 50;
const PAD      = 5;

export type HousingPermission = 'public' | 'friends' | 'locked';

export interface HousingPanelOptions {
  isOwner:          boolean;
  houseTier:        number;
  permission:       HousingPermission;
  playerId:         string;
  onPlaceFurniture: (furnId: string) => void;
  onSaveLayout:     () => void;
  onPermChange:     (perm: HousingPermission) => void;
  onUpgrade:        () => void;
  onExit:           () => void;
  /** Player's current gold (for vendor purchases). */
  playerGold?:      number;
  /** Called when player buys furniture from vendor (furnId, cost). */
  onBuyFurniture?:  (furnId: string, cost: number) => void;
}

const PERM_LABELS: Record<HousingPermission, string> = {
  public:  'Public',
  friends: 'Friends',
  locked:  'Locked',
};

const PERM_COLORS: Record<HousingPermission, number> = {
  public:  0x44aa44,
  friends: 0x4488ff,
  locked:  0xaa4444,
};

type FurnDef = { id: string; name: string; key: string };

export class HousingPanel {
  private scene:     Phaser.Scene;
  private opts:      HousingPanelOptions;
  private container: Phaser.GameObjects.Container;
  private visible    = true;
  private hKey!:     Phaser.Input.Keyboard.Key;

  // Dynamic labels
  private permBtn!:  Phaser.GameObjects.Rectangle;
  private permText!: Phaser.GameObjects.Text;
  private currentPerm: HousingPermission;

  constructor(scene: Phaser.Scene, opts: HousingPanelOptions) {
    this.scene       = scene;
    this.opts        = opts;
    this.currentPerm = opts.permission;

    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(true);

    this.hKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this._build();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.hKey)) {
      this.visible = !this.visible;
      this.container.setVisible(this.visible);
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────────

  private _build(): void {
    const c = this.container;

    // Panel background
    const bg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2,
      PANEL_W, PANEL_H, 0x1a1208, 0.92,
    ).setStrokeStyle(1, 0x886633);
    c.add(bg);

    // Title
    const titleTxt = this.scene.add.text(
      PANEL_X + PAD, PANEL_Y + PAD,
      this.opts.isOwner ? 'My House' : "Player's House",
      { fontSize: '5px', color: '#ddbb77', fontFamily: 'monospace' },
    );
    c.add(titleTxt);

    // Tier label
    const styleName = HOUSING.EXTERIOR_STYLES.find(s => s.tier === this.opts.houseTier)?.name ?? 'Cottage';
    const tierLabel = this.scene.add.text(
      PANEL_X + PAD, PANEL_Y + PAD + 8,
      `Tier ${this.opts.houseTier} — ${styleName}`,
      { fontSize: '4px', color: '#aaaaaa', fontFamily: 'monospace' },
    );
    c.add(tierLabel);

    let curY = PANEL_Y + PAD + 18;

    if (this.opts.isOwner) {
      curY = this._buildOwnerControls(c, curY);
    } else {
      curY = this._buildVisitorControls(c, curY);
    }

    // Exit button (always visible)
    this._buildButton(c, PANEL_X + PAD, PANEL_Y + PANEL_H - 16, PANEL_W - PAD * 2, 11,
      'Exit House', 0x664422, 0xddaa66, () => this.opts.onExit());
  }

  private _buildOwnerControls(
    c: Phaser.GameObjects.Container,
    startY: number,
  ): number {
    let y = startY;

    // Section: Furniture (show owned inventory)
    c.add(this.scene.add.text(PANEL_X + PAD, y, 'Furniture (owned)', {
      fontSize: '4px', color: '#886633', fontFamily: 'monospace',
    }));
    y += 7;

    const housingData = SaveManager.getHousing();
    const inventory   = housingData.inventory ?? {};
    const allItems    = [...HOUSING.FURNITURE, ...HOUSING.DECORATIONS] as unknown as FurnDef[];
    const ownedItems  = allItems.filter(f => (inventory[f.id] ?? 0) > 0);

    if (ownedItems.length === 0) {
      c.add(this.scene.add.text(PANEL_X + PAD, y, 'No furniture owned.\nBuy some below!',
        { fontSize: '3px', color: '#888888', fontFamily: 'monospace' }));
      y += 14;
    } else {
      const visible8 = ownedItems.slice(0, 8);
      for (let i = 0; i < visible8.length; i++) {
        const def = visible8[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx  = PANEL_X + PAD + col * 38;
        const by  = y + row * 11;
        const qty = inventory[def.id] ?? 0;
        this._buildSmallButton(c, bx, by, 36, 10,
          `${def.name.slice(0, 5)}x${qty}`, 0x2a1e10, 0xccaa66,
          () => this.opts.onPlaceFurniture(def.id));
      }
      y += Math.ceil(visible8.length / 2) * 11 + 3;
    }

    // "Buy Furniture" vendor button
    this._buildButton(c, PANEL_X + PAD, y, PANEL_W - PAD * 2, 11,
      'Buy Furniture', 0x222244, 0x88aaff, () => this._openFurnitureVendor());
    y += 13;

    // Save layout button
    this._buildButton(c, PANEL_X + PAD, y, PANEL_W - PAD * 2, 11,
      'Save Layout', 0x224422, 0x66dd66, () => this.opts.onSaveLayout());
    y += 13;

    // Permission cycle button
    const permW = PANEL_W - PAD * 2;
    this.permBtn = this.scene.add.rectangle(
      PANEL_X + PAD + permW / 2, y + 5,
      permW, 11, PERM_COLORS[this.currentPerm], 0.85,
    ).setInteractive({ useHandCursor: true });
    this.permText = this.scene.add.text(
      PANEL_X + PAD + permW / 2, y + 5,
      PERM_LABELS[this.currentPerm],
      { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0.5);

    this.permBtn.on('pointerdown', () => this._cyclePermission());
    c.add(this.permBtn);
    c.add(this.permText);
    y += 13;

    // Upgrade button (tiers 1 and 2 can upgrade)
    if (this.opts.houseTier < 3) {
      const upgCost = this.opts.houseTier === 1 ? HOUSING.UPGRADE_COST : HOUSING.ESTATE_COST;
      const nextStyleName = HOUSING.EXTERIOR_STYLES.find(s => s.tier === this.opts.houseTier + 1)?.name ?? 'Upgrade';
      this._buildButton(c, PANEL_X + PAD, y, PANEL_W - PAD * 2, 11,
        `Upgrade → ${nextStyleName} (${upgCost}g)`, 0x2a1a00, 0xffcc44, () => this.opts.onUpgrade());
      y += 13;
    }

    return y;
  }

  private _buildVisitorControls(
    c: Phaser.GameObjects.Container,
    startY: number,
  ): number {
    const permColor = PERM_COLORS[this.opts.permission];
    const permLabel = PERM_LABELS[this.opts.permission];

    c.add(this.scene.add.text(PANEL_X + PAD, startY, 'Access:', {
      fontSize: '4px', color: '#aaaaaa', fontFamily: 'monospace',
    }));

    const badge = this.scene.add.rectangle(
      PANEL_X + PAD + 30, startY + 3, 38, 8, permColor, 0.9,
    );
    const badgeTxt = this.scene.add.text(
      PANEL_X + PAD + 30, startY + 3, permLabel,
      { fontSize: '4px', color: '#ffffff', fontFamily: 'monospace' },
    ).setOrigin(0.5, 0.5);
    c.add(badge);
    c.add(badgeTxt);

    return startY + 14;
  }

  // ── Furniture vendor popup ────────────────────────────────────────────────────

  private _openFurnitureVendor(): void {
    const scene = this.scene;
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;
    const W  = 200;
    const H  = 110;
    const px = cx - W / 2;
    const py = cy - H / 2;
    const Z  = DEPTH + 10;

    const vendorCont = scene.add.container(0, 0).setScrollFactor(0).setDepth(Z);

    // Background
    vendorCont.add(scene.add.rectangle(cx, cy, W, H, 0x111122, 0.96).setOrigin(0.5));
    vendorCont.add(scene.add.rectangle(cx, cy, W, H, 0x446644, 0).setOrigin(0.5).setStrokeStyle(1, 0x88cc88, 1));
    vendorCont.add(scene.add.text(cx, py + 5, 'FURNITURE VENDOR', { fontSize: '5px', color: '#aaffaa', fontFamily: 'monospace' }).setOrigin(0.5, 0));

    const allItems   = [...HOUSING.FURNITURE, ...HOUSING.DECORATIONS] as unknown as FurnDef[];
    const playerGold = this.opts.playerGold ?? 0;
    let   curX = px + 6;
    let   curY = py + 16;
    const COL_W = 48;

    allItems.slice(0, 12).forEach((def, i) => {
      if (i > 0 && i % 4 === 0) { curX = px + 6; curY += 28; }
      const price = (HOUSING.FURNITURE_PRICES as Record<string, number>)[def.id] ?? 0;
      if (price <= 0) { curX += COL_W; return; }
      const canBuy = playerGold >= price;

      vendorCont.add(scene.add.rectangle(curX + COL_W / 2, curY + 10, COL_W - 2, 24, canBuy ? 0x1a2a1a : 0x1a1a1a).setOrigin(0.5));
      vendorCont.add(scene.add.text(curX + COL_W / 2, curY + 4, def.name.slice(0, 6), { fontSize: '3px', color: canBuy ? '#ccffcc' : '#555555', fontFamily: 'monospace' }).setOrigin(0.5, 0));
      vendorCont.add(scene.add.text(curX + COL_W / 2, curY + 12, `${price}g`, { fontSize: '3px', color: canBuy ? '#ffd700' : '#554444', fontFamily: 'monospace' }).setOrigin(0.5, 0));

      if (canBuy) {
        const buyBtn = scene.add.text(curX + COL_W / 2, curY + 19, '[Buy]', { fontSize: '3px', color: '#44ff88', fontFamily: 'monospace' })
          .setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        buyBtn.on('pointerdown', () => {
          this.opts.onBuyFurniture?.(def.id, price);
          SaveManager.addFurnitureToInventory(def.id);
          vendorCont.destroy(true);
          // Rebuild panel to show new inventory
          this.container.destroy(true);
          this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(this.visible);
          this._build();
        });
        vendorCont.add(buyBtn);
      }

      curX += COL_W;
    });

    // Close button
    const closeBtn = scene.add.text(px + W - 4, py + 4, '[X]', { fontSize: '4px', color: '#ff8888', fontFamily: 'monospace' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => vendorCont.destroy(true));
    vendorCont.add(closeBtn);

    // Gold display
    vendorCont.add(scene.add.text(px + 6, py + H - 10, `Gold: ${playerGold}g`, { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' }).setOrigin(0, 0));
  }

  // ── Permission cycling ────────────────────────────────────────────────────────

  private _cyclePermission(): void {
    const order: HousingPermission[] = ['public', 'friends', 'locked'];
    const idx = order.indexOf(this.currentPerm);
    this.currentPerm = order[(idx + 1) % order.length];

    this.permBtn.setFillStyle(PERM_COLORS[this.currentPerm], 0.85);
    this.permText.setText(PERM_LABELS[this.currentPerm]);

    this.opts.onPermChange(this.currentPerm);
  }

  // ── Button helpers ────────────────────────────────────────────────────────────

  private _buildButton(
    c: Phaser.GameObjects.Container,
    x: number, y: number, w: number, h: number,
    label: string,
    bgColor: number, textColor: number,
    onClick: () => void,
  ): void {
    const bg = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor)
      .setStrokeStyle(1, textColor).setInteractive({ useHandCursor: true });
    const txt = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '4px', color: `#${textColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    bg.on('pointerover',  () => bg.setAlpha(0.8));
    bg.on('pointerout',   () => bg.setAlpha(1.0));
    bg.on('pointerdown',  onClick);
    c.add(bg);
    c.add(txt);
  }

  private _buildSmallButton(
    c: Phaser.GameObjects.Container,
    x: number, y: number, w: number, h: number,
    label: string,
    bgColor: number, textColor: number,
    onClick: () => void,
  ): void {
    const bg = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor)
      .setStrokeStyle(1, 0x665533).setInteractive({ useHandCursor: true });
    const txt = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '4px', color: `#${textColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    bg.on('pointerover',  () => bg.setFillStyle(0x3a2e18));
    bg.on('pointerout',   () => bg.setFillStyle(bgColor));
    bg.on('pointerdown',  onClick);
    c.add(bg);
    c.add(txt);
  }
}

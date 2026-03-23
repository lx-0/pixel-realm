/**
 * HousingScene — house interior for the player housing system.
 *
 * Flow:
 *   1. Entered from GameScene when the player interacts with a land plot
 *      they own, or visits another player's plot (if permission allows).
 *   2. Interior is drawn using tileset_house_interior (or tier-2 manor tileset).
 *   3. Saved furniture layout is loaded and rendered.
 *   4. If isOwner: placement mode lets the player drag furniture onto a
 *      16×16 grid and save the layout via REST.
 *   5. The HousingPanel overlay manages the furniture palette and settings.
 *   6. Exiting returns the player to GameScene (same zone).
 */

import Phaser from 'phaser';
import { CANVAS, SCENES, HOUSING } from '../config/constants';
import { HousingPanel } from '../ui/HousingPanel';

// ── Data contracts ─────────────────────────────────────────────────────────────

export interface FurnitureItem {
  furnitureId: string;
  x:           number; // grid col
  y:           number; // grid row
  rotation:    number; // 0 | 90 | 180 | 270
}

export interface HousingSceneData {
  playerId:        string;
  plotId:          string;
  zoneId:          string;
  isOwner:         boolean;
  houseTier:       number;
  furnitureLayout: FurnitureItem[];
  permission:      'public' | 'friends' | 'locked';
}

// ── Interior layout constants ──────────────────────────────────────────────────

const GS    = HOUSING.GRID_SIZE;  // 16
const IW    = HOUSING.INTERIOR_WIDTH;   // 160
const IH    = HOUSING.INTERIOR_HEIGHT;  // 128
const COLS  = IW / GS;  // 10
const ROWS  = IH / GS;  // 8

// Offsets to center the interior on the 320×180 canvas
const OX = (CANVAS.WIDTH  - IW) / 2;
const OY = (CANVAS.HEIGHT - IH) / 2;


// ── Rest-bonus overlay ─────────────────────────────────────────────────────────

interface RestOverlay {
  bg:   Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  timer: Phaser.Time.TimerEvent;
}

// ── Scene class ────────────────────────────────────────────────────────────────

export class HousingScene extends Phaser.Scene {
  private data_!: HousingSceneData;

  // Rendering
  private furnitureGroup!:    Phaser.GameObjects.Group;
  private furnitureSprites:   Map<string, Phaser.GameObjects.Image> = new Map();

  // Placement mode
  private placementMode   = false;
  private selectedFurnId: string | null = null;
  private ghostSprite:    Phaser.GameObjects.Image | null = null;
  private ghostGridX      = 0;
  private ghostGridY      = 0;
  private layout:         FurnitureItem[] = [];

  // UI
  private housingPanel!:  HousingPanel;
  private exitZone!:      Phaser.GameObjects.Rectangle;
  private hintText!:      Phaser.GameObjects.Text;
  private restOverlay:    RestOverlay | null = null;

  // Keys
  private escKey!:        Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENES.HOUSING });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  init(data: HousingSceneData): void {
    this.data_ = data;
    this.layout = [...(data.furnitureLayout ?? [])];
    this.placementMode = false;
    this.selectedFurnId = null;
    this.ghostSprite = null;
    this.restOverlay = null;
    this.furnitureSprites.clear();
  }

  create(): void {
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this._drawInterior();
    this._renderFurniture();
    this._buildExitZone();

    this.housingPanel = new HousingPanel(this, {
      isOwner:    this.data_.isOwner,
      houseTier:  this.data_.houseTier,
      permission: this.data_.permission,
      playerId:   this.data_.playerId,
      onPlaceFurniture: (furnId) => this._startPlacement(furnId),
      onSaveLayout:     ()        => this._saveLayout(),
      onPermChange:     (perm)    => this._onPermChange(perm),
      onUpgrade:        ()        => this._onUpgrade(),
      onExit:           ()        => this._exitToGame(),
    });

    this._buildHint();

    // Mouse/pointer for placement
    this.input.on('pointermove', this._onPointerMove, this);
    this.input.on('pointerdown', this._onPointerDown, this);
  }

  update(): void {
    this.housingPanel.update();

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.placementMode) {
        this._cancelPlacement();
      } else {
        this._exitToGame();
      }
    }
  }

  // ── Interior drawing ──────────────────────────────────────────────────────────

  private _drawInterior(): void {
    const g = this.add.graphics().setDepth(0);

    const floorColor = this.data_.houseTier === 2 ? 0x3a2a14 : 0x2a1e0f;
    const wallColor  = this.data_.houseTier === 2 ? 0x5a4020 : 0x3e2a10;
    const wallTop    = this.data_.houseTier === 2 ? 0x7a5830 : 0x5a3e18;

    // Floor
    g.fillStyle(floorColor);
    g.fillRect(OX + GS, OY + GS, IW - GS * 2, IH - GS * 2);

    // Walls
    g.fillStyle(wallColor);
    g.fillRect(OX, OY, IW, GS);             // top
    g.fillRect(OX, OY + IH - GS, IW, GS);  // bottom
    g.fillRect(OX, OY, GS, IH);             // left
    g.fillRect(OX + IW - GS, OY, GS, IH);  // right

    // Wall highlight (top edge)
    g.fillStyle(wallTop);
    g.fillRect(OX, OY, IW, 2);

    // Floor planks (horizontal lines)
    g.lineStyle(1, 0x1a1208, 0.4);
    for (let row = 1; row < ROWS - 1; row++) {
      g.beginPath();
      g.moveTo(OX + GS, OY + row * GS);
      g.lineTo(OX + IW - GS, OY + row * GS);
      g.strokePath();
    }

    // Grid overlay (very subtle)
    g.lineStyle(1, 0xffffff, 0.04);
    for (let col = 1; col < COLS - 1; col++) {
      g.beginPath();
      g.moveTo(OX + col * GS, OY + GS);
      g.lineTo(OX + col * GS, OY + IH - GS);
      g.strokePath();
    }
    for (let row = 1; row < ROWS - 1; row++) {
      g.beginPath();
      g.moveTo(OX + GS, OY + row * GS);
      g.lineTo(OX + IW - GS, OY + row * GS);
      g.strokePath();
    }

    // Scene label
    const tierName = this.data_.houseTier === 2 ? 'Manor' : 'Cottage';
    this.add.text(OX + 4, OY + 3, tierName, {
      fontSize: '5px', color: '#ccaa66', fontFamily: 'monospace',
    }).setDepth(5).setScrollFactor(0);
  }

  // ── Furniture rendering ───────────────────────────────────────────────────────

  private _renderFurniture(): void {
    this.furnitureGroup = this.add.group();

    for (const item of this.layout) {
      this._addFurnitureSprite(item);
    }
  }

  private _addFurnitureSprite(item: FurnitureItem): Phaser.GameObjects.Image {
    const { px, py } = this._gridToPixel(item.x, item.y);
    const allItems = [...HOUSING.FURNITURE, ...HOUSING.DECORATIONS] as unknown as { id: string; key: string }[];
    const def = allItems.find(f => f.id === item.furnitureId);
    const key = def?.key ?? 'furn_table';

    const sprite = this.add.image(px + GS / 2, py + GS / 2, key)
      .setDepth(2)
      .setScrollFactor(0)
      .setAngle(item.rotation)
      .setInteractive({ useHandCursor: true });

    if (this.data_.isOwner) {
      sprite.on('pointerdown', () => this._onFurnitureClick(item, sprite));
    }

    // Sit/rest interaction for bed/chair
    const furnDef = HOUSING.FURNITURE.find(f => f.id === item.furnitureId) as { id: string; restBonus: number } | undefined;
    if (furnDef && furnDef.restBonus > 0) {
      sprite.on('pointerover', () => sprite.setTint(0xffffaa));
      sprite.on('pointerout',  () => sprite.clearTint());
    }

    this.furnitureGroup.add(sprite);
    this.furnitureSprites.set(`${item.x},${item.y}`, sprite);
    return sprite;
  }

  private _onFurnitureClick(item: FurnitureItem, sprite: Phaser.GameObjects.Image): void {
    if (this.placementMode) return;

    // Right-click or shift+click to remove; left-click to interact
    const shift = this.input.keyboard!.checkDown(
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    );
    if (shift) {
      // Remove furniture
      this.layout = this.layout.filter(i => !(i.x === item.x && i.y === item.y));
      sprite.destroy();
      this.furnitureSprites.delete(`${item.x},${item.y}`);
    } else {
      // Interact: show rest bonus
      const def = HOUSING.FURNITURE.find(f => f.id === item.furnitureId) as { id: string; restBonus: number; name: string } | undefined;
      if (def && def.restBonus > 0) {
        this._showRestBonus(def.restBonus, def.name, sprite.x, sprite.y);
      }
    }
  }

  private _showRestBonus(bonus: number, name: string, wx: number, wy: number): void {
    if (this.restOverlay) {
      this.restOverlay.timer.remove();
      this.restOverlay.bg.destroy();
      this.restOverlay.text.destroy();
    }

    const bg = this.add.rectangle(wx, wy - 12, 60, 12, 0x000000, 0.75)
      .setDepth(20).setScrollFactor(0);
    const txt = this.add.text(wx, wy - 12, `${name}: +${bonus} Rest`, {
      fontSize: '5px', color: '#ffdd88', fontFamily: 'monospace',
    }).setDepth(21).setScrollFactor(0).setOrigin(0.5, 0.5);

    const timer = this.time.delayedCall(2000, () => {
      bg.destroy(); txt.destroy();
      this.restOverlay = null;
    });
    this.restOverlay = { bg, text: txt, timer };
  }

  // ── Placement mode ────────────────────────────────────────────────────────────

  private _startPlacement(furnId: string): void {
    if (this.layout.length >= HOUSING.MAX_FURNITURE) {
      this._showHint('House is full (max 20 items)');
      return;
    }
    this.placementMode  = true;
    this.selectedFurnId = furnId;

    const allItems = [...HOUSING.FURNITURE, ...HOUSING.DECORATIONS] as unknown as { id: string; key: string }[];
    const def = allItems.find(f => f.id === furnId);
    const key = def?.key ?? 'furn_table';

    this.ghostSprite = this.add.image(0, 0, key)
      .setDepth(10).setAlpha(0.55).setScrollFactor(0);

    this._showHint('Click to place • ESC to cancel');
  }

  private _cancelPlacement(): void {
    this.placementMode  = false;
    this.selectedFurnId = null;
    this.ghostSprite?.destroy();
    this.ghostSprite = null;
    this._showHint('');
  }

  private _onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.placementMode || !this.ghostSprite) return;
    const { col, row } = this._pixelToGrid(pointer.x / CANVAS.SCALE, pointer.y / CANVAS.SCALE);
    if (this._isValidCell(col, row)) {
      const { px, py } = this._gridToPixel(col, row);
      this.ghostSprite.setPosition(px + GS / 2, py + GS / 2);
      this.ghostSprite.setAlpha(0.6);
      this.ghostGridX = col;
      this.ghostGridY = row;
    } else {
      this.ghostSprite.setAlpha(0.2);
    }
  }

  private _onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.placementMode || !this.selectedFurnId) return;
    if (pointer.rightButtonDown()) { this._cancelPlacement(); return; }

    const col = this.ghostGridX;
    const row = this.ghostGridY;

    if (!this._isValidCell(col, row)) return;
    if (this.layout.some(i => i.x === col && i.y === row)) return; // occupied

    const item: FurnitureItem = { furnitureId: this.selectedFurnId, x: col, y: row, rotation: 0 };
    this.layout.push(item);
    this._addFurnitureSprite(item);
    this._cancelPlacement();
  }

  // ── Exit zone ─────────────────────────────────────────────────────────────────

  private _buildExitZone(): void {
    // Door at bottom-center of the interior
    const doorX = OX + IW / 2 - GS / 2;
    const doorY = OY + IH - GS;

    this.exitZone = this.add.rectangle(doorX + GS / 2, doorY + GS / 2, GS, GS, 0x886644)
      .setDepth(1).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.add.text(doorX + GS / 2, doorY + GS / 2, '🚪', {
      fontSize: '8px',
    }).setDepth(3).setScrollFactor(0).setOrigin(0.5, 0.5);

    this.exitZone.on('pointerdown', () => this._exitToGame());
    this.exitZone.on('pointerover',  () => this.exitZone.setFillStyle(0xbbaa66));
    this.exitZone.on('pointerout',   () => this.exitZone.setFillStyle(0x886644));
  }

  // ── Save layout ───────────────────────────────────────────────────────────────

  private async _saveLayout(): Promise<void> {
    try {
      const serverHttp = this._serverHttp();
      await fetch(`${serverHttp}/housing/${this.data_.playerId}/layout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: this.layout }),
      });
      this._showHint('Layout saved!');
      this.time.delayedCall(1500, () => this._showHint(''));
    } catch {
      this._showHint('Save failed');
    }
  }

  private async _onPermChange(perm: string): Promise<void> {
    try {
      const serverHttp = this._serverHttp();
      await fetch(`${serverHttp}/housing/${this.data_.playerId}/permission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: perm }),
      });
      this.data_.permission = perm as 'public' | 'friends' | 'locked';
    } catch {
      // non-fatal
    }
  }

  private async _onUpgrade(): Promise<void> {
    try {
      const serverHttp = this._serverHttp();
      const res = await fetch(`${serverHttp}/housing/${this.data_.playerId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json() as { houseTier: number };
        this.data_.houseTier = json.houseTier;
        this._showHint('House upgraded to Manor!');
        this.time.delayedCall(2000, () => {
          this.scene.restart(this.data_);
        });
      } else {
        const err = await res.json() as { error: string };
        this._showHint(err.error ?? 'Upgrade failed');
      }
    } catch {
      this._showHint('Upgrade failed');
    }
  }

  private _exitToGame(): void {
    this.scene.start(SCENES.GAME, { zoneId: this.data_.zoneId });
  }

  // ── Hint text ─────────────────────────────────────────────────────────────────

  private _buildHint(): void {
    this.hintText = this.add.text(CANVAS.WIDTH / 2, OY - 6, '', {
      fontSize: '5px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setDepth(20).setScrollFactor(0).setOrigin(0.5, 0);
  }

  private _showHint(msg: string): void {
    this.hintText?.setText(msg);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private _gridToPixel(col: number, row: number): { px: number; py: number } {
    return { px: OX + col * GS, py: OY + row * GS };
  }

  private _pixelToGrid(wx: number, wy: number): { col: number; row: number } {
    return {
      col: Math.floor((wx - OX) / GS),
      row: Math.floor((wy - OY) / GS),
    };
  }

  private _isValidCell(col: number, row: number): boolean {
    // Must be within interior (exclude outer wall ring)
    return col >= 1 && col < COLS - 1 && row >= 1 && row < ROWS - 1;
  }

  private _serverHttp(): string {
    const wsUrl: string =
      ((import.meta.env as Record<string, string | undefined>)['VITE_COLYSEUS_URL'])
      ?? 'ws://localhost:2567';
    return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  }
}

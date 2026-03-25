/**
 * PetPanel — companion pet management HUD panel.
 *
 * Layout (fixed to camera, bottom-right area):
 *   [Header: "PETS" + close hint]
 *   [Equipped pet: sprite placeholder, name, level, happiness bar]
 *   [Feed button]
 *   [Dismiss button]
 *   [Separator]
 *   [Pet grid: up to 6 pet type slots for selection/swapping]
 *
 * Controls:
 *   J — toggle panel open/closed
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

// ── Pet definitions (mirrored from server for display) ────────────────────────

export type PetType = 'wolf' | 'hawk' | 'cat' | 'dragon_whelp' | 'wisp' | 'golem';

export interface PetData {
  id:         string;
  petType:    string;
  level:      number;
  xp:         number;
  happiness:  number;
  isEquipped: boolean;
}

const PET_NAMES: Record<string, string> = {
  wolf:         'Wolf',
  hawk:         'Hawk',
  cat:          'Cat',
  dragon_whelp: 'Dragon Whelp',
  wisp:         'Wisp',
  golem:        'Golem',
};

const PET_BONUS_LABELS: Record<string, string> = {
  wolf:         '+5% DMG',
  hawk:         '+5% CRIT',
  cat:          '+5% DODGE',
  dragon_whelp: '+3% ALL',
  wisp:         '+10% XP',
  golem:        '+10% HP',
};

const PET_TINTS: Record<string, number> = {
  wolf:         0xd4a860,
  hawk:         0xa0c0f0,
  cat:          0xf0c0a0,
  dragon_whelp: 0xff6060,
  wisp:         0x80ffff,
  golem:        0xa0a0a0,
};

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_W  = 100;
const PANEL_H  = 130;
const PANEL_X  = CANVAS.WIDTH  - 4;   // right-anchored
const PANEL_Y  = CANVAS.HEIGHT - 4;   // bottom-anchored
const DEPTH    = 53;

const GRID_COLS = 3;
const CELL_W    = 28;
const CELL_H    = 22;

export class PetPanel {
  private scene:  Phaser.Scene;
  /** True when the panel body is visible. */
  isVisible = false;

  // Key bindings
  private jKey!: Phaser.Input.Keyboard.Key;

  // Background / header
  private panelBg!:    Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private hintText!:   Phaser.GameObjects.Text;

  // Equipped pet display
  private equippedBg!:      Phaser.GameObjects.Rectangle;
  private petIcon!:         Phaser.GameObjects.Rectangle; // colored placeholder
  private petNameText!:     Phaser.GameObjects.Text;
  private petLevelText!:    Phaser.GameObjects.Text;
  private petBonusText!:    Phaser.GameObjects.Text;
  private happinessLabel!:  Phaser.GameObjects.Text;
  private happinessBg!:     Phaser.GameObjects.Rectangle;
  private happinessBar!:    Phaser.GameObjects.Rectangle;

  // Buttons
  private feedBtnBg!:    Phaser.GameObjects.Rectangle;
  private feedBtnText!:  Phaser.GameObjects.Text;
  private dismissBtnBg!: Phaser.GameObjects.Rectangle;
  private dismissBtnText!: Phaser.GameObjects.Text;

  // Pet grid (owned pets)
  private gridHeader!:   Phaser.GameObjects.Text;
  private gridCells:     Array<{
    bg:     Phaser.GameObjects.Rectangle;
    icon:   Phaser.GameObjects.Rectangle;
    label:  Phaser.GameObjects.Text;
    lvlTxt: Phaser.GameObjects.Text;
    petId:  string;
  }> = [];

  // "No pets" notice
  private noPetsText!: Phaser.GameObjects.Text;

  // Status bar shown when panel is closed
  private statusBg!:   Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;

  // Current state
  private pets:        PetData[] = [];
  private equippedPet: PetData | null = null;
  private happiness    = 0;

  // Callbacks
  onEquip?:   (petId: string) => void;
  onFeed?:    (petId: string) => void;
  onDismiss?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.build();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private build(): void {
    const px = PANEL_X;
    const py = PANEL_Y - PANEL_H;

    // Status bar (visible even when panel is closed)
    this.statusBg = this.scene.add
      .rectangle(px, PANEL_Y - PANEL_H - 6, PANEL_W, 10, 0x001122, 0.75)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.statusText = this.scene.add
      .text(px - PANEL_W + 3, PANEL_Y - PANEL_H - 5, '[J] Pets', {
        fontSize: '4px', color: '#ffcc44', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    // Panel background
    this.panelBg = this.scene.add
      .rectangle(px, py, PANEL_W, PANEL_H, 0x000d1a, 0.88)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    // Header
    this.headerText = this.scene.add
      .text(px - PANEL_W + 3, py + 3, 'COMPANION PETS', {
        fontSize: '5px', color: '#ffcc44', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);
    this.hintText = this.scene.add
      .text(px - 3, py + 3, '[J]', {
        fontSize: '4px', color: '#558888', fontFamily: 'monospace',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    // Equipped pet section
    this.equippedBg = this.scene.add
      .rectangle(px, py + 12, PANEL_W, 42, 0x001a30, 0.6)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    this.petIcon = this.scene.add
      .rectangle(px - PANEL_W + 6, py + 19, 18, 18, 0x445566, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    this.petNameText = this.scene.add
      .text(px - PANEL_W + 28, py + 14, 'No pet equipped', {
        fontSize: '5px', color: '#dddddd', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    this.petLevelText = this.scene.add
      .text(px - PANEL_W + 28, py + 22, '', {
        fontSize: '4px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    this.petBonusText = this.scene.add
      .text(px - PANEL_W + 28, py + 29, '', {
        fontSize: '4px', color: '#88ffcc', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    this.happinessLabel = this.scene.add
      .text(px - PANEL_W + 6, py + 39, 'Happiness:', {
        fontSize: '4px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    this.happinessBg = this.scene.add
      .rectangle(px - PANEL_W + 46, py + 40, 48, 4, 0x222222, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    this.happinessBar = this.scene.add
      .rectangle(px - PANEL_W + 46, py + 40, 0, 4, 0xff6644, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(false);

    // Feed / Dismiss buttons
    const btnY = py + 57;

    this.feedBtnBg = this.scene.add
      .rectangle(px - PANEL_W + 4, btnY, 44, 8, 0x225533, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.feedBtnBg.setFillStyle(0x336644))
      .on('pointerout',  () => this.feedBtnBg.setFillStyle(0x225533))
      .on('pointerdown', () => this.onFeedClick());

    this.feedBtnText = this.scene.add
      .text(px - PANEL_W + 26, btnY + 4, 'Feed Pet', {
        fontSize: '4px', color: '#88ff99', fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(false);

    this.dismissBtnBg = this.scene.add
      .rectangle(px - PANEL_W + 52, btnY, 44, 8, 0x332222, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.dismissBtnBg.setFillStyle(0x443333))
      .on('pointerout',  () => this.dismissBtnBg.setFillStyle(0x332222))
      .on('pointerdown', () => this.onDismiss?.());

    this.dismissBtnText = this.scene.add
      .text(px - PANEL_W + 74, btnY + 4, 'Dismiss', {
        fontSize: '4px', color: '#ff8888', fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(false);

    // Grid section header
    this.gridHeader = this.scene.add
      .text(px - PANEL_W + 3, py + 69, 'YOUR PETS', {
        fontSize: '4px', color: '#888888', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    // No pets notice
    this.noPetsText = this.scene.add
      .text(px - PANEL_W + 3, py + 78, 'No pets yet.\nVisit the Pet Vendor!', {
        fontSize: '4px', color: '#666666', fontFamily: 'monospace',
      }).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);

    // J key toggle
    this.jKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
  }

  // ── Grid management ────────────────────────────────────────────────────────

  private rebuildGrid(): void {
    this.gridCells.forEach(cell => {
      cell.bg.destroy();
      cell.icon.destroy();
      cell.label.destroy();
      cell.lvlTxt.destroy();
    });
    this.gridCells = [];

    const startX = PANEL_X - PANEL_W + 4;
    const startY = PANEL_Y - PANEL_H + 77;

    this.pets.forEach((pet, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx  = startX + col * (CELL_W + 2);
      const cy  = startY + row * (CELL_H + 2);

      const isEquipped = pet.isEquipped;
      const bg = this.scene.add
        .rectangle(cx, cy, CELL_W, CELL_H, isEquipped ? 0x224422 : 0x111122, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 1)
        .setStrokeStyle(1, isEquipped ? 0x44ff44 : 0x334455)
        .setVisible(this.isVisible)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x1a3344))
        .on('pointerout',  () => bg.setFillStyle(isEquipped ? 0x224422 : 0x111122))
        .on('pointerdown', () => { if (!pet.isEquipped) this.onEquip?.(pet.id); });

      const tint = PET_TINTS[pet.petType] ?? 0x888888;
      const icon = this.scene.add
        .rectangle(cx + 4, cy + 4, 10, 10, tint, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(this.isVisible);

      const label = this.scene.add
        .text(cx + 16, cy + 4, PET_NAMES[pet.petType] ?? pet.petType, {
          fontSize: '4px', color: '#cccccc', fontFamily: 'monospace',
        }).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(this.isVisible);

      const lvlTxt = this.scene.add
        .text(cx + 16, cy + 11, `Lv.${pet.level}`, {
          fontSize: '4px', color: '#888888', fontFamily: 'monospace',
        }).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(this.isVisible);

      this.gridCells.push({ bg, icon, label, lvlTxt, petId: pet.id });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Call every frame from the scene's update loop. */
  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.jKey)) {
      this.isVisible ? this.hide() : this.show();
    }
  }

  /** Close if open; returns true if it was open. */
  closeIfOpen(): boolean {
    if (!this.isVisible) return false;
    this.hide();
    return true;
  }

  /** Update the full list of owned pets. */
  setPets(pets: PetData[]): void {
    this.pets        = pets;
    this.equippedPet = pets.find(p => p.isEquipped) ?? null;
    this.happiness   = this.equippedPet?.happiness ?? 0;
    if (this.isVisible) {
      this.refreshDisplay();
      this.rebuildGrid();
    }
  }

  /** Update only the happiness of the currently equipped pet. */
  setHappiness(happiness: number): void {
    this.happiness = happiness;
    if (this.equippedPet) this.equippedPet.happiness = happiness;
    if (this.isVisible) this.refreshHappinessBar();
  }

  show(): void {
    this.isVisible = true;
    this.setAllVisible(true);
    this.refreshDisplay();
    this.rebuildGrid();
    this.noPetsText.setVisible(this.pets.length === 0);
  }

  hide(): void {
    this.isVisible = false;
    this.setAllVisible(false);
    this.gridCells.forEach(cell => {
      cell.bg.setVisible(false);
      cell.icon.setVisible(false);
      cell.label.setVisible(false);
      cell.lvlTxt.setVisible(false);
    });
  }

  setStatusBarVisible(visible: boolean): void {
    this.statusBg.setVisible(visible);
    this.statusText.setVisible(visible);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private setAllVisible(v: boolean): void {
    [
      this.panelBg, this.headerText, this.hintText,
      this.equippedBg, this.petIcon, this.petNameText, this.petLevelText,
      this.petBonusText, this.happinessLabel, this.happinessBg, this.happinessBar,
      this.feedBtnBg, this.feedBtnText, this.dismissBtnBg, this.dismissBtnText,
      this.gridHeader, this.noPetsText,
    ].forEach(obj => obj.setVisible(v));
  }

  private refreshDisplay(): void {
    const pet = this.equippedPet;
    if (pet) {
      const tint = PET_TINTS[pet.petType] ?? 0x888888;
      this.petIcon.setFillStyle(tint);
      this.petNameText.setText(PET_NAMES[pet.petType] ?? pet.petType);
      this.petLevelText.setText(`Level ${pet.level} / 20`);
      this.petBonusText.setText(PET_BONUS_LABELS[pet.petType] ?? '');
      this.feedBtnBg.setVisible(true);
      this.feedBtnText.setVisible(true);
      this.dismissBtnBg.setVisible(true);
      this.dismissBtnText.setVisible(true);
    } else {
      this.petIcon.setFillStyle(0x445566);
      this.petNameText.setText('No pet equipped');
      this.petLevelText.setText('');
      this.petBonusText.setText('');
      this.feedBtnBg.setVisible(false);
      this.feedBtnText.setVisible(false);
      this.dismissBtnBg.setVisible(false);
      this.dismissBtnText.setVisible(false);
    }
    this.refreshHappinessBar();
  }

  private refreshHappinessBar(): void {
    const h = Math.max(0, Math.min(100, this.happiness));
    const barW = Math.floor(48 * h / 100);
    this.happinessBar.width = barW;

    const color = h > 60 ? 0x44ff88 : h > 30 ? 0xffcc00 : 0xff4444;
    this.happinessBar.setFillStyle(color);
    this.happinessBg.setVisible(this.equippedPet !== null);
    this.happinessBar.setVisible(this.equippedPet !== null);
    this.happinessLabel.setVisible(this.equippedPet !== null);
  }

  private onFeedClick(): void {
    if (this.equippedPet) this.onFeed?.(this.equippedPet.id);
  }

  /** Sync status bar text with currently equipped pet. */
  refreshStatusBar(): void {
    const pet = this.equippedPet;
    if (pet) {
      const h = Math.max(0, Math.min(100, this.happiness));
      const icon = h > 60 ? '♥' : h > 30 ? '♡' : '!';
      this.statusText.setText(`[J] ${PET_NAMES[pet.petType] ?? pet.petType} ${icon}`);
    } else {
      this.statusText.setText('[J] Pets');
    }
  }
}

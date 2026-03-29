/**
 * FishingJournalPanel — catch log overlay.
 *
 * Shows:
 *  - Total unique species caught vs total available (per zone and overall)
 *  - Per-fish entries: icon, name, rarity, best weight, catch count
 *  - Undiscovered entries shown as "???" silhouettes
 *
 * Toggle with J key.  Closes on ESC.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { SaveManager } from '../systems/SaveManager';
import { FISH_DEFS, type FishDef, type FishRarity } from '../systems/FishingSystem';

const PANEL_W  = 180;
const PANEL_H  = CANVAS.HEIGHT - 24;
const PANEL_X  = (CANVAS.WIDTH - PANEL_W) / 2;
const PANEL_Y  = 12;
const DEPTH    = 88;
const PAD      = 6;
const ROW_H    = 14;

const RARITY_COLOR: Record<FishRarity, number> = {
  common:    0xaaaaaa,
  uncommon:  0x44cc44,
  rare:      0x4488ff,
  legendary: 0xff8800,
  junk:      0x886644,
};

export class FishingJournalPanel {
  isVisible = false;

  private scene:      Phaser.Scene;
  private container:  Phaser.GameObjects.Container;
  private jKey?:      Phaser.Input.Keyboard.Key;

  // Scroll state
  private scrollOffset = 0;
  private maxScroll    = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);

    this.jKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    // Mouse wheel scroll
    scene.input.on('wheel', (_ptr: unknown, _gos: unknown, _dx: number, dy: number) => {
      if (!this.isVisible) return;
      this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + (dy > 0 ? ROW_H : -ROW_H)));
      this.rebuild();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  update(): void {
    if (this.jKey && Phaser.Input.Keyboard.JustDown(this.jKey)) {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  show(): void {
    this.isVisible    = true;
    this.scrollOffset = 0;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (!this.isVisible) return false;
    this.hide();
    return true;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    const fishing   = SaveManager.getFishing();
    const caughtMap = fishing.caughtFish;

    // Panel background
    const bg = this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x080c14, 0.96)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = this.scene.add.graphics().setScrollFactor(0);
    border.lineStyle(2, 0x2244aa, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    this.container.add([bg, border]);

    // Header
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PAD, '📖 Fishing Journal',
        { fontSize: '5px', color: '#88ccff', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0).setScrollFactor(0),
    );

    // Skill level bar
    const skillY = PANEL_Y + PAD + 10;
    const skillText = `Fishing Lv.${fishing.skillLevel}  ${fishing.xp}/${fishing.skillLevel * 100}xp`;
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, skillY, skillText,
        { fontSize: '3px', color: '#aaccff', fontFamily: 'monospace' },
      ).setOrigin(0, 0).setScrollFactor(0),
    );

    // Progress summary
    const totalFish   = FISH_DEFS.filter(f => f.rarity !== 'junk').length;
    const caughtCount = FISH_DEFS.filter(f => f.rarity !== 'junk' && (caughtMap[f.id] ?? 0) > 0).length;
    const summaryY    = skillY + 8;
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, summaryY,
        `Species: ${caughtCount}/${totalFish}  Junk: ${(caughtMap['old_boot'] ?? 0) + (caughtMap['sunken_treasure'] ?? 0)}`,
        { fontSize: '3px', color: '#aaaaaa', fontFamily: 'monospace' },
      ).setOrigin(0, 0).setScrollFactor(0),
    );

    // Progress bar
    const pbY = summaryY + 7;
    const pbW = PANEL_W - PAD * 2;
    this.container.add([
      this.scene.add.rectangle(PANEL_X + PAD, pbY, pbW, 4, 0x112233, 1).setOrigin(0, 0).setScrollFactor(0),
      this.scene.add.rectangle(PANEL_X + PAD, pbY, Math.round(pbW * caughtCount / Math.max(1, totalFish)), 4, 0x2266cc, 1).setOrigin(0, 0).setScrollFactor(0),
    ]);

    // Divider
    const divY = pbY + 8;
    const divG = this.scene.add.graphics().setScrollFactor(0);
    divG.lineStyle(1, 0x223355, 0.7);
    divG.lineBetween(PANEL_X + PAD, divY, PANEL_X + PANEL_W - PAD, divY);
    this.container.add(divG);

    // List area
    const listTop    = divY + 3;
    const listBottom = PANEL_Y + PANEL_H - PAD - 10;
    const visibleH   = listBottom - listTop;
    const rowsVisible = Math.floor(visibleH / ROW_H);

    // Build full sorted list: caught first (by rarity weight), then junk, then undiscovered
    const rarityOrder: Record<FishRarity, number> = { legendary: 0, rare: 1, uncommon: 2, common: 3, junk: 4 };
    const sortedFish = [...FISH_DEFS].sort((a, b) =>
      (rarityOrder[a.rarity] - rarityOrder[b.rarity]) || a.name.localeCompare(b.name),
    );
    const caughtFish = sortedFish.filter(f => (caughtMap[f.id] ?? 0) > 0);
    const notCaught  = sortedFish.filter(f => !(caughtMap[f.id] > 0));
    const displayList = [...caughtFish, ...notCaught];

    const totalRows  = displayList.length;
    this.maxScroll   = Math.max(0, (totalRows - rowsVisible) * ROW_H);
    const startIdx   = Math.floor(this.scrollOffset / ROW_H);

    // Clip mask so rows don't overflow below the panel
    const maskShape = this.scene.add.graphics().setScrollFactor(0);
    maskShape.fillRect(PANEL_X, listTop, PANEL_W, visibleH);
    const mask = maskShape.createGeometryMask();
    this.container.setMask(mask);

    for (let i = startIdx; i < Math.min(startIdx + rowsVisible + 1, totalRows); i++) {
      const fish  = displayList[i];
      const count = caughtMap[fish.id] ?? 0;
      const rowY  = listTop + (i - startIdx) * ROW_H;

      this.buildRow(fish, count, rowY, PANEL_X + PAD);
    }

    // Scroll arrows
    if (this.scrollOffset > 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, listTop - 1, '▲',
          { fontSize: '4px', color: '#556677', fontFamily: 'monospace' },
        ).setOrigin(0.5, 1).setScrollFactor(0),
      );
    }
    if (this.scrollOffset < this.maxScroll) {
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W / 2, listBottom + 1, '▼',
          { fontSize: '4px', color: '#556677', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setScrollFactor(0),
      );
    }

    // Close hint
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 4, '[J / ESC] close',
        { fontSize: '3px', color: '#334455', fontFamily: 'monospace' },
      ).setOrigin(0.5, 1).setScrollFactor(0),
    );
  }

  private buildRow(fish: FishDef, count: number, y: number, x: number): void {
    const isCaught  = count > 0;
    const rcHex     = RARITY_COLOR[fish.rarity];
    const rcStr     = `#${rcHex.toString(16).padStart(6, '0')}`;
    const rowW      = PANEL_W - PAD * 2;

    // Row background (highlight for caught)
    if (isCaught) {
      this.container.add(
        this.scene.add.rectangle(x, y, rowW, ROW_H - 1, rcHex, 0.08)
          .setOrigin(0, 0).setScrollFactor(0),
      );
    }

    // Rarity gem dot
    this.container.add(
      this.scene.add.circle(x + 3, y + ROW_H / 2, 2, rcHex, isCaught ? 0.9 : 0.2)
        .setScrollFactor(0),
    );

    // Fish sprite or placeholder
    if (isCaught && this.scene.textures.exists(fish.assetKey)) {
      this.container.add(
        this.scene.add.image(x + 12, y + ROW_H / 2, fish.assetKey)
          .setDisplaySize(10, 10).setScrollFactor(0),
      );
    } else {
      this.container.add(
        this.scene.add.rectangle(x + 12, y + ROW_H / 2, 10, 8, isCaught ? rcHex : 0x223344, isCaught ? 0.6 : 0.3)
          .setScrollFactor(0),
      );
    }

    // Name
    const nameColor = isCaught ? '#dddddd' : '#445566';
    const nameStr   = isCaught ? fish.name : '??? (undiscovered)';
    this.container.add(
      this.scene.add.text(x + 20, y + 2, nameStr,
        { fontSize: '4px', color: nameColor, fontFamily: 'monospace' },
      ).setOrigin(0, 0).setScrollFactor(0),
    );

    // Catch count
    if (isCaught) {
      this.container.add(
        this.scene.add.text(x + rowW - 2, y + 2, `×${count}`,
          { fontSize: '3px', color: rcStr, fontFamily: 'monospace' },
        ).setOrigin(1, 0).setScrollFactor(0),
      );
      // Zone hint
      const zoneStr = fish.zones.length > 0 ? fish.zones[0] : 'any';
      this.container.add(
        this.scene.add.text(x + 20, y + 8, zoneStr,
          { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
        ).setOrigin(0, 0).setScrollFactor(0),
      );
    }
  }
}

/**
 * CosmeticShopPanel — browse, preview, buy and equip cosmetic items.
 *
 * Press V (or interact with the Stylist NPC) to open.
 *
 * Tabs:
 *   [Shop]      — browse cosmetic items by category, buy with gold or earn via achievements
 *   [Wardrobe]  — manage owned cosmetics; equip/unequip slots
 *
 * Cosmetic slots: outfit | hat | aura | cloak | wings | portraitFrame
 *
 * On equip, the caller is notified via onEquipChanged so GameScene can update
 * player cosmetic overlays and broadcast to multiplayer.
 *
 * Uses PIX-338 art assets from assets/ui/cosmetic_shop/ and assets/cosmetics/.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import { SaveManager } from '../systems/SaveManager';

const PANEL_W  = 230;
const PANEL_H  = 185;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 79;
const PAD      = 4;

// ── Cosmetic catalog ──────────────────────────────────────────────────────────

export type CosmeticSlot = 'outfit' | 'hat' | 'aura' | 'cloak' | 'wings' | 'portraitFrame';

export interface CosmeticDef {
  id:            string;
  name:          string;
  slot:          CosmeticSlot;
  assetKey:      string;
  goldCost:      number;
  /** Achievement ID required instead of gold (0 = buy with gold). */
  achievementId: string;
  rarity:        'common' | 'rare' | 'epic' | 'legendary';
  description:   string;
}

export const COSMETICS: CosmeticDef[] = [
  // Outfits
  { id: 'outfit_celestial',  name: 'Celestial Robe',   slot: 'outfit', assetKey: 'cosmetic_outfit_mage_celestial',  goldCost: 800,  achievementId: '', rarity: 'epic',      description: 'An ethereal garb woven from starlight.' },
  { id: 'outfit_ember',      name: 'Ember Plate',      slot: 'outfit', assetKey: 'cosmetic_outfit_warrior_ember',   goldCost: 600,  achievementId: '', rarity: 'rare',      description: 'Forged in the heart of a volcano.' },
  { id: 'outfit_frost',      name: 'Frost Cloak',      slot: 'outfit', assetKey: 'cosmetic_outfit_ranger_frost',    goldCost: 600,  achievementId: '', rarity: 'rare',      description: 'Shimmers like ice in winter light.' },
  { id: 'outfit_shadow',     name: 'Shadow Silk',      slot: 'outfit', assetKey: 'cosmetic_outfit_ranger_shadow',   goldCost: 500,  achievementId: '', rarity: 'common',    description: 'Blends into darkness effortlessly.' },
  { id: 'outfit_royal',      name: 'Royal Vestments',  slot: 'outfit', assetKey: 'cosmetic_outfit_warrior_royal',   goldCost: 1200, achievementId: '', rarity: 'legendary', description: 'Worn only by champions of the realm.' },
  // Hats
  { id: 'hat_wizard',        name: 'Wizard Hat',       slot: 'hat',    assetKey: 'hat_wizard',      goldCost: 200, achievementId: '', rarity: 'common',    description: 'The classic pointy hat of arcane tradition.' },
  { id: 'hat_crown',         name: 'Golden Crown',     slot: 'hat',    assetKey: 'hat_crown',       goldCost: 800, achievementId: '', rarity: 'epic',      description: 'Gleams like a king\'s own diadem.' },
  { id: 'hat_pirate',        name: 'Pirate Hat',       slot: 'hat',    assetKey: 'hat_pirate',      goldCost: 250, achievementId: '', rarity: 'common',    description: 'Yo-ho-ho and a barrel of potions.' },
  { id: 'hat_hood',          name: 'Rogue\'s Hood',    slot: 'hat',    assetKey: 'hat_hood',        goldCost: 300, achievementId: '', rarity: 'rare',      description: 'Never be seen if you don\'t want to be.' },
  // Auras
  { id: 'aura_flame',        name: 'Flame Aura',       slot: 'aura',   assetKey: 'aura_flame',      goldCost: 1000, achievementId: '', rarity: 'epic',     description: 'Wreathed in an eternal ring of fire.' },
  { id: 'aura_frost',        name: 'Frost Aura',       slot: 'aura',   assetKey: 'aura_frost',      goldCost: 1000, achievementId: '', rarity: 'epic',     description: 'Crystalline snowflakes orbit your form.' },
  { id: 'aura_holy',         name: 'Holy Aura',        slot: 'aura',   assetKey: 'aura_holy',       goldCost: 1500, achievementId: 'completionist', rarity: 'legendary', description: 'Radiates divine light. Earned by completionists.' },
  { id: 'aura_shadow',       name: 'Shadow Aura',      slot: 'aura',   assetKey: 'aura_shadow',     goldCost: 1200, achievementId: '', rarity: 'legendary', description: 'Tendrils of void energy trail your every step.' },
  // Cloaks
  { id: 'cloak_crimson',     name: 'Crimson Cloak',    slot: 'cloak',  assetKey: 'cloak_crimson',   goldCost: 350,  achievementId: '', rarity: 'rare',     description: 'A bold red cloak that billows dramatically.' },
  { id: 'cloak_midnight',    name: 'Midnight Cloak',   slot: 'cloak',  assetKey: 'cloak_midnight',  goldCost: 350,  achievementId: '', rarity: 'rare',     description: 'As dark as the space between stars.' },
  { id: 'cloak_ivory',       name: 'Ivory Cloak',      slot: 'cloak',  assetKey: 'cloak_ivory',     goldCost: 300,  achievementId: '', rarity: 'common',   description: 'Pristine white, hard to keep clean.' },
  // Wings
  { id: 'wings_angel',       name: 'Angel Wings',      slot: 'wings',  assetKey: 'wings_angel',     goldCost: 2000, achievementId: '', rarity: 'legendary', description: 'Feathered wings from the upper realm.' },
  { id: 'wings_demon',       name: 'Demon Wings',      slot: 'wings',  assetKey: 'wings_demon',     goldCost: 2000, achievementId: '', rarity: 'legendary', description: 'Bat-like wings from the underworld.' },
  { id: 'wings_fairy',       name: 'Fairy Wings',      slot: 'wings',  assetKey: 'wings_fairy',     goldCost: 800,  achievementId: '', rarity: 'epic',      description: 'Gossamer wings that shimmer in the light.' },
  // Portrait frames
  { id: 'frame_gold',        name: 'Gold Frame',       slot: 'portraitFrame', assetKey: 'frame_gold',       goldCost: 500,  achievementId: '', rarity: 'rare',  description: 'An ornate gold border for your portrait.' },
  { id: 'frame_celestial',   name: 'Celestial Frame',  slot: 'portraitFrame', assetKey: 'frame_celestial',  goldCost: 1500, achievementId: 'game_complete', rarity: 'legendary', description: 'Awarded to those who conquer PixelRealm.' },
];

const RARITY_COLOR: Record<string, number> = {
  common:    0xaaaaaa,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xff8800,
};

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  outfit:       'Outfit',
  hat:          'Hat',
  aura:         'Aura',
  cloak:        'Cloak',
  wings:        'Wings',
  portraitFrame:'Frame',
};

type ShopTab = 'shop' | 'wardrobe';
type ShopCategory = 'all' | CosmeticSlot;

export interface EquippedCosmetics {
  outfit?:       string;
  hat?:          string;
  aura?:         string;
  cloak?:        string;
  wings?:        string;
  portraitFrame?: string;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export class CosmeticShopPanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private vKey!:     Phaser.Input.Keyboard.Key;

  private visible   = false;
  private tab:      ShopTab = 'shop';
  private category: ShopCategory = 'all';
  private selected: CosmeticDef | null = null;
  private scrollOff = 0;
  private feedback  = '';

  /** Player's current gold (set by caller before show). */
  playerGold = 0;

  /** Called when equipped cosmetics change. Payload: full equipped state. */
  onEquipChanged?: (equipped: EquippedCosmetics) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.vKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.rebuild();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.vKey)) this.toggle();
  }

  show(): void {
    this.visible  = true;
    this.tab      = 'shop';
    this.feedback = '';
    this.selected = null;
    this.container.setVisible(true);
    this.rebuild();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  get isVisible(): boolean { return this.visible; }

  destroy(): void { this.container.destroy(true); }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toggle(): void { this.visible ? this.hide() : this.show(); }

  private getCosmeticData() {
    return SaveManager.getCosmetics();
  }

  private getFiltered(): CosmeticDef[] {
    if (this.category === 'all') return COSMETICS;
    return COSMETICS.filter(c => c.slot === this.category);
  }

  // ── Buy / Equip / Unequip ─────────────────────────────────────────────────

  private buy(def: CosmeticDef): void {
    if (def.achievementId) {
      this.feedback = 'This item is earned via an achievement.';
      this.rebuild();
      return;
    }
    if (this.playerGold < def.goldCost) {
      this.feedback = `Not enough gold! (need ${def.goldCost}g)`;
      this.rebuild();
      return;
    }
    SaveManager.buyCosmetic(def.id);
    this.playerGold -= def.goldCost;
    this.feedback = `✦ Purchased: ${def.name}!`;
    this.rebuild();
  }

  private equip(def: CosmeticDef): void {
    SaveManager.equipCosmetic(def.slot, def.id);
    this.feedback = `Equipped: ${def.name}`;
    this.onEquipChanged?.(SaveManager.getCosmetics().equipped);
    this.rebuild();
  }

  private unequip(slot: CosmeticSlot): void {
    SaveManager.equipCosmetic(slot, null);
    this.feedback = `Removed ${SLOT_LABELS[slot]}`;
    this.onEquipChanged?.(SaveManager.getCosmetics().equipped);
    this.rebuild();
  }

  // ── Rebuild ───────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    const cosData = this.getCosmeticData();

    // Background
    if (this.scene.textures.exists('ui_panel_cosmetic_shop')) {
      this.container.add(
        this.scene.add.image(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, 'ui_panel_cosmetic_shop')
          .setDisplaySize(PANEL_W, PANEL_H).setScrollFactor(0).setOrigin(0.5),
      );
    } else {
      const bg = this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x080810, 0.94)
        .setOrigin(0, 0).setScrollFactor(0);
      const border = this.scene.add.graphics().setScrollFactor(0);
      border.lineStyle(1, 0x6644aa, 0.9);
      border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
      this.container.add([bg, border]);
    }

    // Title
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PAD, '✨ Cosmetic Shop',
        { fontSize: '5px', color: '#ddaaff', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0).setScrollFactor(0),
    );

    // Gold display
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + PAD + 1, `${this.playerGold}g`,
        { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0),
    );

    // Shop / Wardrobe tabs
    const tabY = PANEL_Y + 13;
    (['shop', 'wardrobe'] as ShopTab[]).forEach((t, i) => {
      const tx      = PANEL_X + PAD + i * 90;
      const isActive = this.tab === t;
      const tabBg   = this.scene.add.rectangle(tx, tabY, 88, 9, isActive ? 0x1a1040 : 0x0a0810, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      if (isActive) tabBg.setStrokeStyle(1, 0x8844cc, 0.9);
      const tabTxt  = this.scene.add.text(tx + 44, tabY + 4,
        t === 'shop' ? 'Shop' : 'Wardrobe',
        { fontSize: '4px', color: isActive ? '#ddaaff' : '#665588', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0);
      tabBg.on('pointerup', () => {
        this.tab = t; this.selected = null; this.feedback = ''; this.scrollOff = 0; this.rebuild();
      });
      this.container.add([tabBg, tabTxt]);
    });

    const contentY = tabY + 12;

    if (this.tab === 'shop') {
      this.renderShopTab(contentY, cosData);
    } else {
      this.renderWardrobeTab(contentY, cosData);
    }

    // Feedback line
    if (this.feedback) {
      const fColor = this.feedback.startsWith('✦') ? '#88ff88' : '#ffaaaa';
      this.container.add(
        this.scene.add.text(PANEL_X + PAD, PANEL_Y + PANEL_H - 10, this.feedback,
          { fontSize: '3px', color: fColor, fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
    }

    // Close hint
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 4, '[V/Esc]',
        { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0),
    );

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  // ── Shop tab ──────────────────────────────────────────────────────────────

  private renderShopTab(startY: number, cosData: ReturnType<typeof SaveManager.getCosmetics>): void {
    // Category filter row
    const cats: { label: string; id: ShopCategory }[] = [
      { label: 'All',    id: 'all' },
      { label: 'Outfit', id: 'outfit' },
      { label: 'Hat',    id: 'hat' },
      { label: 'Aura',   id: 'aura' },
      { label: 'Cloak',  id: 'cloak' },
      { label: 'Wings',  id: 'wings' },
    ];
    cats.forEach((cat, i) => {
      const cx = PANEL_X + PAD + i * 36;
      const isActive = this.category === cat.id;
      const btn = this.scene.add.rectangle(cx, startY, 34, 8, isActive ? 0x1a1040 : 0x0a0810, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      if (isActive) btn.setStrokeStyle(1, 0x8844cc, 0.8);
      const txt = this.scene.add.text(cx + 17, startY + 4, cat.label,
        { fontSize: '3px', color: isActive ? '#ddaaff' : '#665588', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0);
      btn.on('pointerup', () => {
        this.category = cat.id; this.scrollOff = 0; this.selected = null; this.rebuild();
      });
      this.container.add([btn, txt]);
    });

    const listY  = startY + 11;
    const ROW_H  = 14;
    const maxRows = Math.floor((PANEL_H - (listY - PANEL_Y) - 22) / ROW_H);
    const filtered = this.getFiltered();
    const visible  = filtered.slice(this.scrollOff, this.scrollOff + maxRows);

    visible.forEach((def, i) => {
      const rowY     = listY + i * ROW_H;
      const isOwned  = cosData.owned.includes(def.id);
      const isSel    = this.selected?.id === def.id;
      const rcHex    = RARITY_COLOR[def.rarity] ?? RARITY_COLOR.common;

      const rowBg = this.scene.add.rectangle(PANEL_X + PAD, rowY, PANEL_W - PAD * 2, ROW_H - 1,
        isSel ? 0x1a1040 : 0x080810, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      if (isSel) rowBg.setStrokeStyle(1, 0x8844cc, 0.7);
      rowBg.on('pointerup', () => {
        this.selected = (this.selected?.id === def.id) ? null : def; this.rebuild();
      });
      this.container.add(rowBg);

      // Rarity gem
      this.container.add(
        this.scene.add.circle(PANEL_X + PAD + 4, rowY + ROW_H / 2, 3, rcHex, 0.9).setScrollFactor(0),
      );

      // Name
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 10, rowY + 2,
          def.name.slice(0, 22),
          { fontSize: '4px', color: isOwned ? '#ccaaff' : '#aaaacc', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Slot badge
      this.container.add(
        this.scene.add.text(PANEL_X + PAD + 10, rowY + 8, SLOT_LABELS[def.slot],
          { fontSize: '3px', color: '#665588', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      // Price or OWNED badge
      const priceLabel = def.achievementId ? 'Achievement' : `${def.goldCost}g`;
      const priceColor = isOwned ? '#88ff88' : (this.playerGold >= def.goldCost ? '#ffd700' : '#886644');
      this.container.add(
        this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 2,
          isOwned ? 'Owned' : priceLabel,
          { fontSize: '3px', color: isOwned ? '#88ff88' : priceColor, fontFamily: 'monospace' },
        ).setOrigin(1, 0).setScrollFactor(0),
      );

      // Expanded actions
      if (isSel) {
        const actY = rowY + ROW_H;
        // Description
        this.container.add(
          this.scene.add.text(PANEL_X + PAD + 2, actY, def.description.slice(0, 60),
            { fontSize: '3px', color: '#998877', fontFamily: 'monospace' },
          ).setScrollFactor(0),
        );

        if (isOwned) {
          const equipped = (cosData.equipped as Record<string, string | undefined>)[def.slot];
          const isEquipped = equipped === def.id;
          const btnLabel = isEquipped ? 'Unequip' : 'Equip';
          const equipBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 45, actY, 44, 8, 0x1a2a1a, 0.9)
            .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
          const equipTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 23, actY + 4, btnLabel,
            { fontSize: '3px', color: '#88ff88', fontFamily: 'monospace' },
          ).setOrigin(0.5).setScrollFactor(0);
          equipBtn.on('pointerup', () => isEquipped ? this.unequip(def.slot) : this.equip(def));
          this.container.add([equipBtn, equipTxt]);
        } else {
          const canBuy = this.playerGold >= def.goldCost && !def.achievementId;
          const buyBtn = this.scene.add.rectangle(PANEL_X + PANEL_W - PAD - 45, actY, 44, 8,
            canBuy ? 0x1a1040 : 0x111111, 0.9)
            .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: canBuy });
          const buyTxt = this.scene.add.text(PANEL_X + PANEL_W - PAD - 23, actY + 4,
            canBuy ? `Buy ${def.goldCost}g` : (def.achievementId ? 'Earn' : 'Need gold'),
            { fontSize: '3px', color: canBuy ? '#ddaaff' : '#555566', fontFamily: 'monospace' },
          ).setOrigin(0.5).setScrollFactor(0);
          if (canBuy) buyBtn.on('pointerup', () => this.buy(def));
          this.container.add([buyBtn, buyTxt]);
        }
      }
    });

    // Scroll arrows
    if (this.scrollOff > 0) {
      const upBtn = this.scene.add.text(PANEL_X + PANEL_W - PAD - 4, listY - 1, '▲',
        { fontSize: '4px', color: '#8844cc', fontFamily: 'monospace' },
      ).setOrigin(1, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
      upBtn.on('pointerup', () => { this.scrollOff = Math.max(0, this.scrollOff - 5); this.rebuild(); });
      this.container.add(upBtn);
    }
    if (this.scrollOff + maxRows < filtered.length) {
      const downBtn = this.scene.add.text(PANEL_X + PANEL_W - PAD - 4, PANEL_Y + PANEL_H - 12, '▼',
        { fontSize: '4px', color: '#8844cc', fontFamily: 'monospace' },
      ).setOrigin(1, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
      downBtn.on('pointerup', () => { this.scrollOff += 5; this.rebuild(); });
      this.container.add(downBtn);
    }
  }

  // ── Wardrobe tab ──────────────────────────────────────────────────────────

  private renderWardrobeTab(startY: number, cosData: ReturnType<typeof SaveManager.getCosmetics>): void {
    let y = startY;

    // Equipped slots grid
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, y, 'Equipped:',
        { fontSize: '4px', color: '#ddaaff', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );
    y += 9;

    const slots: CosmeticSlot[] = ['outfit', 'hat', 'aura', 'cloak', 'wings', 'portraitFrame'];
    const equip = cosData.equipped as Record<string, string | undefined>;

    slots.forEach((slot, i) => {
      const col   = i % 2;
      const row   = Math.floor(i / 2);
      const sx    = PANEL_X + PAD + col * 106;
      const sy    = y + row * 14;
      const equippedId = equip[slot];
      const def   = equippedId ? COSMETICS.find(c => c.id === equippedId) : null;

      const slotBg = this.scene.add.rectangle(sx, sy, 100, 12, equippedId ? 0x1a1040 : 0x080810, 0.9)
        .setOrigin(0, 0).setScrollFactor(0);
      if (equippedId) slotBg.setStrokeStyle(1, 0x8844cc, 0.6);
      this.container.add(slotBg);

      this.container.add(
        this.scene.add.text(sx + 2, sy + 2, `${SLOT_LABELS[slot]}:`,
          { fontSize: '3px', color: '#665588', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
      this.container.add(
        this.scene.add.text(sx + 36, sy + 2, def ? def.name.slice(0, 14) : '—',
          { fontSize: '3px', color: def ? '#ccaaff' : '#333344', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );

      if (def) {
        const remBtn = this.scene.add.text(sx + 96, sy + 6, '[✕]',
          { fontSize: '3px', color: '#884466', fontFamily: 'monospace' },
        ).setOrigin(1, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
        remBtn.on('pointerup', () => this.unequip(slot));
        this.container.add(remBtn);
      }
    });
    y += Math.ceil(slots.length / 2) * 14 + 4;

    // Divider
    const divG = this.scene.add.graphics().setScrollFactor(0);
    divG.lineStyle(1, 0x442266, 0.6);
    divG.lineBetween(PANEL_X + PAD, y, PANEL_X + PANEL_W - PAD, y);
    this.container.add(divG);
    y += 4;

    // Owned items list
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, y, `Owned (${cosData.owned.length}):`,
        { fontSize: '4px', color: '#ddaaff', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );
    y += 8;

    if (cosData.owned.length === 0) {
      this.container.add(
        this.scene.add.text(PANEL_X + PAD, y, 'No cosmetics owned yet. Visit the Shop tab!',
          { fontSize: '3px', color: '#665577', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
    } else {
      const ownedDefs = cosData.owned.map(id => COSMETICS.find(c => c.id === id)).filter(Boolean) as CosmeticDef[];
      const maxRows   = Math.floor((PANEL_Y + PANEL_H - 18 - y) / 10);
      ownedDefs.slice(0, maxRows).forEach((def, i) => {
        const equippedHere = equip[def.slot] === def.id;
        this.container.add(
          this.scene.add.text(PANEL_X + PAD, y + i * 10,
            `${equippedHere ? '▶ ' : '  '}${def.name.slice(0, 24)} [${SLOT_LABELS[def.slot]}]`,
            { fontSize: '3px', color: equippedHere ? '#ccaaff' : '#887799', fontFamily: 'monospace' },
          ).setScrollFactor(0),
        );
      });
    }
  }
}

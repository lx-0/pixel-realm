/**
 * BestiaryPanel — monster compendium collection tracker.
 *
 * Press Z to toggle open/close.
 *
 * Features:
 *  - Lists all 72+ regular enemies and 19 bosses across all zones
 *  - Undiscovered entries shown as silhouettes ("???")
 *  - Per-entry detail: stats, zone, drop hint, lore blurb
 *  - Filter tabs: All | Regular | Boss
 *  - Search: type first letter to jump to entry
 *  - Completion progress bar + per-zone progress
 *  - Achievement milestones: 25% / 50% / 75% / 100%
 *  - Boss entries show defeat counter
 *
 * Discovery hooks:
 *  - SaveManager.discoverEnemy(id) — called on first zone enter or first kill
 *  - SaveManager.recordBossKill(id) — called on boss death
 */

import Phaser from 'phaser';
import { CANVAS, ZONES, ENEMY_TYPES, BOSS_TYPES } from '../config/constants';
import { SaveManager } from '../systems/SaveManager';

const PANEL_W  = 230;
const PANEL_H  = 185;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 79;
const PAD      = 4;

// ── Entry type ────────────────────────────────────────────────────────────────

interface BestiaryEntry {
  id:         string;
  name:       string;
  isBoss:     boolean;
  zoneId:     string;
  zoneName:   string;
  biome:      string;
  minLevel:   number;
  maxLevel:   number;
  baseHp:     number;
  baseDmg:    number;
  xpValue:    number;
  behaviour:  string;
  color:      number;
  lore:       string;
}

// ── Static lore table (subset; falls back to generated text) ─────────────────

const LORE_TABLE: Record<string, string> = {
  slime:            'A gelatinous blob born from ambient magic. Harmless alone; troublesome in swarms.',
  slime_king:       'The bloated sovereign of all slimes. Its mass pulses with unnatural hunger.',
  mushroom:         'A spore-laden fungus that bursts when threatened, clouding the air with toxins.',
  bandit:           'Desperate outlaws who prey on wanderers crossing the Dusty Trail.',
  bandit_chief:     'Korran once led a merchant guild before turning to pillage and plunder.',
  wraith:           'A spirit bound to the ruins of a forgotten civilization, unable to rest.',
  archon:           'Thessar, the corrupted guardian of Ironveil, wields stolen arcane power.',
  ice_elemental:    'A crystalline being formed from centuries-old glacial energy.',
  glacial_wyrm:     'A dragon of living ice entombed in the cavern walls for millennia.',
  cosmic_devourer:  'A predator from the void between stars. Its hunger knows no dimension.',
  astral_sovereign: 'The eternal ruler of the Astral Plane, keeper of the final gate.',
};

function generateLore(entry: BestiaryEntry): string {
  if (LORE_TABLE[entry.id]) return LORE_TABLE[entry.id];
  const behav = entry.behaviour;
  if (entry.isBoss) return `A fearsome ruler of ${entry.zoneName}. None who face it leave unchanged.`;
  if (behav === 'ranged') return `A dangerous ${entry.biome.toLowerCase()} denizen that prefers to attack from afar.`;
  if (behav === 'burst')  return `Known for sudden explosive charges that catch adventurers off guard.`;
  if (behav === 'tank')   return `An armored brute of ${entry.zoneName}. Slow but nearly impossible to stop.`;
  return `A native creature of ${entry.zoneName}, adapted to its harsh environment.`;
}

// ── Build complete entry list from constants ──────────────────────────────────

function buildEntries(): BestiaryEntry[] {
  const entries: BestiaryEntry[] = [];

  // Map enemy → zone(s)
  const enemyZoneMap: Record<string, { zoneId: string; zoneName: string; biome: string; minLevel: number }> = {};
  for (const zone of ZONES) {
    for (const enemyId of zone.enemyTypes) {
      if (!enemyZoneMap[enemyId]) {
        enemyZoneMap[enemyId] = {
          zoneId:   zone.id,
          zoneName: zone.name,
          biome:    zone.biome,
          minLevel: zone.minPlayerLevel,
        };
      }
    }
  }

  // Regular enemies
  for (const [id, def] of Object.entries(ENEMY_TYPES)) {
    const zoneInfo = enemyZoneMap[id] ?? { zoneId: 'zone1', zoneName: 'Unknown', biome: 'Unknown', minLevel: 1 };
    const entry: BestiaryEntry = {
      id,
      name:      id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      isBoss:    false,
      zoneId:    zoneInfo.zoneId,
      zoneName:  zoneInfo.zoneName,
      biome:     zoneInfo.biome,
      minLevel:  zoneInfo.minLevel,
      maxLevel:  zoneInfo.minLevel + 3,
      baseHp:    def.baseHp,
      baseDmg:   def.baseDmg,
      xpValue:   def.xpValue,
      behaviour: def.behaviour ?? 'chase',
      color:     def.color,
      lore:      '',
    };
    entry.lore = generateLore(entry);
    entries.push(entry);
  }

  // Boss entries
  for (const [id, def] of Object.entries(BOSS_TYPES)) {
    const zone = ZONES.find(z => z.bossType === id);
    const entry: BestiaryEntry = {
      id,
      name:      def.name,
      isBoss:    true,
      zoneId:    zone?.id ?? 'zone1',
      zoneName:  zone?.name ?? 'Unknown',
      biome:     zone?.biome ?? 'Unknown',
      minLevel:  zone?.minPlayerLevel ?? 1,
      maxLevel:  (zone?.minPlayerLevel ?? 1) + 5,
      baseHp:    def.baseHp,
      baseDmg:   def.baseDmg,
      xpValue:   def.xpValue,
      behaviour: 'boss',
      color:     def.color,
      lore:      '',
    };
    entry.lore = generateLore(entry);
    entries.push(entry);
  }

  return entries;
}

const ALL_ENTRIES: BestiaryEntry[] = buildEntries();
const TOTAL_COUNT = ALL_ENTRIES.length;

type FilterTab = 'all' | 'regular' | 'boss';

const ACHIEVEMENT_THRESHOLDS = [0.25, 0.50, 0.75, 1.0];
const ACHIEVEMENT_LABELS     = ['25%', '50%', '75%', '100%'];
const ACHIEVEMENT_BADGE_KEYS = [
  'ui_bestiary_badge_bronze',
  'ui_bestiary_badge_silver',
  'ui_bestiary_badge_gold',
  'ui_bestiary_badge_platinum',
];

export class BestiaryPanel {
  private scene:     Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private zKey!:     Phaser.Input.Keyboard.Key;

  private visible    = false;
  private filterTab: FilterTab = 'all';
  private searchPrefix = '';
  private scrollOffset = 0;
  private selectedId: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.zKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.rebuild();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.zKey)) this.toggle();
  }

  show(): void {
    this.visible = true;
    this.scrollOffset = 0;
    this.selectedId = null;
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

  // ── Rebuild ───────────────────────────────────────────────────────────────

  private toggle(): void { this.visible ? this.hide() : this.show(); }

  private rebuild(): void {
    this.container.removeAll(true);

    const bestiary    = SaveManager.getBestiary();
    const discovered  = new Set(bestiary.discovered);
    const bossKills   = bestiary.bossKills;
    const discCount   = discovered.size;
    const pct         = TOTAL_COUNT > 0 ? discCount / TOTAL_COUNT : 0;

    // Background
    if (this.scene.textures.exists('ui_bestiary_book_frame')) {
      this.container.add(
        this.scene.add.image(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, 'ui_bestiary_book_frame')
          .setDisplaySize(PANEL_W, PANEL_H).setScrollFactor(0).setOrigin(0.5),
      );
    } else {
      const bg = this.scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x0a0808, 0.94)
        .setOrigin(0, 0).setScrollFactor(0);
      const border = this.scene.add.graphics().setScrollFactor(0);
      border.lineStyle(1, 0x884422, 0.9);
      border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
      this.container.add([bg, border]);
    }

    // Title + count
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PAD,
        `📖 Bestiary — ${discCount}/${TOTAL_COUNT}`,
        { fontSize: '5px', color: '#ddbb77', fontFamily: 'monospace' },
      ).setOrigin(0.5, 0).setScrollFactor(0),
    );

    // Progress bar
    const barY = PANEL_Y + 13;
    const barW = PANEL_W - PAD * 4;
    const barX = PANEL_X + PAD * 2;
    if (this.scene.textures.exists('ui_bestiary_progress_bg')) {
      this.container.add(this.scene.add.image(barX + barW / 2, barY + 3, 'ui_bestiary_progress_bg')
        .setDisplaySize(barW, 6).setOrigin(0.5).setScrollFactor(0));
    } else {
      this.container.add(this.scene.add.rectangle(barX, barY, barW, 6, 0x221a0e, 0.9)
        .setOrigin(0, 0).setScrollFactor(0));
    }
    if (pct > 0) {
      const fillW = Math.max(2, Math.round(barW * pct));
      if (this.scene.textures.exists('ui_bestiary_progress_fill')) {
        this.container.add(this.scene.add.image(barX + fillW / 2, barY + 3, 'ui_bestiary_progress_fill')
          .setDisplaySize(fillW, 6).setOrigin(0.5).setScrollFactor(0));
      } else {
        const fillColor = pct >= 1.0 ? 0xffd700 : pct >= 0.75 ? 0x44cc88 : pct >= 0.5 ? 0x4488ff : 0xaa6633;
        this.container.add(this.scene.add.rectangle(barX, barY, fillW, 6, fillColor, 0.9)
          .setOrigin(0, 0).setScrollFactor(0));
      }
    }

    // Achievement badges
    const badgeY = barY;
    ACHIEVEMENT_THRESHOLDS.forEach((threshold, i) => {
      const bx      = barX + Math.round(barW * threshold) - 4;
      const reached = pct >= threshold;
      const key     = ACHIEVEMENT_BADGE_KEYS[i];
      if (this.scene.textures.exists(key)) {
        this.container.add(
          this.scene.add.image(bx, badgeY + 3, key)
            .setDisplaySize(8, 8).setOrigin(0.5).setScrollFactor(0)
            .setAlpha(reached ? 1 : 0.3),
        );
      } else {
        this.container.add(
          this.scene.add.circle(bx, badgeY + 3, 3,
            reached ? 0xffd700 : 0x333322, reached ? 0.9 : 0.4).setScrollFactor(0),
        );
      }
      this.container.add(
        this.scene.add.text(bx, badgeY + 8, ACHIEVEMENT_LABELS[i],
          { fontSize: '2px', color: reached ? '#ffd700' : '#555544', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setScrollFactor(0),
      );
    });

    // Filter tabs
    const tabY = PANEL_Y + 22;
    const tabs: { label: string; id: FilterTab }[] = [
      { label: 'All',     id: 'all' },
      { label: 'Regular', id: 'regular' },
      { label: 'Boss',    id: 'boss' },
    ];
    tabs.forEach((t, i) => {
      const tx = PANEL_X + PAD + i * 60;
      const isActive = this.filterTab === t.id;
      const tabBg = this.scene.add.rectangle(tx, tabY, 58, 9, isActive ? 0x2a1e10 : 0x111111, 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      if (isActive) tabBg.setStrokeStyle(1, 0x886633, 0.8);
      const tabTxt = this.scene.add.text(tx + 29, tabY + 4, t.label,
        { fontSize: '4px', color: isActive ? '#ddbb77' : '#665544', fontFamily: 'monospace' },
      ).setOrigin(0.5).setScrollFactor(0);
      tabBg.on('pointerup', () => {
        this.filterTab = t.id;
        this.scrollOffset = 0;
        this.selectedId = null;
        this.rebuild();
      });
      this.container.add([tabBg, tabTxt]);
    });

    const contentY = tabY + 12;

    if (this.selectedId) {
      this.renderDetailView(contentY, discovered, bossKills);
    } else {
      this.renderList(contentY, discovered, bossKills);
    }

    // Close hint
    this.container.add(
      this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + PANEL_H - 4, '[Z/Esc]',
        { fontSize: '3px', color: '#445566', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setScrollFactor(0),
    );

    this.container.setVisible(this.visible).setDepth(DEPTH);
  }

  // ── List view ─────────────────────────────────────────────────────────────

  private renderList(startY: number, discovered: Set<string>, bossKills: Record<string, number>): void {
    const filtered = ALL_ENTRIES.filter(e => {
      if (this.filterTab === 'regular' && e.isBoss) return false;
      if (this.filterTab === 'boss' && !e.isBoss) return false;
      if (this.searchPrefix && !e.name.toLowerCase().startsWith(this.searchPrefix)) return false;
      return true;
    });

    const ROW_H   = 11;
    const maxRows = Math.floor((PANEL_H - (startY - PANEL_Y) - 12) / ROW_H);
    const total   = filtered.length;

    const visible = filtered.slice(this.scrollOffset, this.scrollOffset + maxRows);

    visible.forEach((entry, i) => {
      const rowY     = startY + i * ROW_H;
      const isDisc   = discovered.has(entry.id);
      const isSel    = this.selectedId === entry.id;

      // Row background
      const rowBg = this.scene.add.rectangle(PANEL_X + PAD, rowY, PANEL_W - PAD * 2, ROW_H - 1,
        isSel ? 0x2a1e10 : (i % 2 === 0 ? 0x0f0b08 : 0x110d09), 0.9)
        .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      rowBg.on('pointerup', () => {
        this.selectedId = (this.selectedId === entry.id) ? null : entry.id;
        this.rebuild();
      });
      this.container.add(rowBg);

      if (!isDisc) {
        // Undiscovered — silhouette row
        if (this.scene.textures.exists('ui_bestiary_undiscovered')) {
          this.container.add(
            this.scene.add.image(PANEL_X + PAD + 5, rowY + ROW_H / 2, 'ui_bestiary_undiscovered')
              .setDisplaySize(8, 8).setOrigin(0.5).setScrollFactor(0).setAlpha(0.5),
          );
        }
        this.container.add(
          this.scene.add.text(PANEL_X + PAD + 12, rowY + 3, '??? (undiscovered)',
            { fontSize: '4px', color: '#333322', fontFamily: 'monospace' },
          ).setScrollFactor(0),
        );
      } else {
        // Discovered — full row
        // Color dot
        const colorDot = this.scene.add.circle(PANEL_X + PAD + 4, rowY + ROW_H / 2, 3, entry.color, 0.9)
          .setScrollFactor(0);
        this.container.add(colorDot);

        // Boss crown icon
        if (entry.isBoss) {
          this.container.add(
            this.scene.add.text(PANEL_X + PAD + 2, rowY + 1, '♛',
              { fontSize: '4px', color: '#ffd700', fontFamily: 'monospace' },
            ).setScrollFactor(0),
          );
        }

        const nameX = PANEL_X + PAD + 10;
        this.container.add(
          this.scene.add.text(nameX, rowY + 2, entry.name.slice(0, 22),
            { fontSize: '4px', color: entry.isBoss ? '#ffd700' : '#ccbbaa', fontFamily: 'monospace' },
          ).setScrollFactor(0),
        );

        // Zone badge (right-aligned)
        const zoneBadge = entry.zoneName.slice(0, 10);
        this.container.add(
          this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 2, zoneBadge,
            { fontSize: '3px', color: '#666655', fontFamily: 'monospace' },
          ).setOrigin(1, 0).setScrollFactor(0),
        );

        // Boss kill counter
        if (entry.isBoss && bossKills[entry.id]) {
          this.container.add(
            this.scene.add.text(PANEL_X + PANEL_W - PAD - 2, rowY + 6,
              `×${bossKills[entry.id]}`,
              { fontSize: '3px', color: '#cc8844', fontFamily: 'monospace' },
            ).setOrigin(1, 0).setScrollFactor(0),
          );
        }
      }
    });

    // Scroll arrows
    if (this.scrollOffset > 0) {
      const upBtn = this.scene.add.text(PANEL_X + PANEL_W / 2, startY - 1, '▲',
        { fontSize: '4px', color: '#886633', fontFamily: 'monospace' },
      ).setOrigin(0.5, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
      upBtn.on('pointerup', () => { this.scrollOffset = Math.max(0, this.scrollOffset - 4); this.rebuild(); });
      this.container.add(upBtn);
    }
    if (this.scrollOffset + maxRows < total) {
      const downBtn = this.scene.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 10, '▼',
        { fontSize: '4px', color: '#886633', fontFamily: 'monospace' },
      ).setOrigin(0.5, 1).setScrollFactor(0).setInteractive({ useHandCursor: true });
      downBtn.on('pointerup', () => { this.scrollOffset += 4; this.rebuild(); });
      this.container.add(downBtn);
    }
  }

  // ── Detail view ───────────────────────────────────────────────────────────

  private renderDetailView(startY: number, _discovered: Set<string>, bossKills: Record<string, number>): void {
    const entry = ALL_ENTRIES.find(e => e.id === this.selectedId);
    if (!entry) return;

    const killCount = entry.isBoss ? (bossKills[entry.id] ?? 0) : 0;

    // Back button
    const backBtn = this.scene.add.rectangle(PANEL_X + PAD, startY, 30, 8, 0x221a0e, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const backTxt = this.scene.add.text(PANEL_X + PAD + 15, startY + 4, '← Back',
      { fontSize: '3px', color: '#ddbb77', fontFamily: 'monospace' },
    ).setOrigin(0.5).setScrollFactor(0);
    backBtn.on('pointerup', () => { this.selectedId = null; this.rebuild(); });
    this.container.add([backBtn, backTxt]);

    let y = startY + 11;

    // Portrait frame + color swatch
    const portraitKey = entry.isBoss ? 'ui_bestiary_portrait_boss' : 'ui_bestiary_portrait_common';
    if (this.scene.textures.exists(portraitKey)) {
      this.container.add(
        this.scene.add.image(PANEL_X + PAD + 16, y + 16, portraitKey)
          .setDisplaySize(32, 32).setOrigin(0.5).setScrollFactor(0),
      );
    } else {
      this.container.add(
        this.scene.add.rectangle(PANEL_X + PAD, y, 32, 32, entry.color, 0.3)
          .setOrigin(0, 0).setScrollFactor(0).setStrokeStyle(1, entry.color, 0.7),
      );
    }

    const infoX = PANEL_X + PAD + 36;

    // Name
    this.container.add(
      this.scene.add.text(infoX, y, entry.name,
        { fontSize: '5px', color: entry.isBoss ? '#ffd700' : '#ddbb77', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );
    y += 8;

    // Zone + biome
    this.container.add(
      this.scene.add.text(infoX, y, `${entry.zoneName} (${entry.biome})`,
        { fontSize: '3px', color: '#887766', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );
    y += 6;

    // Level range
    this.container.add(
      this.scene.add.text(infoX, y, `Lvl ${entry.minLevel}–${entry.maxLevel}  •  ${entry.behaviour}`,
        { fontSize: '3px', color: '#665544', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );
    y += 8;

    // Stats row
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, y,
        `HP: ${entry.baseHp}   ATK: ${entry.baseDmg}   XP: ${entry.xpValue}`,
        { fontSize: '4px', color: '#aabbcc', fontFamily: 'monospace' },
      ).setScrollFactor(0),
    );
    y += 8;

    // Boss kill counter
    if (entry.isBoss) {
      this.container.add(
        this.scene.add.text(PANEL_X + PAD, y,
          `Defeated: ${killCount}×`,
          { fontSize: '4px', color: killCount > 0 ? '#ffcc44' : '#445566', fontFamily: 'monospace' },
        ).setScrollFactor(0),
      );
      y += 8;
    }

    // Divider
    const divG = this.scene.add.graphics().setScrollFactor(0);
    divG.lineStyle(1, 0x442211, 0.6);
    divG.lineBetween(PANEL_X + PAD, y, PANEL_X + PANEL_W - PAD, y);
    this.container.add(divG);
    y += 3;

    // Lore blurb (word-wrapped)
    this.container.add(
      this.scene.add.text(PANEL_X + PAD, y, entry.lore,
        { fontSize: '3px', color: '#998877', fontFamily: 'monospace',
          wordWrap: { width: PANEL_W - PAD * 2 } },
      ).setScrollFactor(0),
    );
  }
}

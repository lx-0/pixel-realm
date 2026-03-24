/**
 * StatSheetPanel — character stat sheet with damage formula breakdown.
 *
 * Press V to toggle open/close.
 * Shows all derived stats with contributors (base + level + passive bonuses).
 * Skill tree nodes that contribute to each stat are listed inline.
 *
 * Layout (320×180 canvas, scroll-factor 0):
 *   - Panel bg: 288×162 centred
 *   - Header: "CHARACTER STATS" title + [V] hint
 *   - Two columns of stat rows, each with a main value and a contributor line
 */

import Phaser from 'phaser';
import { CANVAS, PLAYER, LEVELS, MANA, SPRINT, DODGE, COMBAT, PRESTIGE } from '../config/constants';
import { SKILL_BY_ID, type PassiveBonus } from '../config/skills';

// ── Layout ────────────────────────────────────────────────────────────────────

const PANEL_W  = 288;
const PANEL_H  = 162;
const PANEL_X  = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y  = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH    = 74;
const PAD      = 5;
const HEADER_H = 14;
const ROW_H    = 14;
const COL_W    = (PANEL_W - PAD * 2) / 2;

// ── Colours ───────────────────────────────────────────────────────────────────

const C_BG       = 0x090912;
const C_BORDER   = 0x3344aa;
const C_HEADER   = 0x13132a;
const C_TITLE    = '#aaddff';
const C_LABEL    = '#8899bb';
const C_VALUE    = '#ffffff';
const C_CONTRIB  = '#556688';
const C_PASSIVE  = '#88ccaa';
const C_DIVIDER  = 0x222244;

// ── State ─────────────────────────────────────────────────────────────────────

export interface StatSheetState {
  level:           number;
  prestigeLevel:   number;
  passiveBonus:    Required<PassiveBonus>;
  unlockedSkillIds: string[];
}

// ── StatSheetPanel ────────────────────────────────────────────────────────────

export class StatSheetPanel {
  private scene:   Phaser.Scene;
  private visible  = false;
  private vKey!:   Phaser.Input.Keyboard.Key;

  private container: Phaser.GameObjects.Container;

  private state: StatSheetState = {
    level:           1,
    prestigeLevel:   0,
    passiveBonus:    {
      maxHpFlat:            0,
      maxManaFlat:          0,
      damagePct:            0,
      speedPct:             0,
      manaRegenFlat:        0,
      critChancePct:        0,
      attackCdReductionPct: 0,
      allCdReductionPct:    0,
      damageReductionPct:   0,
      healOnKill:           0,
    },
    unlockedSkillIds: [],
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.vKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.rebuild();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isVisible(): boolean { return this.visible; }

  updateState(state: StatSheetState): void {
    this.state = { ...state };
    if (this.visible) this.rebuild();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.vKey)) {
      this.visible ? this.hide() : this.show();
    }
  }

  closeIfOpen(): boolean {
    if (this.visible) { this.hide(); return true; }
    return false;
  }

  show(): void {
    this.visible = true;
    this.rebuild();
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    const { level, prestigeLevel, passiveBonus: pb, unlockedSkillIds } = this.state;
    const prestigeMult = 1 + prestigeLevel * PRESTIGE.BONUS_PER_LEVEL;

    // ── Panel background ───────────────────────────────────────────────────
    const bg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, PANEL_W, PANEL_H, C_BG, 0.96,
    ).setStrokeStyle(1, C_BORDER);
    this.container.add(bg);

    // ── Header ─────────────────────────────────────────────────────────────
    const headerBg = this.scene.add.rectangle(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2, PANEL_W, HEADER_H, C_HEADER, 1,
    );
    this.container.add(headerBg);

    const title = this.scene.add.text(
      PANEL_X + PANEL_W / 2, PANEL_Y + HEADER_H / 2,
      'CHARACTER STATS',
      { fontSize: '5px', color: C_TITLE, fontFamily: 'monospace' },
    ).setOrigin(0.5);
    this.container.add(title);

    const hint = this.scene.add.text(
      PANEL_X + PANEL_W - PAD, PANEL_Y + HEADER_H / 2,
      '[V]',
      { fontSize: '4px', color: C_LABEL, fontFamily: 'monospace' },
    ).setOrigin(1, 0.5);
    this.container.add(hint);

    // ── Column divider ─────────────────────────────────────────────────────
    const divLine = this.scene.add.graphics();
    divLine.lineStyle(1, C_DIVIDER, 0.6);
    divLine.lineBetween(
      PANEL_X + PAD + COL_W, PANEL_Y + HEADER_H + 2,
      PANEL_X + PAD + COL_W, PANEL_Y + PANEL_H - 2,
    );
    this.container.add(divLine);

    // ── Build stat rows ─────────────────────────────────────────────────────
    const bodyY = PANEL_Y + HEADER_H + PAD;

    // Left column
    let rowL = 0;
    const addLeft = (rows: StatRow[]) => {
      for (const row of rows) {
        this.addStatRow(
          PANEL_X + PAD,
          bodyY + rowL * ROW_H,
          COL_W - PAD,
          row,
        );
        rowL++;
      }
    };

    // Right column
    let rowR = 0;
    const addRight = (rows: StatRow[]) => {
      for (const row of rows) {
        this.addStatRow(
          PANEL_X + PAD + COL_W + PAD,
          bodyY + rowR * ROW_H,
          COL_W - PAD * 2,
          row,
        );
        rowR++;
      }
    };

    // ── Compute values ─────────────────────────────────────────────────────

    // HP
    const hpBase  = PLAYER.BASE_HP;
    const hpLevel = (level - 1) * LEVELS.HP_BONUS_PER_LEVEL;
    const hpPassive = pb.maxHpFlat;
    const hpPrestige = prestigeLevel > 0
      ? Math.round((hpBase + hpLevel + hpPassive) * (prestigeMult - 1))
      : 0;
    const hpTotal = hpBase + hpLevel + hpPassive;
    const hpPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'maxHpFlat');

    // Mana
    const manaBase   = PLAYER.BASE_MANA;
    const manaPassive = pb.maxManaFlat;
    const manaTotal  = manaBase + manaPassive;
    const regenTotal = MANA.REGEN_PER_SEC + pb.manaRegenFlat;
    const manaPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'maxManaFlat');

    // Damage
    const dmgBase   = COMBAT.ATTACK_DAMAGE;
    const dmgLevel  = (level - 1) * LEVELS.DAMAGE_BONUS_PER_LEVEL;
    const dmgBefore = dmgBase + dmgLevel;
    const dmgPct    = Math.round(pb.damagePct * 100);
    const dmgTotal  = Math.floor(dmgBefore * (1 + pb.damagePct));
    const dmgPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'damagePct');

    // Crit
    const critBase    = 5;
    const critPassive = Math.round(pb.critChancePct * 100);
    const critTotal   = critBase + critPassive;
    const critPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'critChancePct');

    // Speed
    const spdBase   = PLAYER.MOVE_SPEED;
    const spdLevel  = (level - 1) * LEVELS.SPEED_BONUS_PER_LEVEL;
    const spdBefore = spdBase + spdLevel;
    const spdPct    = Math.round(pb.speedPct * 100);
    const spdTotal  = Math.round(spdBefore * (1 + pb.speedPct));
    const spdPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'speedPct');

    // Attack CD
    const cdBase  = COMBAT.ATTACK_COOLDOWN_MS;
    const cdRed   = Math.round(pb.attackCdReductionPct * 100);
    const cdTotal = Math.round(cdBase * Math.max(0.2, 1 - pb.attackCdReductionPct));
    const cdPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'attackCdReductionPct');

    // Damage reduction
    const drPct   = Math.round(pb.damageReductionPct * 100);
    const drPassiveSources = this.getPassiveContributors(unlockedSkillIds, 'damageReductionPct');

    // Heal on kill
    const hokVal  = pb.healOnKill;

    // ── Left column: HP, Mana, Damage, Crit, Speed ─────────────────────────

    addLeft([
      {
        label: 'HP',
        value: String(hpTotal),
        contrib: this.hpContrib(hpBase, hpLevel, hpPassive, hpPrestige, hpPassiveSources),
      },
      {
        label: 'Mana',
        value: `${manaTotal}  (+${regenTotal}/s)`,
        contrib: this.manaContrib(manaBase, manaPassive, regenTotal, manaPassiveSources),
      },
      {
        label: 'Damage',
        value: String(dmgTotal),
        contrib: this.dmgContrib(dmgBase, dmgLevel, dmgPct, dmgPassiveSources),
      },
      {
        label: 'Crit',
        value: `${critTotal}%  (×1.5 dmg)`,
        contrib: this.critContrib(critBase, critPassive, critPassiveSources),
      },
      {
        label: 'Speed',
        value: String(spdTotal),
        contrib: this.spdContrib(spdBase, spdLevel, spdPct, spdPassiveSources),
      },
    ]);

    // ── Right column: Atk CD, DR, Heal, Costs, Prestige ───────────────────

    addRight([
      {
        label: 'Atk CD',
        value: `${cdTotal}ms`,
        contrib: cdRed > 0
          ? `${cdBase}ms base  -${cdRed}% (${cdPassiveSources})`
          : `${cdBase}ms base`,
      },
      {
        label: 'Dmg Red',
        value: drPct > 0 ? `${drPct}%` : 'none',
        contrib: drPct > 0
          ? `from passives (${drPassiveSources})`
          : 'no damage reduction',
      },
      {
        label: 'Heal/Kill',
        value: hokVal > 0 ? `${hokVal} HP` : 'none',
        contrib: hokVal > 0
          ? `from ${this.getPassiveContributors(unlockedSkillIds, 'healOnKill')}`
          : 'no life-on-kill',
      },
      {
        label: 'Sprint',
        value: `${SPRINT.MANA_COST_PER_SEC} MP/s`,
        contrib: 'mana drained while holding Shift',
      },
      {
        label: 'Dodge',
        value: `${DODGE.MANA_COST} MP`,
        contrib: `${DODGE.COOLDOWN_MS}ms CD  •  ${DODGE.INVULN_MS}ms i-frames`,
      },
      {
        label: 'Atk Cost',
        value: `${MANA.ATTACK_COST} MP`,
        contrib: 'mana per swing',
      },
    ]);

    // ── Prestige banner (bottom row, full width) ───────────────────────────
    const footerY = PANEL_Y + PANEL_H - 10;
    const divFoot = this.scene.add.graphics();
    divFoot.lineStyle(1, C_DIVIDER, 0.5);
    divFoot.lineBetween(PANEL_X + PAD, footerY - 2, PANEL_X + PANEL_W - PAD, footerY - 2);
    this.container.add(divFoot);

    const prestigeStr = prestigeLevel > 0
      ? `Prestige P${prestigeLevel}: +${Math.round((prestigeMult - 1) * 100)}% permanent stats  •  Lv.${level}`
      : `Lv.${level}  —  prestige available at Lv.${LEVELS.MAX_LEVEL}`;
    const prestigeColor = prestigeLevel > 0 ? '#ffd700' : C_LABEL;
    const footTxt = this.scene.add.text(
      PANEL_X + PANEL_W / 2, footerY + 1,
      prestigeStr,
      { fontSize: '4px', color: prestigeColor, fontFamily: 'monospace' },
    ).setOrigin(0.5, 0);
    this.container.add(footTxt);
  }

  // ── Row rendering ──────────────────────────────────────────────────────────

  private addStatRow(
    x: number, y: number, maxWidth: number,
    row: StatRow,
  ): void {
    const labelTxt = this.scene.add.text(x, y, `${row.label}:`, {
      fontSize: '4px', color: C_LABEL, fontFamily: 'monospace',
    });
    this.container.add(labelTxt);

    const valueTxt = this.scene.add.text(x + 30, y, row.value, {
      fontSize: '4px', color: C_VALUE, fontFamily: 'monospace',
    });
    this.container.add(valueTxt);

    const contribTxt = this.scene.add.text(x, y + 5, row.contrib, {
      fontSize: '3px', color: pb_has_passive(row.contrib) ? C_PASSIVE : C_CONTRIB,
      fontFamily: 'monospace',
      wordWrap: { width: maxWidth },
    });
    this.container.add(contribTxt);
  }

  // ── Contributor string builders ────────────────────────────────────────────

  private hpContrib(base: number, lvl: number, passive: number, prestige: number, sources: string): string {
    const parts = [`${base} base`, `+${lvl} lvl`];
    if (passive > 0) parts.push(`+${passive} (${sources})`);
    if (prestige > 0) parts.push(`+${prestige} prestige`);
    return parts.join('  ');
  }

  private manaContrib(base: number, passive: number, regen: number, sources: string): string {
    const parts = [`${base} base`];
    if (passive > 0) parts.push(`+${passive} (${sources})`);
    parts.push(`regen ${regen}/s`);
    return parts.join('  ');
  }

  private dmgContrib(base: number, lvl: number, pct: number, sources: string): string {
    const parts = [`${base} base`, `+${lvl} lvl`];
    if (pct > 0) parts.push(`+${pct}% (${sources})`);
    return parts.join('  ');
  }

  private critContrib(base: number, passive: number, sources: string): string {
    const parts = [`${base}% base`];
    if (passive > 0) parts.push(`+${passive}% (${sources})`);
    return parts.join('  ');
  }

  private spdContrib(base: number, lvl: number, pct: number, sources: string): string {
    const parts = [`${base} base`, `+${lvl} lvl`];
    if (pct > 0) parts.push(`+${pct}% (${sources})`);
    return parts.join('  ');
  }

  // ── Skill contributor lookup ───────────────────────────────────────────────

  private getPassiveContributors(skillIds: string[], field: keyof PassiveBonus): string {
    const names: string[] = [];
    for (const id of skillIds) {
      const sk = SKILL_BY_ID.get(id);
      if (!sk || sk.type !== 'passive' || !sk.passiveBonus) continue;
      const val = sk.passiveBonus[field];
      if (val !== undefined && (val as number) > 0) {
        names.push(sk.name);
      }
    }
    return names.length > 0 ? names.join(', ') : 'none';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface StatRow {
  label:   string;
  value:   string;
  contrib: string;
}

/** Returns true if the contributor string contains passive skill info (non-trivial). */
function pb_has_passive(s: string): boolean {
  return s.includes('(') || s.includes('regen') || s.includes('prestige');
}

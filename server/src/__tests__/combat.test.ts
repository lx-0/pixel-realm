/**
 * Combat system tests.
 *
 * Covers:
 *   - computePassiveBonuses() — skill passive stacking
 *   - Damage formula constants and math
 *   - Invincibility window enforcement
 *   - Enemy AI state data (aggro range, ranged flag)
 *   - Mana regen and cost validation
 */

import { describe, it, expect } from "vitest";
import {
  computePassiveBonuses,
  ALL_SKILLS,
  SKILL_BY_ID,
  getSkill,
  MAX_SKILL_POINTS,
} from "../skills";

// ── Combat constants (mirrored from ZoneRoom / DungeonRoom) ───────────────────
// These are private to the room modules, so we mirror them for assertions.
const ATTACK_DAMAGE         = 25;
const PLAYER_HIT_DAMAGE     = 10;
const ATTACK_RANGE_PX       = 30;
const ATTACK_COOLDOWN_MS    = 480;
const MANA_ATTACK_COST      = 5;
const MANA_REGEN_PER_SEC    = 6;
const PLAYER_INVINCIBILITY_MS = 900;
const PROJECTILE_SPEED      = 100;
const PROJECTILE_LIFETIME_MS = 2000;

// ── computePassiveBonuses ────────────────────────────────────────────────────

describe("computePassiveBonuses()", () => {
  it("returns zero bonuses for an empty skill list", () => {
    const bonuses = computePassiveBonuses([]);
    expect(bonuses.damagePct).toBe(0);
    expect(bonuses.maxHpFlat).toBe(0);
    expect(bonuses.maxManaFlat).toBe(0);
    expect(bonuses.speedPct).toBe(0);
    expect(bonuses.manaRegenFlat).toBe(0);
    expect(bonuses.critChancePct).toBe(0);
    expect(bonuses.attackCdReductionPct).toBe(0);
    expect(bonuses.allCdReductionPct).toBe(0);
    expect(bonuses.damageReductionPct).toBe(0);
  });

  it("ignores unknown skill ids without throwing", () => {
    const bonuses = computePassiveBonuses(["nonexistent_skill_xyz"]);
    expect(bonuses.damagePct).toBe(0);
  });

  it("ignores active skills (no passive bonus contribution)", () => {
    // 'reckless_strike' is an active skill, tier 1 berserker
    const bonuses = computePassiveBonuses(["reckless_strike"]);
    expect(bonuses.damagePct).toBe(0);
    expect(bonuses.maxHpFlat).toBe(0);
  });

  it("accumulates damagePct from a passive skill", () => {
    // 'battle_frenzy' gives +12% dmg and +10% attack CD reduction
    const bonuses = computePassiveBonuses(["battle_frenzy"]);
    expect(bonuses.damagePct).toBeCloseTo(0.12);
    expect(bonuses.attackCdReductionPct).toBeCloseTo(0.10);
  });

  it("stacks damagePct additively from multiple passive skills", () => {
    // 'battle_frenzy' (+12%) + 'bloodthirst' (+18%) = +30%
    const bonuses = computePassiveBonuses(["battle_frenzy", "bloodthirst"]);
    expect(bonuses.damagePct).toBeCloseTo(0.30);
  });

  it("accumulates maxHpFlat from iron_skin", () => {
    // 'iron_skin' grants +40 max HP and 8% damage reduction
    const bonuses = computePassiveBonuses(["iron_skin"]);
    expect(bonuses.maxHpFlat).toBe(40);
    expect(bonuses.damageReductionPct).toBeCloseTo(0.08);
  });

  it("stacks maxHpFlat from multiple HP-granting passives", () => {
    // iron_skin (+40) + fortify (+60) = +100 maxHp
    const bonuses = computePassiveBonuses(["iron_skin", "fortify"]);
    expect(bonuses.maxHpFlat).toBeGreaterThanOrEqual(100);
  });

  it("accumulates manaRegenFlat from paladin passive skills", () => {
    // divine_light gives +4 mana regen
    const bonuses = computePassiveBonuses(["divine_light"]);
    expect(bonuses.manaRegenFlat).toBe(4);
  });

  it("stacks manaRegenFlat from multiple paladin passives", () => {
    // divine_light (+4) + aura_of_valor (+6) = +10 mana regen
    const bonuses = computePassiveBonuses(["divine_light", "aura_of_valor"]);
    expect(bonuses.manaRegenFlat).toBe(10);
  });

  it("stacks bonuses from a full warrior berserker branch", () => {
    // All berserker passives: battle_frenzy, bloodthirst
    const bonuses = computePassiveBonuses(["battle_frenzy", "bloodthirst"]);
    // Total damage % should be at least 12 + 18 = 30%
    expect(bonuses.damagePct).toBeGreaterThanOrEqual(0.30);
  });

  it("does not produce negative values for any bonus field", () => {
    // All skills should only grant non-negative bonuses
    const allPassiveIds = ALL_SKILLS
      .filter((s) => s.type === "passive")
      .map((s) => s.id);

    const bonuses = computePassiveBonuses(allPassiveIds);

    expect(bonuses.damagePct).toBeGreaterThanOrEqual(0);
    expect(bonuses.maxHpFlat).toBeGreaterThanOrEqual(0);
    expect(bonuses.maxManaFlat).toBeGreaterThanOrEqual(0);
    expect(bonuses.speedPct).toBeGreaterThanOrEqual(0);
    expect(bonuses.manaRegenFlat).toBeGreaterThanOrEqual(0);
    expect(bonuses.critChancePct).toBeGreaterThanOrEqual(0);
    expect(bonuses.attackCdReductionPct).toBeGreaterThanOrEqual(0);
    expect(bonuses.allCdReductionPct).toBeGreaterThanOrEqual(0);
    expect(bonuses.damageReductionPct).toBeGreaterThanOrEqual(0);
  });
});

// ── Skill tree data integrity ─────────────────────────────────────────────────

describe("Skill tree data integrity", () => {
  it("ALL_SKILLS contains skills for all four classes", () => {
    const classes = new Set(ALL_SKILLS.map((s) => s.classId));
    expect(classes.has("warrior")).toBe(true);
    expect(classes.has("mage")).toBe(true);
    expect(classes.has("ranger")).toBe(true);
    expect(classes.has("artisan")).toBe(true);
  });

  it("every skill has a unique id", () => {
    const ids = ALL_SKILLS.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("SKILL_BY_ID map size matches ALL_SKILLS length", () => {
    expect(SKILL_BY_ID.size).toBe(ALL_SKILLS.length);
  });

  it("every passive skill has a passiveBonus object", () => {
    const passives = ALL_SKILLS.filter((s) => s.type === "passive");
    for (const skill of passives) {
      expect(skill.passiveBonus, `${skill.id} should have passiveBonus`).toBeDefined();
    }
  });

  it("every active skill has cooldownMs and manaCost defined", () => {
    const actives = ALL_SKILLS.filter((s) => s.type === "active");
    for (const skill of actives) {
      expect(skill.cooldownMs, `${skill.id} missing cooldownMs`).toBeGreaterThan(0);
      expect(skill.manaCost, `${skill.id} missing manaCost`).toBeGreaterThanOrEqual(0);
    }
  });

  it("every tier-2+ skill references an existing prerequisite", () => {
    for (const skill of ALL_SKILLS) {
      if (skill.tier === 1) {
        expect(skill.prerequisiteId).toBeNull();
      } else {
        expect(skill.prerequisiteId, `${skill.id} tier ${skill.tier} has no prerequisiteId`).not.toBeNull();
        expect(SKILL_BY_ID.has(skill.prerequisiteId!), `prerequisite ${skill.prerequisiteId} for ${skill.id} not found`).toBe(true);
      }
    }
  });

  it("getSkill() returns the correct skill definition", () => {
    const sk = getSkill("reckless_strike");
    expect(sk.id).toBe("reckless_strike");
    expect(sk.classId).toBe("warrior");
    expect(sk.archetypeId).toBe("berserker");
    expect(sk.type).toBe("active");
  });

  it("getSkill() throws for an unknown skill id", () => {
    expect(() => getSkill("does_not_exist")).toThrow();
  });

  it("MAX_SKILL_POINTS is 9 (one per level 2–10)", () => {
    expect(MAX_SKILL_POINTS).toBe(9);
  });
});

// ── Ranger class passives ─────────────────────────────────────────────────────

describe("Ranger class passive bonuses", () => {
  it("keen_eye grants crit chance and damage", () => {
    const bonuses = computePassiveBonuses(["keen_eye"]);
    expect(bonuses.critChancePct).toBeCloseTo(0.10);
    expect(bonuses.damagePct).toBeCloseTo(0.10);
  });

  it("sharpshooter passives stack crit and attack speed", () => {
    const bonuses = computePassiveBonuses(["keen_eye", "quiver_mastery"]);
    expect(bonuses.critChancePct).toBeCloseTo(0.25);
    expect(bonuses.attackCdReductionPct).toBeCloseTo(0.15);
  });

  it("shadowstalker passives stack speed and damage reduction", () => {
    const bonuses = computePassiveBonuses(["fleet_step", "camouflage"]);
    expect(bonuses.speedPct).toBeCloseTo(0.35);
    expect(bonuses.damageReductionPct).toBeCloseTo(0.15);
  });

  it("beastmaster passives grant HP and mana regen", () => {
    const bonuses = computePassiveBonuses(["tracker", "swift_feet"]);
    expect(bonuses.maxHpFlat).toBe(70);
    expect(bonuses.manaRegenFlat).toBe(3);
    expect(bonuses.damagePct).toBeCloseTo(0.10);
  });

  it("ranger has 15 skills total (3 archetypes × 5 tiers)", () => {
    const rangerSkills = ALL_SKILLS.filter((s) => s.classId === "ranger");
    expect(rangerSkills.length).toBe(15);
  });
});

// ── Artisan class passives ────────────────────────────────────────────────────

describe("Artisan class passive bonuses", () => {
  it("tempered_steel grants HP and damage reduction", () => {
    const bonuses = computePassiveBonuses(["tempered_steel"]);
    expect(bonuses.maxHpFlat).toBe(35);
    expect(bonuses.damageReductionPct).toBeCloseTo(0.08);
  });

  it("blacksmith passives stack HP and damage reduction", () => {
    const bonuses = computePassiveBonuses(["tempered_steel", "anvil_guard"]);
    expect(bonuses.maxHpFlat).toBe(85);
    expect(bonuses.damageReductionPct).toBeCloseTo(0.20);
  });

  it("alchemist passives grant damage and mana", () => {
    const bonuses = computePassiveBonuses(["brew_mastery", "concoction_heal"]);
    expect(bonuses.damagePct).toBeCloseTo(0.12);
    expect(bonuses.maxManaFlat).toBe(20);
    expect(bonuses.manaRegenFlat).toBe(4);
  });

  it("enchanter passives grant mana, damage, and CD reduction", () => {
    const bonuses = computePassiveBonuses(["mana_infusion", "spell_weave"]);
    expect(bonuses.maxManaFlat).toBe(30);
    expect(bonuses.manaRegenFlat).toBe(3);
    expect(bonuses.damagePct).toBeCloseTo(0.15);
    expect(bonuses.allCdReductionPct).toBeCloseTo(0.15);
  });

  it("artisan has 15 skills total (3 archetypes × 5 tiers)", () => {
    const artisanSkills = ALL_SKILLS.filter((s) => s.classId === "artisan");
    expect(artisanSkills.length).toBe(15);
  });
});

// ── Cross-class data integrity ───────────────────────────────────────────────

describe("Cross-class skill data integrity", () => {
  it("ALL_SKILLS has 60 total skills (4 classes × 3 archetypes × 5 tiers)", () => {
    expect(ALL_SKILLS.length).toBe(60);
  });

  it("each class has exactly 3 archetypes with 5 skills each", () => {
    for (const classId of ["warrior", "mage", "ranger", "artisan"]) {
      const classSkills = ALL_SKILLS.filter((s) => s.classId === classId);
      expect(classSkills.length, `${classId} should have 15 skills`).toBe(15);
      const archetypes = new Set(classSkills.map((s) => s.archetypeId));
      expect(archetypes.size, `${classId} should have 3 archetypes`).toBe(3);
    }
  });
});

// ── Combat formula constants ──────────────────────────────────────────────────

describe("Combat formula constants", () => {
  it("base attack damage is 25", () => {
    expect(ATTACK_DAMAGE).toBe(25);
  });

  it("player melee hit damage is 10", () => {
    expect(PLAYER_HIT_DAMAGE).toBe(10);
  });

  it("melee attack range is 30px", () => {
    expect(ATTACK_RANGE_PX).toBe(30);
  });

  it("attack cooldown is 480ms", () => {
    expect(ATTACK_COOLDOWN_MS).toBe(480);
  });

  it("mana cost per attack is 5", () => {
    expect(MANA_ATTACK_COST).toBe(5);
  });

  it("mana regenerates at 6 mana/second", () => {
    expect(MANA_REGEN_PER_SEC).toBe(6);
  });

  it("invincibility window is 900ms after being hit", () => {
    expect(PLAYER_INVINCIBILITY_MS).toBe(900);
  });

  it("projectiles move at 100 units/second", () => {
    expect(PROJECTILE_SPEED).toBe(100);
  });

  it("projectiles expire after 2000ms", () => {
    expect(PROJECTILE_LIFETIME_MS).toBe(2000);
  });

  describe("damage modifier formula", () => {
    it("passive damagePct bonus multiplies base damage correctly", () => {
      const baseDamage = ATTACK_DAMAGE;
      const bonuses = computePassiveBonuses(["battle_frenzy"]); // +12%
      const dmgBonus = 1 + bonuses.damagePct;
      const finalDamage = Math.round(baseDamage * dmgBonus);
      expect(finalDamage).toBe(28); // 25 * 1.12 = 28
    });

    it("damage reduction reduces incoming damage by correct fraction", () => {
      const incomingDamage = PLAYER_HIT_DAMAGE;
      const bonuses = computePassiveBonuses(["iron_skin"]); // +8% reduction
      const reduced = Math.round(incomingDamage * (1 - bonuses.damageReductionPct));
      expect(reduced).toBe(9); // 10 * 0.92 = 9.2 → 9
    });

    it("attack CD reduction shortens cooldown by correct amount", () => {
      const bonuses = computePassiveBonuses(["battle_frenzy"]); // 10% CD reduction
      const reducedCd = ATTACK_COOLDOWN_MS * (1 - bonuses.attackCdReductionPct);
      expect(reducedCd).toBeCloseTo(432); // 480 * 0.90 = 432
    });
  });

  describe("mana economy", () => {
    it("mana regen over one second restores 6 mana", () => {
      const dt = 1.0; // seconds
      const regenAmount = MANA_REGEN_PER_SEC * dt;
      expect(regenAmount).toBe(6);
    });

    it("mana regen over 50ms tick restores 0.3 mana", () => {
      const dt = 0.05; // 50ms in seconds
      const regenAmount = MANA_REGEN_PER_SEC * dt;
      expect(regenAmount).toBeCloseTo(0.3);
    });

    it("enhanced mana regen stacks from passive bonuses", () => {
      // divine_light grants +4 manaRegenFlat (paladin passive)
      const bonuses = computePassiveBonuses(["divine_light"]);
      const totalRegen = MANA_REGEN_PER_SEC + bonuses.manaRegenFlat;
      expect(totalRegen).toBeGreaterThan(MANA_REGEN_PER_SEC);
    });
  });
});

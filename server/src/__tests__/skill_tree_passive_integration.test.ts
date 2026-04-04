/**
 * Integration: SkillTree passive bonus → stat cache → combat damage.
 *
 * Covers the gap identified in PIX-100:
 *   - onAllocSkill callback fires when a passive node is allocated
 *   - passiveBonusCache is recalculated immediately after allocation
 *   - Player attack damage in the combat formula reflects the advertised % bonus
 *
 * All tests run in pure Node (no Phaser). The SkillTreePanel's onAllocSkill
 * wiring is exercised via the same callback pattern used in GameScene line ~706.
 */

import { describe, it, expect } from "vitest";
import {
  computePassiveBonuses,
  SKILL_BY_ID,
  type PassiveBonus,
} from "../skills";

// ── Combat formula constants (mirrored from GameScene / ZoneRoom) ────────────
const ATTACK_DAMAGE         = 25;  // COMBAT.ATTACK_DAMAGE
const DAMAGE_BONUS_PER_LEVEL = 5;  // LEVELS.DAMAGE_BONUS_PER_LEVEL
const ATTACK_COOLDOWN_MS     = 480; // COMBAT.ATTACK_COOLDOWN_MS

/** Mirrors GameScene.handleAttack damage calculation. */
function calcAttackDamage(level: number, passiveCache: Required<PassiveBonus>): number {
  return Math.floor(
    (ATTACK_DAMAGE + (level - 1) * DAMAGE_BONUS_PER_LEVEL) *
    (1 + passiveCache.damagePct),
  );
}

/** Mirrors GameScene.handleAttack cooldown calculation. */
function calcAttackCooldown(passiveCache: Required<PassiveBonus>): number {
  return Math.round(ATTACK_COOLDOWN_MS * Math.max(0.2, 1 - passiveCache.attackCdReductionPct));
}

// ── Simulate GameScene.allocSkill + applyPassiveBonuses ──────────────────────

interface SimPlayerState {
  unlockedSkills: Set<string>;
  skillPoints: number;
  passiveBonusCache: Required<PassiveBonus>;
  onAllocSkillSpy: string[];
}

function makeSimPlayer(skillPoints = 5): SimPlayerState {
  return {
    unlockedSkills: new Set(),
    skillPoints,
    passiveBonusCache: computePassiveBonuses([]),
    onAllocSkillSpy: [],
  };
}

/**
 * Simulates the full allocSkill → applyPassiveBonuses path from GameScene
 * (single-player branch: no mp send, immediate cache update).
 * Also invokes the onAllocSkill callback, mirroring the SkillTreePanel wiring.
 */
function simAllocSkill(state: SimPlayerState, skillId: string): void {
  if (state.skillPoints <= 0) return;
  const skillDef = SKILL_BY_ID.get(skillId);
  if (!skillDef) return;
  if (state.unlockedSkills.has(skillId)) return;
  if (skillDef.prerequisiteId && !state.unlockedSkills.has(skillDef.prerequisiteId)) return;

  // Mirrors: nodeBg.on('pointerdown', () => { this.onAllocSkill?.(skill.id); })
  state.onAllocSkillSpy.push(skillId);

  // Mirrors: GameScene.allocSkill (single-player path)
  state.unlockedSkills.add(skillId);
  state.skillPoints -= 1;
  // Mirrors: applyPassiveBonuses()
  state.passiveBonusCache = computePassiveBonuses([...state.unlockedSkills]);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SkillTree passive bonus → combat integration (PIX-100)", () => {
  describe("onAllocSkill callback wiring", () => {
    it("fires when a tier-1 passive node (iron_skin) is allocated", () => {
      const player = makeSimPlayer();
      simAllocSkill(player, "iron_skin");
      expect(player.onAllocSkillSpy).toContain("iron_skin");
    });

    it("fires when a tier-2 passive node (battle_frenzy) is allocated after its prereq", () => {
      const player = makeSimPlayer(3);
      simAllocSkill(player, "reckless_strike"); // tier-1 active, prereq for battle_frenzy
      simAllocSkill(player, "battle_frenzy");   // tier-2 passive
      expect(player.onAllocSkillSpy).toContain("battle_frenzy");
    });

    it("fires exactly once per allocation", () => {
      const player = makeSimPlayer();
      simAllocSkill(player, "iron_skin");
      expect(player.onAllocSkillSpy.length).toBe(1);
    });

    it("does not fire when skill points are exhausted", () => {
      const player = makeSimPlayer(0); // 0 skill points
      simAllocSkill(player, "iron_skin");
      expect(player.onAllocSkillSpy.length).toBe(0);
    });

    it("does not fire when prerequisite is unmet", () => {
      const player = makeSimPlayer();
      // bloodthirst requires blade_fury → battle_frenzy → reckless_strike chain
      simAllocSkill(player, "bloodthirst");
      expect(player.onAllocSkillSpy.length).toBe(0);
    });

    it("does not fire when skill is already unlocked (no double-fire)", () => {
      const player = makeSimPlayer(5);
      simAllocSkill(player, "iron_skin");
      simAllocSkill(player, "iron_skin"); // second attempt — already unlocked
      expect(player.onAllocSkillSpy.length).toBe(1);
    });
  });

  describe("passiveBonusCache recalculation after allocation", () => {
    it("cache starts at zero before any allocation", () => {
      const player = makeSimPlayer();
      expect(player.passiveBonusCache.damagePct).toBe(0);
    });

    it("cache updates immediately after allocating battle_frenzy (+12% dmg)", () => {
      const player = makeSimPlayer(3);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");
      expect(player.passiveBonusCache.damagePct).toBeCloseTo(0.12);
    });

    it("cache updates attackCdReductionPct after allocating battle_frenzy (+10% cd)", () => {
      const player = makeSimPlayer(3);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");
      expect(player.passiveBonusCache.attackCdReductionPct).toBeCloseTo(0.10);
    });

    it("cache resets to zero after respec (skills cleared)", () => {
      const player = makeSimPlayer(3);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");
      expect(player.passiveBonusCache.damagePct).toBeCloseTo(0.12);

      // Simulate respec: clear skills and recompute
      player.unlockedSkills.clear();
      player.passiveBonusCache = computePassiveBonuses([...player.unlockedSkills]);

      expect(player.passiveBonusCache.damagePct).toBe(0);
    });

    it("cache accumulates from multiple passive allocations", () => {
      const player = makeSimPlayer(5);
      // Unlock the prerequisite chain: reckless_strike (tier-1 active) → battle_frenzy (tier-2 passive)
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");  // +12% dmg
      // blade_fury (tier-3 active, prereq: battle_frenzy) needed before bloodthirst
      simAllocSkill(player, "blade_fury");
      simAllocSkill(player, "bloodthirst");    // +18% dmg

      expect(player.passiveBonusCache.damagePct).toBeCloseTo(0.30);
    });
  });

  describe("combat damage reflects advertised passive bonus", () => {
    it("level-1 base attack deals 25 damage with no passives", () => {
      const player = makeSimPlayer();
      const dmg = calcAttackDamage(1, player.passiveBonusCache);
      expect(dmg).toBe(25);
    });

    it("damage increases to 28 after allocating battle_frenzy (+12%)", () => {
      const player = makeSimPlayer(3);
      const baseDmg = calcAttackDamage(1, player.passiveBonusCache);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");
      const boostedDmg = calcAttackDamage(1, player.passiveBonusCache);

      expect(boostedDmg).toBeGreaterThan(baseDmg);
      // 25 * 1.12 = 28.0 → Math.floor = 28
      expect(boostedDmg).toBe(28);
    });

    it("damage increase matches the advertised damagePct on the skill definition", () => {
      const skill = SKILL_BY_ID.get("battle_frenzy");
      expect(skill?.passiveBonus?.damagePct).toBeCloseTo(0.12);

      const player = makeSimPlayer(3);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");

      const expectedMultiplier = 1 + (skill!.passiveBonus!.damagePct ?? 0);
      const expectedDmg = Math.floor(ATTACK_DAMAGE * expectedMultiplier);
      const actualDmg = calcAttackDamage(1, player.passiveBonusCache);
      expect(actualDmg).toBe(expectedDmg);
    });

    it("higher-level player damage still scales correctly with passive bonus", () => {
      const player = makeSimPlayer(3);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy"); // +12%

      // Level 5: base = 25 + 4*5 = 45; with +12%: Math.floor(45 * 1.12) = 50
      const dmgLv5 = calcAttackDamage(5, player.passiveBonusCache);
      expect(dmgLv5).toBe(50);
    });

    it("damage with stacked passives (battle_frenzy + bloodthirst) equals +30% total", () => {
      const player = makeSimPlayer(5);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");  // +12%
      simAllocSkill(player, "blade_fury");
      simAllocSkill(player, "bloodthirst");    // +18%

      // 25 * 1.30 = 32.5 → Math.floor = 32
      const dmg = calcAttackDamage(1, player.passiveBonusCache);
      expect(dmg).toBe(32);
    });

    it("attack cooldown is shortened after allocating battle_frenzy (-10%)", () => {
      const player = makeSimPlayer(3);
      const cdBefore = calcAttackCooldown(player.passiveBonusCache);
      simAllocSkill(player, "reckless_strike");
      simAllocSkill(player, "battle_frenzy");
      const cdAfter = calcAttackCooldown(player.passiveBonusCache);

      expect(cdAfter).toBeLessThan(cdBefore);
      // 480 * (1 - 0.10) = 432
      expect(cdAfter).toBe(432);
    });
  });
});

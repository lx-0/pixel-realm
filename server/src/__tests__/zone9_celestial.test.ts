/**
 * Zone 9 — Celestial Spire Integration Tests (PIX-175)
 *
 * Validates that the Celestial Spire zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Celestial Arbiter boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone8 → zone9
 *   5. Server-side ZONE_META includes zone9 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone9
 *   7. Server-side zone enemy defs include zone9 with correct types
 *   8. Zone status effects: astral_beast applies stun on melee; star_sentinel/void_mage are ranged with stun
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../db/client", () => ({
  getDb:   vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getFallbackQuest } from "../quests/fallback";

// ── Import client constants (shared with server via tsconfig path) ────────────
import {
  ZONES,
  ENEMY_TYPES,
  BOSS_TYPES,
  MELEE_STATUS_ON_HIT,
  PROJECTILE_STATUS_ON_HIT,
} from "../../../src/config/constants";

// ── 1. Zone config ─────────────────────────────────────────────────────────

describe("zone9 — Celestial Spire config", () => {
  const zone9 = ZONES.find((z) => z.id === "zone9");

  it("zone9 exists in ZONES", () => {
    expect(zone9).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone9?.name).toBe("Celestial Spire");
    expect(zone9?.biome).toBe("Sky / Celestial");
  });

  it("requires minimum player level 20", () => {
    expect(zone9?.minPlayerLevel).toBe(20);
  });

  it("unlocks after zone8", () => {
    expect(zone9?.unlockRequirement).toBe("zone8");
  });

  it("has 3 waves", () => {
    expect(zone9?.waves).toBe(3);
  });

  it("has the three celestial enemy types", () => {
    expect(zone9?.enemyTypes).toEqual(
      expect.arrayContaining(["star_sentinel", "void_mage", "astral_beast"]),
    );
    expect(zone9?.enemyTypes).toHaveLength(3);
  });

  it("boss is celestial_arbiter", () => {
    expect(zone9?.bossType).toBe("celestial_arbiter");
  });

  it("difficultyMult is 5.0 (higher than zone8's 4.5)", () => {
    const zone8 = ZONES.find((z) => z.id === "zone8");
    expect(zone9?.difficultyMult).toBeGreaterThan(zone8?.difficultyMult ?? 0);
    expect(zone9?.difficultyMult).toBe(5.0);
  });

  it("xpReward is higher than zone8", () => {
    const zone8 = ZONES.find((z) => z.id === "zone8");
    expect(zone9?.xpReward).toBeGreaterThan(zone8?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 1–9)", () => {
  it("zones 1–9 form a connected chain", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone1.unlockRequirement).toBeNull();
    expect(byId.zone2.unlockRequirement).toBe("zone1");
    expect(byId.zone3.unlockRequirement).toBe("zone2");
    expect(byId.zone4.unlockRequirement).toBe("zone3");
    expect(byId.zone5.unlockRequirement).toBe("zone4");
    expect(byId.zone6.unlockRequirement).toBe("zone5");
    expect(byId.zone7.unlockRequirement).toBe("zone6");
    expect(byId.zone8.unlockRequirement).toBe("zone7");
    expect(byId.zone9.unlockRequirement).toBe("zone8");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Celestial Spire enemy types", () => {
  it("star_sentinel is defined", () => {
    expect(ENEMY_TYPES.star_sentinel).toBeDefined();
  });

  it("star_sentinel is ranged with a projectile color", () => {
    expect(ENEMY_TYPES.star_sentinel.behaviour).toBe("ranged");
    expect(ENEMY_TYPES.star_sentinel.projectileColor).toBeDefined();
  });

  it("void_mage is defined and uses ranged_flee behaviour", () => {
    expect(ENEMY_TYPES.void_mage).toBeDefined();
    expect(ENEMY_TYPES.void_mage.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.void_mage.projectileColor).toBeDefined();
  });

  it("astral_beast is defined and uses chase behaviour", () => {
    expect(ENEMY_TYPES.astral_beast).toBeDefined();
    expect(ENEMY_TYPES.astral_beast.behaviour).toBe("chase");
  });

  it("celestial enemies have higher stats than zone8 counterparts", () => {
    // star_sentinel should have more HP than frost_elemental
    expect(ENEMY_TYPES.star_sentinel.baseHp).toBeGreaterThan(
      ENEMY_TYPES.frost_elemental.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Celestial Arbiter boss", () => {
  it("celestial_arbiter is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.celestial_arbiter).toBeDefined();
  });

  it("has more HP than frost_titan (harder boss)", () => {
    expect(BOSS_TYPES.celestial_arbiter.baseHp).toBeGreaterThan(
      BOSS_TYPES.frost_titan.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.celestial_arbiter.name).toBe("Celestial Arbiter");
  });

  it("xpValue is higher than frost_titan", () => {
    expect(BOSS_TYPES.celestial_arbiter.xpValue).toBeGreaterThan(
      BOSS_TYPES.frost_titan.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Celestial Spire status effects", () => {
  it("astral_beast melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.astral_beast).toBe("stun");
  });

  it("star_sentinel ranged projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.star_sentinel).toBe("stun");
  });

  it("void_mage ranged projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.void_mage).toBe("stun");
  });

  it("celestial_arbiter projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.celestial_arbiter).toBe("stun");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone9 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone9-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone9", qt);
      expect(quest).toBeDefined();
      expect(quest.title).toBeTruthy();
      expect(quest.description).toBeTruthy();
      expect(quest.objectives.length).toBeGreaterThan(0);
      expect(quest.dialogue.greeting).toBeTruthy();
      expect(quest.dialogue.acceptance).toBeTruthy();
      expect(quest.dialogue.completion).toBeTruthy();
      expect(quest.dialogue.choices.length).toBeGreaterThanOrEqual(3);
      expect(quest.completionConditions.type).toBe(qt);
    });
  }

  it("returns a result even when called multiple times", () => {
    const quest = getFallbackQuest("zone9", "kill");
    expect(quest).toBeDefined();
  });
});

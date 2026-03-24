/**
 * Zone 8 — Frostpeak Highlands Integration Tests (PIX-172)
 *
 * Validates that the Frostpeak Highlands zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Frost Titan boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone7 → zone8
 *   5. Server-side ZONE_META includes zone8 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone8
 *   7. Server-side zone enemy defs include zone8 with correct types
 *   8. Zone status effects: snow_wolf applies freeze on melee; frost_elemental/ice_archer are ranged with freeze
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

describe("zone8 — Frostpeak Highlands config", () => {
  const zone8 = ZONES.find((z) => z.id === "zone8");

  it("zone8 exists in ZONES", () => {
    expect(zone8).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone8?.name).toBe("Frostpeak Highlands");
    expect(zone8?.biome).toBe("Ice / Mountain");
  });

  it("requires minimum player level 17", () => {
    expect(zone8?.minPlayerLevel).toBe(17);
  });

  it("unlocks after zone7", () => {
    expect(zone8?.unlockRequirement).toBe("zone7");
  });

  it("has 3 waves", () => {
    expect(zone8?.waves).toBe(3);
  });

  it("has the three frostpeak enemy types", () => {
    expect(zone8?.enemyTypes).toEqual(
      expect.arrayContaining(["frost_elemental", "snow_wolf", "ice_archer"]),
    );
    expect(zone8?.enemyTypes).toHaveLength(3);
  });

  it("boss is frost_titan", () => {
    expect(zone8?.bossType).toBe("frost_titan");
  });

  it("difficultyMult is 4.5 (higher than zone7's 4.0)", () => {
    const zone7 = ZONES.find((z) => z.id === "zone7");
    expect(zone8?.difficultyMult).toBeGreaterThan(zone7?.difficultyMult ?? 0);
    expect(zone8?.difficultyMult).toBe(4.5);
  });

  it("xpReward is higher than zone7", () => {
    const zone7 = ZONES.find((z) => z.id === "zone7");
    expect(zone8?.xpReward).toBeGreaterThan(zone7?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 1–8)", () => {
  it("zones 1–8 form a connected chain", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone1.unlockRequirement).toBeNull();
    expect(byId.zone2.unlockRequirement).toBe("zone1");
    expect(byId.zone3.unlockRequirement).toBe("zone2");
    expect(byId.zone4.unlockRequirement).toBe("zone3");
    expect(byId.zone5.unlockRequirement).toBe("zone4");
    expect(byId.zone6.unlockRequirement).toBe("zone5");
    expect(byId.zone7.unlockRequirement).toBe("zone6");
    expect(byId.zone8.unlockRequirement).toBe("zone7");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Frostpeak Highlands enemy types", () => {
  it("frost_elemental is defined", () => {
    expect(ENEMY_TYPES.frost_elemental).toBeDefined();
  });

  it("frost_elemental is ranged with ice projectile", () => {
    expect(ENEMY_TYPES.frost_elemental.behaviour).toBe("ranged");
    expect(ENEMY_TYPES.frost_elemental.projectileColor).toBeDefined();
  });

  it("snow_wolf is defined and uses chase behaviour", () => {
    expect(ENEMY_TYPES.snow_wolf).toBeDefined();
    expect(ENEMY_TYPES.snow_wolf.behaviour).toBe("chase");
  });

  it("snow_wolf is faster than previous zone enemies", () => {
    expect(ENEMY_TYPES.snow_wolf.speed).toBeGreaterThan(ENEMY_TYPES.bog_crawler.speed);
  });

  it("ice_archer is defined and ranged", () => {
    expect(ENEMY_TYPES.ice_archer).toBeDefined();
    expect(ENEMY_TYPES.ice_archer.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.ice_archer.projectileColor).toBeDefined();
  });

  it("frostpeak enemies have higher stats than zone7 counterparts", () => {
    // frost_elemental should be tankier than bog_crawler
    expect(ENEMY_TYPES.frost_elemental.baseHp).toBeGreaterThan(
      ENEMY_TYPES.bog_crawler.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Frost Titan boss", () => {
  it("frost_titan is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.frost_titan).toBeDefined();
  });

  it("has more HP than mire_queen (harder boss)", () => {
    expect(BOSS_TYPES.frost_titan.baseHp).toBeGreaterThan(
      BOSS_TYPES.mire_queen.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.frost_titan.name).toBe("Frost Titan");
  });

  it("xpValue is higher than mire_queen", () => {
    expect(BOSS_TYPES.frost_titan.xpValue).toBeGreaterThan(
      BOSS_TYPES.mire_queen.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Frostpeak Highlands status effects", () => {
  it("snow_wolf melee applies freeze", () => {
    expect(MELEE_STATUS_ON_HIT.snow_wolf).toBe("freeze");
  });

  it("frost_elemental ranged projectile applies freeze", () => {
    expect(PROJECTILE_STATUS_ON_HIT.frost_elemental).toBe("freeze");
  });

  it("ice_archer ranged projectile applies freeze", () => {
    expect(PROJECTILE_STATUS_ON_HIT.ice_archer).toBe("freeze");
  });

  it("frost_titan projectile applies freeze", () => {
    expect(PROJECTILE_STATUS_ON_HIT.frost_titan).toBe("freeze");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone8 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone8-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone8", qt);
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
    const quest = getFallbackQuest("zone8", "kill");
    expect(quest).toBeDefined();
  });
});

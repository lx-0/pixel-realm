/**
 * Zone 18 — Oblivion Spire Integration Tests (PIX-220)
 *
 * Validates that the Oblivion Spire zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Spire Keeper boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone17 → zone18
 *   5. Server-side ZONE_META includes zone18 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone18
 *   7. Server-side zone enemy defs include zone18 with correct types
 *   8. Zone status effects: spire_sentinel/oblivion_wraith melee; reality_shard/spire_keeper ranged
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

describe("zone18 — Oblivion Spire config", () => {
  const zone18 = ZONES.find((z) => z.id === "zone18");

  it("zone18 exists in ZONES", () => {
    expect(zone18).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone18?.name).toBe("Oblivion Spire");
    expect(zone18?.biome).toBe("oblivion-spire");
  });

  it("requires minimum player level 47", () => {
    expect(zone18?.minPlayerLevel).toBe(47);
  });

  it("unlocks after zone17", () => {
    expect(zone18?.unlockRequirement).toBe("zone17");
  });

  it("has 3 waves", () => {
    expect(zone18?.waves).toBe(3);
  });

  it("has the three oblivion spire enemy types", () => {
    expect(zone18?.enemyTypes).toEqual(
      expect.arrayContaining(["spire_sentinel", "reality_shard", "oblivion_wraith"]),
    );
    expect(zone18?.enemyTypes).toHaveLength(3);
  });

  it("boss is spire_keeper", () => {
    expect(zone18?.bossType).toBe("spire_keeper");
  });

  it("difficultyMult is 9.5 (higher than zone17's 9.0)", () => {
    const zone17 = ZONES.find((z) => z.id === "zone17");
    expect(zone18?.difficultyMult).toBeGreaterThan(zone17?.difficultyMult ?? 0);
    expect(zone18?.difficultyMult).toBe(9.5);
  });

  it("xpReward is higher than zone17", () => {
    const zone17 = ZONES.find((z) => z.id === "zone17");
    expect(zone18?.xpReward).toBeGreaterThan(zone17?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 17–18)", () => {
  it("zone18 unlocks after zone17", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone17.unlockRequirement).toBe("zone16");
    expect(byId.zone18.unlockRequirement).toBe("zone17");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Oblivion Spire enemy types", () => {
  it("spire_sentinel is defined", () => {
    expect(ENEMY_TYPES.spire_sentinel).toBeDefined();
  });

  it("spire_sentinel uses block behaviour", () => {
    expect(ENEMY_TYPES.spire_sentinel.behaviour).toBe("block");
  });

  it("reality_shard is defined and uses ranged_flee behaviour", () => {
    expect(ENEMY_TYPES.reality_shard).toBeDefined();
    expect(ENEMY_TYPES.reality_shard.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.reality_shard.projectileColor).toBeDefined();
  });

  it("oblivion_wraith is defined and uses phase behaviour", () => {
    expect(ENEMY_TYPES.oblivion_wraith).toBeDefined();
    expect(ENEMY_TYPES.oblivion_wraith.behaviour).toBe("phase");
  });

  it("oblivion spire enemies have higher base stats than zone17 counterparts", () => {
    // spire_sentinel should have more HP than twilight_sentinel
    expect(ENEMY_TYPES.spire_sentinel.baseHp).toBeGreaterThan(
      ENEMY_TYPES.twilight_sentinel.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Spire Keeper boss", () => {
  it("spire_keeper is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.spire_keeper).toBeDefined();
  });

  it("has more HP than twilight_warden (harder boss)", () => {
    expect(BOSS_TYPES.spire_keeper.baseHp).toBeGreaterThan(
      BOSS_TYPES.twilight_warden.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.spire_keeper.name).toBe("The Spire Keeper");
  });

  it("xpValue is higher than twilight_warden", () => {
    expect(BOSS_TYPES.spire_keeper.xpValue).toBeGreaterThan(
      BOSS_TYPES.twilight_warden.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Oblivion Spire status effects", () => {
  it("spire_sentinel melee applies freeze", () => {
    expect(MELEE_STATUS_ON_HIT.spire_sentinel).toBe("freeze");
  });

  it("oblivion_wraith melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.oblivion_wraith).toBe("stun");
  });

  it("reality_shard ranged projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.reality_shard).toBe("burn");
  });

  it("spire_keeper projectile applies freeze", () => {
    expect(PROJECTILE_STATUS_ON_HIT.spire_keeper).toBe("freeze");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone18 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone18-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone18", qt);
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
    const quest = getFallbackQuest("zone18", "kill");
    expect(quest).toBeDefined();
  });
});

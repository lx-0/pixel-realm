/**
 * Zone 15 — Primordial Core Integration Tests (PIX-229)
 *
 * Validates that the Primordial Core zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. The Genesis Flame boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone14 → zone15
 *   5. Fallback quests exist for all five quest types in zone15
 *   6. Zone status effects: core_sentinel melee burn; primordial_shard/genesis_flame ranged burn
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

describe("zone15 — Primordial Core config", () => {
  const zone15 = ZONES.find((z) => z.id === "zone15");

  it("zone15 exists in ZONES", () => {
    expect(zone15).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone15?.name).toBe("Primordial Core");
    expect(zone15?.biome).toBe("primordial-core");
  });

  it("requires minimum player level 38", () => {
    expect(zone15?.minPlayerLevel).toBe(38);
  });

  it("unlocks after zone14", () => {
    expect(zone15?.unlockRequirement).toBe("zone14");
  });

  it("has 3 waves", () => {
    expect(zone15?.waves).toBe(3);
  });

  it("has the three primordial core enemy types", () => {
    expect(zone15?.enemyTypes).toEqual(
      expect.arrayContaining(["elemental_amalgam", "primordial_shard", "core_sentinel"]),
    );
    expect(zone15?.enemyTypes).toHaveLength(3);
  });

  it("boss is genesis_flame", () => {
    expect(zone15?.bossType).toBe("genesis_flame");
  });

  it("difficultyMult is 8.0 (higher than zone14's 7.5)", () => {
    const zone14 = ZONES.find((z) => z.id === "zone14");
    expect(zone15?.difficultyMult).toBeGreaterThan(zone14?.difficultyMult ?? 0);
    expect(zone15?.difficultyMult).toBe(8.0);
  });

  it("xpReward is higher than zone14", () => {
    const zone14 = ZONES.find((z) => z.id === "zone14");
    expect(zone15?.xpReward).toBeGreaterThan(zone14?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 14–15)", () => {
  it("zone15 unlocks after zone14", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone14.unlockRequirement).toBe("zone13");
    expect(byId.zone15.unlockRequirement).toBe("zone14");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Primordial Core enemy types", () => {
  it("elemental_amalgam is defined", () => {
    expect(ENEMY_TYPES.elemental_amalgam).toBeDefined();
  });

  it("elemental_amalgam uses tank behaviour", () => {
    expect(ENEMY_TYPES.elemental_amalgam.behaviour).toBe("tank");
  });

  it("primordial_shard is defined and uses ranged_flee behaviour with a projectile color", () => {
    expect(ENEMY_TYPES.primordial_shard).toBeDefined();
    expect(ENEMY_TYPES.primordial_shard.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.primordial_shard.projectileColor).toBeDefined();
  });

  it("core_sentinel is defined and uses block behaviour", () => {
    expect(ENEMY_TYPES.core_sentinel).toBeDefined();
    expect(ENEMY_TYPES.core_sentinel.behaviour).toBe("block");
  });

  it("primordial core enemies have higher stats than zone14 counterparts", () => {
    // elemental_amalgam (tank) should have more HP than shattered_golem (tank)
    expect(ENEMY_TYPES.elemental_amalgam.baseHp).toBeGreaterThan(
      ENEMY_TYPES.shattered_golem.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("The Genesis Flame boss", () => {
  it("genesis_flame is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.genesis_flame).toBeDefined();
  });

  it("has more HP than the_unmaker (harder boss)", () => {
    expect(BOSS_TYPES.genesis_flame.baseHp).toBeGreaterThan(
      BOSS_TYPES.the_unmaker.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.genesis_flame.name).toBe("The Genesis Flame");
  });

  it("xpValue is higher than the_unmaker", () => {
    expect(BOSS_TYPES.genesis_flame.xpValue).toBeGreaterThan(
      BOSS_TYPES.the_unmaker.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Primordial Core status effects", () => {
  it("core_sentinel melee applies burn", () => {
    expect(MELEE_STATUS_ON_HIT.core_sentinel).toBe("burn");
  });

  it("primordial_shard ranged projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.primordial_shard).toBe("burn");
  });

  it("genesis_flame projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.genesis_flame).toBe("burn");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone15 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone15-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone15", qt);
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
    const quest = getFallbackQuest("zone15", "kill");
    expect(quest).toBeDefined();
  });
});

/**
 * Zone 14 — Shattered Dominion Integration Tests (PIX-229)
 *
 * Validates that the Shattered Dominion zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. The Unmaker boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone13 → zone14
 *   5. Fallback quests exist for all five quest types in zone14
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
} from "../../../src/config/constants";

// ── 1. Zone config ─────────────────────────────────────────────────────────

describe("zone14 — Shattered Dominion config", () => {
  const zone14 = ZONES.find((z) => z.id === "zone14");

  it("zone14 exists in ZONES", () => {
    expect(zone14).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone14?.name).toBe("Shattered Dominion");
    expect(zone14?.biome).toBe("shattered-dominion");
  });

  it("requires minimum player level 35", () => {
    expect(zone14?.minPlayerLevel).toBe(35);
  });

  it("unlocks after zone13", () => {
    expect(zone14?.unlockRequirement).toBe("zone13");
  });

  it("has 3 waves", () => {
    expect(zone14?.waves).toBe(3);
  });

  it("has the three shattered dominion enemy types", () => {
    expect(zone14?.enemyTypes).toEqual(
      expect.arrayContaining(["shattered_golem", "reality_fracture", "dominion_shade"]),
    );
    expect(zone14?.enemyTypes).toHaveLength(3);
  });

  it("boss is the_unmaker", () => {
    expect(zone14?.bossType).toBe("the_unmaker");
  });

  it("difficultyMult is 7.5 (higher than zone13's 7.0)", () => {
    const zone13 = ZONES.find((z) => z.id === "zone13");
    expect(zone14?.difficultyMult).toBeGreaterThan(zone13?.difficultyMult ?? 0);
    expect(zone14?.difficultyMult).toBe(7.5);
  });

  it("xpReward is higher than zone13", () => {
    const zone13 = ZONES.find((z) => z.id === "zone13");
    expect(zone14?.xpReward).toBeGreaterThan(zone13?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 13–14)", () => {
  it("zone14 unlocks after zone13", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone13.unlockRequirement).toBe("zone12");
    expect(byId.zone14.unlockRequirement).toBe("zone13");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Shattered Dominion enemy types", () => {
  it("shattered_golem is defined", () => {
    expect(ENEMY_TYPES.shattered_golem).toBeDefined();
  });

  it("shattered_golem uses tank behaviour", () => {
    expect(ENEMY_TYPES.shattered_golem.behaviour).toBe("tank");
  });

  it("reality_fracture is defined and uses ranged_flee behaviour with a projectile color", () => {
    expect(ENEMY_TYPES.reality_fracture).toBeDefined();
    expect(ENEMY_TYPES.reality_fracture.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.reality_fracture.projectileColor).toBeDefined();
  });

  it("dominion_shade is defined and uses phase behaviour", () => {
    expect(ENEMY_TYPES.dominion_shade).toBeDefined();
    expect(ENEMY_TYPES.dominion_shade.behaviour).toBe("phase");
  });

  it("shattered dominion enemies have higher stats than zone13 counterparts", () => {
    // shattered_golem (tank) should have more HP than eclipse_knight (tank)
    expect(ENEMY_TYPES.shattered_golem.baseHp).toBeGreaterThan(
      ENEMY_TYPES.eclipse_knight.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("The Unmaker boss", () => {
  it("the_unmaker is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.the_unmaker).toBeDefined();
  });

  it("has more HP than eclipsed_king (harder boss)", () => {
    expect(BOSS_TYPES.the_unmaker.baseHp).toBeGreaterThan(
      BOSS_TYPES.eclipsed_king.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.the_unmaker.name).toBe("The Unmaker");
  });

  it("xpValue is higher than eclipsed_king", () => {
    expect(BOSS_TYPES.the_unmaker.xpValue).toBeGreaterThan(
      BOSS_TYPES.eclipsed_king.xpValue,
    );
  });
});

// ── 5. Fallback quests ──────────────────────────────────────────────────────

describe("zone14 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone14-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone14", qt);
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
    const quest = getFallbackQuest("zone14", "kill");
    expect(quest).toBeDefined();
  });
});

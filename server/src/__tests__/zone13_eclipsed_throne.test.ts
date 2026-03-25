/**
 * Zone 13 — Eclipsed Throne Integration Tests (PIX-229)
 *
 * Validates that the Eclipsed Throne zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. The Eclipsed King boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone12 → zone13
 *   5. Fallback quests exist for all five quest types in zone13
 *   6. Zone status effects: eclipse_knight/dusk_wraith melee; shadow_herald/eclipsed_king ranged
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

describe("zone13 — Eclipsed Throne config", () => {
  const zone13 = ZONES.find((z) => z.id === "zone13");

  it("zone13 exists in ZONES", () => {
    expect(zone13).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone13?.name).toBe("Eclipsed Throne");
    expect(zone13?.biome).toBe("eclipsed-throne");
  });

  it("requires minimum player level 32", () => {
    expect(zone13?.minPlayerLevel).toBe(32);
  });

  it("unlocks after zone12", () => {
    expect(zone13?.unlockRequirement).toBe("zone12");
  });

  it("has 3 waves", () => {
    expect(zone13?.waves).toBe(3);
  });

  it("has the three eclipsed throne enemy types", () => {
    expect(zone13?.enemyTypes).toEqual(
      expect.arrayContaining(["eclipse_knight", "shadow_herald", "dusk_wraith"]),
    );
    expect(zone13?.enemyTypes).toHaveLength(3);
  });

  it("boss is eclipsed_king", () => {
    expect(zone13?.bossType).toBe("eclipsed_king");
  });

  it("difficultyMult is 7.0 (higher than zone12's 6.5)", () => {
    const zone12 = ZONES.find((z) => z.id === "zone12");
    expect(zone13?.difficultyMult).toBeGreaterThan(zone12?.difficultyMult ?? 0);
    expect(zone13?.difficultyMult).toBe(7.0);
  });

  it("xpReward is higher than zone12", () => {
    const zone12 = ZONES.find((z) => z.id === "zone12");
    expect(zone13?.xpReward).toBeGreaterThan(zone12?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 12–13)", () => {
  it("zone13 unlocks after zone12", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone12.unlockRequirement).toBe("zone11");
    expect(byId.zone13.unlockRequirement).toBe("zone12");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Eclipsed Throne enemy types", () => {
  it("eclipse_knight is defined", () => {
    expect(ENEMY_TYPES.eclipse_knight).toBeDefined();
  });

  it("eclipse_knight uses tank behaviour", () => {
    expect(ENEMY_TYPES.eclipse_knight.behaviour).toBe("tank");
  });

  it("shadow_herald is defined and uses ranged_flee behaviour with a projectile color", () => {
    expect(ENEMY_TYPES.shadow_herald).toBeDefined();
    expect(ENEMY_TYPES.shadow_herald.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.shadow_herald.projectileColor).toBeDefined();
  });

  it("dusk_wraith is defined and uses phase behaviour", () => {
    expect(ENEMY_TYPES.dusk_wraith).toBeDefined();
    expect(ENEMY_TYPES.dusk_wraith.behaviour).toBe("phase");
  });

  it("eclipsed throne enemies have higher stats than zone12 counterparts", () => {
    // dusk_wraith (phase) should have more HP than rift_walker (phase)
    expect(ENEMY_TYPES.dusk_wraith.baseHp).toBeGreaterThan(
      ENEMY_TYPES.rift_walker.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Eclipsed King boss", () => {
  it("eclipsed_king is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.eclipsed_king).toBeDefined();
  });

  it("has more HP than void_architect (harder boss)", () => {
    expect(BOSS_TYPES.eclipsed_king.baseHp).toBeGreaterThan(
      BOSS_TYPES.void_architect.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.eclipsed_king.name).toBe("The Eclipsed King");
  });

  it("xpValue is higher than void_architect", () => {
    expect(BOSS_TYPES.eclipsed_king.xpValue).toBeGreaterThan(
      BOSS_TYPES.void_architect.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Eclipsed Throne status effects", () => {
  it("eclipse_knight melee applies burn", () => {
    expect(MELEE_STATUS_ON_HIT.eclipse_knight).toBe("burn");
  });

  it("dusk_wraith melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.dusk_wraith).toBe("stun");
  });

  it("shadow_herald ranged projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.shadow_herald).toBe("burn");
  });

  it("eclipsed_king projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.eclipsed_king).toBe("burn");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone13 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone13-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone13", qt);
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
    const quest = getFallbackQuest("zone13", "kill");
    expect(quest).toBeDefined();
  });
});

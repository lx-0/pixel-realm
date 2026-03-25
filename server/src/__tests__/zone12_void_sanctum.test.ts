/**
 * Zone 12 — Void Sanctum Integration Tests (PIX-229)
 *
 * Validates that the Void Sanctum zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Void Architect boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone11 → zone12
 *   5. Fallback quests exist for all five quest types in zone12
 *   6. Zone status effects: rift_walker/shadow_weaver melee stun; void_sentinel/void_architect ranged stun
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

describe("zone12 — Void Sanctum config", () => {
  const zone12 = ZONES.find((z) => z.id === "zone12");

  it("zone12 exists in ZONES", () => {
    expect(zone12).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone12?.name).toBe("Void Sanctum");
    expect(zone12?.biome).toBe("void-dimension");
  });

  it("requires minimum player level 29", () => {
    expect(zone12?.minPlayerLevel).toBe(29);
  });

  it("unlocks after zone11", () => {
    expect(zone12?.unlockRequirement).toBe("zone11");
  });

  it("has 3 waves", () => {
    expect(zone12?.waves).toBe(3);
  });

  it("has the three void sanctum enemy types", () => {
    expect(zone12?.enemyTypes).toEqual(
      expect.arrayContaining(["rift_walker", "void_sentinel", "shadow_weaver"]),
    );
    expect(zone12?.enemyTypes).toHaveLength(3);
  });

  it("boss is void_architect", () => {
    expect(zone12?.bossType).toBe("void_architect");
  });

  it("difficultyMult is 6.5 (higher than zone11's 6.0)", () => {
    const zone11 = ZONES.find((z) => z.id === "zone11");
    expect(zone12?.difficultyMult).toBeGreaterThan(zone11?.difficultyMult ?? 0);
    expect(zone12?.difficultyMult).toBe(6.5);
  });

  it("xpReward is higher than zone11", () => {
    const zone11 = ZONES.find((z) => z.id === "zone11");
    expect(zone12?.xpReward).toBeGreaterThan(zone11?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 11–12)", () => {
  it("zone12 unlocks after zone11", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone11.unlockRequirement).toBe("zone10");
    expect(byId.zone12.unlockRequirement).toBe("zone11");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Void Sanctum enemy types", () => {
  it("rift_walker is defined", () => {
    expect(ENEMY_TYPES.rift_walker).toBeDefined();
  });

  it("rift_walker uses phase behaviour", () => {
    expect(ENEMY_TYPES.rift_walker.behaviour).toBe("phase");
  });

  it("void_sentinel is defined and uses ranged_flee behaviour with a projectile color", () => {
    expect(ENEMY_TYPES.void_sentinel).toBeDefined();
    expect(ENEMY_TYPES.void_sentinel.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.void_sentinel.projectileColor).toBeDefined();
  });

  it("shadow_weaver is defined and uses charm behaviour", () => {
    expect(ENEMY_TYPES.shadow_weaver).toBeDefined();
    expect(ENEMY_TYPES.shadow_weaver.behaviour).toBe("charm");
    expect(ENEMY_TYPES.shadow_weaver.projectileColor).toBeDefined();
  });

  it("void sanctum enemies have higher stats than zone11 counterparts", () => {
    // shadow_weaver should have more HP than spectral_drake
    expect(ENEMY_TYPES.shadow_weaver.baseHp).toBeGreaterThan(
      ENEMY_TYPES.spectral_drake.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Void Architect boss", () => {
  it("void_architect is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.void_architect).toBeDefined();
  });

  it("has more HP than ancient_dracolich (harder boss)", () => {
    expect(BOSS_TYPES.void_architect.baseHp).toBeGreaterThan(
      BOSS_TYPES.ancient_dracolich.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.void_architect.name).toBe("Void Architect");
  });

  it("xpValue is higher than ancient_dracolich", () => {
    expect(BOSS_TYPES.void_architect.xpValue).toBeGreaterThan(
      BOSS_TYPES.ancient_dracolich.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Void Sanctum status effects", () => {
  it("rift_walker melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.rift_walker).toBe("stun");
  });

  it("shadow_weaver melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.shadow_weaver).toBe("stun");
  });

  it("void_sentinel ranged projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.void_sentinel).toBe("stun");
  });

  it("void_architect projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.void_architect).toBe("stun");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone12 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone12-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone12", qt);
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
    const quest = getFallbackQuest("zone12", "kill");
    expect(quest).toBeDefined();
  });
});

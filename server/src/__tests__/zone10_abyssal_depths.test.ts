/**
 * Zone 10 — Abyssal Depths Integration Tests (PIX-229)
 *
 * Validates that the Abyssal Depths zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Abyssal Kraken Lord boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone9 → zone10
 *   5. Fallback quests exist for all five quest types in zone10
 *   6. Zone status effects: abyssal_leviathan/coral_golem melee; deep_angler/abyssal_kraken_lord ranged
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

describe("zone10 — Abyssal Depths config", () => {
  const zone10 = ZONES.find((z) => z.id === "zone10");

  it("zone10 exists in ZONES", () => {
    expect(zone10).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone10?.name).toBe("Abyssal Depths");
    expect(zone10?.biome).toBe("Deep-Sea / Underwater");
  });

  it("requires minimum player level 23", () => {
    expect(zone10?.minPlayerLevel).toBe(23);
  });

  it("unlocks after zone9", () => {
    expect(zone10?.unlockRequirement).toBe("zone9");
  });

  it("has 3 waves", () => {
    expect(zone10?.waves).toBe(3);
  });

  it("has the three abyssal enemy types", () => {
    expect(zone10?.enemyTypes).toEqual(
      expect.arrayContaining(["deep_angler", "abyssal_leviathan", "coral_golem"]),
    );
    expect(zone10?.enemyTypes).toHaveLength(3);
  });

  it("boss is abyssal_kraken_lord", () => {
    expect(zone10?.bossType).toBe("abyssal_kraken_lord");
  });

  it("difficultyMult is 5.5 (higher than zone9's 5.0)", () => {
    const zone9 = ZONES.find((z) => z.id === "zone9");
    expect(zone10?.difficultyMult).toBeGreaterThan(zone9?.difficultyMult ?? 0);
    expect(zone10?.difficultyMult).toBe(5.5);
  });

  it("xpReward is higher than zone9", () => {
    const zone9 = ZONES.find((z) => z.id === "zone9");
    expect(zone10?.xpReward).toBeGreaterThan(zone9?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 9–10)", () => {
  it("zone10 unlocks after zone9", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone9.unlockRequirement).toBe("zone8");
    expect(byId.zone10.unlockRequirement).toBe("zone9");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Abyssal Depths enemy types", () => {
  it("deep_angler is defined", () => {
    expect(ENEMY_TYPES.deep_angler).toBeDefined();
  });

  it("deep_angler uses ranged_flee behaviour with a projectile color", () => {
    expect(ENEMY_TYPES.deep_angler.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.deep_angler.projectileColor).toBeDefined();
  });

  it("abyssal_leviathan is defined and uses chase behaviour", () => {
    expect(ENEMY_TYPES.abyssal_leviathan).toBeDefined();
    expect(ENEMY_TYPES.abyssal_leviathan.behaviour).toBe("chase");
  });

  it("coral_golem is defined and uses tank behaviour", () => {
    expect(ENEMY_TYPES.coral_golem).toBeDefined();
    expect(ENEMY_TYPES.coral_golem.behaviour).toBe("tank");
  });

  it("abyssal depths enemies have higher xpValue than zone9 counterparts", () => {
    // deep_angler xpValue should exceed astral_beast xpValue
    expect(ENEMY_TYPES.deep_angler.xpValue).toBeGreaterThan(
      ENEMY_TYPES.astral_beast.xpValue,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Abyssal Kraken Lord boss", () => {
  it("abyssal_kraken_lord is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.abyssal_kraken_lord).toBeDefined();
  });

  it("has more HP than celestial_arbiter (harder boss)", () => {
    expect(BOSS_TYPES.abyssal_kraken_lord.baseHp).toBeGreaterThan(
      BOSS_TYPES.celestial_arbiter.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.abyssal_kraken_lord.name).toBe("Abyssal Kraken Lord");
  });

  it("xpValue is higher than celestial_arbiter", () => {
    expect(BOSS_TYPES.abyssal_kraken_lord.xpValue).toBeGreaterThan(
      BOSS_TYPES.celestial_arbiter.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Abyssal Depths status effects", () => {
  it("abyssal_leviathan melee applies poison", () => {
    expect(MELEE_STATUS_ON_HIT.abyssal_leviathan).toBe("poison");
  });

  it("coral_golem melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.coral_golem).toBe("stun");
  });

  it("deep_angler ranged projectile applies freeze", () => {
    expect(PROJECTILE_STATUS_ON_HIT.deep_angler).toBe("freeze");
  });

  it("abyssal_kraken_lord projectile applies poison", () => {
    expect(PROJECTILE_STATUS_ON_HIT.abyssal_kraken_lord).toBe("poison");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone10 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone10-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone10", qt);
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
    const quest = getFallbackQuest("zone10", "kill");
    expect(quest).toBeDefined();
  });
});

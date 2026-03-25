/**
 * Zone 11 — Dragonbone Wastes Integration Tests (PIX-229)
 *
 * Validates that the Dragonbone Wastes zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Ancient Dracolich boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone10 → zone11
 *   5. Fallback quests exist for all five quest types in zone11
 *   6. Zone status effects: bone_revenant/spectral_drake melee; ashwyrm/ancient_dracolich ranged
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

describe("zone11 — Dragonbone Wastes config", () => {
  const zone11 = ZONES.find((z) => z.id === "zone11");

  it("zone11 exists in ZONES", () => {
    expect(zone11).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone11?.name).toBe("Dragonbone Wastes");
    expect(zone11?.biome).toBe("bone-wasteland");
  });

  it("requires minimum player level 26", () => {
    expect(zone11?.minPlayerLevel).toBe(26);
  });

  it("unlocks after zone10", () => {
    expect(zone11?.unlockRequirement).toBe("zone10");
  });

  it("has 3 waves", () => {
    expect(zone11?.waves).toBe(3);
  });

  it("has the three dragonbone enemy types", () => {
    expect(zone11?.enemyTypes).toEqual(
      expect.arrayContaining(["bone_revenant", "ashwyrm", "spectral_drake"]),
    );
    expect(zone11?.enemyTypes).toHaveLength(3);
  });

  it("boss is ancient_dracolich", () => {
    expect(zone11?.bossType).toBe("ancient_dracolich");
  });

  it("difficultyMult is 6.0 (higher than zone10's 5.5)", () => {
    const zone10 = ZONES.find((z) => z.id === "zone10");
    expect(zone11?.difficultyMult).toBeGreaterThan(zone10?.difficultyMult ?? 0);
    expect(zone11?.difficultyMult).toBe(6.0);
  });

  it("xpReward is higher than zone10", () => {
    const zone10 = ZONES.find((z) => z.id === "zone10");
    expect(zone11?.xpReward).toBeGreaterThan(zone10?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 10–11)", () => {
  it("zone11 unlocks after zone10", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone10.unlockRequirement).toBe("zone9");
    expect(byId.zone11.unlockRequirement).toBe("zone10");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Dragonbone Wastes enemy types", () => {
  it("bone_revenant is defined", () => {
    expect(ENEMY_TYPES.bone_revenant).toBeDefined();
  });

  it("bone_revenant uses chase behaviour", () => {
    expect(ENEMY_TYPES.bone_revenant.behaviour).toBe("chase");
  });

  it("ashwyrm is defined and uses ranged_flee behaviour with a projectile color", () => {
    expect(ENEMY_TYPES.ashwyrm).toBeDefined();
    expect(ENEMY_TYPES.ashwyrm.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.ashwyrm.projectileColor).toBeDefined();
  });

  it("spectral_drake is defined and uses chase behaviour", () => {
    expect(ENEMY_TYPES.spectral_drake).toBeDefined();
    expect(ENEMY_TYPES.spectral_drake.behaviour).toBe("chase");
  });

  it("dragonbone wastes enemies have higher xpValue than zone10 counterparts", () => {
    // ashwyrm xpValue should exceed deep_angler xpValue
    expect(ENEMY_TYPES.ashwyrm.xpValue).toBeGreaterThan(
      ENEMY_TYPES.deep_angler.xpValue,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Ancient Dracolich boss", () => {
  it("ancient_dracolich is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.ancient_dracolich).toBeDefined();
  });

  it("has more HP than abyssal_kraken_lord (harder boss)", () => {
    expect(BOSS_TYPES.ancient_dracolich.baseHp).toBeGreaterThan(
      BOSS_TYPES.abyssal_kraken_lord.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.ancient_dracolich.name).toBe("Ancient Dracolich");
  });

  it("xpValue is higher than abyssal_kraken_lord", () => {
    expect(BOSS_TYPES.ancient_dracolich.xpValue).toBeGreaterThan(
      BOSS_TYPES.abyssal_kraken_lord.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Dragonbone Wastes status effects", () => {
  it("bone_revenant melee applies poison", () => {
    expect(MELEE_STATUS_ON_HIT.bone_revenant).toBe("poison");
  });

  it("spectral_drake melee applies burn", () => {
    expect(MELEE_STATUS_ON_HIT.spectral_drake).toBe("burn");
  });

  it("ashwyrm ranged projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.ashwyrm).toBe("burn");
  });

  it("ancient_dracolich projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.ancient_dracolich).toBe("burn");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone11 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone11-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone11", qt);
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
    const quest = getFallbackQuest("zone11", "kill");
    expect(quest).toBeDefined();
  });
});

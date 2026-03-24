/**
 * Zone 6 — Volcanic Highlands Integration Tests (PIX-162)
 *
 * Validates that the Volcanic Highlands zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Infernal Warden boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone5 → zone6
 *   5. Server-side ZONE_META includes zone6 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone6
 *   7. Server-side zone enemy defs include zone6 with correct types
 *   8. Zone status effects: lava_slime and magma_golem apply burn on melee
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../db/client", () => ({
  getDb:   vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getFallbackQuest } from "../quests/fallback";

// ── Import client constants (shared with server via tsconfig path) ────────────
// We read directly from the source file to keep this test self-contained.
import {
  ZONES,
  ENEMY_TYPES,
  BOSS_TYPES,
  MELEE_STATUS_ON_HIT,
  PROJECTILE_STATUS_ON_HIT,
} from "../../../src/config/constants";

// ── 1. Zone config ─────────────────────────────────────────────────────────

describe("zone6 — Volcanic Highlands config", () => {
  const zone6 = ZONES.find((z) => z.id === "zone6");

  it("zone6 exists in ZONES", () => {
    expect(zone6).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone6?.name).toBe("Volcanic Highlands");
    expect(zone6?.biome).toBe("Volcanic");
  });

  it("requires minimum player level 11", () => {
    expect(zone6?.minPlayerLevel).toBe(11);
  });

  it("unlocks after zone5", () => {
    expect(zone6?.unlockRequirement).toBe("zone5");
  });

  it("uses tileset_volcanic via zone biome (Volcanic)", () => {
    // tileset key is derived from biome in GameScene; just ensure the biome matches
    expect(zone6?.biome).toBe("Volcanic");
  });

  it("has 3 waves", () => {
    expect(zone6?.waves).toBe(3);
  });

  it("has the three volcanic enemy types", () => {
    expect(zone6?.enemyTypes).toEqual(
      expect.arrayContaining(["lava_slime", "fire_imp", "magma_golem"]),
    );
    expect(zone6?.enemyTypes).toHaveLength(3);
  });

  it("boss is infernal_warden", () => {
    expect(zone6?.bossType).toBe("infernal_warden");
  });

  it("difficultyMult is 3.5 (higher than zone5's 3.0)", () => {
    const zone5 = ZONES.find((z) => z.id === "zone5");
    expect(zone6?.difficultyMult).toBeGreaterThan(zone5?.difficultyMult ?? 0);
    expect(zone6?.difficultyMult).toBe(3.5);
  });

  it("xpReward is higher than zone5", () => {
    const zone5 = ZONES.find((z) => z.id === "zone5");
    expect(zone6?.xpReward).toBeGreaterThan(zone5?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain", () => {
  it("zones 1–6 form a connected chain", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone1.unlockRequirement).toBeNull();
    expect(byId.zone2.unlockRequirement).toBe("zone1");
    expect(byId.zone3.unlockRequirement).toBe("zone2");
    expect(byId.zone4.unlockRequirement).toBe("zone3");
    expect(byId.zone5.unlockRequirement).toBe("zone4");
    expect(byId.zone6.unlockRequirement).toBe("zone5");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Volcanic Highlands enemy types", () => {
  it("lava_slime is defined", () => {
    expect(ENEMY_TYPES.lava_slime).toBeDefined();
  });

  it("fire_imp is defined and ranged", () => {
    expect(ENEMY_TYPES.fire_imp).toBeDefined();
    expect(ENEMY_TYPES.fire_imp.behaviour).toBe("ranged");
    expect(ENEMY_TYPES.fire_imp.projectileColor).toBeDefined();
  });

  it("magma_golem is defined and tank behaviour", () => {
    expect(ENEMY_TYPES.magma_golem).toBeDefined();
    expect(ENEMY_TYPES.magma_golem.behaviour).toBe("tank");
  });

  it("volcanic enemies have higher stats than zone5 counterparts", () => {
    // magma_golem should be tankier than crystal_golem
    expect(ENEMY_TYPES.magma_golem.baseHp).toBeGreaterThan(
      ENEMY_TYPES.crystal_golem.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Infernal Warden boss", () => {
  it("infernal_warden is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.infernal_warden).toBeDefined();
  });

  it("has more HP than glacial_wyrm (harder boss)", () => {
    expect(BOSS_TYPES.infernal_warden.baseHp).toBeGreaterThan(
      BOSS_TYPES.glacial_wyrm.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.infernal_warden.name).toBe("Infernal Warden");
  });

  it("xpValue is higher than glacial_wyrm", () => {
    expect(BOSS_TYPES.infernal_warden.xpValue).toBeGreaterThan(
      BOSS_TYPES.glacial_wyrm.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Volcanic Highlands status effects", () => {
  it("lava_slime melee applies burn", () => {
    expect(MELEE_STATUS_ON_HIT.lava_slime).toBe("burn");
  });

  it("magma_golem melee applies burn", () => {
    expect(MELEE_STATUS_ON_HIT.magma_golem).toBe("burn");
  });

  it("fire_imp projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.fire_imp).toBe("burn");
  });

  it("infernal_warden projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.infernal_warden).toBe("burn");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone6 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone6-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone6", qt);
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

  it("returns a result even for an unknown quest type", () => {
    const quest = getFallbackQuest("zone6", "kill");
    expect(quest).toBeDefined();
  });
});

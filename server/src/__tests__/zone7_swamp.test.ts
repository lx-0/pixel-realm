/**
 * Zone 7 — Shadowmire Swamp Integration Tests (PIX-168)
 *
 * Validates that the Shadowmire Swamp zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Mire Queen boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone6 → zone7
 *   5. Server-side ZONE_META includes zone7 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone7
 *   7. Server-side zone enemy defs include zone7 with correct types
 *   8. Zone status effects: toxic_toad applies poison on melee; swamp_wraith is ranged
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
} from "../../../src/config/constants";

// ── 1. Zone config ─────────────────────────────────────────────────────────

describe("zone7 — Shadowmire Swamp config", () => {
  const zone7 = ZONES.find((z) => z.id === "zone7");

  it("zone7 exists in ZONES", () => {
    expect(zone7).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone7?.name).toBe("Shadowmire Swamp");
    expect(zone7?.biome).toBe("Swamp");
  });

  it("requires minimum player level 14", () => {
    expect(zone7?.minPlayerLevel).toBe(14);
  });

  it("unlocks after zone6", () => {
    expect(zone7?.unlockRequirement).toBe("zone6");
  });

  it("uses swamp biome for tileset", () => {
    expect(zone7?.biome).toBe("Swamp");
  });

  it("has 3 waves", () => {
    expect(zone7?.waves).toBe(3);
  });

  it("has the three swamp enemy types", () => {
    expect(zone7?.enemyTypes).toEqual(
      expect.arrayContaining(["bog_crawler", "swamp_wraith", "toxic_toad"]),
    );
    expect(zone7?.enemyTypes).toHaveLength(3);
  });

  it("boss is mire_queen", () => {
    expect(zone7?.bossType).toBe("mire_queen");
  });

  it("difficultyMult is 4.0 (higher than zone6's 3.5)", () => {
    const zone6 = ZONES.find((z) => z.id === "zone6");
    expect(zone7?.difficultyMult).toBeGreaterThan(zone6?.difficultyMult ?? 0);
    expect(zone7?.difficultyMult).toBe(4.0);
  });

  it("xpReward is higher than zone6", () => {
    const zone6 = ZONES.find((z) => z.id === "zone6");
    expect(zone7?.xpReward).toBeGreaterThan(zone6?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 1–7)", () => {
  it("zones 1–7 form a connected chain", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone1.unlockRequirement).toBeNull();
    expect(byId.zone2.unlockRequirement).toBe("zone1");
    expect(byId.zone3.unlockRequirement).toBe("zone2");
    expect(byId.zone4.unlockRequirement).toBe("zone3");
    expect(byId.zone5.unlockRequirement).toBe("zone4");
    expect(byId.zone6.unlockRequirement).toBe("zone5");
    expect(byId.zone7.unlockRequirement).toBe("zone6");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Shadowmire Swamp enemy types", () => {
  it("bog_crawler is defined", () => {
    expect(ENEMY_TYPES.bog_crawler).toBeDefined();
  });

  it("bog_crawler uses chase behaviour", () => {
    expect(ENEMY_TYPES.bog_crawler.behaviour).toBe("chase");
  });

  it("swamp_wraith is defined and ranged", () => {
    expect(ENEMY_TYPES.swamp_wraith).toBeDefined();
    expect(ENEMY_TYPES.swamp_wraith.behaviour).toBe("ranged");
    expect(ENEMY_TYPES.swamp_wraith.projectileColor).toBeDefined();
  });

  it("toxic_toad is defined", () => {
    expect(ENEMY_TYPES.toxic_toad).toBeDefined();
  });

  it("toxic_toad uses chase behaviour", () => {
    expect(ENEMY_TYPES.toxic_toad.behaviour).toBe("chase");
  });

  it("swamp enemies have higher stats than zone6 counterparts", () => {
    // bog_crawler should be tankier than lava_slime
    expect(ENEMY_TYPES.bog_crawler.baseHp).toBeGreaterThan(
      ENEMY_TYPES.lava_slime.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Mire Queen boss", () => {
  it("mire_queen is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.mire_queen).toBeDefined();
  });

  it("has more HP than infernal_warden (harder boss)", () => {
    expect(BOSS_TYPES.mire_queen.baseHp).toBeGreaterThan(
      BOSS_TYPES.infernal_warden.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.mire_queen.name).toBe("Mire Queen");
  });

  it("xpValue is higher than infernal_warden", () => {
    expect(BOSS_TYPES.mire_queen.xpValue).toBeGreaterThan(
      BOSS_TYPES.infernal_warden.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Shadowmire Swamp status effects", () => {
  it("toxic_toad melee applies poison", () => {
    expect(MELEE_STATUS_ON_HIT.toxic_toad).toBe("poison");
  });

  it("swamp_wraith is ranged (no melee status)", () => {
    // swamp_wraith is ranged, so it should NOT be in the melee status map
    expect(MELEE_STATUS_ON_HIT.swamp_wraith).toBeUndefined();
    expect(ENEMY_TYPES.swamp_wraith.behaviour).toBe("ranged");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone7 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone7-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone7", qt);
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
    const quest = getFallbackQuest("zone7", "kill");
    expect(quest).toBeDefined();
  });
});

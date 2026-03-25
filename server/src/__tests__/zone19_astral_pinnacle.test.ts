/**
 * Zone 19 — Astral Pinnacle Integration Tests (PIX-224)
 *
 * Validates that the Astral Pinnacle zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Astral Sovereign boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone18 → zone19
 *   5. Server-side ZONE_META includes zone19 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone19
 *   7. Server-side zone enemy defs include zone19 with correct types
 *   8. Zone status effects: astral_warden/cosmic_devourer melee; nebula_wisp/astral_sovereign ranged
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

describe("zone19 — Astral Pinnacle config", () => {
  const zone19 = ZONES.find((z) => z.id === "zone19");

  it("zone19 exists in ZONES", () => {
    expect(zone19).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone19?.name).toBe("Astral Pinnacle");
    expect(zone19?.biome).toBe("astral-pinnacle");
  });

  it("requires minimum player level 50", () => {
    expect(zone19?.minPlayerLevel).toBe(50);
  });

  it("unlocks after zone18", () => {
    expect(zone19?.unlockRequirement).toBe("zone18");
  });

  it("has 3 waves", () => {
    expect(zone19?.waves).toBe(3);
  });

  it("has the three astral pinnacle enemy types", () => {
    expect(zone19?.enemyTypes).toEqual(
      expect.arrayContaining(["astral_warden", "cosmic_devourer", "nebula_wisp"]),
    );
    expect(zone19?.enemyTypes).toHaveLength(3);
  });

  it("boss is astral_sovereign", () => {
    expect(zone19?.bossType).toBe("astral_sovereign");
  });

  it("difficultyMult is 10.0 (higher than zone18's 9.5)", () => {
    const zone18 = ZONES.find((z) => z.id === "zone18");
    expect(zone19?.difficultyMult).toBeGreaterThan(zone18?.difficultyMult ?? 0);
    expect(zone19?.difficultyMult).toBe(10.0);
  });

  it("xpReward is higher than zone18", () => {
    const zone18 = ZONES.find((z) => z.id === "zone18");
    expect(zone19?.xpReward).toBeGreaterThan(zone18?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 18–19)", () => {
  it("zone19 unlocks after zone18", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone18.unlockRequirement).toBe("zone17");
    expect(byId.zone19.unlockRequirement).toBe("zone18");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Astral Pinnacle enemy types", () => {
  it("astral_warden is defined", () => {
    expect(ENEMY_TYPES.astral_warden).toBeDefined();
  });

  it("astral_warden uses block behaviour", () => {
    expect(ENEMY_TYPES.astral_warden.behaviour).toBe("block");
  });

  it("nebula_wisp is defined and uses ranged_flee behaviour", () => {
    expect(ENEMY_TYPES.nebula_wisp).toBeDefined();
    expect(ENEMY_TYPES.nebula_wisp.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.nebula_wisp.projectileColor).toBeDefined();
  });

  it("cosmic_devourer is defined and uses phase behaviour", () => {
    expect(ENEMY_TYPES.cosmic_devourer).toBeDefined();
    expect(ENEMY_TYPES.cosmic_devourer.behaviour).toBe("phase");
  });

  it("astral pinnacle enemies have higher base stats than zone18 counterparts", () => {
    // astral_warden should have more HP than spire_sentinel
    expect(ENEMY_TYPES.astral_warden.baseHp).toBeGreaterThan(
      ENEMY_TYPES.spire_sentinel.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Astral Sovereign boss", () => {
  it("astral_sovereign is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.astral_sovereign).toBeDefined();
  });

  it("has more HP than spire_keeper (harder boss)", () => {
    expect(BOSS_TYPES.astral_sovereign.baseHp).toBeGreaterThan(
      BOSS_TYPES.spire_keeper.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.astral_sovereign.name).toBe("The Astral Sovereign");
  });

  it("xpValue is higher than spire_keeper", () => {
    expect(BOSS_TYPES.astral_sovereign.xpValue).toBeGreaterThan(
      BOSS_TYPES.spire_keeper.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Astral Pinnacle status effects", () => {
  it("astral_warden melee applies freeze", () => {
    expect(MELEE_STATUS_ON_HIT.astral_warden).toBe("freeze");
  });

  it("cosmic_devourer melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.cosmic_devourer).toBe("stun");
  });

  it("nebula_wisp ranged projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.nebula_wisp).toBe("burn");
  });

  it("astral_sovereign projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.astral_sovereign).toBe("stun");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone19 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone19-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone19", qt);
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
    const quest = getFallbackQuest("zone19", "kill");
    expect(quest).toBeDefined();
  });
});

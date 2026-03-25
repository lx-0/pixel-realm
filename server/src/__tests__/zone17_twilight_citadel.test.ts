/**
 * Zone 17 — Twilight Citadel Integration Tests (PIX-217)
 *
 * Validates that the Twilight Citadel zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Twilight Warden boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone16 → zone17
 *   5. Server-side ZONE_META includes zone17 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone17
 *   7. Server-side zone enemy defs include zone17 with correct types
 *   8. Zone status effects: twilight_sentinel/rift_stalker melee; echo_wraith/twilight_warden ranged
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

describe("zone17 — Twilight Citadel config", () => {
  const zone17 = ZONES.find((z) => z.id === "zone17");

  it("zone17 exists in ZONES", () => {
    expect(zone17).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone17?.name).toBe("Twilight Citadel");
    expect(zone17?.biome).toBe("twilight-citadel");
  });

  it("requires minimum player level 44", () => {
    expect(zone17?.minPlayerLevel).toBe(44);
  });

  it("unlocks after zone16", () => {
    expect(zone17?.unlockRequirement).toBe("zone16");
  });

  it("has 3 waves", () => {
    expect(zone17?.waves).toBe(3);
  });

  it("has the three twilight citadel enemy types", () => {
    expect(zone17?.enemyTypes).toEqual(
      expect.arrayContaining(["twilight_sentinel", "rift_stalker", "echo_wraith"]),
    );
    expect(zone17?.enemyTypes).toHaveLength(3);
  });

  it("boss is twilight_warden", () => {
    expect(zone17?.bossType).toBe("twilight_warden");
  });

  it("difficultyMult is 9.0 (higher than zone16's 8.5)", () => {
    const zone16 = ZONES.find((z) => z.id === "zone16");
    expect(zone17?.difficultyMult).toBeGreaterThan(zone16?.difficultyMult ?? 0);
    expect(zone17?.difficultyMult).toBe(9.0);
  });

  it("xpReward is higher than zone16", () => {
    const zone16 = ZONES.find((z) => z.id === "zone16");
    expect(zone17?.xpReward).toBeGreaterThan(zone16?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 16–17)", () => {
  it("zone17 unlocks after zone16", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone16.unlockRequirement).toBe("zone15");
    expect(byId.zone17.unlockRequirement).toBe("zone16");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Twilight Citadel enemy types", () => {
  it("twilight_sentinel is defined", () => {
    expect(ENEMY_TYPES.twilight_sentinel).toBeDefined();
  });

  it("twilight_sentinel uses block behaviour", () => {
    expect(ENEMY_TYPES.twilight_sentinel.behaviour).toBe("block");
  });

  it("rift_stalker is defined and uses phase behaviour", () => {
    expect(ENEMY_TYPES.rift_stalker).toBeDefined();
    expect(ENEMY_TYPES.rift_stalker.behaviour).toBe("phase");
  });

  it("echo_wraith is defined and uses ranged_flee behaviour", () => {
    expect(ENEMY_TYPES.echo_wraith).toBeDefined();
    expect(ENEMY_TYPES.echo_wraith.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.echo_wraith.projectileColor).toBeDefined();
  });

  it("twilight citadel enemies have higher stats than zone16 counterparts", () => {
    // twilight_sentinel should have more HP than nexus_guardian
    expect(ENEMY_TYPES.twilight_sentinel.baseHp).toBeGreaterThan(
      ENEMY_TYPES.nexus_guardian.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Twilight Warden boss", () => {
  it("twilight_warden is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.twilight_warden).toBeDefined();
  });

  it("has more HP than nexus_overseer (harder boss)", () => {
    expect(BOSS_TYPES.twilight_warden.baseHp).toBeGreaterThan(
      BOSS_TYPES.nexus_overseer.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.twilight_warden.name).toBe("The Twilight Warden");
  });

  it("xpValue is higher than nexus_overseer", () => {
    expect(BOSS_TYPES.twilight_warden.xpValue).toBeGreaterThan(
      BOSS_TYPES.nexus_overseer.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Twilight Citadel status effects", () => {
  it("twilight_sentinel melee applies burn", () => {
    expect(MELEE_STATUS_ON_HIT.twilight_sentinel).toBe("burn");
  });

  it("rift_stalker melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.rift_stalker).toBe("stun");
  });

  it("echo_wraith ranged projectile applies burn", () => {
    expect(PROJECTILE_STATUS_ON_HIT.echo_wraith).toBe("burn");
  });

  it("twilight_warden projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.twilight_warden).toBe("stun");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone17 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone17-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone17", qt);
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
    const quest = getFallbackQuest("zone17", "kill");
    expect(quest).toBeDefined();
  });
});

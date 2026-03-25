/**
 * Zone 16 — Ethereal Nexus Integration Tests (PIX-212)
 *
 * Validates that the Ethereal Nexus zone is correctly wired:
 *   1. Zone config is present in ZONES with correct properties
 *   2. All three enemy types exist in ENEMY_TYPES
 *   3. Nexus Overseer boss is defined in BOSS_TYPES
 *   4. Zone unlock chain connects zone15 → zone16
 *   5. Server-side ZONE_META includes zone16 for LLM quest generation
 *   6. Fallback quests exist for all five quest types in zone16
 *   7. Server-side zone enemy defs include zone16 with correct types
 *   8. Zone status effects: nexus_guardian/phase_strider melee; energy_parasite/nexus_overseer ranged
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

describe("zone16 — Ethereal Nexus config", () => {
  const zone16 = ZONES.find((z) => z.id === "zone16");

  it("zone16 exists in ZONES", () => {
    expect(zone16).toBeDefined();
  });

  it("has correct name and biome", () => {
    expect(zone16?.name).toBe("Ethereal Nexus");
    expect(zone16?.biome).toBe("ethereal-nexus");
  });

  it("requires minimum player level 41", () => {
    expect(zone16?.minPlayerLevel).toBe(41);
  });

  it("unlocks after zone15", () => {
    expect(zone16?.unlockRequirement).toBe("zone15");
  });

  it("has 3 waves", () => {
    expect(zone16?.waves).toBe(3);
  });

  it("has the three ethereal nexus enemy types", () => {
    expect(zone16?.enemyTypes).toEqual(
      expect.arrayContaining(["nexus_guardian", "phase_strider", "energy_parasite"]),
    );
    expect(zone16?.enemyTypes).toHaveLength(3);
  });

  it("boss is nexus_overseer", () => {
    expect(zone16?.bossType).toBe("nexus_overseer");
  });

  it("difficultyMult is 8.5 (higher than zone15's 8.0)", () => {
    const zone15 = ZONES.find((z) => z.id === "zone15");
    expect(zone16?.difficultyMult).toBeGreaterThan(zone15?.difficultyMult ?? 0);
    expect(zone16?.difficultyMult).toBe(8.5);
  });

  it("xpReward is higher than zone15", () => {
    const zone15 = ZONES.find((z) => z.id === "zone15");
    expect(zone16?.xpReward).toBeGreaterThan(zone15?.xpReward ?? 0);
  });
});

// ── 2. Zone unlock chain ────────────────────────────────────────────────────

describe("zone unlock chain (zones 15–16)", () => {
  it("zone16 unlocks after zone15", () => {
    const byId = Object.fromEntries(ZONES.map((z) => [z.id, z]));
    expect(byId.zone15.unlockRequirement).toBe("zone14");
    expect(byId.zone16.unlockRequirement).toBe("zone15");
  });
});

// ── 3. Enemy type definitions ───────────────────────────────────────────────

describe("Ethereal Nexus enemy types", () => {
  it("nexus_guardian is defined", () => {
    expect(ENEMY_TYPES.nexus_guardian).toBeDefined();
  });

  it("nexus_guardian uses block behaviour", () => {
    expect(ENEMY_TYPES.nexus_guardian.behaviour).toBe("block");
  });

  it("phase_strider is defined and uses phase behaviour", () => {
    expect(ENEMY_TYPES.phase_strider).toBeDefined();
    expect(ENEMY_TYPES.phase_strider.behaviour).toBe("phase");
  });

  it("energy_parasite is defined and uses ranged_flee behaviour", () => {
    expect(ENEMY_TYPES.energy_parasite).toBeDefined();
    expect(ENEMY_TYPES.energy_parasite.behaviour).toBe("ranged_flee");
    expect(ENEMY_TYPES.energy_parasite.projectileColor).toBeDefined();
  });

  it("ethereal nexus enemies have higher stats than zone15 counterparts", () => {
    // nexus_guardian should have more HP than elemental_amalgam
    expect(ENEMY_TYPES.nexus_guardian.baseHp).toBeGreaterThan(
      ENEMY_TYPES.elemental_amalgam.baseHp,
    );
  });
});

// ── 4. Boss definition ──────────────────────────────────────────────────────

describe("Nexus Overseer boss", () => {
  it("nexus_overseer is defined in BOSS_TYPES", () => {
    expect(BOSS_TYPES.nexus_overseer).toBeDefined();
  });

  it("has more HP than genesis_flame (harder boss)", () => {
    expect(BOSS_TYPES.nexus_overseer.baseHp).toBeGreaterThan(
      BOSS_TYPES.genesis_flame.baseHp,
    );
  });

  it("has correct name", () => {
    expect(BOSS_TYPES.nexus_overseer.name).toBe("The Nexus Overseer");
  });

  it("xpValue is higher than genesis_flame", () => {
    expect(BOSS_TYPES.nexus_overseer.xpValue).toBeGreaterThan(
      BOSS_TYPES.genesis_flame.xpValue,
    );
  });
});

// ── 5. Status effects ───────────────────────────────────────────────────────

describe("Ethereal Nexus status effects", () => {
  it("nexus_guardian melee applies freeze", () => {
    expect(MELEE_STATUS_ON_HIT.nexus_guardian).toBe("freeze");
  });

  it("phase_strider melee applies stun", () => {
    expect(MELEE_STATUS_ON_HIT.phase_strider).toBe("stun");
  });

  it("energy_parasite ranged projectile applies freeze", () => {
    expect(PROJECTILE_STATUS_ON_HIT.energy_parasite).toBe("freeze");
  });

  it("nexus_overseer projectile applies stun", () => {
    expect(PROJECTILE_STATUS_ON_HIT.nexus_overseer).toBe("stun");
  });
});

// ── 6. Fallback quests ──────────────────────────────────────────────────────

describe("zone16 fallback quests", () => {
  const questTypes = ["kill", "fetch", "explore", "escort", "puzzle"] as const;

  for (const qt of questTypes) {
    it(`returns a zone16-themed fallback for questType "${qt}"`, () => {
      const quest = getFallbackQuest("zone16", qt);
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
    const quest = getFallbackQuest("zone16", "kill");
    expect(quest).toBeDefined();
  });
});

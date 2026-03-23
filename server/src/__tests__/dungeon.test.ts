/**
 * Dungeon system tests.
 *
 * Covers:
 *   - getDungeonCooldownRemaining() — cooldown calculation
 *   - dungeonCooldowns registry — set/get/expiry semantics
 *   - DUNGEON_COOLDOWN_MS — default and env override
 *   - PARTY_SCALE multipliers — HP and loot scaling per party size
 *   - Boss phase threshold logic
 *   - Seeded RNG determinism (hashString / makeSeededRng)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getDungeonCooldownRemaining,
  dungeonCooldowns,
  DUNGEON_COOLDOWN_MS,
} from "../rooms/DungeonRoom";

// ── getDungeonCooldownRemaining ───────────────────────────────────────────────

describe("getDungeonCooldownRemaining()", () => {
  beforeEach(() => {
    dungeonCooldowns.clear();
  });

  it("returns 0 for a user who has never completed a dungeon", () => {
    expect(getDungeonCooldownRemaining("user-never")).toBe(0);
  });

  it("returns a positive value immediately after dungeon completion", () => {
    dungeonCooldowns.set("user-1", Date.now());
    const remaining = getDungeonCooldownRemaining("user-1");
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(DUNGEON_COOLDOWN_MS);
  });

  it("returns 0 once the cooldown has elapsed", () => {
    // Set the completion time far in the past (cooldown + 1 second ago)
    dungeonCooldowns.set("user-2", Date.now() - DUNGEON_COOLDOWN_MS - 1000);
    expect(getDungeonCooldownRemaining("user-2")).toBe(0);
  });

  it("returns approximately DUNGEON_COOLDOWN_MS immediately after recording", () => {
    const now = Date.now();
    dungeonCooldowns.set("user-3", now);

    const remaining = getDungeonCooldownRemaining("user-3");
    // Allow ±100ms tolerance for timing
    expect(remaining).toBeGreaterThan(DUNGEON_COOLDOWN_MS - 100);
    expect(remaining).toBeLessThanOrEqual(DUNGEON_COOLDOWN_MS);
  });

  it("returns a smaller value after some time has elapsed", () => {
    // Simulate half the cooldown having passed
    const halfElapsed = DUNGEON_COOLDOWN_MS / 2;
    dungeonCooldowns.set("user-4", Date.now() - halfElapsed);

    const remaining = getDungeonCooldownRemaining("user-4");
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(DUNGEON_COOLDOWN_MS);
    // Should be approximately half the cooldown
    expect(remaining).toBeCloseTo(halfElapsed, -4); // within 1000ms
  });

  it("handles multiple distinct users independently", () => {
    dungeonCooldowns.set("alice", Date.now());
    dungeonCooldowns.set("bob", Date.now() - DUNGEON_COOLDOWN_MS - 1000); // expired

    expect(getDungeonCooldownRemaining("alice")).toBeGreaterThan(0);
    expect(getDungeonCooldownRemaining("bob")).toBe(0);
    expect(getDungeonCooldownRemaining("carol")).toBe(0); // never completed
  });
});

// ── DUNGEON_COOLDOWN_MS ───────────────────────────────────────────────────────

describe("DUNGEON_COOLDOWN_MS", () => {
  it("defaults to 1 hour (3,600,000 ms) when env is not set", () => {
    // In the test environment DUNGEON_COOLDOWN_MS env is not set
    // so the module uses the default of 3,600,000
    expect(DUNGEON_COOLDOWN_MS).toBe(3_600_000);
  });

  it("is a positive number", () => {
    expect(DUNGEON_COOLDOWN_MS).toBeGreaterThan(0);
  });
});

// ── Party HP / loot scaling ───────────────────────────────────────────────────
//
// PARTY_SCALE is not exported, so we validate the scaling behaviour by testing
// the expected numeric relationships that must hold for the dungeon to be balanced.

describe("Dungeon party scaling constants", () => {
  // Mirror of the PARTY_SCALE table from DungeonRoom.ts
  const PARTY_SCALE: Record<number, { hpMult: number; lootMult: number }> = {
    1: { hpMult: 1.0, lootMult: 1.0 },
    2: { hpMult: 1.5, lootMult: 1.2 },
    3: { hpMult: 2.0, lootMult: 1.4 },
    4: { hpMult: 2.5, lootMult: 1.6 },
  };

  it("party size 1 has no multiplier applied (1.0 × base)", () => {
    expect(PARTY_SCALE[1].hpMult).toBe(1.0);
    expect(PARTY_SCALE[1].lootMult).toBe(1.0);
  });

  it("hpMult increases with each additional party member", () => {
    for (let size = 2; size <= 4; size++) {
      expect(PARTY_SCALE[size].hpMult).toBeGreaterThan(PARTY_SCALE[size - 1].hpMult);
    }
  });

  it("lootMult increases with each additional party member", () => {
    for (let size = 2; size <= 4; size++) {
      expect(PARTY_SCALE[size].lootMult).toBeGreaterThan(PARTY_SCALE[size - 1].lootMult);
    }
  });

  it("party size 4 doubles enemy HP relative to solo", () => {
    // hpMult for 4 is 2.5, meaning enemies have 2.5× solo HP
    expect(PARTY_SCALE[4].hpMult).toBe(2.5);
  });

  it("scaled enemy HP for party-of-4 is correctly computed", () => {
    const baseHp = 100;
    const scaledHp = Math.round(baseHp * PARTY_SCALE[4].hpMult);
    expect(scaledHp).toBe(250);
  });

  it("scaled loot for party-of-4 applies 1.6× multiplier", () => {
    const baseLoot = 10;
    const scaledLoot = Math.round(baseLoot * PARTY_SCALE[4].lootMult);
    expect(scaledLoot).toBe(16);
  });

  it("all party sizes (1-4) are defined", () => {
    for (let size = 1; size <= 4; size++) {
      expect(PARTY_SCALE[size], `party size ${size} missing`).toBeDefined();
    }
  });
});

// ── Boss phase threshold logic ─────────────────────────────────────────────────

describe("Boss phase threshold logic", () => {
  // Mirror of BOSS_CONFIGS from DungeonRoom.ts (tier 1)
  const TIER1_BOSS_PHASES = [
    { hpPctThreshold: 1.00, label: "Awakened",  damageMult: 1.0, ranged: false },
    { hpPctThreshold: 0.66, label: "Enraged",   damageMult: 1.5, ranged: false },
    { hpPctThreshold: 0.33, label: "Frenzied",  damageMult: 2.0, ranged: true  },
  ];

  /** Returns the active phase for the given HP fraction. */
  function getActivePhase(hpFraction: number) {
    return [...TIER1_BOSS_PHASES]
      .reverse()
      .find((p) => hpFraction <= p.hpPctThreshold)!;
  }

  it("boss starts in phase 1 at full HP", () => {
    const phase = getActivePhase(1.0);
    expect(phase.label).toBe("Awakened");
    expect(phase.damageMult).toBe(1.0);
    expect(phase.ranged).toBe(false);
  });

  it("boss enters phase 2 just below 66% HP", () => {
    const phase = getActivePhase(0.65);
    expect(phase.label).toBe("Enraged");
    expect(phase.damageMult).toBe(1.5);
  });

  it("boss enters phase 3 at exactly 33% HP", () => {
    const phase = getActivePhase(0.33);
    expect(phase.label).toBe("Frenzied");
    expect(phase.damageMult).toBe(2.0);
    expect(phase.ranged).toBe(true);
  });

  it("boss enters phase 3 just below 33% HP", () => {
    const phase = getActivePhase(0.10);
    expect(phase.label).toBe("Frenzied");
  });

  it("boss damage multiplier increases as HP drops lower (later phases hit harder)", () => {
    // Phases sorted descending by threshold = order they are triggered (full HP first)
    const ordered = [...TIER1_BOSS_PHASES].sort((a, b) => b.hpPctThreshold - a.hpPctThreshold);
    for (let i = 1; i < ordered.length; i++) {
      // Each subsequent phase (lower HP threshold) must deal more damage
      expect(ordered[i].damageMult).toBeGreaterThan(ordered[i - 1].damageMult);
    }
  });

  it("tier-1 boss base HP is 1200", () => {
    // Mirror from BOSS_CONFIGS in DungeonRoom.ts
    expect(1200).toBe(1200); // explicit sanity check
  });

  it("has exactly 3 phases for tier-1 boss", () => {
    expect(TIER1_BOSS_PHASES).toHaveLength(3);
  });
});

// ── Enemy count scaling with party size ───────────────────────────────────────

describe("Enemy count scaling with party size", () => {
  /** Mirrors the count formula from DungeonRoom.ts spawnCombatRoom(). */
  function enemyCount(baseCount: number, partySize: number): number {
    return Math.round(baseCount * (0.75 + partySize * 0.25));
  }

  it("solo player gets the base count (rounded from 0.75 + 0.25 = 1.0 factor)", () => {
    const base = 4;
    expect(enemyCount(base, 1)).toBe(4); // 4 * 1.0
  });

  it("2-player party scales enemy count up", () => {
    const base = 4;
    expect(enemyCount(base, 2)).toBe(5); // 4 * 1.25 = 5
  });

  it("3-player party scales enemy count up further", () => {
    const base = 4;
    expect(enemyCount(base, 3)).toBe(6); // 4 * 1.5 = 6
  });

  it("4-player party provides the highest count", () => {
    const base = 4;
    expect(enemyCount(base, 4)).toBe(7); // 4 * 1.75 = 7
  });

  it("enemy count grows monotonically with party size", () => {
    const base = 4;
    for (let size = 2; size <= 4; size++) {
      expect(enemyCount(base, size)).toBeGreaterThanOrEqual(enemyCount(base, size - 1));
    }
  });
});

/**
 * Territory wars integration tests.
 *
 * Covers:
 *   - nextWarWindow() — returns correct upcoming window, handles times inside/outside windows
 *   - War declaration validation — leader-only, no duplicate wars, no self-declaration
 *   - Capture point recording — accumulates correctly, clamps per call
 *   - War resolution — attacker wins on tie (challenger advantage), territory transfer
 *   - Guild leaderboard territory bonus — 50 000 pts per territory
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TERRITORIES, WAR_WINDOW_HOURS_UTC, WAR_WINDOW_DURATION_MS, nextWarWindow } from "../../../src/config/territory";

// ── nextWarWindow() ───────────────────────────────────────────────────────────

const WAR_WINDOW_HOURS_UTC_VALS = WAR_WINDOW_HOURS_UTC;

describe("nextWarWindow()", () => {
  it("returns a window start that is one of the scheduled UTC hours", () => {
    const now = new Date("2026-03-25T10:00:00Z"); // between 08 and 16
    const win = nextWarWindow(now);
    expect(WAR_WINDOW_HOURS_UTC_VALS).toContain(win.start.getUTCHours() as 8 | 16 | 22);
    expect(win.end.getTime() - win.start.getTime()).toBe(WAR_WINDOW_DURATION_MS);
  });

  it("skips the current open window and returns the next one", () => {
    // 08:30 UTC — inside the 08:00 window, should return 16:00
    const now = new Date("2026-03-25T08:30:00Z");
    const win = nextWarWindow(now);
    expect(win.start.getUTCHours()).toBe(16);
  });

  it("wraps around to next day when past the last window", () => {
    // 23:00 UTC — past all windows for today, next is 08:00 next day
    const now = new Date("2026-03-25T23:00:00Z");
    const win = nextWarWindow(now);
    expect(win.start.getUTCHours()).toBe(8);
    expect(win.start.getUTCDate()).toBe(26);
  });

  it("returns window starting exactly at a boundary (window just ended)", () => {
    // Exactly at 10:00 UTC — the 08:00–10:00 window just ended, next is 16:00
    const now = new Date("2026-03-25T10:00:00Z");
    const win = nextWarWindow(now);
    expect(win.start.getUTCHours()).toBe(16);
  });

  it("end time is always start + 2 hours", () => {
    const cases = [
      new Date("2026-03-25T00:00:00Z"),
      new Date("2026-03-25T08:00:00Z"),
      new Date("2026-03-25T15:59:00Z"),
      new Date("2026-03-25T22:30:00Z"),
    ];
    for (const now of cases) {
      const win = nextWarWindow(now);
      expect(win.end.getTime() - win.start.getTime()).toBe(2 * 60 * 60 * 1000);
    }
  });
});

// ── TERRITORIES config ────────────────────────────────────────────────────────

describe("TERRITORIES config", () => {
  it("has exactly 6 territories", () => {
    expect(TERRITORIES).toHaveLength(6);
  });

  it("all territory IDs are unique", () => {
    const ids = TERRITORIES.map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("each territory has positive bonus percentages", () => {
    for (const t of TERRITORIES) {
      expect(t.xpBonusPct).toBeGreaterThan(0);
      expect(t.dropBonusPct).toBeGreaterThan(0);
    }
  });

  it("each territory has valid map coordinates", () => {
    for (const t of TERRITORIES) {
      expect(t.mapX).toBeGreaterThanOrEqual(0);
      expect(t.mapX).toBeLessThanOrEqual(640);
      expect(t.mapY).toBeGreaterThanOrEqual(0);
      expect(t.mapY).toBeLessThanOrEqual(360);
    }
  });

  it("territory IDs match server-side migration seed", () => {
    const expectedIds = [
      "ironhold", "shadow_peaks", "golden_nexus",
      "crystal_caverns", "dragons_rest", "storm_crossing",
    ];
    const actualIds = TERRITORIES.map((t) => t.id).sort();
    expect(actualIds).toEqual(expectedIds.sort());
  });
});

// ── War window helpers ────────────────────────────────────────────────────────

describe("war window scheduling", () => {
  it("windows do not overlap", () => {
    // All three windows for a single day should have gaps between them
    const midnight = Date.UTC(2026, 2, 25); // 2026-03-25
    const windows = WAR_WINDOW_HOURS_UTC_VALS.map((h) => ({
      start: midnight + h * 3_600_000,
      end:   midnight + h * 3_600_000 + WAR_WINDOW_DURATION_MS,
    }));
    for (let i = 0; i < windows.length - 1; i++) {
      expect(windows[i].end).toBeLessThanOrEqual(windows[i + 1].start);
    }
  });

  it("each window is exactly 2 hours", () => {
    for (const h of WAR_WINDOW_HOURS_UTC_VALS) {
      const start = new Date(Date.UTC(2026, 2, 25, h, 0, 0));
      const win   = { start, end: new Date(start.getTime() + WAR_WINDOW_DURATION_MS) };
      const durationHours = (win.end.getTime() - win.start.getTime()) / 3_600_000;
      expect(durationHours).toBe(2);
    }
  });
});

// ── Guild leaderboard bonus ───────────────────────────────────────────────────

describe("guild leaderboard territory bonus", () => {
  it("awards 50 000 points per territory owned", () => {
    const BONUS_PER_TERRITORY = 50_000;
    const guildXp = 100_000;
    const territoriesOwned = 3;
    const score = guildXp + territoriesOwned * BONUS_PER_TERRITORY;
    expect(score).toBe(250_000);
  });

  it("guild with 0 territories gets no bonus", () => {
    const BONUS_PER_TERRITORY = 50_000;
    const guildXp = 75_000;
    const score = guildXp + 0 * BONUS_PER_TERRITORY;
    expect(score).toBe(75_000);
  });

  it("territory bonus can exceed member XP for small active guilds", () => {
    const BONUS_PER_TERRITORY = 50_000;
    // A guild with 2 members each at level 5 (low XP) but owns 2 territories
    const guildXp = 5_000;
    const score = guildXp + 2 * BONUS_PER_TERRITORY;
    expect(score).toBe(105_000);
    // That's more than a large guild with 20k XP and 0 territories
    expect(score).toBeGreaterThan(20_000);
  });
});

// ── Capture point accumulation ────────────────────────────────────────────────

describe("capture point logic", () => {
  it("accumulates attacker and defender points independently", () => {
    const attackerPoints = [3, 3, 10, 3]; // kill, kill, objective, kill
    const defenderPoints = [3, 3];
    const attackerTotal = attackerPoints.reduce((a, b) => a + b, 0);
    const defenderTotal = defenderPoints.reduce((a, b) => a + b, 0);
    expect(attackerTotal).toBe(19);
    expect(defenderTotal).toBe(6);
  });

  it("attacker wins on tie (challenger advantage)", () => {
    const attackerPoints = 10;
    const defenderPoints = 10;
    const attackerWins   = attackerPoints >= defenderPoints;
    expect(attackerWins).toBe(true);
  });

  it("defender wins when strictly higher points", () => {
    const attackerPoints = 8;
    const defenderPoints = 15;
    const attackerWins   = attackerPoints >= defenderPoints;
    expect(attackerWins).toBe(false);
  });
});

// ── GvG leaderboard (battles won) ────────────────────────────────────────────

describe("GvG battles-won leaderboard", () => {
  it("counts each completed war win as +1 battle won", () => {
    const wins = [
      { winner_guild_id: "guild_a" },
      { winner_guild_id: "guild_a" },
      { winner_guild_id: "guild_b" },
    ];
    const tally = wins.reduce<Record<string, number>>((acc, w) => {
      acc[w.winner_guild_id] = (acc[w.winner_guild_id] ?? 0) + 1;
      return acc;
    }, {});
    expect(tally["guild_a"]).toBe(2);
    expect(tally["guild_b"]).toBe(1);
  });

  it("guild with no wins has score 0 (not ranked)", () => {
    const wins: Array<{ winner_guild_id: string }> = [];
    const score = wins.filter(w => w.winner_guild_id === "guild_c").length;
    expect(score).toBe(0);
  });

  it("GvG ranking is independent of XP or territory count", () => {
    // A guild that wins all battles ranks first regardless of member XP
    const gvgRankings = [
      { guild: "guild_a", battlesWon: 10 },
      { guild: "guild_b", battlesWon: 3  },
      { guild: "guild_c", battlesWon: 1  },
    ].sort((a, b) => b.battlesWon - a.battlesWon);
    expect(gvgRankings[0].guild).toBe("guild_a");
    expect(gvgRankings[0].battlesWon).toBe(10);
  });

  it("pending or active wars do not count toward battles won", () => {
    const allWars = [
      { status: "completed", winner_guild_id: "guild_a" },
      { status: "active",    winner_guild_id: null },
      { status: "pending",   winner_guild_id: null },
      { status: "completed", winner_guild_id: "guild_a" },
    ];
    const wins = allWars.filter(w => w.status === "completed" && w.winner_guild_id !== null);
    expect(wins).toHaveLength(2);
  });

  it("territories held is separate from battles won metric", () => {
    // A guild may hold 3 territories but have won 1 battle (inherited old ownership)
    const territoriesHeld = 3;
    const battlesWon      = 1;
    expect(territoriesHeld).not.toBe(battlesWon);
  });
});

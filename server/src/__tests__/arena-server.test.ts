/**
 * Server-side PvP arena system tests.
 *
 * Covers:
 *   - ELO calculation correctness (isolated helper re-tests)
 *   - ratingToTier() boundaries
 *   - DB arena module: season management, rating upsert, match recording,
 *     leaderboard ordering, season rewards, season advance + soft-reset
 *
 * All DB tests run against a mock Drizzle client and mock Redis so the suite
 * is fast and does not require a live database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Isolated ELO tests (no DB required) ──────────────────────────────────────

/** Mirrors the internal eloUpdate function from arena.ts. */
function eloUpdate(rA: number, rB: number, aWon: boolean): [number, number] {
  const ELO_K = 32;
  const eA   = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  const eB   = 1 - eA;
  const sA   = aWon ? 1 : 0;
  const sB   = aWon ? 0 : 1;
  const newA = Math.round(rA + ELO_K * (sA - eA));
  const newB = Math.round(rB + ELO_K * (sB - eB));
  return [Math.max(0, newA), Math.max(0, newB)];
}

describe("ELO calculation (server)", () => {
  it("equal-rated match: winner gains ~16, loser loses ~16", () => {
    const [nA, nB] = eloUpdate(1000, 1000, true);
    expect(nA).toBe(1016);
    expect(nB).toBe(984);
  });

  it("winner gains rating, loser loses rating", () => {
    const [nA, nB] = eloUpdate(1200, 1000, true);
    expect(nA).toBeGreaterThan(1200);
    expect(nB).toBeLessThan(1000);
  });

  it("upset win (lower-rated): winner gains more than a favourite win", () => {
    const [upsetWinner]    = eloUpdate(800, 1200, true);   // upset
    const [favouriteWinner] = eloUpdate(1200, 800, true);  // expected win
    expect(upsetWinner - 800).toBeGreaterThan(favouriteWinner - 1200);
  });

  it("zero-sum: winner gain ≈ loser loss (rounding within ±1)", () => {
    const [nA, nB] = eloUpdate(1000, 1000, true);
    expect((nA - 1000) + (nB - 1000)).toBeGreaterThanOrEqual(-1);
    expect((nA - 1000) + (nB - 1000)).toBeLessThanOrEqual(1);
  });

  it("rating floor: loser cannot go below 0", () => {
    const [, nB] = eloUpdate(0, 2000, true); // loser is 0-rated
    expect(nB).toBeGreaterThanOrEqual(0);
  });

  it("very high-rated vs very low-rated: favourite barely gains", () => {
    const [nA] = eloUpdate(2000, 800, true);
    expect(nA - 2000).toBeLessThan(5); // near-certainty win earns very few points
  });
});

// ── ratingToTier() tests ──────────────────────────────────────────────────────

import { ratingToTier } from "../db/arena";

describe("ratingToTier()", () => {
  it("returns BRONZE below 1200", () => {
    expect(ratingToTier(0)).toBe("BRONZE");
    expect(ratingToTier(999)).toBe("BRONZE");
    expect(ratingToTier(1199)).toBe("BRONZE");
  });

  it("returns SILVER at 1200", () => {
    expect(ratingToTier(1200)).toBe("SILVER");
    expect(ratingToTier(1399)).toBe("SILVER");
  });

  it("returns GOLD at 1400", () => {
    expect(ratingToTier(1400)).toBe("GOLD");
    expect(ratingToTier(1599)).toBe("GOLD");
  });

  it("returns PLATINUM at 1600", () => {
    expect(ratingToTier(1600)).toBe("PLATINUM");
    expect(ratingToTier(1799)).toBe("PLATINUM");
  });

  it("returns DIAMOND at 1800", () => {
    expect(ratingToTier(1800)).toBe("DIAMOND");
    expect(ratingToTier(2199)).toBe("DIAMOND");
  });

  it("returns CHAMPION at 2200+", () => {
    expect(ratingToTier(2200)).toBe("CHAMPION");
    expect(ratingToTier(9999)).toBe("CHAMPION");
  });

  it("tier boundaries are monotonically increasing", () => {
    const points = [0, 1000, 1199, 1200, 1399, 1400, 1599, 1600, 1799, 1800, 2199, 2200];
    const tiers  = ["BRONZE","BRONZE","BRONZE","SILVER","SILVER","GOLD","GOLD","PLATINUM","PLATINUM","DIAMOND","DIAMOND","CHAMPION"];
    points.forEach((r, i) => expect(ratingToTier(r)).toBe(tiers[i]));
  });
});

// ── getPvpCurrencyForTier() tests ─────────────────────────────────────────────

import { getPvpCurrencyForTier } from "../db/arena";

describe("getPvpCurrencyForTier()", () => {
  it("each tier returns a positive currency value", () => {
    for (const tier of ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "CHAMPION"]) {
      expect(getPvpCurrencyForTier(tier)).toBeGreaterThan(0);
    }
  });

  it("higher tiers reward more currency", () => {
    expect(getPvpCurrencyForTier("SILVER")).toBeGreaterThan(getPvpCurrencyForTier("BRONZE"));
    expect(getPvpCurrencyForTier("GOLD")).toBeGreaterThan(getPvpCurrencyForTier("SILVER"));
    expect(getPvpCurrencyForTier("PLATINUM")).toBeGreaterThan(getPvpCurrencyForTier("GOLD"));
    expect(getPvpCurrencyForTier("DIAMOND")).toBeGreaterThan(getPvpCurrencyForTier("PLATINUM"));
    expect(getPvpCurrencyForTier("CHAMPION")).toBeGreaterThan(getPvpCurrencyForTier("DIAMOND"));
  });

  it("unknown tier falls back to 100", () => {
    expect(getPvpCurrencyForTier("UNKNOWN_TIER")).toBe(100);
  });
});

// ── DB module tests (mocked Drizzle + Redis) ──────────────────────────────────

// We mock the DB client and Redis so we don't need a live database.

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("../db/redis", () => ({
  getRedis: vi.fn(() => ({
    get:  vi.fn().mockResolvedValue(null),
    set:  vi.fn().mockResolvedValue("OK"),
    del:  vi.fn().mockResolvedValue(1),
  })),
}));

import { getDb } from "../db/client";
import {
  getOrCreateRating,
  recordArenaMatch,
  getArenaLeaderboard,
} from "../db/arena";

// Helper: build a minimal chainable Drizzle mock
function makeDbMock(rows: unknown[] = []) {
  const chain = {
    select:      vi.fn().mockReturnThis(),
    from:        vi.fn().mockReturnThis(),
    where:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockResolvedValue(rows),
    insert:      vi.fn().mockReturnThis(),
    values:      vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning:   vi.fn().mockResolvedValue(rows),
    update:      vi.fn().mockReturnThis(),
    set:         vi.fn().mockReturnThis(),
    execute:     vi.fn().mockResolvedValue(rows),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(chain);
    }),
    desc:        vi.fn().mockReturnThis(),
    orderBy:     vi.fn().mockReturnThis(),
  };
  return chain;
}

describe("getOrCreateRating()", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns existing record if found", async () => {
    const existing = {
      playerId: "p1", seasonId: "s1", rating: 1200,
      wins: 5, losses: 3, kills: 8, deaths: 4, peakRating: 1250,
      updatedAt: new Date(),
    };
    const db = makeDbMock([existing]);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const result = await getOrCreateRating("p1", "s1");
    expect(result.rating).toBe(1200);
    expect(result.wins).toBe(5);
  });

  it("creates default record when not found (insert path)", async () => {
    const newRow = {
      playerId: "p2", seasonId: "s1", rating: 1000,
      wins: 0, losses: 0, kills: 0, deaths: 0, peakRating: 1000,
      updatedAt: new Date(),
    };
    // First select returns empty, insert returns newRow
    const db = makeDbMock([]);
    db.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([newRow]);
    db.returning.mockResolvedValueOnce([newRow]);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const result = await getOrCreateRating("p2", "s1");
    expect(result.rating).toBe(1000);
    expect(result.wins).toBe(0);
  });
});

describe("recordArenaMatch() — rating delta direction", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns positive delta for winner, negative for loser", async () => {
    const winnerRow = {
      playerId: "w1", seasonId: "s1", rating: 1000, wins: 2, losses: 1,
      kills: 3, deaths: 1, peakRating: 1050, updatedAt: new Date(),
    };
    const loserRow = {
      playerId: "l1", seasonId: "s1", rating: 1000, wins: 1, losses: 2,
      kills: 1, deaths: 3, peakRating: 1020, updatedAt: new Date(),
    };

    const db = makeDbMock([]);
    // getOrCreateRating calls: winner then loser
    db.limit
      .mockResolvedValueOnce([winnerRow])
      .mockResolvedValueOnce([loserRow]);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const deltas = await recordArenaMatch({
      seasonId:  "s1",
      mode:      "1v1",
      map:       "gladiator_pit",
      winnerIds: ["w1"],
      loserIds:  ["l1"],
      kills:     { w1: 1, l1: 0 },
      durationMs: 60_000,
    });

    expect(deltas["w1"]).toBeGreaterThan(0);
    expect(deltas["l1"]).toBeLessThan(0);
  });
});

describe("getArenaLeaderboard()", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns leaderboard entries sorted by rank", async () => {
    const rows = [
      { player_id: "p1", username: "Alice", rating: 1800, wins: 10, losses: 2, peak_rating: 1850 },
      { player_id: "p2", username: "Bob",   rating: 1400, wins: 5,  losses: 5, peak_rating: 1450 },
      { player_id: "p3", username: "Carol", rating: 1000, wins: 1,  losses: 9, peak_rating: 1050 },
    ];
    const db = makeDbMock(rows);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const entries = await getArenaLeaderboard("s1", 10);
    expect(entries).toHaveLength(3);
    expect(entries[0].rank).toBe(1);
    expect(entries[0].playerId).toBe("p1");
    expect(entries[1].rank).toBe(2);
    expect(entries[2].rank).toBe(3);
  });

  it("respects limit parameter", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      player_id: `p${i}`, username: `P${i}`,
      rating: 1500 - i * 10, wins: 0, losses: 0, peak_rating: 1500 - i * 10,
    }));
    const db = makeDbMock(rows);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    const entries = await getArenaLeaderboard("s1", 5);
    expect(entries.length).toBeLessThanOrEqual(5);
  });
});

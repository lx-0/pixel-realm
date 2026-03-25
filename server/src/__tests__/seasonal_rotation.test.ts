/**
 * Seasonal rotation service tests.
 *
 * Covers:
 *   - getSeasonForDate()       — maps calendar date to season name
 *   - getSeasonWindow()        — returns correct UTC date bounds per season
 *   - ensureSeasonalEvents()   — upserts all four events into the DB
 *   - syncSeasonalActivation() — activates only the correct season
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSeasonForDate,
  getSeasonWindow,
  ensureSeasonalEvents,
  syncSeasonalActivation,
  SEASON_DEFS,
  SEASONAL_ENEMY_OVERLAYS,
  SEASONAL_FEATURED_ZONES,
  SEASONAL_SPAWN_RATIO,
} from "../seasons/rotation";

vi.mock("../db/client", () => ({
  getDb:   vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getPool } from "../db/client";

function mockPool(responses: Array<{ rows: unknown[]; rowCount?: number }>) {
  const pool = { query: vi.fn() };
  for (const resp of responses) {
    pool.query.mockResolvedValueOnce({ rows: resp.rows, rowCount: resp.rowCount ?? resp.rows.length });
  }
  // Default: return empty for any remaining calls
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  vi.mocked(getPool).mockReturnValue(pool as never);
  return pool;
}

// ── getSeasonForDate() ─────────────────────────────────────────────────────────

describe("getSeasonForDate", () => {
  it.each([
    // Spring: Mar-May
    [new Date("2026-03-01"), "spring"],
    [new Date("2026-04-15"), "spring"],
    [new Date("2026-05-31"), "spring"],
    // Summer: Jun-Aug
    [new Date("2026-06-01"), "summer"],
    [new Date("2026-07-04"), "summer"],
    [new Date("2026-08-31"), "summer"],
    // Fall: Sep-Nov
    [new Date("2026-09-01"), "fall"],
    [new Date("2026-10-31"), "fall"],
    [new Date("2026-11-30"), "fall"],
    // Winter: Dec-Feb
    [new Date("2026-12-01"), "winter"],
    [new Date("2027-01-15"), "winter"],
    [new Date("2027-02-28"), "winter"],
  ] as [Date, string][])("returns %s for %s", (date, expected) => {
    expect(getSeasonForDate(date)).toBe(expected);
  });
});

// ── getSeasonWindow() ──────────────────────────────────────────────────────────

describe("getSeasonWindow", () => {
  it("spring window starts Mar 1 and ends May 31", () => {
    const ref = new Date("2026-04-01");
    const { startsAt, endsAt } = getSeasonWindow("spring", ref);
    expect(startsAt.getUTCMonth()).toBe(2); // March
    expect(startsAt.getUTCDate()).toBe(1);
    expect(endsAt.getUTCMonth()).toBe(4);   // May
    expect(endsAt.getUTCDate()).toBe(31);
  });

  it("summer window starts Jun 1 and ends Aug 31", () => {
    const ref = new Date("2026-07-15");
    const { startsAt, endsAt } = getSeasonWindow("summer", ref);
    expect(startsAt.getUTCMonth()).toBe(5);  // June
    expect(endsAt.getUTCMonth()).toBe(7);    // August
    expect(endsAt.getUTCDate()).toBe(31);
  });

  it("fall window starts Sep 1 and ends Nov 30", () => {
    const ref = new Date("2026-10-20");
    const { startsAt, endsAt } = getSeasonWindow("fall", ref);
    expect(startsAt.getUTCMonth()).toBe(8);  // September
    expect(endsAt.getUTCMonth()).toBe(10);   // November
    expect(endsAt.getUTCDate()).toBe(30);
  });

  it("winter window starts Dec 1 and ends in Feb of next year", () => {
    const ref = new Date("2026-12-15");
    const { startsAt, endsAt } = getSeasonWindow("winter", ref);
    expect(startsAt.getUTCFullYear()).toBe(2026);
    expect(startsAt.getUTCMonth()).toBe(11);  // December
    expect(startsAt.getUTCDate()).toBe(1);
    expect(endsAt.getUTCFullYear()).toBe(2027);
    expect(endsAt.getUTCMonth()).toBe(1);     // February
  });

  it("winter window for February ref points back to previous December", () => {
    const ref = new Date("2027-02-10");
    const { startsAt } = getSeasonWindow("winter", ref);
    expect(startsAt.getUTCFullYear()).toBe(2026);
    expect(startsAt.getUTCMonth()).toBe(11); // Dec 2026
  });

  it("active date falls within its own window", () => {
    const seasons = ["spring", "summer", "fall", "winter"] as const;
    const testDates = [
      new Date("2026-04-01"),
      new Date("2026-07-01"),
      new Date("2026-10-01"),
      new Date("2026-12-15"),
    ];
    for (let i = 0; i < seasons.length; i++) {
      const { startsAt, endsAt } = getSeasonWindow(seasons[i], testDates[i]);
      const t = testDates[i].getTime();
      expect(t).toBeGreaterThanOrEqual(startsAt.getTime());
      expect(t).toBeLessThanOrEqual(endsAt.getTime());
    }
  });
});

// ── ensureSeasonalEvents() ────────────────────────────────────────────────────

describe("ensureSeasonalEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues exactly 4 INSERT queries (one per season)", async () => {
    const pool = mockPool([
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    ]);
    await ensureSeasonalEvents();
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  it("each query includes the season_key parameter", async () => {
    const pool = mockPool([
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    ]);
    await ensureSeasonalEvents();
    const seasonKeys = pool.query.mock.calls.map((call: unknown[]) => (call as [string, unknown[]])[1][0]);
    expect(seasonKeys).toContain("spring");
    expect(seasonKeys).toContain("summer");
    expect(seasonKeys).toContain("fall");
    expect(seasonKeys).toContain("winter");
  });

  it("uses ON CONFLICT (season_key) DO UPDATE", async () => {
    const pool = mockPool([
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    ]);
    await ensureSeasonalEvents();
    for (const call of pool.query.mock.calls) {
      const sql = (call as [string])[0];
      expect(sql).toMatch(/ON CONFLICT/i);
      expect(sql).toMatch(/season_key/i);
    }
  });
});

// ── syncSeasonalActivation() ──────────────────────────────────────────────────

describe("syncSeasonalActivation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deactivates all events then activates the matching season_key", async () => {
    const pool = mockPool([
      { rows: [] },                  // UPDATE ... SET is_active = FALSE
      { rows: [{ id: "uuid-1" }] },  // UPDATE ... WHERE season_key = $1 RETURNING id
    ]);
    const result = await syncSeasonalActivation(new Date("2026-04-01")); // spring
    expect(result).toBe("spring");
    // First query: deactivate all
    const firstSql = pool.query.mock.calls[0][0] as string;
    expect(firstSql).toMatch(/is_active = FALSE/i);
    // Second query: activate by season_key
    const secondSql = pool.query.mock.calls[1][0] as string;
    expect(secondSql).toMatch(/season_key/i);
    expect((pool.query.mock.calls[1] as [string, unknown[]])[1][0]).toBe("spring");
  });

  it("activates winter for December dates", async () => {
    const pool = mockPool([
      { rows: [] },
      { rows: [{ id: "uuid-winter" }] },
    ]);
    const result = await syncSeasonalActivation(new Date("2026-12-15"));
    expect(result).toBe("winter");
    expect((pool.query.mock.calls[1] as [string, unknown[]])[1][0]).toBe("winter");
  });

  it("activates winter for February dates", async () => {
    const pool = mockPool([
      { rows: [] },
      { rows: [{ id: "uuid-winter" }] },
    ]);
    const result = await syncSeasonalActivation(new Date("2027-02-14"));
    expect(result).toBe("winter");
  });

  it("falls back to date window match when season_key UPDATE finds nothing", async () => {
    const pool = mockPool([
      { rows: [] },       // deactivate all
      { rows: [] },       // season_key match — no rows
      { rows: [{ id: "uuid-fallback" }] }, // date window fallback
    ]);
    const result = await syncSeasonalActivation(new Date("2026-07-01"));
    expect(result).toBe("summer");
  });

  it("returns null when no event matches at all", async () => {
    const pool = mockPool([
      { rows: [] }, // deactivate
      { rows: [] }, // season_key miss
      { rows: [] }, // date window miss
    ]);
    const result = await syncSeasonalActivation(new Date("2026-07-01"));
    expect(result).toBeNull();
  });
});

// ── SEASON_DEFS sanity checks ─────────────────────────────────────────────────

describe("SEASON_DEFS", () => {
  it("has exactly 4 seasons", () => {
    expect(SEASON_DEFS).toHaveLength(4);
  });

  it("each season has at least 4 reward tiers", () => {
    for (const def of SEASON_DEFS) {
      expect(def.rewardTiers.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("reward tiers are sorted ascending by points", () => {
    for (const def of SEASON_DEFS) {
      for (let i = 1; i < def.rewardTiers.length; i++) {
        expect(def.rewardTiers[i].points).toBeGreaterThan(def.rewardTiers[i - 1].points);
      }
    }
  });
});

// ── Zone overlay config sanity checks ────────────────────────────────────────

describe("Seasonal zone overlay config", () => {
  it("SEASONAL_ENEMY_OVERLAYS has entries for all 4 seasons", () => {
    expect(Object.keys(SEASONAL_ENEMY_OVERLAYS)).toEqual(
      expect.arrayContaining(["spring", "summer", "fall", "winter"]),
    );
  });

  it("each season has 4 enemy types defined", () => {
    for (const season of ["spring", "summer", "fall", "winter"] as const) {
      expect(SEASONAL_ENEMY_OVERLAYS[season]).toHaveLength(4);
    }
  });

  it("SEASONAL_FEATURED_ZONES includes zone1, zone2, zone3", () => {
    expect(SEASONAL_FEATURED_ZONES.has("zone1")).toBe(true);
    expect(SEASONAL_FEATURED_ZONES.has("zone2")).toBe(true);
    expect(SEASONAL_FEATURED_ZONES.has("zone3")).toBe(true);
  });

  it("SEASONAL_SPAWN_RATIO is between 0 and 1 (exclusive)", () => {
    expect(SEASONAL_SPAWN_RATIO).toBeGreaterThan(0);
    expect(SEASONAL_SPAWN_RATIO).toBeLessThan(1);
  });
});

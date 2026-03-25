/**
 * Daily login rewards and streak system tests.
 *
 * Tests the pure reward calculation function and the DB-backed claim/status
 * functions with a mocked pg pool.
 *
 * No real PostgreSQL connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Top-level mocks (hoisted before all imports) ──────────────────────────────

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getPool } from "../db/client";
import {
  getRewardForStreakDay,
  claimDailyReward,
  getStreakStatus,
  utcToday,
} from "../db/dailyRewards";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAYER_ID = "00000000-0000-0000-0000-000000000001";

/** Returns a YYYY-MM-DD string offset by `days` from today (UTC). */
function dateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Build a mock pg client for transaction tests. */
function makeMockClient(queryResponses: Record<string, unknown>) {
  const queryMock = vi.fn().mockImplementation((sql: string) => {
    const key = Object.keys(queryResponses).find((k) => sql.includes(k));
    if (key) return Promise.resolve(queryResponses[key]);
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  return {
    query: queryMock,
    release: vi.fn(),
  };
}

// ── Pure unit tests: getRewardForStreakDay ─────────────────────────────────────

describe("getRewardForStreakDay", () => {
  it("day 1 awards 50 gold, 0 XP, no bonus item", () => {
    const r = getRewardForStreakDay(1);
    expect(r).toEqual({ gold: 50, xp: 0, bonusItem: false });
  });

  it("day 7 awards 500 gold, 300 XP, and a milestone bonus item", () => {
    const r = getRewardForStreakDay(7);
    expect(r).toEqual({ gold: 500, xp: 300, bonusItem: true });
  });

  it("day 14 (second 7-cycle) also awards the milestone bonus item", () => {
    const r = getRewardForStreakDay(14);
    expect(r).toEqual({ gold: 500, xp: 300, bonusItem: true });
  });

  it("day 8 resets to cycle day 1 rewards (50 gold, 0 XP)", () => {
    const r = getRewardForStreakDay(8);
    expect(r).toEqual({ gold: 50, xp: 0, bonusItem: false });
  });

  it("day 5 awards 250 gold, 200 XP", () => {
    const r = getRewardForStreakDay(5);
    expect(r).toEqual({ gold: 250, xp: 200, bonusItem: false });
  });

  it("reward escalates across the 7-day cycle", () => {
    const golds = [1, 2, 3, 4, 5, 6, 7].map((d) => getRewardForStreakDay(d).gold);
    // Each day should be >= previous
    for (let i = 1; i < golds.length; i++) {
      expect(golds[i]).toBeGreaterThanOrEqual(golds[i - 1]);
    }
  });
});

// ── claimDailyReward ──────────────────────────────────────────────────────────

describe("claimDailyReward", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first-ever claim sets streak to 1 and returns correct reward", async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Transaction query sequence:
    // 1. BEGIN
    // 2. INSERT ... ON CONFLICT DO NOTHING (streak upsert)
    // 3. SELECT ... FOR UPDATE → no prior claim (null date)
    // 4. UPDATE player_login_streaks
    // 5. UPDATE player_state
    // 6. INSERT daily_reward_claims
    // 7. COMMIT
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // INSERT streak upsert
      .mockResolvedValueOnce({          // SELECT FOR UPDATE
        rows: [{ current_streak: 0, longest_streak: 0, last_claim_date: null }],
      })
      .mockResolvedValueOnce(undefined) // UPDATE streaks
      .mockResolvedValueOnce(undefined) // UPDATE player_state
      .mockResolvedValueOnce(undefined) // INSERT claims
      .mockResolvedValueOnce(undefined); // COMMIT

    vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(mockClient) } as never);

    const result = await claimDailyReward(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.streakDay).toBe(1);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.goldAwarded).toBe(50); // day 1 reward
    expect(result.xpAwarded).toBe(0);
    expect(result.bonusItem).toBe(false);
  });

  it("consecutive day increments streak", async () => {
    const yesterday = dateOffset(-1);
    const mockClient = { query: vi.fn(), release: vi.fn() };

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // INSERT streak upsert
      .mockResolvedValueOnce({          // SELECT FOR UPDATE — last claimed yesterday, streak 3
        rows: [{ current_streak: 3, longest_streak: 3, last_claim_date: yesterday }],
      })
      .mockResolvedValueOnce(undefined) // UPDATE streaks
      .mockResolvedValueOnce(undefined) // UPDATE player_state
      .mockResolvedValueOnce(undefined) // INSERT claims
      .mockResolvedValueOnce(undefined); // COMMIT

    vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(mockClient) } as never);

    const result = await claimDailyReward(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.currentStreak).toBe(4);      // 3 + 1
    expect(result.goldAwarded).toBe(200);       // day 4 reward
  });

  it("missed day resets streak to 1", async () => {
    const twoDaysAgo = dateOffset(-2);
    const mockClient = { query: vi.fn(), release: vi.fn() };

    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{ current_streak: 10, longest_streak: 10, last_claim_date: twoDaysAgo }],
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(mockClient) } as never);

    const result = await claimDailyReward(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.currentStreak).toBe(1);    // reset
    expect(result.longestStreak).toBe(10);   // longest preserved
    expect(result.goldAwarded).toBe(50);     // day 1
  });

  it("already claimed today returns claimed: false without modifying DB", async () => {
    const today = utcToday();
    const mockClient = { query: vi.fn(), release: vi.fn() };

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // INSERT streak upsert
      .mockResolvedValueOnce({          // SELECT FOR UPDATE — already claimed today
        rows: [{ current_streak: 5, longest_streak: 5, last_claim_date: today }],
      })
      .mockResolvedValueOnce(undefined); // ROLLBACK

    vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(mockClient) } as never);

    const result = await claimDailyReward(PLAYER_ID);

    expect(result.claimed).toBe(false);
    expect(result.currentStreak).toBe(5);
    expect(result.goldAwarded).toBe(0);

    // Verify no UPDATE or INSERT was issued after the rollback decision
    const calls = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string);
    const hasUpdate = calls.some((sql) => sql.includes("UPDATE player_state"));
    expect(hasUpdate).toBe(false);
  });

  it("reaches milestone on day 7 and awards bonus item", async () => {
    const yesterday = dateOffset(-1);
    const mockClient = { query: vi.fn(), release: vi.fn() };

    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{ current_streak: 6, longest_streak: 6, last_claim_date: yesterday }],
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(mockClient) } as never);

    const result = await claimDailyReward(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.currentStreak).toBe(7);
    expect(result.bonusItem).toBe(true);
    expect(result.goldAwarded).toBe(500);
    expect(result.xpAwarded).toBe(300);
  });

  it("rolls back and throws on DB error", async () => {
    const mockClient = { query: vi.fn(), release: vi.fn() };

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // INSERT upsert
      .mockRejectedValueOnce(new Error("DB connection lost")); // SELECT FOR UPDATE fails

    vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(mockClient) } as never);

    await expect(claimDailyReward(PLAYER_ID)).rejects.toThrow("DB connection lost");

    // ROLLBACK must have been called
    const calls = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls).toContain("ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledOnce();
  });
});

// ── getStreakStatus ────────────────────────────────────────────────────────────

describe("getStreakStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canClaimToday: true when last_claim_date is yesterday", async () => {
    const yesterday = dateOffset(-1);
    vi.mocked(getPool).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [{ current_streak: 4, longest_streak: 7, last_claim_date: yesterday }],
      }),
    } as never);

    const status = await getStreakStatus(PLAYER_ID);

    expect(status.canClaimToday).toBe(true);
    expect(status.currentStreak).toBe(4);
    expect(status.longestStreak).toBe(7);
    // Next reward previews day 5 (continuation)
    expect(status.nextReward.gold).toBe(250);
  });

  it("returns canClaimToday: false when last_claim_date is today", async () => {
    const today = utcToday();
    vi.mocked(getPool).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [{ current_streak: 3, longest_streak: 3, last_claim_date: today }],
      }),
    } as never);

    const status = await getStreakStatus(PLAYER_ID);

    expect(status.canClaimToday).toBe(false);
    expect(status.currentStreak).toBe(3);
  });

  it("returns canClaimToday: true and resets preview when streak is broken", async () => {
    const threeDaysAgo = dateOffset(-3);
    vi.mocked(getPool).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [{ current_streak: 5, longest_streak: 9, last_claim_date: threeDaysAgo }],
      }),
    } as never);

    const status = await getStreakStatus(PLAYER_ID);

    expect(status.canClaimToday).toBe(true);
    // Streak will reset to 1 — preview should be day 1 reward
    expect(status.nextReward.gold).toBe(50);
    expect(status.nextReward.xp).toBe(0);
  });

  it("returns null lastClaimDate and canClaimToday: true for new players", async () => {
    vi.mocked(getPool).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [{ current_streak: 0, longest_streak: 0, last_claim_date: null }],
      }),
    } as never);

    const status = await getStreakStatus(PLAYER_ID);

    expect(status.lastClaimDate).toBeNull();
    expect(status.canClaimToday).toBe(true);
    expect(status.nextReward.gold).toBe(50); // day 1
  });
});

// ── Streak edge cases (pure logic) ────────────────────────────────────────────

describe("streak edge cases via reward table", () => {
  it("day 28 is a milestone (4th weekly cycle)", () => {
    expect(getRewardForStreakDay(28).bonusItem).toBe(true);
  });

  it("day 21 is a milestone (3rd weekly cycle)", () => {
    expect(getRewardForStreakDay(21).bonusItem).toBe(true);
  });

  it("day 6 is NOT a milestone", () => {
    expect(getRewardForStreakDay(6).bonusItem).toBe(false);
  });

  it("day 13 is NOT a milestone (day before second cycle milestone)", () => {
    expect(getRewardForStreakDay(13).bonusItem).toBe(false);
  });
});

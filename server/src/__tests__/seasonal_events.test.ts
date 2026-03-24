/**
 * Seasonal event framework tests.
 *
 * Covers:
 *   - getActiveSeasonalEvent() — returns active event or null
 *   - getOrJoinEvent()         — creates participation row or returns existing
 *   - awardEventPoints()       — accumulates points correctly
 *   - claimEventReward()       — validates points threshold and de-duplication
 *   - getEventLeaderboard()    — maps rows with username join
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client", () => ({
  getDb:   vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getPool } from "../db/client";
import {
  getActiveSeasonalEvent,
  getOrJoinEvent,
  awardEventPoints,
  claimEventReward,
  getEventLeaderboard,
} from "../db/seasonalEvents";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockPool(rows: unknown[] = [], rowCount = rows.length) {
  const pool = { query: vi.fn().mockResolvedValue({ rows, rowCount }) };
  vi.mocked(getPool).mockReturnValue(pool as never);
  return pool;
}

function mockPoolSequence(responses: Array<{ rows: unknown[]; rowCount?: number }>) {
  const pool = { query: vi.fn() };
  for (const resp of responses) {
    pool.query.mockResolvedValueOnce({ rows: resp.rows, rowCount: resp.rowCount ?? resp.rows.length });
  }
  vi.mocked(getPool).mockReturnValue(pool as never);
  return pool;
}

const ACTIVE_ROW = {
  id:              "evt-001",
  name:            "Harvest Festival",
  description:     "Collect crops and earn rewards!",
  theme:           "harvest",
  starts_at:       new Date("2026-03-01T00:00:00Z"),
  ends_at:         new Date("2026-03-31T00:00:00Z"),
  is_active:       true,
  reward_tiers:    [{ points: 100, itemId: "pumpkin_hat", label: "Pumpkin Hat" }],
  quest_chain_ids: ["chain-abc"],
};

// ── getActiveSeasonalEvent() ──────────────────────────────────────────────────

describe("getActiveSeasonalEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns mapped event when a row is found", async () => {
    mockPool([ACTIVE_ROW]);
    const event = await getActiveSeasonalEvent();
    expect(event).not.toBeNull();
    expect(event!.id).toBe("evt-001");
    expect(event!.name).toBe("Harvest Festival");
    expect(event!.isActive).toBe(true);
    expect(event!.rewardTiers).toHaveLength(1);
    expect(event!.rewardTiers[0].itemId).toBe("pumpkin_hat");
    expect(event!.questChainIds).toContain("chain-abc");
    // Dates must be ISO strings
    expect(event!.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event!.endsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null when no active event exists", async () => {
    mockPool([]);
    const event = await getActiveSeasonalEvent();
    expect(event).toBeNull();
  });

  it("defaults reward_tiers to empty array when null in DB", async () => {
    mockPool([{ ...ACTIVE_ROW, reward_tiers: null, quest_chain_ids: null }]);
    const event = await getActiveSeasonalEvent();
    expect(event!.rewardTiers).toEqual([]);
    expect(event!.questChainIds).toEqual([]);
  });
});

// ── getOrJoinEvent() ──────────────────────────────────────────────────────────

describe("getOrJoinEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing participation record", async () => {
    const participationRow = {
      player_id:       "player-1",
      event_id:        "evt-001",
      points:          150,
      claimed_rewards: ["pumpkin_hat"],
    };
    mockPoolSequence([
      { rows: [] },             // INSERT ... ON CONFLICT DO NOTHING
      { rows: [participationRow] }, // SELECT
    ]);

    const p = await getOrJoinEvent("player-1", "evt-001");
    expect(p.playerId).toBe("player-1");
    expect(p.eventId).toBe("evt-001");
    expect(p.points).toBe(150);
    expect(p.claimedRewards).toContain("pumpkin_hat");
  });

  it("returns zero-point record for a new participant", async () => {
    const newRow = {
      player_id:       "player-2",
      event_id:        "evt-001",
      points:          0,
      claimed_rewards: [],
    };
    mockPoolSequence([
      { rows: [] },
      { rows: [newRow] },
    ]);

    const p = await getOrJoinEvent("player-2", "evt-001");
    expect(p.points).toBe(0);
    expect(p.claimedRewards).toEqual([]);
  });

  it("defaults claimed_rewards to empty array when null in DB", async () => {
    const row = {
      player_id: "p3", event_id: "e1", points: 0, claimed_rewards: null,
    };
    mockPoolSequence([{ rows: [] }, { rows: [row] }]);
    const p = await getOrJoinEvent("p3", "e1");
    expect(p.claimedRewards).toEqual([]);
  });
});

// ── awardEventPoints() ────────────────────────────────────────────────────────

describe("awardEventPoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the new total after awarding points", async () => {
    mockPool([{ points: 200 }]);
    const total = await awardEventPoints("player-1", "evt-001", 50);
    expect(total).toBe(200);
  });

  it("returns 0 when RETURNING gives no rows (edge case)", async () => {
    mockPool([]);
    const total = await awardEventPoints("player-1", "evt-999", 50);
    expect(total).toBe(0);
  });

  it("issues an INSERT ... ON CONFLICT ... RETURNING query", async () => {
    const pool = mockPool([{ points: 50 }]);
    await awardEventPoints("player-1", "evt-001", 50);
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/ON CONFLICT/i);
    expect(sql).toMatch(/RETURNING/i);
  });
});

// ── claimEventReward() ────────────────────────────────────────────────────────

describe("claimEventReward", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when player has no participation row", async () => {
    mockPool([]);
    const ok = await claimEventReward("p1", "evt-001", "pumpkin_hat", 100);
    expect(ok).toBe(false);
  });

  it("returns false when player has insufficient points", async () => {
    mockPool([{ points: 50, claimed_rewards: [] }]);
    const ok = await claimEventReward("p1", "evt-001", "pumpkin_hat", 100);
    expect(ok).toBe(false);
  });

  it("returns false when reward already claimed", async () => {
    mockPool([{ points: 200, claimed_rewards: ["pumpkin_hat"] }]);
    const ok = await claimEventReward("p1", "evt-001", "pumpkin_hat", 100);
    expect(ok).toBe(false);
  });

  it("returns true and issues UPDATE when claim is valid", async () => {
    const pool = mockPoolSequence([
      { rows: [{ points: 200, claimed_rewards: [] }] }, // SELECT
      { rows: [] },                                       // UPDATE
    ]);
    const ok = await claimEventReward("p1", "evt-001", "pumpkin_hat", 100);
    expect(ok).toBe(true);
    expect(pool.query).toHaveBeenCalledTimes(2);
    const updateSql: string = pool.query.mock.calls[1][0];
    expect(updateSql).toMatch(/UPDATE player_event_participation/i);
  });

  it("handles null claimed_rewards column as empty array", async () => {
    const pool = mockPoolSequence([
      { rows: [{ points: 200, claimed_rewards: null }] },
      { rows: [] },
    ]);
    const ok = await claimEventReward("p1", "evt-001", "pumpkin_hat", 100);
    expect(ok).toBe(true);
  });
});

// ── getEventLeaderboard() ─────────────────────────────────────────────────────

describe("getEventLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns mapped leaderboard entries", async () => {
    mockPool([
      { player_id: "p1", username: "Alice", score: 500 },
      { player_id: "p2", username: "Bob",   score: 300 },
    ]);
    const board = await getEventLeaderboard("evt-001");
    expect(board).toHaveLength(2);
    expect(board[0].playerId).toBe("p1");
    expect(board[0].username).toBe("Alice");
    expect(board[0].score).toBe(500);
  });

  it("returns empty array when no participants", async () => {
    mockPool([]);
    const board = await getEventLeaderboard("evt-001");
    expect(board).toEqual([]);
  });
});

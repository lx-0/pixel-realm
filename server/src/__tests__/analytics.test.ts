/**
 * Analytics endpoints — unit tests.
 *
 * Covers the telemetry write routes:
 *   POST /api/analytics/session/start
 *   POST /api/analytics/session/end
 *   POST /api/analytics/zone/enter
 *   POST /api/analytics/zone/exit
 *   POST /api/analytics/client-error   ← added in PIX-457
 *
 * Uses mocked DB pool so no real PostgreSQL connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../db/client", () => ({
  getDb:    vi.fn(),
  getPool:  vi.fn(),
  closeDb:  vi.fn(),
}));

import { getPool } from "../db/client";
import {
  startSession,
  endSession,
  enterZone,
  exitZone,
  logClientError,
} from "../db/analytics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockPool(rows: unknown[] = [], rowCount = 1) {
  const pool = { query: vi.fn().mockResolvedValue({ rows, rowCount }) };
  vi.mocked(getPool).mockReturnValue(pool as any);
  return pool;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("startSession", () => {
  it("inserts a session and returns its id", async () => {
    const pool = mockPool([{ id: "sess-1" }]);
    const id = await startSession("player-uuid");
    expect(id).toBe("sess-1");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO player_sessions"),
      ["player-uuid"],
    );
  });
});

describe("endSession", () => {
  it("updates session with ended_at and duration", async () => {
    const pool = mockPool();
    await endSession("sess-1", "player-uuid");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE player_sessions"),
      ["sess-1", "player-uuid"],
    );
  });
});

describe("enterZone", () => {
  it("inserts a zone visit and returns its id", async () => {
    const pool = mockPool([{ id: "visit-1" }]);
    const id = await enterZone("player-uuid", "sess-1", "zone2");
    expect(id).toBe("visit-1");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO zone_visits"),
      ["player-uuid", "sess-1", "zone2"],
    );
  });
});

describe("exitZone", () => {
  it("updates zone visit with exited_at and duration", async () => {
    const pool = mockPool();
    await exitZone("visit-1");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE zone_visits"),
      ["visit-1"],
    );
  });
});

describe("logClientError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a client_errors row with all fields", async () => {
    const pool = mockPool();
    await logClientError({
      playerId:  "anon-uuid",
      sessionId: "sess-1",
      message:   "Cannot read properties of undefined",
      source:    "game.js",
      line:      42,
      col:       7,
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO client_errors"),
      ["anon-uuid", "sess-1", "Cannot read properties of undefined", "game.js", 42, 7],
    );
  });

  it("inserts with null optional fields when omitted", async () => {
    const pool = mockPool();
    await logClientError({ playerId: "anon-uuid", message: "Unhandled rejection" });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO client_errors"),
      ["anon-uuid", null, "Unhandled rejection", null, null, null],
    );
  });

  it("propagates DB errors so callers can handle best-effort failures", async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error("DB down")) };
    vi.mocked(getPool).mockReturnValue(pool as any);
    await expect(
      logClientError({ playerId: "anon-uuid", message: "oops" }),
    ).rejects.toThrow("DB down");
  });
});

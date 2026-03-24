/**
 * Prestige system tests.
 *
 * Covers:
 *   - getPrestigeBonuses() — pure bonus calculations
 *   - performPrestigeReset() — success path, NOT_MAX_LEVEL, MAX_PRESTIGE_REACHED, PLAYER_STATE_NOT_FOUND
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getDb } from "../db/client";
import {
  getPrestigeBonuses,
  performPrestigeReset,
  MAX_PRESTIGE,
  PRESTIGE_BONUS_PER_LEVEL,
} from "../db/prestige";

// ── Mock chain factories ──────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej ?? undefined),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(rows).catch(fn),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
    limit: vi.fn().mockResolvedValue(rows),
  };
  chain.from    = vi.fn().mockReturnValue(chain);
  chain.where   = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeUpdateChain() {
  const whereResult = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve([]).then(res, rej ?? undefined),
  };
  return {
    set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(whereResult) }),
  };
}

function buildMockDb(opts: { selectRows?: unknown[] } = {}) {
  const { selectRows = [] } = opts;
  return {
    select: vi.fn().mockReturnValue(makeSelectChain(selectRows)),
    update: vi.fn().mockReturnValue(makeUpdateChain()),
  };
}

// ── Test data ─────────────────────────────────────────────────────────────────

const BASE_STATE = {
  playerId:            "player-1",
  level:               50,
  xp:                  67240,
  hp:                  100,
  maxHp:               100,
  mana:                50,
  maxMana:             50,
  gold:                0,
  currentZone:         "zone1",
  pveKills:            0,
  prestigeLevel:       0,
  totalPrestigeResets: 0,
  lastSeenAt:          new Date(),
  updatedAt:           new Date(),
};

// ── getPrestigeBonuses() ──────────────────────────────────────────────────────

describe("getPrestigeBonuses", () => {
  it("returns 0 multiplier for prestige level 0", () => {
    expect(getPrestigeBonuses(0).statMultiplier).toBe(0);
  });

  it("returns correct multiplier for each prestige level", () => {
    for (let p = 1; p <= MAX_PRESTIGE; p++) {
      const expected = p * PRESTIGE_BONUS_PER_LEVEL;
      expect(getPrestigeBonuses(p).statMultiplier).toBeCloseTo(expected);
    }
  });

  it("caps multiplier at MAX_PRESTIGE when given a value above the cap", () => {
    const atCap   = getPrestigeBonuses(MAX_PRESTIGE).statMultiplier;
    const aboveCap = getPrestigeBonuses(MAX_PRESTIGE + 5).statMultiplier;
    expect(aboveCap).toBeCloseTo(atCap);
  });

  it("clamps negative prestige to 0", () => {
    expect(getPrestigeBonuses(-1).statMultiplier).toBe(0);
  });
});

// ── performPrestigeReset() ────────────────────────────────────────────────────

describe("performPrestigeReset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resets level/xp and increments prestige on a max-level player", async () => {
    const db = buildMockDb({ selectRows: [BASE_STATE] });
    vi.mocked(getDb).mockReturnValue(db as never);

    const result = await performPrestigeReset("player-1");

    expect(result.newPrestigeLevel).toBe(1);
    expect(result.bonuses.statMultiplier).toBeCloseTo(PRESTIGE_BONUS_PER_LEVEL);
    // verify update was called
    expect(db.update).toHaveBeenCalled();
    const setArg = (db.update().set as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(setArg?.level).toBe(1);
    expect(setArg?.xp).toBe(0);
    expect(setArg?.prestigeLevel).toBe(1);
    expect(setArg?.totalPrestigeResets).toBe(1);
  });

  it("throws NOT_MAX_LEVEL when player is below level 50", async () => {
    const db = buildMockDb({ selectRows: [{ ...BASE_STATE, level: 49 }] });
    vi.mocked(getDb).mockReturnValue(db as never);

    await expect(performPrestigeReset("player-1")).rejects.toThrow("NOT_MAX_LEVEL");
  });

  it("throws MAX_PRESTIGE_REACHED when player is at the prestige cap", async () => {
    const db = buildMockDb({
      selectRows: [{ ...BASE_STATE, prestigeLevel: MAX_PRESTIGE }],
    });
    vi.mocked(getDb).mockReturnValue(db as never);

    await expect(performPrestigeReset("player-1")).rejects.toThrow("MAX_PRESTIGE_REACHED");
  });

  it("throws PLAYER_STATE_NOT_FOUND when no state row exists", async () => {
    const db = buildMockDb({ selectRows: [] });
    vi.mocked(getDb).mockReturnValue(db as never);

    await expect(performPrestigeReset("no-such-player")).rejects.toThrow(
      "PLAYER_STATE_NOT_FOUND",
    );
  });

  it("allows reset at prestige 9 (one below cap)", async () => {
    const db = buildMockDb({
      selectRows: [{ ...BASE_STATE, prestigeLevel: MAX_PRESTIGE - 1 }],
    });
    vi.mocked(getDb).mockReturnValue(db as never);

    const result = await performPrestigeReset("player-1");
    expect(result.newPrestigeLevel).toBe(MAX_PRESTIGE);
  });
});

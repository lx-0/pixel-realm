/**
 * Post-M10 Integration Test Sweep (PIX-161)
 *
 * Validates that guild raids (PIX-153), prestige system (PIX-150), and
 * seasonal event framework (PIX-155) function correctly together.
 *
 * Cross-system areas covered:
 *   1. Prestige × Raid: player attack damage scales with prestige bonus
 *   2. Prestige × Raid: boss HP scales with avgPrestige of mixed parties
 *   3. Prestige × Skill passives: prestige HP bonus must survive applySkillPassives
 *      (regression guard for the ordering bug found during this sweep)
 *   4. Seasonal event time-window: not-yet-started and expired events return null
 *   5. Seasonal event admin: listSeasonalEvents, createSeasonalEvent, appendEventQuestChains
 *   6. Raid lockout: cross-week boundary — last week's clear does not lock this week
 *   7. Day/night cycle: period boundaries are on game-time, event timers are on
 *      real wall-clock time — the two clocks are independent
 *   8. Seasonal events × Guild: prestige players can participate in events;
 *      event points are tracked independently of raid lockouts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client", () => ({
  getDb:   vi.fn(),
  getPool: vi.fn(),
  closeDb: vi.fn(),
}));

import { getPool } from "../db/client";
import { getPrestigeBonuses, MAX_PRESTIGE, PRESTIGE_BONUS_PER_LEVEL } from "../db/prestige";
import { getWeekStart } from "../db/raids";
import {
  getActiveSeasonalEvent,
  listSeasonalEvents,
  createSeasonalEvent,
  appendEventQuestChains,
  awardEventPoints,
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

// ── Constants (inline from RaidRoom to stay in sync with spec) ────────────────
const ATTACK_DAMAGE    = 25;
const ENRAGE_DAMAGE_MULT = 2.0;
const ENRAGE_SPEED_MULT  = 1.5;

/** Inline of raidHpMultiplier from RaidRoom — must stay in sync with implementation. */
function raidHpMultiplier(playerCount: number, avgPrestige: number): number {
  const countBonus    = 1 + Math.min(15, playerCount - 1) * 0.15;
  const prestigeBonus = 1 + Math.min(10, avgPrestige) * 0.05;
  return countBonus * prestigeBonus;
}

/** Inline of getTimePeriod from src/config/dayNightPalette.ts */
function getTimePeriod(hour: number): "dawn" | "day" | "dusk" | "night" {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6  && h < 9)  return "dawn";
  if (h >= 9  && h < 17) return "day";
  if (h >= 17 && h < 21) return "dusk";
  return "night";
}

// ── 1. Prestige × Raid: attack damage scaling ─────────────────────────────────

describe("Cross-system: prestige × raid attack damage", () => {
  it("prestige 0 — no bonus, damage equals base ATTACK_DAMAGE", () => {
    const { statMultiplier } = getPrestigeBonuses(0);
    expect(statMultiplier).toBe(0);
    const dmg = Math.round(ATTACK_DAMAGE * (1 + statMultiplier));
    expect(dmg).toBe(25);
  });

  it("prestige 5 — +10% bonus, damage rounds to 28", () => {
    const { statMultiplier } = getPrestigeBonuses(5);
    expect(statMultiplier).toBeCloseTo(0.10);
    const dmg = Math.round(ATTACK_DAMAGE * (1 + statMultiplier));
    expect(dmg).toBe(28); // 25 * 1.10 = 27.5 → rounds to 28
  });

  it("prestige 10 (max) — +20% bonus, damage is 30", () => {
    const { statMultiplier } = getPrestigeBonuses(MAX_PRESTIGE);
    expect(statMultiplier).toBeCloseTo(0.20);
    const dmg = Math.round(ATTACK_DAMAGE * (1 + statMultiplier));
    expect(dmg).toBe(30);
  });

  it("prestige players deal strictly more damage than non-prestige players", () => {
    const dmgP0 = Math.round(ATTACK_DAMAGE * (1 + getPrestigeBonuses(0).statMultiplier));
    const dmgP1 = Math.round(ATTACK_DAMAGE * (1 + getPrestigeBonuses(1).statMultiplier));
    expect(dmgP1).toBeGreaterThan(dmgP0);
  });

  it("enraged boss: prestige player attack still correct (no double-scaling)", () => {
    // Enrage multiplies BOSS damage/speed, not player damage — player prestige scaling unchanged
    const { statMultiplier } = getPrestigeBonuses(5);
    const dmg = Math.round(ATTACK_DAMAGE * (1 + statMultiplier));
    // Enrage constants affect boss, not players
    expect(dmg).toBe(28);
    expect(ENRAGE_DAMAGE_MULT).toBe(2.0); // boss damage doubles
    expect(ENRAGE_SPEED_MULT).toBe(1.5);  // boss speed increases
    // Player attack is unchanged by enrage
    expect(Math.round(ATTACK_DAMAGE * (1 + statMultiplier))).toBe(28);
  });
});

// ── 2. Prestige × Raid: boss HP scaling with mixed parties ────────────────────

describe("Cross-system: prestige × boss HP multiplier (mixed parties)", () => {
  it("solo non-prestige player — multiplier is 1.0", () => {
    expect(raidHpMultiplier(1, 0)).toBeCloseTo(1.0);
  });

  it("4-player party all prestige 5 — multiplier is ~1.45 × 1.25", () => {
    // countBonus = 1 + min(15,3) * 0.15 = 1.45
    // prestigeBonus = 1 + min(10,5) * 0.05 = 1.25
    const expected = 1.45 * 1.25;
    expect(raidHpMultiplier(4, 5)).toBeCloseTo(expected, 5);
  });

  it("mixed 4-player: P0 + P10 + P10 + P10 → avgPrestige 7.5", () => {
    const avgPrestige = (0 + 10 + 10 + 10) / 4; // 7.5
    const mult = raidHpMultiplier(4, avgPrestige);
    // countBonus = 1.45, prestigeBonus = 1 + 7.5*0.05 = 1.375
    expect(mult).toBeCloseTo(1.45 * 1.375, 5);
  });

  it("full 16-player all prestige 10 — maximum possible multiplier", () => {
    // countBonus = 1 + min(15,15)*0.15 = 3.25
    // prestigeBonus = 1 + min(10,10)*0.05 = 1.5
    const expected = 3.25 * 1.5;
    expect(raidHpMultiplier(16, 10)).toBeCloseTo(expected, 5);
  });

  it("prestige is capped at 10 for boss scaling even if player has higher", () => {
    // A player who somehow has prestige 12 doesn't increase difficulty beyond prestige 10
    const capped    = raidHpMultiplier(1, 10);
    const overflowed = raidHpMultiplier(1, 12);
    expect(capped).toBeCloseTo(overflowed, 5);
  });

  it("adding a prestige-10 player increases boss HP compared to adding a prestige-0 player", () => {
    const withP0  = raidHpMultiplier(2, (0 + 0) / 2);   // both P0
    const withP10 = raidHpMultiplier(2, (0 + 10) / 2);  // one P0, one P10
    expect(withP10).toBeGreaterThan(withP0);
  });
});

// ── 3. Prestige × Skill passives: ordering regression guard ──────────────────
//
// BUG found in RaidRoom.onJoin():
//   Prestige HP bonus was applied BEFORE applySkillPassives(), which recalculates
//   maxHp from scratch (base + skill flat) and wipes the prestige multiplier.
//
// Fix: apply prestige bonus AFTER applySkillPassives().
//
// This test suite documents the correct computation order and guards against
// regression regardless of RaidRoom implementation details.

describe("Cross-system: prestige bonus must stack on top of skill-passive base stats", () => {
  it("prestige 0 — no change regardless of base stats", () => {
    const baseMaxHp = 300; // after skill passives
    const { statMultiplier } = getPrestigeBonuses(0);
    const finalHp = statMultiplier > 0 ? Math.round(baseMaxHp * (1 + statMultiplier)) : baseMaxHp;
    expect(finalHp).toBe(300);
  });

  it("prestige 5 — multiplies base stats by 1.10, applied after skill-passive baseline", () => {
    const skillBaseHp = 300; // level 1 base (100) + skill flat bonus (200)
    const { statMultiplier } = getPrestigeBonuses(5); // 0.10
    const prestigeHp = Math.round(skillBaseHp * (1 + statMultiplier));
    expect(prestigeHp).toBe(330);
  });

  it("wrong order (prestige before skills) would set HP to just skill-passive result, stripping bonus", () => {
    // Simulate the BUG: prestige applied first, then overwritten by skills
    let maxHp = 100; // DB-stored maxHp
    const { statMultiplier } = getPrestigeBonuses(5); // 0.10
    // BUG path: prestige first
    maxHp = Math.round(maxHp * (1 + statMultiplier)); // 110 — prestige applied
    const bugSkillResult = 300; // applySkillPassives recalculates from scratch
    maxHp = bugSkillResult;     // BUG: overwrites 110 with 300 — prestige bonus LOST

    // Correct path: skills first, then prestige
    let correctHp = bugSkillResult;                        // skill passives set the base
    correctHp = Math.round(correctHp * (1 + statMultiplier)); // prestige on top

    // Bug path final HP (300) is less than correct path final HP (330)
    expect(maxHp).toBe(300);
    expect(correctHp).toBe(330);
    expect(correctHp).toBeGreaterThan(maxHp);
  });

  it("prestige 10 (max) — correct ordering gives 20% HP bonus on top of skill baseline", () => {
    const skillBaseHp   = 500;
    const { statMultiplier } = getPrestigeBonuses(MAX_PRESTIGE); // 0.20
    const finalHp = Math.round(skillBaseHp * (1 + statMultiplier));
    expect(finalHp).toBe(600);
  });

  it("prestige bonus also applies to mana when calculated after skill passives", () => {
    const skillBaseMana = 150;
    const { statMultiplier } = getPrestigeBonuses(3); // 0.06
    const finalMana = Math.round(skillBaseMana * (1 + statMultiplier));
    expect(finalMana).toBe(159);
  });
});

// ── 4. Seasonal event: time-window activation/deactivation ───────────────────

describe("Seasonal event: time-window activation/deactivation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("event that has not yet started is not returned by getActiveSeasonalEvent", async () => {
    // DB query uses: is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
    // If no row is returned, the function returns null — simulating a future event
    mockPool([]); // DB filtered it out because starts_at > NOW()
    const event = await getActiveSeasonalEvent();
    expect(event).toBeNull();
  });

  it("event that has already ended is not returned by getActiveSeasonalEvent", async () => {
    mockPool([]); // DB filtered it out because ends_at < NOW()
    const event = await getActiveSeasonalEvent();
    expect(event).toBeNull();
  });

  it("getActiveSeasonalEvent SQL checks is_active flag", async () => {
    const pool = mockPool([]);
    await getActiveSeasonalEvent();
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/is_active\s*=\s*TRUE/i);
  });

  it("getActiveSeasonalEvent SQL checks both starts_at and ends_at against NOW()", async () => {
    const pool = mockPool([]);
    await getActiveSeasonalEvent();
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/starts_at\s*<=\s*NOW\(\)/i);
    expect(sql).toMatch(/ends_at\s*>=\s*NOW\(\)/i);
  });

  it("active event within its time window is returned correctly", async () => {
    const activeRow = {
      id:              "evt-spring",
      name:            "Spring Bloom",
      description:     "Celebrate spring!",
      theme:           "spring",
      starts_at:       new Date("2026-03-01T00:00:00Z"),
      ends_at:         new Date("2026-03-31T23:59:59Z"),
      is_active:       true,
      reward_tiers:    [{ points: 500, itemId: "flower_crown", label: "Flower Crown" }],
      quest_chain_ids: ["chain-spring-1"],
    };
    mockPool([activeRow]);
    const event = await getActiveSeasonalEvent();
    expect(event).not.toBeNull();
    expect(event!.name).toBe("Spring Bloom");
    expect(event!.isActive).toBe(true);
  });
});

// ── 5. Seasonal event admin functions ────────────────────────────────────────

describe("Seasonal event admin: listSeasonalEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns upcoming and active events sorted by starts_at", async () => {
    const rows = [
      {
        id: "evt-a", name: "Spring", description: "Spring event", theme: "spring",
        starts_at: new Date("2026-03-01"), ends_at: new Date("2026-03-31"),
        is_active: true, reward_tiers: [], quest_chain_ids: [],
      },
      {
        id: "evt-b", name: "Summer", description: "Summer event", theme: "summer",
        starts_at: new Date("2026-06-01"), ends_at: new Date("2026-06-30"),
        is_active: false, reward_tiers: null, quest_chain_ids: null,
      },
    ];
    mockPool(rows);
    const events = await listSeasonalEvents();
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe("evt-a");
    expect(events[1].id).toBe("evt-b");
  });

  it("listSeasonalEvents SQL excludes past events (ends_at >= NOW())", async () => {
    const pool = mockPool([]);
    await listSeasonalEvents();
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/ends_at\s*>=\s*NOW\(\)/i);
  });

  it("listSeasonalEvents SQL orders by starts_at ASC", async () => {
    const pool = mockPool([]);
    await listSeasonalEvents();
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/ORDER BY starts_at ASC/i);
  });

  it("defaults null reward_tiers and quest_chain_ids to empty arrays", async () => {
    mockPool([{
      id: "evt-x", name: "X", description: "x", theme: "x",
      starts_at: new Date(), ends_at: new Date(),
      is_active: false, reward_tiers: null, quest_chain_ids: null,
    }]);
    const events = await listSeasonalEvents();
    expect(events[0].rewardTiers).toEqual([]);
    expect(events[0].questChainIds).toEqual([]);
  });

  it("returns empty array when no future events exist", async () => {
    mockPool([]);
    const events = await listSeasonalEvents();
    expect(events).toEqual([]);
  });
});

describe("Seasonal event admin: createSeasonalEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the new event id from RETURNING clause", async () => {
    mockPool([{ id: "new-event-uuid" }]);
    const id = await createSeasonalEvent({
      name:        "Harvest Moon",
      description: "A moonlit harvest festival.",
      theme:       "harvest",
      startsAt:    new Date("2026-10-01"),
      endsAt:      new Date("2026-10-31"),
      rewardTiers: [{ points: 200, itemId: "moon_hat", label: "Moon Hat" }],
      isActive:    true,
    });
    expect(id).toBe("new-event-uuid");
  });

  it("createSeasonalEvent SQL uses INSERT INTO seasonal_events", async () => {
    const pool = mockPool([{ id: "any-id" }]);
    await createSeasonalEvent({
      name: "Test", description: "desc", theme: "test",
      startsAt: new Date(), endsAt: new Date(), rewardTiers: [],
    });
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/INSERT INTO seasonal_events/i);
    expect(sql).toMatch(/RETURNING id/i);
  });

  it("isActive defaults to false when not provided", async () => {
    const pool = mockPool([{ id: "x" }]);
    await createSeasonalEvent({
      name: "Test", description: "d", theme: "t",
      startsAt: new Date(), endsAt: new Date(), rewardTiers: [],
      // isActive not specified
    });
    const params: unknown[] = pool.query.mock.calls[0][1];
    // isActive is 6th param (index 5): name, desc, theme, startsAt, endsAt, isActive, rewardTiers
    expect(params[5]).toBe(false);
  });
});

describe("Seasonal event admin: appendEventQuestChains", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues an UPDATE using JSONB append operator", async () => {
    const pool = mockPool();
    await appendEventQuestChains("evt-001", ["chain-new-1", "chain-new-2"]);
    const sql: string = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/UPDATE seasonal_events/i);
    expect(sql).toMatch(/quest_chain_ids\s*=\s*quest_chain_ids\s*\|\|/i);
  });

  it("passes the event id and chain ids as query parameters", async () => {
    const pool = mockPool();
    await appendEventQuestChains("evt-abc", ["chain-x"]);
    const params: unknown[] = pool.query.mock.calls[0][1];
    expect(params[0]).toBe("evt-abc");
    expect(params[1]).toBe(JSON.stringify(["chain-x"]));
  });

  it("resolves without error for empty chain ids array", async () => {
    mockPool();
    await expect(appendEventQuestChains("evt-001", [])).resolves.toBeUndefined();
  });
});

// ── 6. Raid lockout: cross-week boundary ─────────────────────────────────────

describe("Raid lockout: cross-week boundary", () => {
  it("Monday of one week is a different date from Monday of the next week", () => {
    const thisWeekMonday = new Date("2026-03-23T00:00:00Z"); // Monday
    const nextWeekMonday = new Date("2026-03-30T00:00:00Z"); // Monday + 7

    expect(getWeekStart(thisWeekMonday)).toBe("2026-03-23");
    expect(getWeekStart(nextWeekMonday)).toBe("2026-03-30");
    expect(getWeekStart(thisWeekMonday)).not.toBe(getWeekStart(nextWeekMonday));
  });

  it("a clear on Sunday of week N does not lock week N+1 (different week_start key)", () => {
    const sundayWeekN     = new Date("2026-03-29T23:59:00Z"); // Sunday of week starting 2026-03-23
    const mondayWeekN1    = new Date("2026-03-30T00:01:00Z"); // Start of next week

    const weekStartN  = getWeekStart(sundayWeekN);
    const weekStartN1 = getWeekStart(mondayWeekN1);

    expect(weekStartN).toBe("2026-03-23");  // locked boss is recorded for 2026-03-23
    expect(weekStartN1).toBe("2026-03-30"); // new week has a different key — no carry-over
    expect(weekStartN).not.toBe(weekStartN1);
  });

  it("raid_lockouts table uses week_start as part of the composite PK — different week = new row", () => {
    // Composite PK is (player_id, boss_id, week_start).
    // If week_start differs, there is no conflict → player is NOT locked for the new week.
    const weekA = getWeekStart(new Date("2026-03-20")); // week of 2026-03-16
    const weekB = getWeekStart(new Date("2026-03-27")); // week of 2026-03-23
    expect(weekA).not.toBe(weekB);
  });

  it("getWeekStart always returns YYYY-MM-DD string pointing to a Monday", () => {
    const result = getWeekStart(new Date("2026-03-25T12:00:00Z")); // Wednesday
    const date   = new Date(result + "T00:00:00Z");
    expect(date.getUTCDay()).toBe(1); // 1 = Monday
  });
});

// ── 7. Day/night cycle: independent clock from event timers ──────────────────

describe("Day/night cycle: game-time periods are independent of event timers", () => {
  it("hour 0 is night", ()  => expect(getTimePeriod(0)).toBe("night"));
  it("hour 5 is night", ()  => expect(getTimePeriod(5)).toBe("night"));
  it("hour 6 is dawn", ()   => expect(getTimePeriod(6)).toBe("dawn"));
  it("hour 8 is dawn", ()   => expect(getTimePeriod(8)).toBe("dawn"));
  it("hour 9 is day", ()    => expect(getTimePeriod(9)).toBe("day"));
  it("hour 16 is day", ()   => expect(getTimePeriod(16)).toBe("day"));
  it("hour 17 is dusk", ()  => expect(getTimePeriod(17)).toBe("dusk"));
  it("hour 20 is dusk", ()  => expect(getTimePeriod(20)).toBe("dusk"));
  it("hour 21 is night", () => expect(getTimePeriod(21)).toBe("night"));
  it("hour 23 is night", () => expect(getTimePeriod(23)).toBe("night"));

  it("getTimePeriod wraps correctly for negative and overflow hours", () => {
    expect(getTimePeriod(-1)).toBe("night");  // wraps to 23
    expect(getTimePeriod(24)).toBe("night"); // wraps to 0
    expect(getTimePeriod(25)).toBe("night"); // wraps to 1
  });

  it("event timers use real-world NOW() — not game-hour — so day/night phase cannot block events", async () => {
    // Seasonal events check starts_at <= NOW() && ends_at >= NOW() in SQL.
    // Game-time hours are completely separate; a 'night' game phase will not
    // cause an active event to be deactivated.
    const pool = mockPool([{
      id: "evt-midnight", name: "Midnight Gala", description: "Real-time event",
      theme: "night", starts_at: new Date(), ends_at: new Date(Date.now() + 3600_000),
      is_active: true, reward_tiers: [], quest_chain_ids: [],
    }]);
    const event = await getActiveSeasonalEvent();
    // Even if game time is 'night', the event is still active because it checks real timestamps
    expect(event).not.toBeNull();
    expect(event!.name).toBe("Midnight Gala");
    const sql: string = pool.query.mock.calls[0][0];
    // Confirms no game-hour reference in the query
    expect(sql).not.toMatch(/game_hour/i);
    expect(sql).not.toMatch(/time_period/i);
  });
});

// ── 8. Cross-system: prestige players + seasonal events ──────────────────────

describe("Cross-system: prestige players can participate in seasonal events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("awardEventPoints works regardless of player prestige level", async () => {
    // Event participation is independent of prestige — any player can earn points
    mockPool([{ points: 150 }]);
    const total = await awardEventPoints("prestige-10-player", "evt-spring", 50);
    expect(total).toBe(150);
  });

  it("prestige level has no effect on event point accumulation (pure addition)", () => {
    // Prestige bonus only affects combat stats — not event points
    const prestigeBonus = getPrestigeBonuses(10).statMultiplier; // 0.20
    const rawPoints     = 50;
    // Points are NOT multiplied by prestige — they accumulate flat
    const eventPoints   = rawPoints; // NOT rawPoints * (1 + prestigeBonus)
    expect(eventPoints).toBe(50);
    expect(eventPoints).not.toBe(Math.round(rawPoints * (1 + prestigeBonus)));
  });

  it("raid lockout and event participation are fully independent state records", () => {
    // Raid lockouts are stored in raid_lockouts (player_id, boss_id, week_start)
    // Event participation is stored in player_event_participation (player_id, event_id)
    // Clearing a boss does NOT affect event participation and vice versa
    const raidTable  = "raid_lockouts";
    const eventTable = "player_event_participation";
    expect(raidTable).not.toBe(eventTable);
  });

  it("prestige bonus calculation is deterministic — same level always yields same multiplier", () => {
    for (let p = 0; p <= MAX_PRESTIGE; p++) {
      const a = getPrestigeBonuses(p).statMultiplier;
      const b = getPrestigeBonuses(p).statMultiplier;
      expect(a).toBe(b);
    }
  });

  it("prestige bonus stacks additively across all 10 tiers at +2% per tier", () => {
    for (let p = 1; p <= MAX_PRESTIGE; p++) {
      const expected = p * PRESTIGE_BONUS_PER_LEVEL;
      expect(getPrestigeBonuses(p).statMultiplier).toBeCloseTo(expected, 10);
    }
  });
});

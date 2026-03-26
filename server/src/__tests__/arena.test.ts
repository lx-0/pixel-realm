/**
 * PvP Arena system integration tests.
 *
 * Covers:
 *   - Matchmaking queue — join/leave, mode selection, rating-bracket matching
 *   - Arena instance lifecycle — creation, start, cleanup
 *   - ELO rating system — win/loss updates, tier promotion/demotion, edge cases
 *   - Spectator mode — join/leave, accuracy of spectator registry
 *   - Match resolution — rating deltas, W/L records, draw/disconnect edge cases
 *   - Leaderboard — ordering, tier assignment, rank lookup
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ArenaManager,
  getTier,
  getTierLabel,
  getTierIcon,
  type ArenaPlayer,
  type ArenaInstance,
  type ArenaMatchResult,
} from "../../../src/systems/ArenaManager";
import { ARENA } from "../../../src/config/constants";

// ── localStorage stub (ArenaManager persists to localStorage) ─────────────────

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem:    (key: string) => localStorageStore[key] ?? null,
  setItem:    (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear:      () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
};
vi.stubGlobal("localStorage", localStorageMock);

// ── Singleton reset helper ────────────────────────────────────────────────────

/** Reset the ArenaManager singleton and clear persisted state between tests. */
function resetArena(): ArenaManager {
  localStorageMock.clear();
  // Reset private singleton instance via type assertion
  (ArenaManager as unknown as { _instance: ArenaManager | null })._instance = null;
  return ArenaManager.getInstance();
}

/** Create a player with a given rating shorthand. */
function makePlayer(id: string, name: string, rating: number = ARENA.ELO_DEFAULT): ArenaPlayer {
  return { id, name, rating, wins: 0, losses: 0, kills: 0, deaths: 0 };
}

// ── getTier() ─────────────────────────────────────────────────────────────────

describe("getTier()", () => {
  it("returns BRONZE below 1200", () => {
    expect(getTier(0)).toBe("BRONZE");
    expect(getTier(999)).toBe("BRONZE");
    expect(getTier(1199)).toBe("BRONZE");
  });

  it("returns SILVER at 1200", () => {
    expect(getTier(1200)).toBe("SILVER");
    expect(getTier(1399)).toBe("SILVER");
  });

  it("returns GOLD at 1400", () => {
    expect(getTier(1400)).toBe("GOLD");
    expect(getTier(1599)).toBe("GOLD");
  });

  it("returns PLATINUM at 1600", () => {
    expect(getTier(1600)).toBe("PLATINUM");
    expect(getTier(1799)).toBe("PLATINUM");
  });

  it("returns DIAMOND at 1800-2199", () => {
    expect(getTier(1800)).toBe("DIAMOND");
    expect(getTier(2199)).toBe("DIAMOND");
  });

  it("returns CHAMPION at 2200+", () => {
    expect(getTier(2200)).toBe("CHAMPION");
    expect(getTier(9999)).toBe("CHAMPION");
  });

  it("uses the ARENA.TIERS config for boundaries", () => {
    expect(getTier(ARENA.TIERS.SILVER.min)).toBe("SILVER");
    expect(getTier(ARENA.TIERS.GOLD.min)).toBe("GOLD");
    expect(getTier(ARENA.TIERS.PLATINUM.min)).toBe("PLATINUM");
    expect(getTier(ARENA.TIERS.DIAMOND.min)).toBe("DIAMOND");
    expect(getTier(ARENA.TIERS.CHAMPION.min)).toBe("CHAMPION");
  });
});

describe("getTierLabel() / getTierIcon()", () => {
  it("returns expected labels for each tier", () => {
    expect(getTierLabel("BRONZE")).toBe("Bronze");
    expect(getTierLabel("SILVER")).toBe("Silver");
    expect(getTierLabel("GOLD")).toBe("Gold");
    expect(getTierLabel("PLATINUM")).toBe("Platinum");
    expect(getTierLabel("DIAMOND")).toBe("Diamond");
    expect(getTierLabel("CHAMPION")).toBe("Champion");
  });

  it("returns non-empty icon strings for each tier", () => {
    const tiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "CHAMPION"] as const;
    for (const tier of tiers) {
      expect(getTierIcon(tier)).toBeTruthy();
    }
  });
});

// ── Player registry ───────────────────────────────────────────────────────────

describe("ArenaManager — player registry", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  it("getOrCreate() creates a player with default ELO rating", () => {
    const p = arena.getOrCreate("p1", "Alice");
    expect(p.id).toBe("p1");
    expect(p.name).toBe("Alice");
    expect(p.rating).toBe(ARENA.ELO_DEFAULT);
    expect(p.wins).toBe(0);
    expect(p.losses).toBe(0);
  });

  it("getOrCreate() returns the same object on subsequent calls", () => {
    const p1 = arena.getOrCreate("p1", "Alice");
    const p2 = arena.getOrCreate("p1", "Alice");
    expect(p1).toBe(p2);
  });

  it("getPlayer() returns undefined for an unknown id", () => {
    expect(arena.getPlayer("nobody")).toBeUndefined();
  });

  it("getPlayer() returns the registered player", () => {
    arena.getOrCreate("p1", "Alice");
    expect(arena.getPlayer("p1")).toBeDefined();
    expect(arena.getPlayer("p1")!.name).toBe("Alice");
  });

  it("persists player data to localStorage on creation", () => {
    arena.getOrCreate("p1", "Alice");
    const saved = JSON.parse(localStorageMock.getItem("arena_data")!);
    expect(saved.players["p1"]).toBeDefined();
    expect(saved.players["p1"].name).toBe("Alice");
  });

  it("loads persisted players after a singleton reset", () => {
    arena.getOrCreate("p1", "Alice");
    // Reset singleton but leave localStorage intact
    (ArenaManager as unknown as { _instance: ArenaManager | null })._instance = null;
    const fresh = ArenaManager.getInstance();
    expect(fresh.getPlayer("p1")).toBeDefined();
    expect(fresh.getPlayer("p1")!.name).toBe("Alice");
  });
});

// ── Matchmaking queue ─────────────────────────────────────────────────────────

describe("ArenaManager — matchmaking queue", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  it("enqueue() adds a player to the queue (no match yet)", () => {
    const p = makePlayer("p1", "Alice");
    const result = arena.enqueue(p, "1v1");
    expect(result).toBeNull();
    expect(arena.isQueued("p1")).toBe(true);
  });

  it("dequeue() removes a queued player", () => {
    const p = makePlayer("p1", "Alice");
    arena.enqueue(p, "1v1");
    arena.dequeue("p1");
    expect(arena.isQueued("p1")).toBe(false);
  });

  it("enqueue() prevents double-queuing the same player", () => {
    const p = makePlayer("p1", "Alice");
    arena.enqueue(p, "1v1");
    const second = arena.enqueue(p, "1v1");
    // null means the player was already queued and was not added again
    expect(second).toBeNull();
  });

  it("enqueue() creates a 1v1 match when two players are queued for 1v1", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    arena.enqueue(p1, "1v1");
    const inst = arena.enqueue(p2, "1v1");
    expect(inst).not.toBeNull();
    expect(inst!.mode).toBe("1v1");
    expect(inst!.players).toHaveLength(2);
  });

  it("both matched players are removed from the queue after match creation", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    arena.enqueue(p1, "1v1");
    arena.enqueue(p2, "1v1");
    expect(arena.isQueued("p1")).toBe(false);
    expect(arena.isQueued("p2")).toBe(false);
  });

  it("1v1 queue does not match while only one player is present", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    const p3 = makePlayer("p3", "Carol");
    arena.enqueue(p1, "1v1");
    expect(arena.isQueued("p1")).toBe(true);
    arena.enqueue(p2, "2v2");  // different mode, should not trigger 1v1 match
    expect(arena.isQueued("p1")).toBe(true);
    arena.enqueue(p3, "1v1");
    // p1 + p3 matched; p2 remains in 2v2 queue
    expect(arena.isQueued("p1")).toBe(false);
    expect(arena.isQueued("p3")).toBe(false);
    expect(arena.isQueued("p2")).toBe(true);
  });

  it("2v2 match requires 4 players", () => {
    const players = [1, 2, 3].map(i => makePlayer(`p${i}`, `Player${i}`));
    players.forEach(p => arena.enqueue(p, "2v2"));
    // Only 3 in queue — no match yet
    expect(arena.isQueued("p1")).toBe(true);

    const p4 = makePlayer("p4", "Player4");
    const inst = arena.enqueue(p4, "2v2");
    expect(inst).not.toBeNull();
    expect(inst!.mode).toBe("2v2");
    expect(inst!.players).toHaveLength(4);
  });

  it("2v2 match created with 4 players includes all 4 and sorts them by rating", () => {
    // Queue 4 players for 2v2 — the 4th enqueue triggers the match.
    // The returned instance players should be sorted by rating (lowest first).
    const p1 = makePlayer("r1", "P1", 1000);
    const p2 = makePlayer("r2", "P2", 1500);
    const p3 = makePlayer("r3", "P3", 1050);
    const p4 = makePlayer("r4", "P4", 1200);
    arena.enqueue(p2, "2v2");
    arena.enqueue(p4, "2v2");
    arena.enqueue(p3, "2v2");
    const inst = arena.enqueue(p1, "2v2");
    expect(inst).not.toBeNull();
    expect(inst!.players).toHaveLength(4);
    // All four players are present
    const ids = inst!.players.map(p => p.id);
    expect(ids).toContain("r1");
    expect(ids).toContain("r2");
    expect(ids).toContain("r3");
    expect(ids).toContain("r4");
    // Sorted by rating ascending: p1(1000), p3(1050), p4(1200), p2(1500)
    const ratings = inst!.players.map(p => p.rating);
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i - 1]);
    }
  });

  it("estimatedWait() returns a positive number", () => {
    expect(arena.estimatedWait("1v1")).toBeGreaterThan(0);
    expect(arena.estimatedWait("2v2")).toBeGreaterThan(0);
  });

  it("estimatedWait() decreases as more players join the queue", () => {
    const waitBefore = arena.estimatedWait("1v1");
    arena.enqueue(makePlayer("p1", "P1"), "1v1");
    const waitAfter = arena.estimatedWait("1v1");
    expect(waitAfter).toBeLessThan(waitBefore);
  });
});

// ── Arena instance lifecycle ──────────────────────────────────────────────────

describe("ArenaManager — instance lifecycle", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  function create1v1(): ArenaInstance {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    arena.enqueue(p1, "1v1");
    return arena.enqueue(p2, "1v1")!;
  }

  it("newly created instance has status 'waiting'", () => {
    const inst = create1v1();
    expect(inst.status).toBe("waiting");
  });

  it("getInstance() returns the created instance by id", () => {
    const inst = create1v1();
    expect(arena.getInstance(inst.id)).toBe(inst);
  });

  it("getInstance() returns undefined for an unknown id", () => {
    expect(arena.getInstance("nonexistent")).toBeUndefined();
  });

  it("startInstance() transitions status to 'active'", () => {
    const inst = create1v1();
    arena.startInstance(inst.id);
    expect(arena.getInstance(inst.id)!.status).toBe("active");
  });

  it("getActiveInstances() returns only active instances", () => {
    const inst1 = create1v1();
    const p3 = makePlayer("p3", "Carol");
    const p4 = makePlayer("p4", "Dave");
    arena.enqueue(p3, "1v1");
    const inst2 = arena.enqueue(p4, "1v1")!;

    arena.startInstance(inst1.id);
    // inst2 still 'waiting'

    const active = arena.getActiveInstances();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(inst1.id);
  });

  it("instance has a valid map assigned", () => {
    const inst = create1v1();
    expect(["gladiator_pit", "shadow_sanctum"]).toContain(inst.map);
  });

  it("instance has a non-empty id", () => {
    const inst = create1v1();
    expect(inst.id).toBeTruthy();
    expect(inst.id.length).toBeGreaterThan(0);
  });

  it("instance startedAt is a recent timestamp", () => {
    const before = Date.now();
    const inst = create1v1();
    expect(inst.startedAt).toBeGreaterThanOrEqual(before);
    expect(inst.startedAt).toBeLessThanOrEqual(Date.now());
  });

  it("instance spectators list starts empty", () => {
    const inst = create1v1();
    expect(inst.spectators).toHaveLength(0);
  });
});

// ── Spectator mode ────────────────────────────────────────────────────────────

describe("ArenaManager — spectator mode", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  function activeInst(): ArenaInstance {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    arena.enqueue(p1, "1v1");
    const inst = arena.enqueue(p2, "1v1")!;
    arena.startInstance(inst.id);
    return arena.getInstance(inst.id)!;
  }

  it("addSpectator() adds a player to a live instance", () => {
    const inst = activeInst();
    const added = arena.addSpectator(inst.id, "spec1");
    expect(added).toBe(true);
    expect(arena.getInstance(inst.id)!.spectators).toContain("spec1");
  });

  it("addSpectator() returns false for a 'waiting' instance", () => {
    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");
    arena.enqueue(p1, "1v1");
    const inst = arena.enqueue(p2, "1v1")!;
    // still 'waiting'
    expect(arena.addSpectator(inst.id, "spec1")).toBe(false);
  });

  it("addSpectator() returns false for a nonexistent instance", () => {
    expect(arena.addSpectator("bogus-id", "spec1")).toBe(false);
  });

  it("addSpectator() does not add the same spectator twice", () => {
    const inst = activeInst();
    arena.addSpectator(inst.id, "spec1");
    arena.addSpectator(inst.id, "spec1");
    expect(arena.getInstance(inst.id)!.spectators.filter(s => s === "spec1")).toHaveLength(1);
  });

  it("multiple spectators can observe the same instance", () => {
    const inst = activeInst();
    arena.addSpectator(inst.id, "spec1");
    arena.addSpectator(inst.id, "spec2");
    arena.addSpectator(inst.id, "spec3");
    expect(arena.getInstance(inst.id)!.spectators).toHaveLength(3);
  });

  it("removeSpectator() removes the spectator from the list", () => {
    const inst = activeInst();
    arena.addSpectator(inst.id, "spec1");
    arena.addSpectator(inst.id, "spec2");
    arena.removeSpectator(inst.id, "spec1");
    expect(arena.getInstance(inst.id)!.spectators).not.toContain("spec1");
    expect(arena.getInstance(inst.id)!.spectators).toContain("spec2");
  });

  it("removeSpectator() is a no-op for a non-spectating player", () => {
    const inst = activeInst();
    expect(() => arena.removeSpectator(inst.id, "nobody")).not.toThrow();
  });

  it("spectator list is accurate after adds and removes", () => {
    const inst = activeInst();
    ["s1", "s2", "s3", "s4"].forEach(id => arena.addSpectator(inst.id, id));
    arena.removeSpectator(inst.id, "s2");
    arena.removeSpectator(inst.id, "s4");
    const specs = arena.getInstance(inst.id)!.spectators;
    expect(specs).toEqual(["s1", "s3"]);
  });
});

// ── ELO rating system — 1v1 ───────────────────────────────────────────────────

describe("ArenaManager — ELO rating updates (1v1)", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  function play1v1(aId: string, bId: string, aRating: number, bRating: number, aWins: boolean) {
    const pA = arena.getOrCreate(aId, aId);
    const pB = arena.getOrCreate(bId, bId);
    pA.rating = aRating;
    pB.rating = bRating;
    arena.enqueue(pA, "1v1");
    const inst = arena.enqueue(pB, "1v1")!;
    arena.startInstance(inst.id);
    const result: ArenaMatchResult = {
      instance: inst,
      winnerIds:  aWins ? [aId] : [bId],
      loserIds:   aWins ? [bId] : [aId],
      kills:      aWins ? { [aId]: 1, [bId]: 0 } : { [aId]: 0, [bId]: 1 },
      durationMs: 60_000,
    };
    return arena.resolveMatch(result);
  }

  it("resolveMatch() returns non-zero deltas for both players", () => {
    const deltas = play1v1("a", "b", 1000, 1000, true);
    expect(deltas["a"]).not.toBe(0);
    expect(deltas["b"]).not.toBe(0);
  });

  it("winner gains rating, loser loses rating", () => {
    play1v1("a", "b", 1000, 1000, true);
    expect(arena.getPlayer("a")!.rating).toBeGreaterThan(1000);
    expect(arena.getPlayer("b")!.rating).toBeLessThan(1000);
  });

  it("rating gain for winner approximately equals loss for loser (equal ratings)", () => {
    const deltas = play1v1("a", "b", 1000, 1000, true);
    expect(deltas["a"] + deltas["b"]).toBeGreaterThanOrEqual(-1);
    expect(deltas["a"] + deltas["b"]).toBeLessThanOrEqual(1);
  });

  it("upset win (lower-rated beats higher-rated) yields larger delta for upset winner", () => {
    // a is 800, b is 1200 → a wins (upset)
    const deltasUpset = play1v1("u_a", "u_b", 800, 1200, true);
    // Favourite wins (a is 1200, b is 800 → a wins)
    resetArena();
    const deltasFav = play1v1("f_a", "f_b", 1200, 800, true);

    // Upset winner gains MORE points than a favourite winning the expected match
    expect(deltasUpset["u_a"]).toBeGreaterThan(deltasFav["f_a"]);
  });

  it("loser cannot drop below 0 rating", () => {
    // Start very low rated player and resolve many losses
    const a = arena.getOrCreate("poor_a", "A");
    const b = arena.getOrCreate("rich_b", "B");
    a.rating = 0;
    b.rating = 2000;
    arena.enqueue(a, "1v1");
    const inst = arena.enqueue(b, "1v1")!;
    arena.startInstance(inst.id);
    const result: ArenaMatchResult = {
      instance:  inst,
      winnerIds: ["rich_b"],
      loserIds:  ["poor_a"],
      kills:     { rich_b: 1, poor_a: 0 },
      durationMs: 45_000,
    };
    arena.resolveMatch(result);
    expect(arena.getPlayer("poor_a")!.rating).toBeGreaterThanOrEqual(0);
  });

  it("win/loss counters increment correctly", () => {
    play1v1("p1", "p2", 1000, 1000, true);
    expect(arena.getPlayer("p1")!.wins).toBe(1);
    expect(arena.getPlayer("p1")!.losses).toBe(0);
    expect(arena.getPlayer("p2")!.wins).toBe(0);
    expect(arena.getPlayer("p2")!.losses).toBe(1);
  });

  it("kill count is recorded for the winner", () => {
    play1v1("p1", "p2", 1000, 1000, true);
    expect(arena.getPlayer("p1")!.kills).toBe(1);
    expect(arena.getPlayer("p2")!.deaths).toBe(1);
  });

  it("match instance status is set to 'finished' after resolveMatch()", () => {
    const a = arena.getOrCreate("p1", "P1");
    const b = arena.getOrCreate("p2", "P2");
    arena.enqueue(a, "1v1");
    const inst = arena.enqueue(b, "1v1")!;
    arena.startInstance(inst.id);
    const result: ArenaMatchResult = {
      instance:  inst,
      winnerIds: ["p1"],
      loserIds:  ["p2"],
      kills:     { p1: 1 },
      durationMs: 30_000,
    };
    arena.resolveMatch(result);
    expect(arena.getInstance(inst.id)!.status).toBe("finished");
  });

  it("ratings persist to localStorage after match resolution", () => {
    play1v1("p1", "p2", 1000, 1000, true);
    const saved = JSON.parse(localStorageMock.getItem("arena_data")!);
    expect(saved.players["p1"].rating).toBeGreaterThan(1000);
    expect(saved.players["p2"].rating).toBeLessThan(1000);
  });
});

// ── ELO rating system — 2v2 ───────────────────────────────────────────────────

describe("ArenaManager — ELO rating updates (2v2)", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  function play2v2(team1Won: boolean) {
    const [ta1, ta2, tb1, tb2] = ["t1a", "t1b", "t2a", "t2b"].map(id => arena.getOrCreate(id, id));
    ta1.rating = 1000; ta2.rating = 1000; tb1.rating = 1000; tb2.rating = 1000;
    arena.enqueue(ta1, "2v2");
    arena.enqueue(ta2, "2v2");
    arena.enqueue(tb1, "2v2");
    const match = arena.enqueue(tb2, "2v2")!;
    arena.startInstance(match.id);
    const winnerIds = team1Won
      ? [match.players[0].id, match.players[1].id]
      : [match.players[2].id, match.players[3].id];
    const loserIds = team1Won
      ? [match.players[2].id, match.players[3].id]
      : [match.players[0].id, match.players[1].id];
    const result: ArenaMatchResult = {
      instance:  match,
      winnerIds,
      loserIds,
      kills:     Object.fromEntries(match.players.map(p => [p.id, winnerIds.includes(p.id) ? 1 : 0])),
      durationMs: 120_000,
    };
    return { deltas: arena.resolveMatch(result), match };
  }

  it("all four players receive rating deltas", () => {
    const { deltas, match } = play2v2(true);
    for (const p of match.players) {
      expect(deltas[p.id]).toBeDefined();
    }
  });

  it("winning team gains rating, losing team loses rating", () => {
    const { match } = play2v2(true);
    // Team 1 (indices 0–1) won
    const t1 = match.players.slice(0, 2);
    const t2 = match.players.slice(2, 4);
    // Both teams started at 1000
    t1.forEach(p => expect(arena.getPlayer(p.id)!.rating).toBeGreaterThan(1000));
    t2.forEach(p => expect(arena.getPlayer(p.id)!.rating).toBeLessThan(1000));
  });

  it("2v2 match instance finishes with status 'finished'", () => {
    const { match } = play2v2(true);
    expect(arena.getInstance(match.id)!.status).toBe("finished");
  });
});

// ── Tier bracket promotion / demotion ─────────────────────────────────────────

describe("Arena tier promotion and demotion", () => {
  it("player at 1199 is BRONZE, at 1200 is SILVER (promotion boundary)", () => {
    expect(getTier(1199)).toBe("BRONZE");
    expect(getTier(1200)).toBe("SILVER");
  });

  it("player at 1399 is SILVER, at 1400 is GOLD (promotion boundary)", () => {
    expect(getTier(1399)).toBe("SILVER");
    expect(getTier(1400)).toBe("GOLD");
  });

  it("player at 1799 is PLATINUM, at 1800 is DIAMOND (promotion boundary)", () => {
    expect(getTier(1799)).toBe("PLATINUM");
    expect(getTier(1800)).toBe("DIAMOND");
  });

  it("a win against an equal-rated opponent near the tier boundary crosses into SILVER", () => {
    const arena = resetArena();
    const a = arena.getOrCreate("a", "A");
    const b = arena.getOrCreate("b", "B");
    // K=32, equal ratings (1195 each): winner gains round(32 * 0.5) = 16 → 1211 ≥ 1200
    a.rating = 1195;
    b.rating = 1195;
    arena.enqueue(a, "1v1");
    const inst = arena.enqueue(b, "1v1")!;
    arena.startInstance(inst.id);
    arena.resolveMatch({
      instance: inst,
      winnerIds: ["a"],
      loserIds: ["b"],
      kills: { a: 1 },
      durationMs: 60_000,
    });
    const newRating = arena.getPlayer("a")!.rating;
    expect(newRating).toBeGreaterThan(1195);
    expect(getTier(newRating)).toBe("SILVER");
  });
});

// ── ARENA constants validation ─────────────────────────────────────────────────

describe("ARENA constants", () => {
  it("ELO_DEFAULT is 1000", () => {
    expect(ARENA.ELO_DEFAULT).toBe(1000);
  });

  it("ELO_K factor is 32", () => {
    expect(ARENA.ELO_K).toBe(32);
  });

  it("match duration is 3 minutes (180,000 ms)", () => {
    expect(ARENA.MATCH_DURATION_MS).toBe(180_000);
  });

  it("arena attack damage is 20", () => {
    expect(ARENA.ATTACK_DAMAGE).toBe(20);
  });

  it("arena attack cooldown is 500ms", () => {
    expect(ARENA.ATTACK_COOLDOWN_MS).toBe(500);
  });

  it("arena invincibility window is 800ms", () => {
    expect(ARENA.PLAYER_INVINCIBILITY_MS).toBe(800);
  });

  it("round HP is 100", () => {
    expect(ARENA.ROUND_HP).toBe(100);
  });

  it("all six tiers are defined with min/max/label/icon", () => {
    const tiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "CHAMPION"] as const;
    for (const tier of tiers) {
      const t = ARENA.TIERS[tier];
      expect(t.min).toBeGreaterThanOrEqual(0);
      expect(t.label).toBeTruthy();
      expect(t.icon).toBeTruthy();
    }
  });

  it("tier minimums are strictly increasing", () => {
    const ordered = [
      ARENA.TIERS.BRONZE.min,
      ARENA.TIERS.SILVER.min,
      ARENA.TIERS.GOLD.min,
      ARENA.TIERS.PLATINUM.min,
      ARENA.TIERS.DIAMOND.min,
      ARENA.TIERS.CHAMPION.min,
    ];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

describe("ArenaManager — leaderboard", () => {
  let arena: ArenaManager;
  beforeEach(() => { arena = resetArena(); });

  it("getLeaderboard() returns an empty array when no players exist", () => {
    expect(arena.getLeaderboard()).toHaveLength(0);
  });

  it("getLeaderboard() orders players by rating descending", () => {
    const low  = arena.getOrCreate("low",  "Low");
    const mid  = arena.getOrCreate("mid",  "Mid");
    const high = arena.getOrCreate("high", "High");
    low.rating  = 900;
    mid.rating  = 1200;
    high.rating = 1800;

    const board = arena.getLeaderboard();
    const ratings = board.map(e => e.player.rating);
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
    }
  });

  it("getLeaderboard() assigns correct tiers", () => {
    const p = arena.getOrCreate("diamond_player", "DP");
    p.rating = 1800;
    const board = arena.getLeaderboard();
    const entry = board.find(e => e.player.id === "diamond_player");
    expect(entry).toBeDefined();
    expect(entry!.tier).toBe("DIAMOND");
  });

  it("getLeaderboard() assigns rank starting at 1", () => {
    arena.getOrCreate("p1", "P1");
    arena.getOrCreate("p2", "P2");
    arena.getOrCreate("p3", "P3");
    const board = arena.getLeaderboard();
    expect(board[0].rank).toBe(1);
    expect(board[1].rank).toBe(2);
    expect(board[2].rank).toBe(3);
  });

  it("getLeaderboard() respects the limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      arena.getOrCreate(`player_${i}`, `P${i}`);
    }
    expect(arena.getLeaderboard(5)).toHaveLength(5);
    expect(arena.getLeaderboard(3)).toHaveLength(3);
  });

  it("getPlayerRank() returns 0 for an unregistered player", () => {
    expect(arena.getPlayerRank("nobody")).toBe(0);
  });

  it("getPlayerRank() returns 1 for the highest-rated player", () => {
    const p = arena.getOrCreate("top", "Top");
    p.rating = 9999;
    arena.getOrCreate("low", "Low");
    expect(arena.getPlayerRank("top")).toBe(1);
  });

  it("getPlayerRank() reflects correct position among multiple players", () => {
    const p1 = arena.getOrCreate("p1", "P1"); p1.rating = 1500;
    const p2 = arena.getOrCreate("p2", "P2"); p2.rating = 1200;
    const p3 = arena.getOrCreate("p3", "P3"); p3.rating = 1800;
    expect(arena.getPlayerRank("p3")).toBe(1);
    expect(arena.getPlayerRank("p1")).toBe(2);
    expect(arena.getPlayerRank("p2")).toBe(3);
  });
});

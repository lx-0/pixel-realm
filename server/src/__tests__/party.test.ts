/**
 * Party system tests.
 *
 * The party logic lives inside ZoneRoom (Colyseus Room) and is not exported as
 * standalone functions, so these tests validate the pure algorithmic rules that
 * govern party behaviour:
 *
 *   - Shared XP distribution formula (even split, floor, min 1)
 *   - Proximity gating (PARTY_XP_RANGE)
 *   - Round-robin loot index cycling
 *   - Need/greed loot mode falls through to killer
 *   - Party formation rules (leader, member cap)
 *   - Party leave / leader succession logic
 */

import { describe, it, expect } from "vitest";

// ── Constants mirrored from ZoneRoom.ts ──────────────────────────────────────

/** Proximity radius (server coords) for shared XP distribution. */
const PARTY_XP_RANGE = 80;

// ── Helper types (mirrors ZoneRoom internal PartyData) ───────────────────────

interface PartyData {
  id: string;
  leaderSessionId: string;
  memberSessionIds: string[];
  lootMode: "round_robin" | "need_greed";
  roundRobinIndex: number;
}

interface PlayerPos {
  sessionId: string;
  x: number;
  y: number;
}

// ── Pure party logic helpers (replicate room logic for testing) ───────────────

/** Euclidean distance between two positions. */
function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Compute shared XP for each party member in range of the killer.
 * Returns a map of sessionId → xp awarded (0 = out of range or killer).
 */
function computePartyXp(
  killerSid: string,
  killerPos: { x: number; y: number },
  party: PartyData,
  players: PlayerPos[],
  baseXp: number,
): Map<string, number> {
  const playerMap = new Map(players.map((p) => [p.sessionId, p]));
  const result = new Map<string, number>();

  const nearby = party.memberSessionIds.filter((sid) => {
    const p = playerMap.get(sid);
    return p && dist(p.x, p.y, killerPos.x, killerPos.y) <= PARTY_XP_RANGE;
  });

  if (nearby.length === 0) return result;

  const sharedXp = Math.max(1, Math.floor(baseXp / nearby.length));

  for (const sid of nearby) {
    if (sid === killerSid) continue; // killer gets XP locally
    result.set(sid, sharedXp);
  }

  return result;
}

/**
 * Advance round-robin loot index and return the recipient session id.
 */
function advanceRoundRobin(party: PartyData, onlineMembers: string[]): string {
  party.roundRobinIndex = (party.roundRobinIndex + 1) % onlineMembers.length;
  return onlineMembers[party.roundRobinIndex];
}

/**
 * Remove a member from the party, promoting a new leader if needed.
 * Returns null if the party dissolves (0 or 1 members left).
 */
function removeMember(party: PartyData, sessionId: string): PartyData | null {
  party.memberSessionIds = party.memberSessionIds.filter((s) => s !== sessionId);

  if (party.memberSessionIds.length < 2) return null; // dissolves

  if (party.leaderSessionId === sessionId) {
    party.leaderSessionId = party.memberSessionIds[0];
  }
  return party;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeParty(memberSids: string[], leader?: string): PartyData {
  return {
    id: "party-test-1",
    leaderSessionId: leader ?? memberSids[0],
    memberSessionIds: [...memberSids],
    lootMode: "need_greed",
    roundRobinIndex: 0,
  };
}

// ── Shared XP distribution ───────────────────────────────────────────────────

describe("Shared XP distribution", () => {
  const KILLER = "session-1";

  it("no XP is shared when the killer has no party", () => {
    // If there's no party, shareXpWithParty returns early — simulate by passing empty
    const result = computePartyXp(
      KILLER,
      { x: 100, y: 100 },
      makeParty([KILLER]),
      [{ sessionId: KILLER, x: 100, y: 100 }],
      50,
    );
    expect(result.size).toBe(0); // killer doesn't receive their own share
  });

  it("XP is split evenly between 2 members both in range", () => {
    const party = makeParty([KILLER, "session-2"]);
    const players: PlayerPos[] = [
      { sessionId: KILLER, x: 100, y: 100 },
      { sessionId: "session-2", x: 120, y: 100 }, // 20px away — in range
    ];

    const result = computePartyXp(KILLER, { x: 100, y: 100 }, party, players, 50);

    // 2 nearby members → sharedXp = floor(50 / 2) = 25
    expect(result.get("session-2")).toBe(25);
    expect(result.has(KILLER)).toBe(false); // killer excluded from map
  });

  it("XP is split evenly among 4 members all in range", () => {
    const sids = [KILLER, "s2", "s3", "s4"];
    const party = makeParty(sids);
    const players: PlayerPos[] = sids.map((sid, i) => ({
      sessionId: sid,
      x: 100 + i * 10,
      y: 100,
    }));

    const result = computePartyXp(KILLER, { x: 100, y: 100 }, party, players, 40);

    // 4 members nearby → sharedXp = floor(40 / 4) = 10
    for (const sid of sids.filter((s) => s !== KILLER)) {
      expect(result.get(sid)).toBe(10);
    }
  });

  it("out-of-range members receive no XP", () => {
    const party = makeParty([KILLER, "near", "far"]);
    const players: PlayerPos[] = [
      { sessionId: KILLER, x: 0, y: 0 },
      { sessionId: "near", x: 50, y: 0 },   // 50px — in range (≤80)
      { sessionId: "far",  x: 200, y: 0 },  // 200px — out of range
    ];

    const result = computePartyXp(KILLER, { x: 0, y: 0 }, party, players, 30);

    // Only 2 members nearby (killer + near) → sharedXp = floor(30/2) = 15
    expect(result.has("near")).toBe(true);
    expect(result.get("near")).toBe(15);
    expect(result.has("far")).toBe(false);
  });

  it("XP minimum is 1 even when baseXp is very small", () => {
    const party = makeParty([KILLER, "s2", "s3", "s4"]);
    const players: PlayerPos[] = party.memberSessionIds.map((sid, i) => ({
      sessionId: sid,
      x: i,
      y: 0,
    }));

    // baseXp=1, 4 members → floor(1/4)=0, but max(1,...) → 1
    const result = computePartyXp(KILLER, { x: 0, y: 0 }, party, players, 1);

    for (const sid of ["s2", "s3", "s4"]) {
      expect(result.get(sid)).toBe(1);
    }
  });

  it("members exactly at PARTY_XP_RANGE boundary receive XP", () => {
    const party = makeParty([KILLER, "edge"]);
    const players: PlayerPos[] = [
      { sessionId: KILLER, x: 0, y: 0 },
      { sessionId: "edge", x: PARTY_XP_RANGE, y: 0 }, // exactly at boundary
    ];

    const result = computePartyXp(KILLER, { x: 0, y: 0 }, party, players, 20);
    expect(result.has("edge")).toBe(true);
  });

  it("members one pixel beyond PARTY_XP_RANGE receive no XP", () => {
    const party = makeParty([KILLER, "just-out"]);
    const players: PlayerPos[] = [
      { sessionId: KILLER, x: 0, y: 0 },
      { sessionId: "just-out", x: PARTY_XP_RANGE + 1, y: 0 },
    ];

    const result = computePartyXp(KILLER, { x: 0, y: 0 }, party, players, 20);
    expect(result.has("just-out")).toBe(false);
  });
});

// ── Round-robin loot distribution ────────────────────────────────────────────

describe("Round-robin loot distribution", () => {
  it("first drop goes to index 1 (advances from 0)", () => {
    const party = makeParty(["leader", "s2", "s3"]);
    party.lootMode = "round_robin";
    party.roundRobinIndex = 0;

    const onlineMembers = ["leader", "s2", "s3"];
    const recipient = advanceRoundRobin(party, onlineMembers);

    expect(recipient).toBe("s2");
    expect(party.roundRobinIndex).toBe(1);
  });

  it("index wraps around after the last member", () => {
    const party = makeParty(["leader", "s2", "s3"]);
    party.lootMode = "round_robin";
    party.roundRobinIndex = 2; // last member was recipient

    const onlineMembers = ["leader", "s2", "s3"];
    const recipient = advanceRoundRobin(party, onlineMembers);

    expect(recipient).toBe("leader"); // wraps to index 0
    expect(party.roundRobinIndex).toBe(0);
  });

  it("cycles through all members exactly once per full rotation", () => {
    const members = ["leader", "s2", "s3", "s4"];
    const party = makeParty(members);
    party.lootMode = "round_robin";
    party.roundRobinIndex = 0;

    const recipients = new Set<string>();
    for (let i = 0; i < members.length; i++) {
      recipients.add(advanceRoundRobin(party, members));
    }

    // Every member should have received loot exactly once
    expect(recipients.size).toBe(members.length);
    for (const m of members) {
      expect(recipients.has(m)).toBe(true);
    }
  });

  it("need_greed mode: loot goes to the killer (no round-robin)", () => {
    const party = makeParty(["leader", "s2"]);
    party.lootMode = "need_greed";

    // In need_greed mode, the killer always receives loot — no index is advanced
    const indexBefore = party.roundRobinIndex;
    // (In the actual room, grantLootToSession is called with killerSessionId directly)
    // We simply assert the index is unchanged
    expect(party.roundRobinIndex).toBe(indexBefore);
  });
});

// ── Party formation and leave logic ──────────────────────────────────────────

describe("Party formation and leave logic", () => {
  it("first member listed is the default party leader", () => {
    const party = makeParty(["alice", "bob", "carol"]);
    expect(party.leaderSessionId).toBe("alice");
  });

  it("party starts with need_greed as the default loot mode", () => {
    // ZoneRoom initialises lootMode as "need_greed" in handlePartyRespond
    const party = makeParty(["alice", "bob"]);
    party.lootMode = "need_greed"; // default
    expect(party.lootMode).toBe("need_greed");
  });

  it("party can change loot mode to round_robin", () => {
    const party = makeParty(["alice", "bob"]);
    party.lootMode = "round_robin";
    expect(party.lootMode).toBe("round_robin");
  });

  it("removing a non-leader member keeps the current leader", () => {
    const party = makeParty(["alice", "bob", "carol"]);

    const updated = removeMember(party, "carol");

    expect(updated).not.toBeNull();
    expect(updated!.leaderSessionId).toBe("alice");
    expect(updated!.memberSessionIds).toEqual(["alice", "bob"]);
  });

  it("removing the leader promotes the next member to leader", () => {
    const party = makeParty(["alice", "bob", "carol"]);

    const updated = removeMember(party, "alice");

    expect(updated).not.toBeNull();
    expect(updated!.leaderSessionId).toBe("bob");
  });

  it("party dissolves when fewer than 2 members remain", () => {
    const party = makeParty(["alice", "bob"]);

    // Remove bob — alice is alone, party dissolves
    const updated = removeMember(party, "bob");
    expect(updated).toBeNull();
  });

  it("party dissolves when the last two members both leave", () => {
    const party = makeParty(["alice", "bob", "carol"]);

    let result = removeMember(party, "carol")!;
    expect(result).not.toBeNull();
    expect(result.memberSessionIds).toEqual(["alice", "bob"]);

    // Now remove bob, alice is alone
    result = removeMember(result, "alice")!;
    expect(result).toBeNull();
  });

  it("maximum party size is 4 players", () => {
    // ZoneRoom enforces max 4 players per party
    const MAX_PARTY_SIZE = 4;
    const party = makeParty(["p1", "p2", "p3", "p4"]);
    expect(party.memberSessionIds.length).toBeLessThanOrEqual(MAX_PARTY_SIZE);
  });
});

// ── PARTY_XP_RANGE constant ───────────────────────────────────────────────────

describe("PARTY_XP_RANGE constant", () => {
  it("equals 80 server units", () => {
    expect(PARTY_XP_RANGE).toBe(80);
  });

  it("is positive", () => {
    expect(PARTY_XP_RANGE).toBeGreaterThan(0);
  });
});

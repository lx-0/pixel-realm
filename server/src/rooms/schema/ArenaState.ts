/**
 * Colyseus schema for the ArenaRoom.
 *
 * Tracks two combatants, match timer, round state, and the matchmaking queue
 * size so connected clients can display accurate wait times.
 */

import { Schema, type, MapSchema } from "@colyseus/schema";

// ── Arena Combatant ───────────────────────────────────────────────────────────

export class ArenaCombatant extends Schema {
  @type("string")  playerId: string  = "";
  @type("string")  name: string      = "Hero";
  @type("int16")   hp: number        = 100;
  @type("int16")   maxHp: number     = 100;
  @type("int16")   mana: number      = 50;
  @type("float32") x: number         = 160;
  @type("float32") y: number         = 90;
  @type("float32") facingX: number   = 1;
  @type("float32") facingY: number   = 0;
  @type("boolean") isAttacking: boolean = false;
  @type("int32")   invincibleUntil: number = 0;
  @type("int32")   kills: number     = 0;
  /** Current ELO rating entering this match. */
  @type("int32")   rating: number    = 1000;
  /** Tier string: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'CHAMPION' */
  @type("string")  tier: string      = "BRONZE";
}

// ── Arena Match State ─────────────────────────────────────────────────────────

export type ArenaPhase =
  | "waiting"    // pre-match, waiting for both players to ready up
  | "intro"      // VS splash screen countdown (3 s)
  | "active"     // match in progress
  | "finished";  // post-match, ratings updated

export class ArenaMatchState extends Schema {
  /** Unique match identifier (server-generated). */
  @type("string")  matchId: string    = "";
  /** "1v1" | "2v2" */
  @type("string")  mode: string       = "1v1";
  /** "gladiator_pit" | "shadow_sanctum" */
  @type("string")  map: string        = "gladiator_pit";
  /** Current phase of the match. */
  @type("string")  phase: string      = "waiting";
  /** Server-epoch ms when the match started (phase = active). */
  @type("int32")   startedAt: number  = 0;
  /** Remaining time in ms (updated each second). */
  @type("int32")   timeRemainingMs: number = 180_000;
  /** Combatants keyed by Colyseus sessionId. */
  @type({ map: ArenaCombatant }) combatants = new MapSchema<ArenaCombatant>();
  /** playerId of the winner (empty string = draw/timeout). */
  @type("string")  winnerId: string   = "";
  /** JSON-encoded Record<playerId, number>: ELO deltas after match resolves. */
  @type("string")  ratingDeltas: string = "{}";
}

// ── Top-level Arena Room State ─────────────────────────────────────────────────

export class ArenaRoomState extends Schema {
  /** Active match (null-ish while in queue). */
  match = new ArenaMatchState();
  /** Number of players currently in the 1v1 queue (for UI estimate display). */
  @type("int8")    queueSize1v1: number = 0;
  /** Number of players currently in the 2v2 queue. */
  @type("int8")    queueSize2v2: number = 0;
  /** Current season number for display. */
  @type("int16")   seasonNumber: number = 1;
  /** Current season name. */
  @type("string")  seasonName: string   = "";
}

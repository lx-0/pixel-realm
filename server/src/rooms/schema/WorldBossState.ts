import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./GameState";

export { Player };

// ── World Boss Participant (contribution tracking per player in-room) ──────────

export class WorldBossParticipant extends Schema {
  @type("string")  playerId: string = "";
  @type("string")  username: string = "";
  @type("int32")   damageDealt: number = 0;
  @type("string")  guildId: string = "";
  @type("string")  guildTag: string = "";
  // contribution tier: "bronze" | "silver" | "gold" | ""
  @type("string")  tier: string = "";
}

// ── World Boss Game State ─────────────────────────────────────────────────────

export class WorldBossState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ map: WorldBossParticipant })
  participants = new MapSchema<WorldBossParticipant>();

  /** Unique instance ID from DB. */
  @type("string")  instanceId: string = "";

  /** Boss entity identifier (e.g. "storm_titan"). */
  @type("string")  bossId: string = "";

  /** Display name shown in UI. */
  @type("string")  bossName: string = "";

  /** Current boss HP. */
  @type("int32")   bossHp: number = 0;

  /** Maximum boss HP. */
  @type("int32")   bossMaxHp: number = 0;

  /** Current boss phase (1, 2, or 3). */
  @type("int8")    bossPhase: number = 1;

  /**
   * Room lifecycle state:
   * "waiting"  — boss not yet active (spawnsAt in the future)
   * "active"   — boss is alive and taking damage
   * "defeated" — boss defeated, distributing loot
   * "expired"  — time limit reached, boss retreated
   */
  @type("string")  roomState: string = "waiting";

  /** Zone where boss is located. */
  @type("string")  zoneId: string = "zone3";

  /** Unix timestamp (ms) when boss becomes active. */
  @type("int32")   spawnsAt: number = 0;

  /** Unix timestamp (ms) when boss auto-expires. */
  @type("int32")   expiresAt: number = 0;

  /** Total damage dealt to boss this event. */
  @type("int32")   totalDamage: number = 0;

  /** Number of players who have participated (dealt at least 1 damage). */
  @type("int16")   participantCount: number = 0;
}

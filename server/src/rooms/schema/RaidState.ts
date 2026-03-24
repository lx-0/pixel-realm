import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player, Enemy, Projectile } from "./GameState";

export { Player, Enemy, Projectile };

// ── Raid Game State ────────────────────────────────────────────────────────────

export class RaidGameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ map: Enemy })
  enemies = new MapSchema<Enemy>();

  @type({ map: Projectile })
  projectiles = new MapSchema<Projectile>();

  /**
   * Raid boss identifier.
   * "raid_dragon" | "raid_shadow" | "raid_crystal"
   */
  @type("string") bossId: string = "";

  /** Boss display name for client HUD. */
  @type("string") bossName: string = "";

  /** Current boss HP (0 when dead). */
  @type("int32")  bossHp: number = 0;

  /** Maximum boss HP (scales with difficulty). */
  @type("int32")  bossMaxHp: number = 0;

  /** Current boss phase (1-3). Phase 0 = not started. */
  @type("int8")   bossPhase: number = 0;

  /** Boss phase label for client display ("Shadow Form", "Void Surge", etc.) */
  @type("string") bossPhaseLabel: string = "";

  /** Number of players present at raid start (for scaling reference). */
  @type("int8")   raidSize: number = 0;

  /**
   * Raid lifecycle:
   * "preparing"  — waiting for parties to assemble (JOIN_WINDOW)
   * "active"     — boss encounter in progress
   * "victory"    — boss defeated, distributing loot
   * "defeat"     — all players dead
   */
  @type("string") raidState: string = "preparing";

  /** Seconds remaining on the enrage timer (0 = not started / expired). */
  @type("int32")  enrageSecondsLeft: number = 0;

  /** Whether the boss is enraged (≥ enrage timer expiry). */
  @type("boolean") isEnraged: boolean = false;
}

import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player, Enemy, Projectile } from "./GameState";

export { Player, Enemy, Projectile };

// ── Dungeon Game State ────────────────────────────────────────────────────────

export class DungeonGameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ map: Enemy })
  enemies = new MapSchema<Enemy>();

  @type({ map: Projectile })
  projectiles = new MapSchema<Projectile>();

  /** Dungeon tier (1-3). Determines boss, enemies, loot quality. */
  @type("int8")   tier: number = 1;

  /** Seeded string used for reproducible procedural generation. */
  @type("string") seed: string = "";

  /** Current room index (0 = spawn, 1-4 = combat, 5 = treasure, 6 = boss). */
  @type("int8")   currentRoom: number = 0;

  /** Total rooms in this dungeon instance (always 7). */
  @type("int8")   totalRooms: number = 7;

  /**
   * Room type for UI rendering:
   * "spawn" | "combat" | "arena" | "elite" | "treasure" | "boss"
   */
  @type("string") roomType: string = "spawn";

  /**
   * Dungeon lifecycle state:
   * "preparing" — waiting for party to assemble (join window)
   * "room_active" — enemies present (or non-combat room in progress)
   * "room_cleared" — all enemies dead, transition pending
   * "complete" — boss defeated, dungeon done
   */
  @type("string") dungeonState: string = "preparing";

  /** Number of living enemies in the current room. */
  @type("int32")  enemiesAlive: number = 0;

  /**
   * Current boss phase (0 = no boss active).
   * Phase transitions at 66% and 33% HP thresholds → phases 1, 2, 3.
   */
  @type("int8")   bossPhase: number = 0;

  /** Boss entity type string (e.g. "dungeon_keeper"). Empty when no boss room. */
  @type("string") bossType: string = "";

  /** Number of players in this instance at dungeon start (used for scaling). */
  @type("int8")   partySize: number = 1;

  /**
   * Named dungeon theme for this instance.
   * Drives client-side palette and boss flavour.
   * e.g. "cursed_crypt" | "volcanic_forge" | "frozen_depths" | "nightmare_void"
   */
  @type("string") dungeonTheme: string = "";
}

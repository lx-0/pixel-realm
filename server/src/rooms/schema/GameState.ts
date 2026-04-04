import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";

/** AoI filter radius in server coordinate units (world is 320×180). */
const AOI_FILTER_RADIUS = 200;

// ── Player ────────────────────────────────────────────────────────────────────

export class Player extends Schema {
  @type("string")  sessionId: string = "";
  @type("string")  name: string = "Hero";

  // Position
  @type("float32") x: number = 160;
  @type("float32") y: number = 90;

  // Stats
  @type("int16")   hp: number = 100;
  @type("int16")   maxHp: number = 100;
  @type("int16")   mana: number = 50;
  @type("int16")   maxMana: number = 50;
  @type("int8")    level: number = 1;
  @type("int32")   xp: number = 0;

  // Combat state
  @type("boolean") isAttacking: boolean = false;
  @type("int32")   lastAttackAt: number = 0;
  @type("int32")   invincibleUntil: number = 0;

  // Status effects (bitmask: 1=poison 2=burn 4=freeze 8=stun)
  @type("int8")    statusFlags: number = 0;
  @type("int32")   statusExpiry: number = 0;

  // Facing direction (for combat hit detection)
  @type("float32") facingX: number = 1;
  @type("float32") facingY: number = 0;

  // Skill tree
  @type("int8")    skillPoints: number = 0;
  @type("string")  classId: string = "warrior";
  /** JSON-encoded string[]: unlocked skill ids */
  @type("string")  unlockedSkills: string = "[]";
  /** JSON-encoded string[6]: hotbar skill ids (empty string = empty slot) */
  @type("string")  hotbar: string = "[]";
  /** JSON-encoded Record<skillId, expiresAtMs>: active skill cooldowns */
  @type("string")  skillCooldowns: string = "{}";
  /** Non-zero = player is in a timed buff state, value = buff flags bitmask */
  @type("int8")    buffFlags: number = 0;
  /** When the current buff expires (ms epoch) */
  @type("int32")   buffExpiresAt: number = 0;
  /** Absorb shield HP remaining (from arcane_shield) */
  @type("int16")   shieldAbsorb: number = 0;

  // Guild (empty string = no guild)
  @type("string")  guildId: string = "";
  /** Short tag displayed next to player name, e.g. "[PFG]" */
  @type("string")  guildTag: string = "";

  // Party (empty string = no party)
  @type("string")  partyId: string = "";
  @type("boolean") isPartyLeader: boolean = false;

  // Prestige (0 = never prestiged)
  @type("int8")    prestigeLevel: number = 0;

  // Companion pet (empty string = no pet equipped)
  @type("string")  equippedPetType: string = "";
  /** 0 = no pet / unhappy (bonus disabled); 1-100 = happy */
  @type("int8")    petHappiness: number = 0;
  @type("int8")    petLevel: number = 1;
}

// ── Enemy ─────────────────────────────────────────────────────────────────────

export class Enemy extends Schema {
  @type("string")  id: string = "";
  @type("string")  type: string = "slime";

  // Position
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;

  // Stats
  @type("int16")   hp: number = 30;
  @type("int16")   maxHp: number = 30;
  @type("int16")   damage: number = 5;
  @type("float32") speed: number = 45;
  @type("float32") aggroRange: number = 80;

  // Status effects (bitmask: 1=poison 2=burn 4=freeze 8=stun)
  @type("int8")    statusFlags: number = 0;

  // AI state
  @type("string")  aiState: string = "patrol";   // "patrol" | "chase" | "dead"
  @type("string")  targetId: string = "";        // sessionId of targeted player
  @type("float32") patrolX: number = 0;
  @type("float32") patrolY: number = 0;
  @type("int32")   spawnedAt: number = 0;
}

// ── Projectile ────────────────────────────────────────────────────────────────

export class Projectile extends Schema {
  @type("string")  id: string = "";
  @type("string")  ownerId: string = "";  // enemy id
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") velX: number = 0;
  @type("float32") velY: number = 0;
  @type("int16")   damage: number = 5;
  @type("int32")   expiresAt: number = 0;
}

// ── Zone Game State ───────────────────────────────────────────────────────────

export class ZoneGameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @filterChildren(function(this: ZoneGameState, client: { sessionId: string }, _key: string, value: Enemy) {
    const player = this.players.get(client.sessionId);
    if (!player) return true;
    const dx = player.x - value.x;
    const dy = player.y - value.y;
    return dx * dx + dy * dy <= AOI_FILTER_RADIUS * AOI_FILTER_RADIUS;
  })
  @type({ map: Enemy })
  enemies = new MapSchema<Enemy>();

  @filterChildren(function(this: ZoneGameState, client: { sessionId: string }, _key: string, value: Projectile) {
    const player = this.players.get(client.sessionId);
    if (!player) return true;
    const dx = player.x - value.x;
    const dy = player.y - value.y;
    return dx * dx + dy * dy <= AOI_FILTER_RADIUS * AOI_FILTER_RADIUS;
  })
  @type({ map: Projectile })
  projectiles = new MapSchema<Projectile>();

  @type("string")  zoneId: string = "zone1";
  @type("int8")    currentWave: number = 0;
  @type("int8")    totalWaves: number = 3;
  @type("string")  waveState: string = "waiting";  // "waiting" | "active" | "complete" | "boss"
  @type("int32")   waveStartAt: number = 0;
  @type("int32")   enemiesAlive: number = 0;

  // Active world event (empty string = no event)
  @type("string")  activeEventType: string = "";
  @type("float32") activeEventX: number = 0;
  @type("float32") activeEventY: number = 0;
  @type("int32")   activeEventEndsAt: number = 0;  // epoch ms / 1000 to fit int32
}

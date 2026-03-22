import { Room, Client, Delayed } from "@colyseus/core";
import { ZoneGameState, Player, Enemy, Projectile } from "./schema/GameState";
import { loadPlayerState, savePlayerState, initPlayerState } from "../db/players";
import { getOrGenerateQuest, completeQuestForPlayer } from "../quests/db";
import { verifyRoomToken, AuthPayload } from "../auth/middleware";
import { executeP2PTrade, type TradeItem } from "../db/marketplace";
import { initSkillState, loadSkillState, saveSkillState, type SkillState } from "../db/skills";
import { ALL_SKILLS, SKILL_BY_ID, computePassiveBonuses, type ClassId } from "../skills";
import { addItem } from "../db/inventory";

// ── Constants (mirrored from client constants.ts) ─────────────────────────────
const TICK_RATE_MS = 50;          // 20 Hz server tick
const ATTACK_COOLDOWN_MS = 480;
const ATTACK_RANGE_PX = 30;
const ATTACK_DAMAGE = 25;
const PLAYER_HIT_DAMAGE = 10;
const PLAYER_INVINCIBILITY_MS = 900;
const MANA_REGEN_PER_SEC = 6;
const MANA_ATTACK_COST = 5;
const PROJECTILE_SPEED = 100;
const PROJECTILE_LIFETIME_MS = 2000;
const WAVE_PREP_MS = 5000;        // 5 s between waves
const BASE_ENEMY_COUNT = 4;       // enemies in wave 1; +2 per additional wave

// ── Skill buff flags (bitmask, synced to player.buffFlags) ───────────────────
const BUFF_BERSERK      = 1; // +50% dmg, +20% spd for 6 s
const BUFF_DIVINE_SHIELD = 2; // invulnerable for 3 s
const BUFF_ARCANE_SURGE = 4; // 2× skill dmg, no mana cost for 10 s

// ── Player skill range constants ──────────────────────────────────────────────
const SKILL_AoE_RADIUS = 55;  // pixels — for AoE skills
const SKILL_MELEE_RANGE = 38; // pixels — for targeted melee skills

// ── Status effect flags (bitmask, mirrors client STATUS_EFFECTS) ──────────────
const STATUS_FLAG_FREEZE = 4; // bit 2
const STATUS_FREEZE_MS   = 3000;
/** Enemy types whose melee contact applies a status flag to the player. */
const MELEE_STATUS_MAP: Record<string, { flag: number; durationMs: number }> = {
  frost_wolf:    { flag: STATUS_FLAG_FREEZE, durationMs: STATUS_FREEZE_MS },
  crystal_golem: { flag: STATUS_FLAG_FREEZE, durationMs: STATUS_FREEZE_MS },
};

// ── Crafting material loot tables (per zone) ──────────────────────────────────
/** Each entry rolls independently on enemy death. */
const ZONE_LOOT: Record<string, Array<{ itemId: string; chance: number }>> = {
  zone1: [
    { itemId: "mat_slime_gel",      chance: 0.40 },
    { itemId: "mat_leather_scraps", chance: 0.25 },
  ],
  zone2: [
    { itemId: "mat_iron_ore",       chance: 0.35 },
    { itemId: "mat_leather_scraps", chance: 0.30 },
    { itemId: "mat_bone_fragment",  chance: 0.15 },
  ],
  zone3: [
    { itemId: "mat_iron_ore",       chance: 0.30 },
    { itemId: "mat_magic_crystal",  chance: 0.20 },
    { itemId: "mat_bone_fragment",  chance: 0.25 },
  ],
  zone4: [
    { itemId: "mat_leather_scraps", chance: 0.25 },
    { itemId: "mat_magic_crystal",  chance: 0.25 },
    { itemId: "mat_bone_fragment",  chance: 0.20 },
  ],
  zone5: [
    { itemId: "mat_magic_crystal",  chance: 0.30 },
    { itemId: "mat_bone_fragment",  chance: 0.25 },
  ],
};

// Zone → enemy type tables
interface EnemyDef {
  type: string;
  hp: number;
  dmg: number;
  speed: number;
  aggroRange: number;
  ranged?: boolean;
}

const ZONE_ENEMIES: Record<string, EnemyDef[]> = {
  zone1: [
    { type: "slime",    hp: 30,  dmg: 5,  speed: 45, aggroRange: 80  },
    { type: "mushroom", hp: 50,  dmg: 8,  speed: 70, aggroRange: 70  },
  ],
  zone2: [
    { type: "beetle",  hp: 45,  dmg: 10, speed: 85, aggroRange: 120 },
    { type: "bandit",  hp: 80,  dmg: 18, speed: 55, aggroRange: 100, ranged: true },
    { type: "sentry",  hp: 120, dmg: 0,  speed: 0,  aggroRange: 0   },
  ],
  zone3: [
    { type: "wraith",  hp: 90,  dmg: 20, speed: 65, aggroRange: 100 },
    { type: "golem",   hp: 200, dmg: 35, speed: 30, aggroRange: 80  },
    { type: "archer",  hp: 70,  dmg: 22, speed: 40, aggroRange: 110, ranged: true },
  ],
  zone4: [
    { type: "crab",    hp: 60,  dmg: 12, speed: 65, aggroRange: 80  },
    { type: "wisp",    hp: 110, dmg: 28, speed: 72, aggroRange: 100, ranged: true },
    { type: "raider",  hp: 140, dmg: 32, speed: 50, aggroRange: 90  },
  ],
  zone5: [
    { type: "ice_elemental", hp: 90,  dmg: 22, speed: 55,  aggroRange: 110, ranged: true },
    { type: "frost_wolf",    hp: 75,  dmg: 18, speed: 100, aggroRange: 120 },
    { type: "crystal_golem", hp: 250, dmg: 40, speed: 28,  aggroRange: 75  },
  ],
};

// ── Join options / messages ───────────────────────────────────────────────────

interface JoinOptions {
  zoneId?: string;
  playerName?: string;
  token?: string; // JWT access token — verified in onAuth
}

interface MoveMessage {
  x: number;
  y: number;
  facingX: number;
  facingY: number;
}

interface ChatMessage {
  text: string;
  whisperTo?: string; // name of target player for private messages
}

interface QuestNpcMessage {
  npcId: string; // which quest NPC the player interacted with
}

interface QuestCompleteMessage {
  questId: string;
}

// P2P trade messages
interface TradeRequestMessage {
  targetSessionId: string; // who the initiator wants to trade with
}

interface TradeRespondMessage {
  accept: boolean; // true = accept, false = decline
}

interface TradeOfferMessage {
  // Both sides call this to lock in their side of the offer before confirming
  items: Array<{ inventoryId: string; itemId: string; quantity: number }>;
  gold: number;
}

interface TradeConfirmMessage {
  confirmed: boolean; // both must confirm to execute
}

// Crafting notify message — sent by client after a successful craft
interface CraftNotifyMessage {
  itemId: string;
  itemName: string;
}

// Skill messages
interface SkillUseMessage   { skillId: string }
interface SkillAllocMessage { skillId: string }
interface SkillHotbarMessage { hotbar: string[] }  // ordered array of skill ids (len ≤ 6)
interface SkillClassMessage  { classId: string }
interface SkillRespecMessage { confirm: boolean }

// Per-room pending trade state
interface PendingTrade {
  initiatorSessionId: string;
  counterpartSessionId: string;
  initiatorOffer: { items: TradeItem[]; gold: number } | null;
  counterpartOffer: { items: TradeItem[]; gold: number } | null;
  initiatorConfirmed: boolean;
  counterpartConfirmed: boolean;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Room ──────────────────────────────────────────────────────────────────────

// Maps sessionId → userId for persistence lookups
const sessionUserMap = new Map<string, string>();

// Interval (ms) between automatic mid-session saves
const PERSIST_INTERVAL_MS = 30_000;

export class ZoneRoom extends Room<ZoneGameState> {
  maxClients = 16;

  private lastTick: number = 0;

  // Active P2P trades keyed by the initiator's sessionId
  private pendingTrades = new Map<string, PendingTrade>();

  // ── Skill tree state (in-memory per session) ──────────────────────────────
  /** Skill allocation state, keyed by sessionId */
  private skillStateMap = new Map<string, SkillState>();
  /** Per-player skill cooldowns: sessionId → skillId → expiresAtMs */
  private skillCooldowns = new Map<string, Record<string, number>>();

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthPayload> {
    return verifyRoomToken(options.token);
  }

  onCreate(options: JoinOptions) {
    this.setState(new ZoneGameState());

    const zoneId = options?.zoneId ?? "zone1";
    this.state.zoneId = zoneId;
    this.state.totalWaves = 3;
    this.state.waveState = "waiting";

    // Register message handlers
    this.onMessage("move",             (client: Client, msg: MoveMessage)       => this.handleMove(client, msg));
    this.onMessage("attack",           (client: Client)                         => this.handleAttack(client));
    this.onMessage("chat",             (client: Client, msg: ChatMessage)        => this.handleChat(client, msg));
    this.onMessage("quest_npc_interact", (client: Client, msg: QuestNpcMessage) => this.handleQuestNpcInteract(client, msg));
    this.onMessage("quest_complete",   (client: Client, msg: QuestCompleteMessage) => this.handleQuestComplete(client, msg));

    // Skill tree messages
    this.onMessage("level_up",     (client: Client)                           => this.handleLevelUp(client));
    this.onMessage("skill_use",    (client: Client, msg: SkillUseMessage)    => this.handleSkillUse(client, msg));
    this.onMessage("skill_alloc",  (client: Client, msg: SkillAllocMessage)  => this.handleSkillAlloc(client, msg));
    this.onMessage("skill_hotbar", (client: Client, msg: SkillHotbarMessage) => this.handleSkillHotbar(client, msg));
    this.onMessage("skill_class",  (client: Client, msg: SkillClassMessage)  => this.handleSkillClass(client, msg));
    this.onMessage("skill_respec", (client: Client, msg: SkillRespecMessage) => this.handleSkillRespec(client, msg));

    // Crafting notify — broadcast to other players in the zone
    this.onMessage("craft_notify", (client: Client, msg: CraftNotifyMessage) => this.handleCraftNotify(client, msg));

    // P2P trade messages
    this.onMessage("trade_request",  (client: Client, msg: TradeRequestMessage)  => this.handleTradeRequest(client, msg));
    this.onMessage("trade_respond",  (client: Client, msg: TradeRespondMessage)  => this.handleTradeRespond(client, msg));
    this.onMessage("trade_offer",    (client: Client, msg: TradeOfferMessage)    => this.handleTradeOffer(client, msg));
    this.onMessage("trade_confirm",  (client: Client, msg: TradeConfirmMessage)  => this.handleTradeConfirm(client, msg));
    this.onMessage("trade_cancel",   (client: Client)                            => this.handleTradeCancel(client));

    // Start game loop
    this.lastTick = Date.now();
    this.clock.setInterval(() => this.tick(), TICK_RATE_MS);

    // Begin first wave after prep time
    this.clock.setTimeout(() => this.startNextWave(), WAVE_PREP_MS);

    // Periodic mid-session persistence (every 30 s)
    this.clock.setInterval(() => this.persistAllPlayers(), PERSIST_INTERVAL_MS);

    console.log(`[ZoneRoom] created room ${this.roomId} for zone ${zoneId}`);
  }

  async onJoin(client: Client, options: JoinOptions) {
    const auth = client.auth as AuthPayload;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options?.playerName ?? auth?.username ?? "Hero";
    // Spawn at a random position near center
    player.x = 100 + Math.random() * 120;
    player.y = 50  + Math.random() * 80;

    this.state.players.set(client.sessionId, player);

    // Load persisted state using the verified userId from the JWT
    const userId = auth?.userId;
    if (userId) {
      sessionUserMap.set(client.sessionId, userId);
      try {
        await initPlayerState(userId);
        const saved = await loadPlayerState(userId);
        if (saved) {
          player.hp      = saved.hp;
          player.maxHp   = saved.maxHp;
          player.mana    = saved.mana;
          player.maxMana = saved.maxMana;
          player.level   = saved.level;
          player.xp      = saved.xp;
        }
        // Load skill allocations and apply passive bonuses
        const skillState = await initSkillState(userId);
        this.skillStateMap.set(client.sessionId, skillState);
        this.skillCooldowns.set(client.sessionId, {});
        this.applySkillPassives(player, skillState);
        this.syncSkillState(player, skillState);
      } catch (err) {
        console.warn(`[ZoneRoom] Failed to load state for ${userId}:`, (err as Error).message);
      }
    }

    console.log(`[ZoneRoom] ${client.sessionId} (${auth?.username}) joined zone ${this.state.zoneId} (${this.clients.length} players)`);
  }

  async onLeave(client: Client, consented: boolean) {
    this.cancelTradesForClient(client.sessionId);
    await this.persistPlayer(client.sessionId);
    this.skillStateMap.delete(client.sessionId);
    this.skillCooldowns.delete(client.sessionId);
    sessionUserMap.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`[ZoneRoom] ${client.sessionId} left (consented=${consented})`);
  }

  async onDispose() {
    // Persist all remaining players on room teardown
    await this.persistAllPlayers();
    console.log(`[ZoneRoom] disposing room ${this.roomId}`);
  }

  // ── Persistence Helpers ───────────────────────────────────────────────────────

  private async persistPlayer(sessionId: string): Promise<void> {
    const userId = sessionUserMap.get(sessionId);
    if (!userId) return;
    const player = this.state.players.get(sessionId);
    if (!player) return;
    try {
      await savePlayerState(userId, {
        hp: player.hp,
        maxHp: player.maxHp,
        mana: player.mana,
        maxMana: player.maxMana,
        level: player.level,
        xp: player.xp,
        currentZone: this.state.zoneId,
      });
      const skillState = this.skillStateMap.get(sessionId);
      if (skillState) {
        await saveSkillState(userId, skillState);
      }
    } catch (err) {
      console.warn(`[ZoneRoom] Failed to save state for ${userId}:`, (err as Error).message);
    }
  }

  private async persistAllPlayers(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.state.players.forEach((_player, sessionId) => {
      promises.push(this.persistPlayer(sessionId));
    });
    await Promise.allSettled(promises);
  }

  // ── Message Handlers ─────────────────────────────────────────────────────────

  private handleMove(client: Client, msg: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Basic sanity-clamp to canvas bounds (320×180)
    player.x = Math.max(0, Math.min(320, msg.x));
    player.y = Math.max(0, Math.min(180, msg.y));
    player.facingX = msg.facingX;
    player.facingY = msg.facingY;
  }

  private handleAttack(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const now = Date.now();
    if (now - player.lastAttackAt < ATTACK_COOLDOWN_MS) return;
    if (player.mana < MANA_ATTACK_COST) return;

    player.lastAttackAt = now;
    player.mana = Math.max(0, player.mana - MANA_ATTACK_COST);
    player.isAttacking = true;

    // Resolve melee hits against enemies in range
    this.state.enemies.forEach((enemy: Enemy) => {
      if (enemy.aiState === "dead") return;
      if (dist(player.x, player.y, enemy.x, enemy.y) > ATTACK_RANGE_PX) return;

      enemy.hp = Math.max(0, enemy.hp - ATTACK_DAMAGE);
      if (enemy.hp === 0) {
        this.killEnemy(enemy, client.sessionId);
      }
    });

    // Clear attacking flag after one tick
    this.clock.setTimeout(() => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.isAttacking = false;
    }, TICK_RATE_MS * 2);
  }

  private handleChat(client: Client, msg: ChatMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Sanitise: cap text length, strip control chars
    const text = String(msg.text ?? "").replace(/[\x00-\x1f]/g, "").slice(0, 140);
    if (!text) return;

    const senderName = player.name || "Hero";

    if (msg.whisperTo) {
      // Private whisper — find target in this zone room
      const targetName = String(msg.whisperTo).slice(0, 32);
      let targetClient: Client | undefined;
      this.state.players.forEach((p: Player, sid: string) => {
        if (p.name === targetName && sid !== client.sessionId) {
          targetClient = this.clients.find((c: Client) => c.sessionId === sid);
        }
      });

      if (targetClient) {
        // Send to both sender and recipient
        client.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
        targetClient.send("chat", { sender: senderName, text, whisper: true, whisperTo: targetName });
      } else {
        // Target not found in this zone
        client.send("chat", {
          sender: "System",
          text: `Player "${targetName}" is not in this zone.`,
          whisper: false,
        });
      }
    } else {
      // Zone-wide broadcast
      this.broadcast("chat", { sender: senderName, text, whisper: false });
    }
  }

  // ── Quest NPC Handlers ────────────────────────────────────────────────────────

  private async handleQuestNpcInteract(client: Client, _msg: QuestNpcMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) {
      client.send("quest_error", { message: "You must be logged in to accept quests." });
      return;
    }

    try {
      const { quest, isNew } = await getOrGenerateQuest(
        userId,
        this.state.zoneId,
        player.level,
      );
      client.send("quest_data", { quest, isNew });
    } catch (err) {
      const msg = (err as Error).message ?? "Quest generation failed.";
      console.warn(`[ZoneRoom] Quest generation error for ${userId}:`, msg);
      client.send("quest_error", { message: msg });
    }
  }

  private async handleQuestComplete(client: Client, msg: QuestCompleteMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const userId = sessionUserMap.get(client.sessionId);
    if (!userId) return;

    const questId = String(msg.questId ?? "").slice(0, 100);
    if (!questId) return;

    try {
      await completeQuestForPlayer(userId, this.state.zoneId, questId);
      client.send("quest_completed", { questId });
      console.log(`[ZoneRoom] Quest ${questId} completed by ${userId}`);
    } catch (err) {
      console.warn(`[ZoneRoom] Quest completion error for ${userId}:`, (err as Error).message);
    }
  }

  // ── Wave Management ───────────────────────────────────────────────────────────

  private startNextWave() {
    if (this.state.currentWave >= this.state.totalWaves) return;

    this.state.currentWave += 1;
    this.state.waveState = "active";
    this.state.waveStartAt = Date.now();

    this.spawnWaveEnemies();
    console.log(`[ZoneRoom] wave ${this.state.currentWave}/${this.state.totalWaves} started in zone ${this.state.zoneId}`);
  }

  private spawnWaveEnemies() {
    const zoneDefs = ZONE_ENEMIES[this.state.zoneId] ?? ZONE_ENEMIES["zone1"];
    const count = BASE_ENEMY_COUNT + (this.state.currentWave - 1) * 2;

    for (let i = 0; i < count; i++) {
      const def = zoneDefs[Math.floor(Math.random() * zoneDefs.length)];
      const enemy = new Enemy();
      enemy.id = uid();
      enemy.type = def.type;
      enemy.hp = def.hp;
      enemy.maxHp = def.hp;
      enemy.damage = def.dmg;
      enemy.speed = def.speed;
      enemy.aggroRange = def.aggroRange;
      enemy.aiState = "patrol";
      enemy.spawnedAt = Date.now();

      // Spawn near edges of the 320×180 canvas
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: enemy.x = Math.random() * 320; enemy.y = 5;   break;
        case 1: enemy.x = Math.random() * 320; enemy.y = 175; break;
        case 2: enemy.x = 5;   enemy.y = Math.random() * 180; break;
        default: enemy.x = 315; enemy.y = Math.random() * 180; break;
      }
      enemy.patrolX = enemy.x;
      enemy.patrolY = enemy.y;

      this.state.enemies.set(enemy.id, enemy);
    }

    this.updateEnemiesAlive();
  }

  private updateEnemiesAlive() {
    let count = 0;
    this.state.enemies.forEach((e: Enemy) => { if (e.aiState !== "dead") count++; });
    this.state.enemiesAlive = count;
  }

  private killEnemy(enemy: Enemy, killerSessionId?: string) {
    enemy.aiState = "dead";
    // Drop crafting materials for the killer
    if (killerSessionId) {
      this.dropLootForPlayer(killerSessionId).catch(() => {/* best-effort */});
    }
    // Remove from state after a short delay (so clients can play death animation)
    this.clock.setTimeout(() => {
      this.state.enemies.delete(enemy.id);
      this.updateEnemiesAlive();
      this.checkWaveComplete();
    }, 500);
  }

  /** Rolls loot table for the current zone and adds dropped materials to the killer's inventory. */
  private async dropLootForPlayer(sessionId: string): Promise<void> {
    const userId = sessionUserMap.get(sessionId);
    if (!userId) return;

    const lootTable = ZONE_LOOT[this.state.zoneId] ?? [];
    const droppedItems: string[] = [];

    for (const entry of lootTable) {
      if (Math.random() < entry.chance) {
        await addItem(userId, entry.itemId, 1);
        droppedItems.push(entry.itemId);
      }
    }

    if (droppedItems.length > 0) {
      // Notify the killer's client so it can show floating pickup text
      const killerClient = this.clients.find((c: Client) => c.sessionId === sessionId);
      if (killerClient) {
        killerClient.send("loot_drop", { items: droppedItems });
      }
    }
  }

  /** Broadcast crafting event to all other players in the zone. */
  private handleCraftNotify(client: Client, msg: CraftNotifyMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const playerName = player.name || "Hero";
    const itemName = String(msg.itemName ?? "").slice(0, 50);
    if (!itemName) return;

    // Broadcast to everyone else in the room
    this.broadcast(
      "craft_event",
      { playerName, itemName },
      { except: client },
    );
  }

  private checkWaveComplete() {
    if (this.state.waveState !== "active") return;
    if (this.state.enemiesAlive > 0) return;

    if (this.state.currentWave >= this.state.totalWaves) {
      this.state.waveState = "complete";
      console.log(`[ZoneRoom] zone ${this.state.zoneId} complete`);
    } else {
      this.state.waveState = "waiting";
      this.clock.setTimeout(() => this.startNextWave(), WAVE_PREP_MS);
    }
  }

  // ── Game Tick ─────────────────────────────────────────────────────────────────

  private tick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000; // seconds
    this.lastTick = now;

    this.tickEnemyAI(dt, now);
    this.tickProjectiles(dt, now);
    this.tickManaRegen(dt);
    this.tickStatusEffects(now);
    this.tickBuffs(now);
  }

  /** Expire player status effects whose duration has elapsed. */
  private tickStatusEffects(now: number) {
    this.state.players.forEach((player: Player) => {
      if (player.statusFlags !== 0 && now > player.statusExpiry) {
        player.statusFlags = 0;
      }
    });
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────────────

  private tickEnemyAI(dt: number, now: number) {
    this.state.enemies.forEach((enemy: Enemy) => {
      if (enemy.aiState === "dead") return;

      // Find nearest living player
      let nearestPlayer: Player | null = null;
      let nearestDist = Infinity;
      this.state.players.forEach((player: Player) => {
        if (player.hp <= 0) return;
        const d = dist(enemy.x, enemy.y, player.x, player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPlayer = player;
        }
      });

      if (nearestPlayer !== null && nearestDist <= enemy.aggroRange) {
        const target = nearestPlayer as Player;
        enemy.aiState = "chase";
        enemy.targetId = target.sessionId;
        this.moveEnemyToward(enemy, target.x, target.y, dt);
        this.checkEnemyMeleeHit(enemy, target, now);
      } else {
        // Patrol: wander around spawn point
        enemy.aiState = "patrol";
        enemy.targetId = "";
        this.patrolEnemy(enemy, dt);
      }
    });
  }

  private moveEnemyToward(enemy: Enemy, tx: number, ty: number, dt: number) {
    if (enemy.speed === 0) return;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return;
    enemy.x += (dx / d) * enemy.speed * dt;
    enemy.y += (dy / d) * enemy.speed * dt;
    enemy.x = Math.max(0, Math.min(320, enemy.x));
    enemy.y = Math.max(0, Math.min(180, enemy.y));
  }

  private patrolEnemy(enemy: Enemy, dt: number) {
    if (enemy.speed === 0) return;
    const d = dist(enemy.x, enemy.y, enemy.patrolX, enemy.patrolY);
    if (d < 5) {
      enemy.patrolX = Math.max(0, Math.min(320, enemy.x + (Math.random() - 0.5) * 60));
      enemy.patrolY = Math.max(0, Math.min(180, enemy.y + (Math.random() - 0.5) * 60));
    }
    this.moveEnemyToward(enemy, enemy.patrolX, enemy.patrolY, dt * 0.5);
  }

  private checkEnemyMeleeHit(enemy: Enemy, player: Player, now: number) {
    if (now < player.invincibleUntil) return;
    if (dist(enemy.x, enemy.y, player.x, player.y) > 12) return;

    // Arcane shield absorb
    let dmgToApply = PLAYER_HIT_DAMAGE;
    if (player.shieldAbsorb > 0) {
      const absorbed = Math.min(player.shieldAbsorb, dmgToApply);
      player.shieldAbsorb -= absorbed;
      dmgToApply -= absorbed;
    }
    player.hp = Math.max(0, player.hp - dmgToApply);
    player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;

    // Apply status effect from this enemy type (e.g. frost_wolf → freeze)
    const statusDef = MELEE_STATUS_MAP[enemy.type];
    if (statusDef && now >= player.statusExpiry) {
      player.statusFlags |= statusDef.flag;
      player.statusExpiry = now + statusDef.durationMs;
    }

    if (player.hp === 0) {
      console.log(`[ZoneRoom] player ${player.sessionId} died`);
    }
  }

  // ── Projectile Tick ───────────────────────────────────────────────────────────

  private tickProjectiles(dt: number, now: number) {
    const toDelete: string[] = [];

    this.state.projectiles.forEach((proj: Projectile) => {
      if (now > proj.expiresAt) {
        toDelete.push(proj.id);
        return;
      }

      proj.x += proj.velX * dt;
      proj.y += proj.velY * dt;

      if (proj.x < 0 || proj.x > 320 || proj.y < 0 || proj.y > 180) {
        toDelete.push(proj.id);
        return;
      }

      this.state.players.forEach((player: Player) => {
        if (player.hp <= 0) return;
        if (now < player.invincibleUntil) return;
        if (dist(proj.x, proj.y, player.x, player.y) > 8) return;

        let projDmg = proj.damage;
        if (player.shieldAbsorb > 0) {
          const absorbed = Math.min(player.shieldAbsorb, projDmg);
          player.shieldAbsorb -= absorbed;
          projDmg -= absorbed;
        }
        player.hp = Math.max(0, player.hp - projDmg);
        player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;
        toDelete.push(proj.id);
      });
    });

    toDelete.forEach((id) => this.state.projectiles.delete(id));
  }

  // ── Mana Regen ────────────────────────────────────────────────────────────────

  private tickManaRegen(dt: number) {
    this.state.players.forEach((player: Player) => {
      if (player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN_PER_SEC * dt);
      }
    });
  }

  // ── Ranged projectile spawn (called from tickEnemyAI for ranged enemies) ──────

  protected spawnProjectile(enemy: Enemy, tx: number, ty: number) {
    const proj = new Projectile();
    proj.id = uid();
    proj.ownerId = enemy.id;
    proj.x = enemy.x;
    proj.y = enemy.y;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    proj.velX = (dx / d) * PROJECTILE_SPEED;
    proj.velY = (dy / d) * PROJECTILE_SPEED;
    proj.damage = enemy.damage;
    proj.expiresAt = Date.now() + PROJECTILE_LIFETIME_MS;
    this.state.projectiles.set(proj.id, proj);
  }

  // ── P2P Trade handlers ────────────────────────────────────────────────────────

  /** Initiator sends a trade invite to another player in the zone. */
  private handleTradeRequest(client: Client, msg: TradeRequestMessage): void {
    const target = this.clients.find((c) => c.sessionId === msg.targetSessionId);
    if (!target) {
      client.send("trade_error", { message: "Player not found in this zone" });
      return;
    }
    if (target.sessionId === client.sessionId) {
      client.send("trade_error", { message: "Cannot trade with yourself" });
      return;
    }
    // Check if either side is already in a trade
    for (const [, trade] of this.pendingTrades) {
      if (
        trade.initiatorSessionId === client.sessionId ||
        trade.counterpartSessionId === client.sessionId ||
        trade.initiatorSessionId === target.sessionId ||
        trade.counterpartSessionId === target.sessionId
      ) {
        client.send("trade_error", { message: "One of you is already in a trade" });
        return;
      }
    }

    const initiatorName = this.state.players.get(client.sessionId)?.name ?? "Unknown";
    this.pendingTrades.set(client.sessionId, {
      initiatorSessionId: client.sessionId,
      counterpartSessionId: target.sessionId,
      initiatorOffer: null,
      counterpartOffer: null,
      initiatorConfirmed: false,
      counterpartConfirmed: false,
    });

    target.send("trade_invited", { from: client.sessionId, fromName: initiatorName });
    client.send("trade_pending", { with: target.sessionId });
    console.log(`[Trade] ${client.sessionId} invited ${target.sessionId}`);
  }

  /** Counterpart accepts or declines a trade invite. */
  private handleTradeRespond(client: Client, msg: TradeRespondMessage): void {
    // Find trade where this client is the counterpart
    let trade: PendingTrade | undefined;
    let tradeKey: string | undefined;
    for (const [key, t] of this.pendingTrades) {
      if (t.counterpartSessionId === client.sessionId) {
        trade = t;
        tradeKey = key;
        break;
      }
    }
    if (!trade || !tradeKey) {
      client.send("trade_error", { message: "No pending trade invite" });
      return;
    }

    const initiatorClient = this.clients.find((c) => c.sessionId === trade!.initiatorSessionId);

    if (!msg.accept) {
      this.pendingTrades.delete(tradeKey);
      initiatorClient?.send("trade_declined", { by: client.sessionId });
      client.send("trade_cancelled", { reason: "You declined" });
      return;
    }

    // Both clients enter the offer phase
    initiatorClient?.send("trade_accepted", { with: client.sessionId });
    client.send("trade_accepted", { with: trade.initiatorSessionId });
  }

  /** Each side submits their offer (items + gold). */
  private handleTradeOffer(client: Client, msg: TradeOfferMessage): void {
    const { trade, isInitiator } = this.findTrade(client.sessionId);
    if (!trade) {
      client.send("trade_error", { message: "No active trade" });
      return;
    }

    const offer = {
      items: msg.items.map((i) => ({
        inventoryId: i.inventoryId,
        itemId: i.itemId,
        quantity: Math.max(1, Math.floor(i.quantity)),
      })),
      gold: Math.max(0, Math.floor(msg.gold)),
    };

    if (isInitiator) {
      trade.initiatorOffer = offer;
      trade.initiatorConfirmed = false; // reset on re-offer
    } else {
      trade.counterpartOffer = offer;
      trade.counterpartConfirmed = false;
    }

    // Notify the other side
    const otherSessionId = isInitiator
      ? trade.counterpartSessionId
      : trade.initiatorSessionId;
    const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
    otherClient?.send("trade_offer_updated", { offer, fromInitiator: isInitiator });
  }

  /** Each side confirms the current offers. When both confirm → execute. */
  private handleTradeConfirm(client: Client, msg: TradeConfirmMessage): void {
    const { trade, isInitiator, tradeKey } = this.findTrade(client.sessionId);
    if (!trade || !tradeKey) {
      client.send("trade_error", { message: "No active trade" });
      return;
    }

    if (!msg.confirmed) {
      // Un-confirm resets the other side too
      trade.initiatorConfirmed = false;
      trade.counterpartConfirmed = false;
      const otherSessionId = isInitiator ? trade.counterpartSessionId : trade.initiatorSessionId;
      const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
      otherClient?.send("trade_unconfirmed", {});
      return;
    }

    if (isInitiator) {
      trade.initiatorConfirmed = true;
    } else {
      trade.counterpartConfirmed = true;
    }

    if (trade.initiatorConfirmed && trade.counterpartConfirmed) {
      this.executeTrade(trade, tradeKey);
    } else {
      // Notify the other side they're waiting for them
      const otherSessionId = isInitiator ? trade.counterpartSessionId : trade.initiatorSessionId;
      const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
      otherClient?.send("trade_awaiting_confirm", {});
    }
  }

  /** Either side can cancel at any time before execution. */
  private handleTradeCancel(client: Client): void {
    const { trade, tradeKey } = this.findTrade(client.sessionId);
    if (!trade || !tradeKey) return;

    this.pendingTrades.delete(tradeKey);

    const initiatorClient  = this.clients.find((c) => c.sessionId === trade.initiatorSessionId);
    const counterpartClient = this.clients.find((c) => c.sessionId === trade.counterpartSessionId);
    initiatorClient?.send("trade_cancelled", { reason: "Trade was cancelled" });
    counterpartClient?.send("trade_cancelled", { reason: "Trade was cancelled" });
  }

  /** Execute a fully-confirmed P2P trade via the DB layer. */
  private async executeTrade(trade: PendingTrade, tradeKey: string): Promise<void> {
    const initiatorUserId   = sessionUserMap.get(trade.initiatorSessionId);
    const counterpartUserId = sessionUserMap.get(trade.counterpartSessionId);

    const initiatorClient   = this.clients.find((c) => c.sessionId === trade.initiatorSessionId);
    const counterpartClient = this.clients.find((c) => c.sessionId === trade.counterpartSessionId);

    if (!initiatorUserId || !counterpartUserId) {
      initiatorClient?.send("trade_error", { message: "Trade requires a logged-in account" });
      counterpartClient?.send("trade_error", { message: "Trade requires a logged-in account" });
      this.pendingTrades.delete(tradeKey);
      return;
    }

    try {
      const result = await executeP2PTrade(
        initiatorUserId,
        counterpartUserId,
        trade.initiatorOffer?.items ?? [],
        trade.initiatorOffer?.gold ?? 0,
        trade.counterpartOffer?.items ?? [],
        trade.counterpartOffer?.gold ?? 0,
      );

      this.pendingTrades.delete(tradeKey);

      if (result.success) {
        initiatorClient?.send("trade_complete", { success: true });
        counterpartClient?.send("trade_complete", { success: true });
        console.log(`[Trade] P2P trade completed between ${initiatorUserId} and ${counterpartUserId}`);
      } else {
        initiatorClient?.send("trade_error", { message: result.error ?? "Trade failed" });
        counterpartClient?.send("trade_error", { message: result.error ?? "Trade failed" });
      }
    } catch (err) {
      this.pendingTrades.delete(tradeKey);
      initiatorClient?.send("trade_error", { message: "Trade execution failed" });
      counterpartClient?.send("trade_error", { message: "Trade execution failed" });
      console.error("[Trade] executeTrade error:", (err as Error).message);
    }
  }

  /** Cancel all trades involving a disconnecting player. */
  private cancelTradesForClient(sessionId: string): void {
    for (const [key, trade] of this.pendingTrades) {
      if (trade.initiatorSessionId === sessionId || trade.counterpartSessionId === sessionId) {
        const otherSessionId =
          trade.initiatorSessionId === sessionId
            ? trade.counterpartSessionId
            : trade.initiatorSessionId;
        const otherClient = this.clients.find((c) => c.sessionId === otherSessionId);
        otherClient?.send("trade_cancelled", { reason: "Other player disconnected" });
        this.pendingTrades.delete(key);
      }
    }
  }

  /** Helper: find a pending trade involving sessionId. */
  private findTrade(sessionId: string): {
    trade?: PendingTrade;
    tradeKey?: string;
    isInitiator: boolean;
  } {
    for (const [key, trade] of this.pendingTrades) {
      if (trade.initiatorSessionId === sessionId) {
        return { trade, tradeKey: key, isInitiator: true };
      }
      if (trade.counterpartSessionId === sessionId) {
        return { trade, tradeKey: key, isInitiator: false };
      }
    }
    return { isInitiator: false };
  }

  // ── Skill Tree Handlers ───────────────────────────────────────────────────────

  /** Apply all passive bonuses from unlocked skills to the Colyseus Player schema. */
  private applySkillPassives(player: Player, skillState: SkillState): void {
    const bonuses = computePassiveBonuses(Object.keys(skillState.unlockedSkills));
    const baseHp   = 100 + (player.level - 1) * 20;
    const baseMana =  50;
    player.maxHp   = baseHp   + bonuses.maxHpFlat;
    player.maxMana = baseMana + bonuses.maxManaFlat;
    // Clamp current values to new maxes
    player.hp   = Math.min(player.hp,   player.maxHp);
    player.mana = Math.min(player.mana, player.maxMana);
  }

  /** Push skill state into the Colyseus-synced Player fields. */
  private syncSkillState(player: Player, skillState: SkillState): void {
    player.classId        = skillState.classId;
    player.skillPoints    = skillState.skillPoints;
    player.unlockedSkills = JSON.stringify(Object.keys(skillState.unlockedSkills));
    player.hotbar         = JSON.stringify(skillState.hotbar.slice(0, 6));
  }

  /** Called by the client on level-up — grant one skill point. */
  private handleLevelUp(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;
    skillState.skillPoints += 1;
    player.skillPoints = skillState.skillPoints;
    client.send("skill_points_updated", { skillPoints: skillState.skillPoints });
  }

  /** Player spends a skill point to unlock a skill. */
  private handleSkillAlloc(client: Client, msg: SkillAllocMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const skillId = String(msg.skillId ?? "").slice(0, 50);
    const skillDef = SKILL_BY_ID.get(skillId);
    if (!skillDef) { client.send("skill_error", { message: "Unknown skill" }); return; }
    if (skillDef.classId !== skillState.classId) { client.send("skill_error", { message: "Wrong class" }); return; }
    if (skillState.unlockedSkills[skillId]) { client.send("skill_error", { message: "Already unlocked" }); return; }
    if (skillState.skillPoints <= 0) { client.send("skill_error", { message: "No skill points" }); return; }

    // Check prerequisite
    if (skillDef.prerequisiteId && !skillState.unlockedSkills[skillDef.prerequisiteId]) {
      client.send("skill_error", { message: "Prerequisite not met" }); return;
    }

    skillState.unlockedSkills[skillId] = 1;
    skillState.skillPoints -= 1;

    this.applySkillPassives(player, skillState);
    this.syncSkillState(player, skillState);
    client.send("skill_alloc_ok", { skillId, skillPoints: skillState.skillPoints });
  }

  /** Player updates their hotbar layout. */
  private handleSkillHotbar(client: Client, msg: SkillHotbarMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const hotbar = (Array.isArray(msg.hotbar) ? msg.hotbar : [])
      .slice(0, 6)
      .map(id => String(id).slice(0, 50));

    // Only allow skills they've unlocked (or empty slots "")
    const validated = hotbar.map(id => {
      if (!id) return "";
      const def = SKILL_BY_ID.get(id);
      if (!def || !skillState.unlockedSkills[id] || def.type !== "active") return "";
      return id;
    });

    skillState.hotbar = validated;
    player.hotbar = JSON.stringify(validated);
    client.send("skill_hotbar_ok", { hotbar: validated });
  }

  /** Player switches class (only allowed if no skills unlocked yet). */
  private handleSkillClass(client: Client, msg: SkillClassMessage): void {
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;
    const classId = String(msg.classId ?? "").slice(0, 20) as ClassId;
    if (classId !== "warrior" && classId !== "mage") {
      client.send("skill_error", { message: "Invalid class" }); return;
    }
    if (Object.keys(skillState.unlockedSkills).length > 0) {
      client.send("skill_error", { message: "Respec first to change class" }); return;
    }
    skillState.classId = classId;
    const player = this.state.players.get(client.sessionId);
    if (player) player.classId = classId;
    client.send("skill_class_ok", { classId });
  }

  /** Respec: refund all skill points (resets unlocked skills). */
  private handleSkillRespec(client: Client, msg: SkillRespecMessage): void {
    if (!msg.confirm) return;
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const refunded = Object.keys(skillState.unlockedSkills).length;
    skillState.unlockedSkills = {};
    skillState.hotbar         = [];
    skillState.skillPoints    += refunded;

    this.applySkillPassives(player, skillState);
    this.syncSkillState(player, skillState);
    client.send("skill_respec_ok", { skillPoints: skillState.skillPoints });
  }

  /** Player activates an active skill. */
  private handleSkillUse(client: Client, msg: SkillUseMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.hp <= 0) return;
    const skillState = this.skillStateMap.get(client.sessionId);
    if (!skillState) return;

    const skillId = String(msg.skillId ?? "").slice(0, 50);
    const skillDef = SKILL_BY_ID.get(skillId);
    if (!skillDef || skillDef.type !== "active") return;
    if (!skillState.unlockedSkills[skillId]) return;

    const now = Date.now();
    const cds = this.skillCooldowns.get(client.sessionId) ?? {};

    // Check cooldown
    if ((cds[skillId] ?? 0) > now) {
      client.send("skill_on_cooldown", { skillId, expiresAt: cds[skillId] });
      return;
    }

    // Check mana (unless arcane_surge is active)
    const surgeBuff = (player.buffFlags & BUFF_ARCANE_SURGE) !== 0 && now < player.buffExpiresAt;
    const manaCost  = surgeBuff ? 0 : (skillDef.manaCost ?? 0);
    if (player.mana < manaCost) {
      client.send("skill_no_mana", { skillId }); return;
    }

    // Cooldown reduction from passives
    const bonuses = computePassiveBonuses(Object.keys(skillState.unlockedSkills));
    const cdMult  = Math.max(0.2, 1 - bonuses.allCdReductionPct);
    const cd      = Math.round((skillDef.cooldownMs ?? 0) * cdMult);
    cds[skillId]  = now + cd;
    this.skillCooldowns.set(client.sessionId, cds);
    player.mana = Math.max(0, player.mana - manaCost);

    // Skill multipliers
    const surgeMult  = surgeBuff ? 2.0 : 1.0;
    const berserkMult = ((player.buffFlags & BUFF_BERSERK) !== 0 && now < player.buffExpiresAt) ? 1.5 : 1.0;
    const dmgBonus   = 1 + bonuses.damagePct;

    this.executeSkillEffect(client, player, skillId, now, surgeMult * berserkMult * dmgBonus);

    // Broadcast cooldown info back to the caster
    player.skillCooldowns = JSON.stringify(cds);
    client.send("skill_used", { skillId, cooldownMs: cd, expiresAt: cds[skillId] });
  }

  private executeSkillEffect(client: Client, player: Player, skillId: string, now: number, dmgMult: number): void {
    const sid = client.sessionId;
    switch (skillId) {
      // ── Warrior — Berserker ──────────────────────────────────────────────────
      case "reckless_strike": {
        const enemy = this.nearestEnemyTo(player, SKILL_MELEE_RANGE * 2);
        if (enemy) this.dealDamageToEnemy(enemy, Math.round(50 * dmgMult), player, sid);
        break;
      }
      case "blade_fury": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS) return;
          this.dealDamageToEnemy(e, Math.round(38 * dmgMult), player, sid);
        });
        break;
      }
      case "berserk_mode": {
        player.buffFlags    |= BUFF_BERSERK;
        player.buffExpiresAt = now + 6000;
        break;
      }

      // ── Warrior — Guardian ───────────────────────────────────────────────────
      case "shield_bash": {
        const enemy = this.nearestEnemyTo(player, SKILL_MELEE_RANGE * 2);
        if (enemy) {
          enemy.statusFlags |= 8; // stun
          // Use spawnedAt as a temporary stun-expiry tag (repurposed field)
          enemy.spawnedAt = now + 1500;
        }
        break;
      }
      case "taunt": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState !== "dead") {
            e.aiState  = "chase";
            e.targetId = player.sessionId;
          }
        });
        // Taunt lasts 4s on client — server just forces chase state
        break;
      }
      case "last_stand": break; // purely passive (handled in applySkillPassives)

      // ── Warrior — Paladin ────────────────────────────────────────────────────
      case "holy_mending": {
        player.hp = Math.min(player.maxHp, player.hp + 50);
        break;
      }
      case "sacred_strike": {
        const enemy = this.nearestEnemyTo(player, SKILL_MELEE_RANGE * 2);
        if (enemy) {
          this.dealDamageToEnemy(enemy, Math.round(45 * dmgMult), player, sid);
          // Apply burn (flag 2)
          enemy.statusFlags |= 2;
        }
        break;
      }
      case "divine_shield": {
        player.buffFlags    |= BUFF_DIVINE_SHIELD;
        player.buffExpiresAt = now + 3000;
        player.invincibleUntil = now + 3000;
        break;
      }

      // ── Mage — Pyromancer ────────────────────────────────────────────────────
      case "fireball": {
        const enemy = this.nearestEnemyTo(player, 200);
        if (enemy) {
          this.dealDamageToEnemy(enemy, Math.round(60 * dmgMult), player, sid);
          enemy.statusFlags |= 2; // burn
        }
        break;
      }
      case "inferno_ring": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS) return;
          this.dealDamageToEnemy(e, Math.round(80 * dmgMult), player, sid);
          e.statusFlags |= 2; // burn
        });
        break;
      }
      case "meteor_strike": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS * 1.5) return;
          this.dealDamageToEnemy(e, Math.round(150 * dmgMult), player, sid);
        });
        break;
      }

      // ── Mage — Frostbinder ───────────────────────────────────────────────────
      case "ice_lance": {
        const enemy = this.nearestEnemyTo(player, 200);
        if (enemy) {
          this.dealDamageToEnemy(enemy, Math.round(45 * dmgMult), player, sid);
          enemy.statusFlags |= 4; // freeze
        }
        break;
      }
      case "blizzard": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS * 1.3) return;
          e.statusFlags |= 4; // freeze
        });
        break;
      }
      case "glacial_nova": {
        this.state.enemies.forEach((e: Enemy) => {
          if (e.aiState === "dead") return;
          if (dist(player.x, player.y, e.x, e.y) > SKILL_AoE_RADIUS * 1.5) return;
          this.dealDamageToEnemy(e, Math.round(100 * dmgMult), player, sid);
          e.statusFlags |= 4; // freeze
        });
        break;
      }

      // ── Mage — Arcanist ──────────────────────────────────────────────────────
      case "arcane_bolt": {
        const enemy = this.nearestEnemyTo(player, 200);
        if (enemy) this.dealDamageToEnemy(enemy, Math.round(70 * dmgMult), player, sid);
        break;
      }
      case "arcane_shield": {
        player.shieldAbsorb = 80;
        break;
      }
      case "arcane_surge": {
        player.buffFlags    |= BUFF_ARCANE_SURGE;
        player.buffExpiresAt = now + 10000;
        break;
      }

      default: break;
    }
  }

  /** Deals damage to an enemy. killerSessionId is used for loot drops on kill. */
  private dealDamageToEnemy(enemy: Enemy, damage: number, _player: Player, killerSessionId?: string): void {
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp === 0) this.killEnemy(enemy, killerSessionId);
  }

  /** Returns the closest alive enemy within maxRange of the player, or null. */
  private nearestEnemyTo(player: Player, maxRange: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = maxRange;
    this.state.enemies.forEach((e: Enemy) => {
      if (e.aiState === "dead") return;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    });
    return nearest;
  }

  /** Tick buff expiry and expire buff flags. */
  private tickBuffs(now: number): void {
    this.state.players.forEach((player: Player) => {
      if (player.buffFlags !== 0 && now > player.buffExpiresAt) {
        player.buffFlags = 0;
      }
    });
  }
}

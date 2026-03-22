import { Room, Client, Delayed } from "@colyseus/core";
import { ZoneGameState, Player, Enemy, Projectile } from "./schema/GameState";
import { loadPlayerState, savePlayerState, initPlayerState } from "../db/players";
import { getOrGenerateQuest, completeQuestForPlayer } from "../quests/db";
import { verifyRoomToken, AuthPayload } from "../auth/middleware";

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

// ── Status effect flags (bitmask, mirrors client STATUS_EFFECTS) ──────────────
const STATUS_FLAG_FREEZE = 4; // bit 2
const STATUS_FREEZE_MS   = 3000;
/** Enemy types whose melee contact applies a status flag to the player. */
const MELEE_STATUS_MAP: Record<string, { flag: number; durationMs: number }> = {
  frost_wolf:    { flag: STATUS_FLAG_FREEZE, durationMs: STATUS_FREEZE_MS },
  crystal_golem: { flag: STATUS_FLAG_FREEZE, durationMs: STATUS_FREEZE_MS },
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
      } catch (err) {
        console.warn(`[ZoneRoom] Failed to load state for ${userId}:`, (err as Error).message);
      }
    }

    console.log(`[ZoneRoom] ${client.sessionId} (${auth?.username}) joined zone ${this.state.zoneId} (${this.clients.length} players)`);
  }

  async onLeave(client: Client, consented: boolean) {
    await this.persistPlayer(client.sessionId);
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
        this.killEnemy(enemy);
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

  private killEnemy(enemy: Enemy) {
    enemy.aiState = "dead";
    // Remove from state after a short delay (so clients can play death animation)
    this.clock.setTimeout(() => {
      this.state.enemies.delete(enemy.id);
      this.updateEnemiesAlive();
      this.checkWaveComplete();
    }, 500);
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

    player.hp = Math.max(0, player.hp - PLAYER_HIT_DAMAGE);
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

        player.hp = Math.max(0, player.hp - proj.damage);
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
}

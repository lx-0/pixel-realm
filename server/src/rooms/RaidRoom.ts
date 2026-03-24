/**
 * RaidRoom — guild raid boss encounter Colyseus room.
 *
 * Lifecycle:
 *   1. Players join during JOIN_WINDOW_MS (60 s). Up to 16 players (4 parties × 4).
 *   2. Raid starts: boss spawns, enrage timer begins.
 *   3. Boss has 3 phases (transitions at 66% and 33% HP).
 *   4. Enrage: after ENRAGE_MS, boss damage is doubled and it gains a speed boost.
 *   5. Victory: loot distributed to all living players, weekly lockouts recorded.
 *   6. Defeat: all players dead → raid_defeat broadcast.
 *
 * Matchmaking:
 *   client.joinOrCreate("raid", { bossId, token })
 *   Each bossId gets one shared instance per week slot (filterBy: ["bossId"]).
 *
 * Difficulty scaling:
 *   Boss HP scales with (playerCount) and avgPrestigeLevel of participants.
 */

import { Room, Client, Delayed } from "@colyseus/core";
import { incrementMessageCount } from "../metrics";
import { RaidGameState, Player, Enemy, Projectile } from "./schema/RaidState";
import { loadPlayerState, savePlayerState, initPlayerState } from "../db/players";
import { invalidateLeaderboardCache } from "../db/leaderboard";
import { getPool } from "../db/client";
import { verifyRoomToken, AuthPayload } from "../auth/middleware";
import { initSkillState, loadSkillState, saveSkillState, type SkillState } from "../db/skills";
import { computePassiveBonuses } from "../skills";
import { addItem } from "../db/inventory";
import { getPlayerGuild } from "../db/guilds";
import { getPrestigeBonuses } from "../db/prestige";
import { isRaidLocked, recordRaidClear, getRaidLockouts, type RaidBossId } from "../db/raids";

// ── Constants ─────────────────────────────────────────────────────────────────

const TICK_RATE_MS             = 50;      // 20 Hz
const JOIN_WINDOW_MS           = 60_000;  // 60 s for all parties to join
const ENRAGE_MS                = 600_000; // 10 minutes → boss enrages
const PERSIST_INTERVAL_MS      = 30_000;
const PLAYER_INVINCIBILITY_MS  = 900;
const MANA_REGEN_PER_SEC       = 6;
const ATTACK_RANGE_PX          = 30;
const ATTACK_DAMAGE            = 25;
const ATTACK_COOLDOWN_MS       = 480;
const PROJECTILE_SPEED         = 100;
const PROJECTILE_LIFETIME_MS   = 2400;
const RANGED_FIRE_COOLDOWN_MS  = 1800;
const ENRAGE_DAMAGE_MULT       = 2.0;
const ENRAGE_SPEED_MULT        = 1.5;

// ── Raid boss configs ─────────────────────────────────────────────────────────

interface BossPhase {
  hpPctThreshold: number;
  speedMult:      number;
  damageMult:     number;
  ranged:         boolean;
  label:          string;
}

interface RaidBossConfig {
  id:         RaidBossId;
  name:       string;
  type:       string;   // sprite key
  baseHp:     number;
  baseDamage: number;
  baseSpeed:  number;
  aggroRange: number;
  phases:     BossPhase[];
  xpReward:   number;
}

const RAID_BOSSES: Record<RaidBossId, RaidBossConfig> = {
  raid_dragon: {
    id:         "raid_dragon",
    name:       "Emberveil Dragon",
    type:       "boss_raid_dragon_idle",
    baseHp:     8000,
    baseDamage: 60,
    baseSpeed:  50,
    aggroRange: 200,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: false, label: "Dormant Wrath" },
      { hpPctThreshold: 0.66, speedMult: 1.3, damageMult: 1.4, ranged: true,  label: "Firestorm" },
      { hpPctThreshold: 0.33, speedMult: 1.7, damageMult: 2.0, ranged: true,  label: "Inferno Ascent" },
    ],
    xpReward: 3000,
  },
  raid_shadow: {
    id:         "raid_shadow",
    name:       "The Umbral Lich",
    type:       "boss_raid_shadow_idle",
    baseHp:     9500,
    baseDamage: 70,
    baseSpeed:  60,
    aggroRange: 220,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Shadow Veil" },
      { hpPctThreshold: 0.66, speedMult: 1.4, damageMult: 1.6, ranged: true,  label: "Void Surge" },
      { hpPctThreshold: 0.33, speedMult: 2.0, damageMult: 2.5, ranged: false, label: "Soul Shatter" },
    ],
    xpReward: 3500,
  },
  raid_crystal: {
    id:         "raid_crystal",
    name:       "The Resonant Core",
    type:       "boss_raid_crystal_idle",
    baseHp:     11000,
    baseDamage: 80,
    baseSpeed:  35,
    aggroRange: 250,
    phases: [
      { hpPctThreshold: 1.00, speedMult: 1.0, damageMult: 1.0, ranged: true,  label: "Crystallised" },
      { hpPctThreshold: 0.66, speedMult: 1.2, damageMult: 1.8, ranged: true,  label: "Resonance Surge" },
      { hpPctThreshold: 0.33, speedMult: 1.5, damageMult: 2.8, ranged: true,  label: "Harmonic Annihilation" },
    ],
    xpReward: 4000,
  },
};

// ── Raid loot tables ──────────────────────────────────────────────────────────

const RAID_LOOT: Record<RaidBossId, Array<{ itemId: string; chance: number }>> = {
  raid_dragon: [
    { itemId: "raid_token_dragon",       chance: 1.00 },
    { itemId: "dungeon_gem_supreme",     chance: 0.90 },
    { itemId: "boss_essence_overlord",   chance: 0.70 },
    { itemId: "dungeon_shard_void",      chance: 0.50 },
    { itemId: "sword_void",              chance: 0.15 },
    { itemId: "raid_cosmetic_dragon",    chance: 0.05 },
  ],
  raid_shadow: [
    { itemId: "raid_token_shadow",       chance: 1.00 },
    { itemId: "dungeon_gem_supreme",     chance: 0.90 },
    { itemId: "boss_essence_overlord",   chance: 0.70 },
    { itemId: "dungeon_shard_void",      chance: 0.55 },
    { itemId: "armor_void",              chance: 0.15 },
    { itemId: "raid_cosmetic_shadow",    chance: 0.05 },
  ],
  raid_crystal: [
    { itemId: "raid_token_crystal",      chance: 1.00 },
    { itemId: "dungeon_gem_supreme",     chance: 0.90 },
    { itemId: "boss_essence_overlord",   chance: 0.75 },
    { itemId: "dungeon_shard_void",      chance: 0.60 },
    { itemId: "staff_resonant",          chance: 0.15 },
    { itemId: "raid_cosmetic_crystal",   chance: 0.05 },
  ],
};

// ── Raid difficulty scaling ───────────────────────────────────────────────────

/** HP multiplier for player count + prestige contribution. */
function raidHpMultiplier(playerCount: number, avgPrestige: number): number {
  // Base: +15% HP per player beyond 1, capped at 16 players
  const countBonus    = 1 + Math.min(15, playerCount - 1) * 0.15;
  // Prestige bonus: +5% per average prestige tier
  const prestigeBonus = 1 + Math.min(10, avgPrestige) * 0.05;
  return countBonus * prestigeBonus;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function uid(): string { return Math.random().toString(36).slice(2, 10); }

function isValidBossId(id: string): id is RaidBossId {
  return id === "raid_dragon" || id === "raid_shadow" || id === "raid_crystal";
}

// ── Session → userId / prestige ───────────────────────────────────────────────

const raidSessionUserMap = new Map<string, string>();

// ── Room join options ─────────────────────────────────────────────────────────

interface RaidJoinOptions {
  bossId?:     string;
  playerName?: string;
  token?:      string;
}

interface MoveMessage { x: number; y: number; facingX: number; facingY: number }
interface ChatMessage { text: string }

// ── RaidRoom ──────────────────────────────────────────────────────────────────

export class RaidRoom extends Room<RaidGameState> {
  maxClients = 16;

  private lastTick      = 0;
  private raidStartTime = 0;

  // Boss state
  private bossConfig:       RaidBossConfig | null = null;
  private bossId_:          string | null         = null;
  private bossCurrentPhase  = 0;
  private activeBossRanged  = false;
  private lastBossRangedShot = 0;

  // Skill state per session
  private skillStateMap  = new Map<string, SkillState>();
  private skillCooldowns = new Map<string, Record<string, number>>();
  private lastAttackTime = new Map<string, number>();

  // Prestige levels per session (loaded on join)
  private prestigeLevels = new Map<string, number>();

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async onAuth(_client: Client, options: RaidJoinOptions): Promise<AuthPayload> {
    return verifyRoomToken(options.token);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  onCreate(options: RaidJoinOptions) {
    this.setState(new RaidGameState());

    const bossId = isValidBossId(options?.bossId ?? "")
      ? (options.bossId as RaidBossId)
      : "raid_dragon";
    const cfg = RAID_BOSSES[bossId];

    this.bossConfig       = cfg;
    this.state.bossId     = cfg.id;
    this.state.bossName   = cfg.name;
    this.state.raidState  = "preparing";

    // Register message handlers
    this.onMessage("move",   (c, m: MoveMessage) => this.handleMove(c, m));
    this.onMessage("attack", (c)                  => this.handleAttack(c));
    this.onMessage("chat",   (c, m: ChatMessage)  => this.handleChat(c, m));
    this.onMessage("*", () => { incrementMessageCount(); });

    // Game loop
    this.lastTick = Date.now();
    this.clock.setInterval(() => this.tick(), TICK_RATE_MS);

    // Persistence loop
    this.clock.setInterval(() => this.persistAllPlayers(), PERSIST_INTERVAL_MS);

    // Join window — start after 60 s with whoever is present
    this.clock.setTimeout(() => this.beginRaid(), JOIN_WINDOW_MS);

    console.log(`[RaidRoom] created ${bossId} instance ${this.roomId}`);
  }

  async onJoin(client: Client, options: RaidJoinOptions) {
    const auth   = client.auth as AuthPayload;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name      = options?.playerName ?? auth?.username ?? "Hero";
    player.x = 130 + Math.random() * 60;
    player.y =  70 + Math.random() * 40;

    this.state.players.set(client.sessionId, player);

    const userId = auth?.userId;
    if (userId) {
      raidSessionUserMap.set(client.sessionId, userId);
      try {
        await initPlayerState(userId);
        const saved = await loadPlayerState(userId);
        if (saved) {
          player.hp            = saved.hp;
          player.maxHp         = saved.maxHp;
          player.mana          = saved.mana;
          player.maxMana       = saved.maxMana;
          player.level         = saved.level;
          player.xp            = saved.xp;
          player.prestigeLevel = saved.prestigeLevel ?? 0;
          this.prestigeLevels.set(client.sessionId, player.prestigeLevel);
        }

        const skillState = await initSkillState(userId);
        this.skillStateMap.set(client.sessionId, skillState);
        this.skillCooldowns.set(client.sessionId, {});
        // Apply skill passives first — they recalculate maxHp/maxMana from base level
        this.applySkillPassives(player, skillState);
        // Apply permanent prestige bonuses ON TOP of the skill-passive baseline
        const prestige = this.prestigeLevels.get(client.sessionId) ?? 0;
        const { statMultiplier } = getPrestigeBonuses(prestige);
        if (statMultiplier > 0) {
          player.maxHp   = Math.round(player.maxHp   * (1 + statMultiplier));
          player.maxMana = Math.round(player.maxMana  * (1 + statMultiplier));
          player.hp      = Math.min(player.hp,   player.maxHp);
          player.mana    = Math.min(player.mana, player.maxMana);
        }
        this.syncSkillState(player, skillState);

        try {
          const guildInfo = await getPlayerGuild(userId);
          if (guildInfo) {
            player.guildId  = guildInfo.guildId;
            player.guildTag = `[${guildInfo.guildTag}]`;
          }
        } catch { /* non-fatal */ }

        // Inform client of weekly lockout status
        const lockouts = await getRaidLockouts(userId).catch(() => [] as RaidBossId[]);
        client.send("raid_lockout_status", { lockedBosses: lockouts });

        // Reject if already locked for this boss
        if (this.bossConfig && lockouts.includes(this.bossConfig.id)) {
          client.send("raid_locked", {
            bossId:  this.bossConfig.id,
            message: `Already cleared ${this.bossConfig.name} this week.`,
          });
          // Allow spectate but mark them as already-locked
          player.hp = 0; // spectator
        }
      } catch (err) {
        console.warn(`[RaidRoom] Failed to load state for ${userId}:`, (err as Error).message);
      }
    }

    console.log(`[RaidRoom] ${client.sessionId} (${auth?.username}) joined raid ${this.state.bossId} (${this.clients.length}/${this.maxClients})`);
  }

  async onLeave(client: Client, consented: boolean) {
    await this.persistPlayer(client.sessionId);
    this.skillStateMap.delete(client.sessionId);
    this.skillCooldowns.delete(client.sessionId);
    this.prestigeLevels.delete(client.sessionId);
    this.lastAttackTime.delete(client.sessionId);
    raidSessionUserMap.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`[RaidRoom] ${client.sessionId} left (consented=${consented})`);
  }

  async onDispose() {
    await this.persistAllPlayers();
    console.log(`[RaidRoom] disposing room ${this.roomId}`);
  }

  // ── Raid Flow ─────────────────────────────────────────────────────────────────

  private beginRaid() {
    if (this.state.raidState !== "preparing") return;

    const playerCount = this.clients.length;
    if (playerCount === 0) {
      this.disconnect();
      return;
    }

    this.state.raidSize = playerCount;
    this.state.raidState = "active";
    this.raidStartTime = Date.now();

    // Compute average prestige level for difficulty scaling
    let totalPrestige = 0;
    this.prestigeLevels.forEach(p => { totalPrestige += p; });
    const avgPrestige = playerCount > 0 ? totalPrestige / playerCount : 0;

    // Spawn boss
    this.spawnBoss(playerCount, avgPrestige);

    // Enrage timer HUD countdown
    this.state.enrageSecondsLeft = Math.round(ENRAGE_MS / 1000);
    this.clock.setInterval(() => {
      if (this.state.raidState !== "active") return;
      this.state.enrageSecondsLeft = Math.max(0,
        Math.round((ENRAGE_MS - (Date.now() - this.raidStartTime)) / 1000),
      );
      if (this.state.enrageSecondsLeft <= 0 && !this.state.isEnraged) {
        this.enrageNow();
      }
    }, 1000);

    this.broadcast("raid_start", {
      bossId:      this.state.bossId,
      bossName:    this.state.bossName,
      playerCount,
      avgPrestige: Math.round(avgPrestige * 10) / 10,
    });

    console.log(`[RaidRoom] raid started — ${playerCount} players, avgPrestige=${avgPrestige.toFixed(1)}`);
  }

  private spawnBoss(playerCount: number, avgPrestige: number) {
    if (!this.bossConfig) return;

    const cfg    = this.bossConfig;
    const hpMult = raidHpMultiplier(playerCount, avgPrestige);
    const maxHp  = Math.round(cfg.baseHp * hpMult);

    const boss        = new Enemy();
    boss.id           = uid();
    boss.type         = cfg.type;
    boss.x            = 160; boss.y = 90; // center of the 320×180 world
    boss.hp           = maxHp;
    boss.maxHp        = maxHp;
    boss.damage       = cfg.baseDamage;
    boss.speed        = cfg.baseSpeed;
    boss.aggroRange   = cfg.aggroRange;
    boss.patrolX      = 160; boss.patrolY = 90;
    boss.aiState      = "idle";

    this.bossId_             = boss.id;
    this.state.bossHp        = maxHp;
    this.state.bossMaxHp     = maxHp;
    this.bossCurrentPhase    = 0;
    this.activeBossRanged    = cfg.phases[0]?.ranged ?? false;
    this.state.bossPhase     = 1;
    this.state.bossPhaseLabel = cfg.phases[0]?.label ?? "";

    this.state.enemies.set(boss.id, boss);
    console.log(`[RaidRoom] ${cfg.name} spawned — HP=${maxHp} (×${hpMult.toFixed(2)})`);
  }

  private enrageNow() {
    if (!this.bossConfig || !this.bossId_) return;
    const boss = this.state.enemies.get(this.bossId_);
    if (!boss || boss.hp <= 0) return;

    this.state.isEnraged = true;
    boss.damage = Math.round(boss.damage * ENRAGE_DAMAGE_MULT);
    boss.speed  = Math.round(boss.speed  * ENRAGE_SPEED_MULT);
    this.broadcast("raid_enrage", {
      bossId: this.state.bossId,
      message: `${this.state.bossName} enrages!`,
    });
    console.log(`[RaidRoom] ${this.state.bossName} ENRAGED`);
  }

  private checkBossPhaseTransition(boss: Enemy) {
    if (!this.bossConfig || !this.bossId_) return;
    const cfg = this.bossConfig;
    const hpPct = boss.hp / boss.maxHp;

    // Phases are sorted by descending HP threshold; find the last phase we qualify for
    for (let i = cfg.phases.length - 1; i > this.bossCurrentPhase; i--) {
      const phase = cfg.phases[i];
      if (hpPct <= phase.hpPctThreshold) {
        this.bossCurrentPhase  = i;
        this.activeBossRanged  = phase.ranged;
        boss.speed  = Math.round(cfg.baseSpeed  * phase.speedMult  * (this.state.isEnraged ? ENRAGE_SPEED_MULT  : 1));
        boss.damage = Math.round(cfg.baseDamage * phase.damageMult * (this.state.isEnraged ? ENRAGE_DAMAGE_MULT : 1));

        this.state.bossPhase     = i + 1;
        this.state.bossPhaseLabel = phase.label;

        this.broadcast("raid_phase_change", {
          phase:   i + 1,
          label:   phase.label,
          bossHp:  boss.hp,
          bossMaxHp: boss.maxHp,
        });
        console.log(`[RaidRoom] ${this.state.bossName} → phase ${i + 1}: ${phase.label}`);
        break;
      }
    }
  }

  private async onBossDefeated() {
    if (this.state.raidState !== "active") return;
    this.state.raidState = "victory";
    this.state.bossHp    = 0;

    this.broadcast("raid_victory", {
      bossId:   this.state.bossId,
      bossName: this.state.bossName,
    });

    // Grant loot to all living players, record lockouts, invalidate leaderboard
    const lootTable = RAID_LOOT[this.state.bossId as RaidBossId] ?? [];
    const grants: Record<string, string[]> = {};

    for (const client of this.clients) {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.hp <= 0) continue;

      const userId = raidSessionUserMap.get(client.sessionId);
      if (!userId) continue;

      const items: string[] = [];
      for (const entry of lootTable) {
        if (Math.random() < entry.chance) {
          items.push(entry.itemId);
          await addItem(userId, entry.itemId, 1).catch(() => null);
        }
      }
      grants[client.sessionId] = items;
      client.send("raid_loot", { items });

      await recordRaidClear(userId, this.state.bossId as RaidBossId).catch(() => null);
    }

    await invalidateLeaderboardCache("kills").catch(() => null);
    console.log(`[RaidRoom] ${this.state.bossName} defeated — loot distributed`);
  }

  private checkRaidDefeat() {
    let anyAlive = false;
    this.state.players.forEach((p: Player) => { if (p.hp > 0) anyAlive = true; });
    if (!anyAlive) {
      this.state.raidState = "defeat";
      this.broadcast("raid_defeat", { bossId: this.state.bossId });
      console.log(`[RaidRoom] all players dead — raid defeat`);
    }
  }

  // ── Message handlers ──────────────────────────────────────────────────────────

  private handleMove(client: Client, msg: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.hp <= 0) return;
    player.x = Math.max(0, Math.min(320, Number(msg.x) || 0));
    player.y = Math.max(0, Math.min(180, Number(msg.y) || 0));
    player.facingX = Number(msg.facingX) || 0;
    player.facingY = Number(msg.facingY) || 1;
  }

  private handleAttack(client: Client) {
    if (this.state.raidState !== "active") return;
    const player = this.state.players.get(client.sessionId);
    if (!player || player.hp <= 0) return;

    const now  = Date.now();
    const last = this.lastAttackTime.get(client.sessionId) ?? 0;
    if (now - last < ATTACK_COOLDOWN_MS) return;
    this.lastAttackTime.set(client.sessionId, now);

    // Hit boss if in range
    if (!this.bossId_) return;
    const boss = this.state.enemies.get(this.bossId_);
    if (!boss || boss.hp <= 0) return;

    if (dist(player.x, player.y, boss.x, boss.y) > ATTACK_RANGE_PX) return;

    // Damage with player's level + prestige scaling
    const prestige     = this.prestigeLevels.get(client.sessionId) ?? 0;
    const { statMultiplier } = getPrestigeBonuses(prestige);
    const dmg = Math.round(ATTACK_DAMAGE * (1 + statMultiplier));

    boss.hp = Math.max(0, boss.hp - dmg);
    this.state.bossHp = boss.hp;

    if (boss.hp <= 0) {
      boss.aiState = "dead";
      this.onBossDefeated().catch(err =>
        console.error("[RaidRoom] onBossDefeated error:", err),
      );
      return;
    }

    this.checkBossPhaseTransition(boss);
  }

  private handleChat(client: Client, msg: ChatMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const text = String(msg.text ?? "").slice(0, 200);
    if (!text) return;
    this.broadcast("chat", { name: player.name, text, sessionId: client.sessionId });
  }

  // ── Game Tick ─────────────────────────────────────────────────────────────────

  private tick() {
    const now = Date.now();
    const dt  = (now - this.lastTick) / 1000;
    this.lastTick = now;

    if (this.state.raidState !== "active") return;

    this.tickBossAI(dt, now);
    this.tickProjectiles(dt, now);
    this.tickManaRegen(dt);
    this.tickStatusEffects(now);
  }

  private tickStatusEffects(now: number) {
    this.state.players.forEach((player: Player) => {
      if (player.statusFlags !== 0 && now > player.statusExpiry) {
        player.statusFlags = 0;
      }
    });
  }

  private tickManaRegen(dt: number) {
    this.state.players.forEach((player: Player) => {
      if (player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN_PER_SEC * dt);
      }
    });
  }

  private tickBossAI(dt: number, now: number) {
    if (!this.bossId_) return;
    const boss = this.state.enemies.get(this.bossId_);
    if (!boss || boss.hp <= 0) return;

    // Find nearest player
    let nearest: Player | null = null;
    let nearestDist = Infinity;
    this.state.players.forEach((player: Player) => {
      if (player.hp <= 0) return;
      const d = dist(boss.x, boss.y, player.x, player.y);
      if (d < nearestDist) { nearestDist = d; nearest = player; }
    });

    if (nearest && nearestDist <= boss.aggroRange) {
      const target = nearest as Player;
      boss.aiState  = "chase";
      boss.targetId = target.sessionId;

      if (this.activeBossRanged) {
        if (now - this.lastBossRangedShot >= RANGED_FIRE_COOLDOWN_MS && nearestDist > 20) {
          this.spawnBossProjectile(boss, target.x, target.y);
          this.lastBossRangedShot = now;
        }
        // Keep distance
        if (nearestDist < 70) {
          const dx = boss.x - target.x; const dy = boss.y - target.y;
          const d  = Math.sqrt(dx*dx + dy*dy) || 1;
          boss.x   = Math.max(0, Math.min(320, boss.x + (dx/d) * boss.speed * dt));
          boss.y   = Math.max(0, Math.min(180, boss.y + (dy/d) * boss.speed * dt));
        } else if (nearestDist > 90) {
          this.moveBossToward(boss, target.x, target.y, dt);
        }
      } else {
        this.moveBossToward(boss, target.x, target.y, dt);
        this.checkBossMeleeHit(boss, target, now);
      }
    } else {
      // Patrol centre
      boss.aiState = "patrol";
      this.moveBossToward(boss, 160, 90, dt * 0.3);
    }

    // Check defeat condition after each tick
    if (this.state.raidState === "active") {
      this.checkRaidDefeat();
    }
  }

  private moveBossToward(boss: Enemy, tx: number, ty: number, dt: number) {
    const dx = tx - boss.x; const dy = ty - boss.y;
    const d  = Math.sqrt(dx*dx + dy*dy);
    if (d < 2) return;
    boss.x = Math.max(0, Math.min(320, boss.x + (dx/d) * boss.speed * dt));
    boss.y = Math.max(0, Math.min(180, boss.y + (dy/d) * boss.speed * dt));
  }

  private checkBossMeleeHit(boss: Enemy, player: Player, now: number) {
    if (now < player.invincibleUntil) return;
    if (dist(boss.x, boss.y, player.x, player.y) > 14) return;
    player.hp             = Math.max(0, player.hp - boss.damage);
    player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;
  }

  private spawnBossProjectile(boss: Enemy, tx: number, ty: number) {
    const proj    = new Projectile();
    proj.id       = uid();
    proj.ownerId  = boss.id;
    proj.x        = boss.x; proj.y = boss.y;
    const dx      = tx - boss.x; const dy = ty - boss.y;
    const d       = Math.sqrt(dx*dx + dy*dy) || 1;
    proj.velX     = (dx/d) * PROJECTILE_SPEED;
    proj.velY     = (dy/d) * PROJECTILE_SPEED;
    proj.damage   = boss.damage;
    proj.expiresAt = Date.now() + PROJECTILE_LIFETIME_MS;
    this.state.projectiles.set(proj.id, proj);
  }

  private tickProjectiles(dt: number, now: number) {
    const toDelete: string[] = [];
    this.state.projectiles.forEach((proj: Projectile) => {
      if (now > proj.expiresAt) { toDelete.push(proj.id); return; }
      proj.x += proj.velX * dt;
      proj.y += proj.velY * dt;
      if (proj.x < 0 || proj.x > 320 || proj.y < 0 || proj.y > 180) {
        toDelete.push(proj.id); return;
      }
      this.state.players.forEach((player: Player) => {
        if (player.hp <= 0) return;
        if (now < player.invincibleUntil) return;
        if (dist(proj.x, proj.y, player.x, player.y) > 8) return;
        player.hp             = Math.max(0, player.hp - proj.damage);
        player.invincibleUntil = now + PLAYER_INVINCIBILITY_MS;
        toDelete.push(proj.id);
      });
    });
    toDelete.forEach(id => this.state.projectiles.delete(id));
  }

  // ── Skill helpers ─────────────────────────────────────────────────────────────

  private applySkillPassives(player: Player, skillState: SkillState): void {
    const bonuses  = computePassiveBonuses(Object.keys(skillState.unlockedSkills));
    const baseHp   = 100 + (player.level - 1) * 20;
    const baseMana = 50;
    player.maxHp   = baseHp   + bonuses.maxHpFlat;
    player.maxMana = baseMana + bonuses.maxManaFlat;
    player.hp      = Math.min(player.hp,   player.maxHp);
    player.mana    = Math.min(player.mana, player.maxMana);
  }

  private syncSkillState(player: Player, skillState: SkillState): void {
    player.classId        = skillState.classId;
    player.skillPoints    = skillState.skillPoints;
    player.unlockedSkills = JSON.stringify(Object.keys(skillState.unlockedSkills));
    player.hotbar         = JSON.stringify(skillState.hotbar.slice(0, 6));
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  private async persistPlayer(sessionId: string) {
    const player  = this.state.players.get(sessionId);
    const userId  = raidSessionUserMap.get(sessionId);
    if (!player || !userId) return;
    try {
      await savePlayerState(userId, {
        hp: player.hp, maxHp: player.maxHp,
        mana: player.mana, maxMana: player.maxMana,
        level: player.level, xp: player.xp,
      });
      const skillState = this.skillStateMap.get(sessionId);
      if (skillState) await saveSkillState(userId, skillState);
    } catch (err) {
      console.warn(`[RaidRoom] persist failed for ${userId}:`, (err as Error).message);
    }
  }

  private async persistAllPlayers() {
    await Promise.all([...this.state.players.keys()].map(sid => this.persistPlayer(sid)));
  }
}

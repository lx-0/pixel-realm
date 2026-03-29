/**
 * WorldBossRoom — shared Colyseus room for world boss events.
 *
 * Architecture:
 *   - Single room instance per active boss (shared across all players).
 *   - Up to 200 concurrent players per room.
 *   - Players deal damage via "attack" messages; server applies and broadcasts.
 *   - Boss HP is authoritative (stored in DB, updated atomically).
 *   - On defeat: loot distributed server-side, victory broadcast to all.
 *
 * Clients join via:
 *   client.joinOrCreate("world_boss", { token })
 *
 * Message protocol (client → server):
 *   { type: "attack", damage: number }   — deal damage to the boss
 *   { type: "ping" }                     — keepalive
 *
 * Broadcast messages (server → all clients):
 *   { type: "boss_spawn",   bossId, bossName, maxHp, phase, spawnsAt }
 *   { type: "boss_hit",     playerId, damage, currentHp, maxHp, phase }
 *   { type: "phase_change", phase, bossId }
 *   { type: "boss_defeated", bossId, bossName, topContributors[] }
 *   { type: "boss_expired",  bossId }
 *   { type: "loot_grant",    playerId, gold, xp, tier }    (targeted broadcast)
 */

import { Room, Client } from "@colyseus/core";
import { WorldBossState, WorldBossParticipant, Player } from "./schema/WorldBossState";
import { verifyRoomToken, AuthPayload } from "../auth/middleware";
import { loadPlayerState, initPlayerState } from "../db/players";
import { getPlayerGuild } from "../db/guilds";
import {
  getBossInstanceById,
  activateBossInstance,
  applyBossDamage,
  expireBossInstance,
  distributeBossLoot,
  getBossLeaderboard,
  WORLD_BOSS_DEFS,
  type WorldBossId,
} from "../db/worldBoss";
import { processAchievementEvent } from "../db/achievements";
import { incrementMessageCount } from "../metrics";

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_PLAYERS = 200;
const TICK_RATE_MS = 100;            // 10 Hz — boss events don't need 20 Hz
const PERSIST_INTERVAL_MS = 5_000;   // sync HP to DB every 5s for durability
const ATTACK_COOLDOWN_MS = 500;      // min ms between attack messages per player
const MAX_DAMAGE_PER_HIT = 1_000;    // cap per hit to limit exploits

// ── WorldBossRoom ─────────────────────────────────────────────────────────────

export class WorldBossRoom extends Room<WorldBossState> {
  private instanceId: string = "";
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private persistInterval: ReturnType<typeof setInterval> | null = null;

  /** Per-session attack cooldown tracking (avoids repeated DB auth on each attack). */
  private lastAttackAt = new Map<string, number>();

  /** Maps sessionId → AuthPayload for auth lookup. */
  private sessions = new Map<string, AuthPayload>();

  // ── Room lifecycle ──────────────────────────────────────────────────────────

  async onCreate(options: { instanceId?: string }): Promise<void> {
    this.setState(new WorldBossState());

    if (!options.instanceId) {
      console.warn("[WorldBossRoom] Created without instanceId — room will wait for assignment.");
      return;
    }

    await this.loadInstance(options.instanceId);
    this.startTick();
    this.startPersist();

    this.onMessage("attack", (client, message: { damage?: number }) => {
      incrementMessageCount();
      this.handleAttack(client, message).catch(err =>
        console.warn("[WorldBossRoom] attack handler error:", err.message),
      );
    });

    this.onMessage("ping", () => { /* keepalive */ });
  }

  async onJoin(client: Client, options: { token?: string }): Promise<void> {
    let auth: AuthPayload | null = null;

    if (options.token) {
      try {
        auth = await verifyRoomToken(options.token);
      } catch {
        // Non-fatal: allow anonymous spectators (no damage ability)
      }
    }

    if (auth) {
      this.sessions.set(client.sessionId, auth);
      await this.initPlayer(client, auth);
    }

    // Send current boss state to joining client
    client.send("boss_state", {
      instanceId: this.state.instanceId,
      bossId: this.state.bossId,
      bossName: this.state.bossName,
      bossHp: this.state.bossHp,
      bossMaxHp: this.state.bossMaxHp,
      bossPhase: this.state.bossPhase,
      roomState: this.state.roomState,
      spawnsAt: this.state.spawnsAt,
      expiresAt: this.state.expiresAt,
      participantCount: this.state.participantCount,
    });
  }

  async onLeave(client: Client): Promise<void> {
    this.state.players.delete(client.sessionId);
    this.sessions.delete(client.sessionId);
    this.lastAttackAt.delete(client.sessionId);
  }

  onDispose(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.persistInterval) clearInterval(this.persistInterval);
  }

  // ── Instance loading ────────────────────────────────────────────────────────

  private async loadInstance(instanceId: string): Promise<void> {
    const instance = await getBossInstanceById(instanceId);
    if (!instance) {
      console.error("[WorldBossRoom] Instance not found:", instanceId);
      return;
    }

    const def = WORLD_BOSS_DEFS[instance.bossId as WorldBossId];
    this.instanceId = instanceId;

    this.state.instanceId = instanceId;
    this.state.bossId = instance.bossId;
    this.state.bossName = def?.name ?? instance.bossId;
    this.state.bossHp = instance.currentHp;
    this.state.bossMaxHp = instance.maxHp;
    this.state.bossPhase = instance.phase;
    this.state.zoneId = instance.zoneId;
    this.state.roomState = instance.status === "active" ? "active" : "waiting";
    this.state.spawnsAt = Math.floor(instance.spawnsAt.getTime() / 1000) * 1000;
    this.state.expiresAt = Math.floor(instance.expiresAt.getTime() / 1000) * 1000;

    console.log(
      `[WorldBossRoom] Loaded instance ${instanceId}: ${def?.name} ` +
      `(${instance.currentHp}/${instance.maxHp} HP, phase ${instance.phase}, ${instance.status})`,
    );
  }

  /** Called by the scheduler when a pending boss becomes active. */
  async activateBoss(): Promise<void> {
    if (!this.instanceId) return;
    await activateBossInstance(this.instanceId);
    this.state.roomState = "active";

    this.broadcast("boss_spawn", {
      bossId: this.state.bossId,
      bossName: this.state.bossName,
      maxHp: this.state.bossMaxHp,
      phase: this.state.bossPhase,
      spawnsAt: this.state.spawnsAt,
    });

    console.log(`[WorldBossRoom] Boss activated: ${this.state.bossName}`);
  }

  // ── Player init ─────────────────────────────────────────────────────────────

  private async initPlayer(client: Client, auth: AuthPayload): Promise<void> {
    let ps = await loadPlayerState(auth.sub);
    if (!ps) ps = await initPlayerState(auth.sub);

    let guildId = "";
    let guildTag = "";
    try {
      const membership = await getPlayerGuild(auth.sub);
      if (membership) {
        guildId = membership.guild.id;
        guildTag = membership.guild.tag;
      }
    } catch { /* non-fatal */ }

    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = auth.username;
    player.hp = ps.hp;
    player.maxHp = ps.maxHp;
    player.level = ps.level;
    player.xp = ps.xp;
    player.guildId = guildId;
    player.guildTag = guildTag;
    this.state.players.set(client.sessionId, player);

    // Ensure participant entry exists in state
    if (!this.state.participants.has(auth.sub)) {
      const p = new WorldBossParticipant();
      p.playerId = auth.sub;
      p.username = auth.username;
      p.damageDealt = 0;
      p.guildId = guildId;
      p.guildTag = guildTag;
      this.state.participants.set(auth.sub, p);
    }
  }

  // ── Attack handling ─────────────────────────────────────────────────────────

  private async handleAttack(client: Client, message: { damage?: number }): Promise<void> {
    const auth = this.sessions.get(client.sessionId);
    if (!auth) return; // anonymous — no damage allowed

    if (this.state.roomState !== "active") return;
    if (!this.instanceId) return;

    // Rate limiting
    const now = Date.now();
    const lastAt = this.lastAttackAt.get(client.sessionId) ?? 0;
    if (now - lastAt < ATTACK_COOLDOWN_MS) return;
    this.lastAttackAt.set(client.sessionId, now);

    // Clamp damage to prevent exploits
    const rawDamage = Math.max(1, Math.min(MAX_DAMAGE_PER_HIT, Math.floor(message.damage ?? 10)));

    const player = this.state.players.get(client.sessionId);
    const guildId = player?.guildId || null;

    const result = await applyBossDamage(this.instanceId, auth.sub, rawDamage, guildId);

    // Update in-room contribution counter
    const participant = this.state.participants.get(auth.sub);
    if (participant) {
      participant.damageDealt += rawDamage;
      participant.tier = result.currentHp / result.maxHp >= 0.10
        ? "gold"
        : result.currentHp / result.maxHp >= 0.02
          ? "silver"
          : "bronze";
    }

    // Sync HP state
    this.state.bossHp = result.currentHp;
    this.state.totalDamage += rawDamage;
    this.state.participantCount = this.state.participants.size;

    // Phase change broadcast
    if (result.phase !== this.state.bossPhase) {
      this.state.bossPhase = result.phase;
      this.broadcast("phase_change", {
        phase: result.phase,
        bossId: this.state.bossId,
      });
      console.log(`[WorldBossRoom] ${this.state.bossName} entered phase ${result.phase}`);
    }

    // Broadcast the hit to all clients for visual feedback
    this.broadcast("boss_hit", {
      playerId: auth.sub,
      username: auth.username,
      damage: rawDamage,
      currentHp: result.currentHp,
      maxHp: result.maxHp,
      phase: result.phase,
    });

    if (result.defeated) {
      await this.handleBossDefeated();
    }
  }

  // ── Boss defeated ───────────────────────────────────────────────────────────

  private async handleBossDefeated(): Promise<void> {
    this.state.roomState = "defeated";
    this.state.bossHp = 0;
    console.log(`[WorldBossRoom] ${this.state.bossName} defeated! Distributing loot...`);

    // Distribute loot
    let grants: Array<{ playerId: string; goldAwarded: number; xpAwarded: number; tier: string }> = [];
    try {
      grants = await distributeBossLoot(this.instanceId);
    } catch (err) {
      console.error("[WorldBossRoom] Loot distribution failed:", (err as Error).message);
    }

    // Top 3 contributors for victory broadcast
    let topContributors: Array<{ username: string; damageDealt: number; tier: string }> = [];
    try {
      const lb = await getBossLeaderboard(this.instanceId);
      topContributors = lb.slice(0, 3).map(e => ({
        username: e.username,
        damageDealt: e.damageDealt,
        tier: e.tier,
      }));
    } catch { /* non-fatal */ }

    // Broadcast victory to everyone in the room
    this.broadcast("boss_defeated", {
      bossId: this.state.bossId,
      bossName: this.state.bossName,
      topContributors,
      totalParticipants: this.state.participantCount,
    });

    // Send individual loot notifications
    for (const grant of grants) {
      this.broadcast("loot_grant", {
        playerId: grant.playerId,
        gold: grant.goldAwarded,
        xp: grant.xpAwarded,
        tier: grant.tier,
      });
    }

    // Fire achievements for all participants
    for (const grant of grants) {
      try {
        await processAchievementEvent(grant.playerId, "world_boss_killed" as any, {
          bossId: this.state.bossId,
          tier: grant.tier,
        });
      } catch { /* non-fatal */ }
    }
  }

  // ── Tick (expiry check + waiting → active transition) ──────────────────────

  private startTick(): void {
    this.tickInterval = setInterval(() => {
      this.tick().catch(err =>
        console.warn("[WorldBossRoom] tick error:", err.message),
      );
    }, TICK_RATE_MS);
  }

  private async tick(): Promise<void> {
    if (!this.instanceId) return;
    const now = Date.now();

    // Transition pending → active when spawn time arrives
    if (this.state.roomState === "waiting" && now >= this.state.spawnsAt) {
      await this.activateBoss();
      return;
    }

    // Expire if time limit exceeded
    if (this.state.roomState === "active" && now >= this.state.expiresAt) {
      await expireBossInstance(this.instanceId);
      this.state.roomState = "expired";
      this.state.bossHp = 0;
      this.broadcast("boss_expired", { bossId: this.state.bossId });
      console.log(`[WorldBossRoom] ${this.state.bossName} expired (not defeated in time)`);
    }
  }

  // ── Periodic HP sync to DB ─────────────────────────────────────────────────

  private startPersist(): void {
    this.persistInterval = setInterval(() => {
      // HP is already applied atomically in applyBossDamage — nothing extra needed.
      // This interval exists as a hook for future state persistence needs.
    }, PERSIST_INTERVAL_MS);
  }
}

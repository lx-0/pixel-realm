/**
 * ArenaRoom — Colyseus room managing server-authoritative PvP arena matches.
 *
 * One room instance = one match (1v1 or 2v2).
 *
 * Lifecycle:
 *   1. Client sends "queue" message → room adds player to in-memory global queue.
 *   2. When enough players match, a new ArenaRoom is created and players are
 *      moved into it via matchMaker.createRoom / client.send("arena:matched").
 *   3. Both players join the room; match starts after a 3-second intro.
 *   4. Clients send movement + attack messages; server validates and broadcasts.
 *   5. On HP reaching 0 or timeout, server resolves the match, updates ELO via
 *      the arena DB module, and broadcasts the result to both clients.
 *   6. Room disposes after clients leave.
 *
 * Global matchmaking state is held in a module-level Map so it survives across
 * multiple room instances on the same process.
 */

import { Room, Client } from "@colyseus/core";
import { ArenaRoomState, ArenaMatchState, ArenaCombatant } from "./schema/ArenaState";
import {
  getOrCreateActiveSeason,
  getOrCreateRating,
  recordArenaMatch,
  ratingToTier,
} from "../db/arena";

// ── Constants ─────────────────────────────────────────────────────────────────

const MATCH_DURATION_MS = 180_000;  // 3 minutes
const INTRO_DURATION_MS =   3_000;  // VS splash
const ROUND_HP          =     100;
const ROUND_MANA        =      50;
const ATTACK_DAMAGE     =      20;
const ATTACK_RANGE_PX   =      36;
const ATTACK_COOLDOWN_MS =    500;
const PLAYER_INVULN_MS  =     800;
const MAX_HIT_DAMAGE    =      30;  // PvP cap

type ArenaMode = "1v1" | "2v2";

// ── Global queue (shared across all ArenaRoom instances on this process) ───────

interface QueueEntry {
  client:   Client;
  playerId: string;
  name:     string;
  rating:   number;
  mode:     ArenaMode;
  queuedAt: number;
}

const globalQueue: QueueEntry[] = [];

function dequeuePlayer(playerId: string): void {
  const idx = globalQueue.findIndex(e => e.playerId === playerId);
  if (idx >= 0) globalQueue.splice(idx, 1);
}

function tryMatch(mode: ArenaMode): QueueEntry[] | null {
  const needed = mode === "1v1" ? 2 : 4;
  const pool   = globalQueue.filter(e => e.mode === mode);
  if (pool.length < needed) return null;
  // Sort by rating to pair similar-rated players
  pool.sort((a, b) => a.rating - b.rating);
  return pool.slice(0, needed);
}

// ── ArenaRoom ─────────────────────────────────────────────────────────────────

export class ArenaRoom extends Room<ArenaRoomState> {
  private seasonId: string = "";
  private seasonNumber: number = 1;
  private seasonName: string = "";
  private kills: Record<string, number> = {};
  private matchTimer: ReturnType<typeof setInterval> | null = null;
  private matchEndTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastAttackAt: Record<string, number> = {};

  async onCreate(options: {
    mode: ArenaMode;
    players: Array<{ playerId: string; name: string; rating: number }>;
    map: "gladiator_pit" | "shadow_sanctum";
    seasonId: string;
    seasonNumber: number;
    seasonName: string;
  }) {
    this.setState(new ArenaRoomState());
    this.maxClients = options.mode === "1v1" ? 2 : 4;

    this.seasonId     = options.seasonId;
    this.seasonNumber = options.seasonNumber;
    this.seasonName   = options.seasonName;

    const state = this.state;
    state.seasonNumber = options.seasonNumber;
    state.seasonName   = options.seasonName;

    // Build match state
    const match = new ArenaMatchState();
    match.matchId  = `arena_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    match.mode     = options.mode;
    match.map      = options.map;
    match.phase    = "waiting";
    match.timeRemainingMs = MATCH_DURATION_MS;

    // Pre-populate combatant slots from matched queue entries
    const spawnPoints = [
      { x: 80,  y: 90 },
      { x: 240, y: 90 },
      { x: 80,  y: 60 },
      { x: 240, y: 60 },
    ];
    options.players.forEach((p, i) => {
      const combatant           = new ArenaCombatant();
      combatant.playerId        = p.playerId;
      combatant.name            = p.name;
      combatant.hp              = ROUND_HP;
      combatant.maxHp           = ROUND_HP;
      combatant.mana            = ROUND_MANA;
      combatant.x               = spawnPoints[i]?.x ?? 160;
      combatant.y               = spawnPoints[i]?.y ?? 90;
      combatant.rating          = p.rating;
      combatant.tier            = ratingToTier(p.rating);
      match.combatants.set(p.playerId, combatant);
      this.kills[p.playerId]    = 0;
    });

    state.match = match;

    // Register message handlers
    this.onMessage("move", (client, data: { x: number; y: number; facingX: number; facingY: number }) => {
      this.handleMove(client, data);
    });
    this.onMessage("attack", (client, data: { targetId: string }) => {
      this.handleAttack(client, data);
    });
    this.onMessage("ready", (client) => {
      this.handleReady(client);
    });
  }

  onJoin(client: Client, options: { playerId: string }) {
    const combatant = this.state.match.combatants.get(options?.playerId ?? "");
    if (combatant) {
      combatant.playerId = options.playerId;
      // Bind sessionId to combatant for quick lookup
      (client as Client & { _arenaPlayerId?: string })._arenaPlayerId = options.playerId;
    }

    // If all expected clients have joined, start intro
    if (this.clients.length >= this.maxClients) {
      this.startIntro();
    }
  }

  onLeave(client: Client, consented: boolean) {
    const playerId = (client as Client & { _arenaPlayerId?: string })._arenaPlayerId;
    if (!playerId) return;

    const match = this.state.match;
    if (match.phase === "active" || match.phase === "intro") {
      // Treat disconnect as forfeit — the opponent wins
      const opponentId = [...match.combatants.keys()].find(id => id !== playerId);
      if (opponentId) {
        this.endMatch(opponentId, playerId, "disconnect");
      }
    }
  }

  onDispose() {
    if (this.matchTimer)      clearInterval(this.matchTimer);
    if (this.matchEndTimeout) clearTimeout(this.matchEndTimeout);
  }

  // ── Match lifecycle ────────────────────────────────────────────────────────

  private startIntro(): void {
    this.state.match.phase = "intro";
    this.broadcast("arena:intro", { durationMs: INTRO_DURATION_MS });
    setTimeout(() => this.startMatch(), INTRO_DURATION_MS);
  }

  private startMatch(): void {
    const match   = this.state.match;
    match.phase   = "active";
    match.startedAt = Date.now();
    match.timeRemainingMs = MATCH_DURATION_MS;

    this.broadcast("arena:start", { map: match.map, matchId: match.matchId });

    // Tick every second to update timer
    this.matchTimer = setInterval(() => {
      match.timeRemainingMs = Math.max(
        0,
        MATCH_DURATION_MS - (Date.now() - match.startedAt),
      );
      if (match.timeRemainingMs <= 0) this.handleTimeout();
    }, 1_000);

    // Hard timeout safety
    this.matchEndTimeout = setTimeout(() => this.handleTimeout(), MATCH_DURATION_MS + 1_000);
  }

  private handleTimeout(): void {
    if (this.state.match.phase !== "active") return;
    // Determine winner by remaining HP
    const combatants = [...this.state.match.combatants.values()];
    combatants.sort((a, b) => b.hp - a.hp);
    const winner = combatants[0];
    const loser  = combatants[combatants.length - 1];
    if (winner.hp === loser.hp) {
      // True draw — no rating change, but record match
      this.endMatchDraw();
    } else {
      this.endMatch(winner.playerId, loser.playerId, "timeout");
    }
  }

  private async endMatch(winnerId: string, loserId: string, reason: string): Promise<void> {
    const match = this.state.match;
    if (match.phase === "finished") return;

    if (this.matchTimer)      { clearInterval(this.matchTimer);  this.matchTimer = null; }
    if (this.matchEndTimeout) { clearTimeout(this.matchEndTimeout); this.matchEndTimeout = null; }

    match.phase    = "finished";
    match.winnerId = winnerId;

    // Persist to DB and compute ELO deltas
    let deltas: Record<string, number> = {};
    try {
      deltas = await recordArenaMatch({
        seasonId:   this.seasonId,
        mode:       match.mode as "1v1" | "2v2",
        map:        match.map,
        winnerIds:  [winnerId],
        loserIds:   [loserId],
        kills:      { ...this.kills },
        durationMs: Date.now() - match.startedAt,
      });
    } catch (err) {
      console.error("[ArenaRoom] recordArenaMatch failed:", (err as Error).message);
    }

    match.ratingDeltas = JSON.stringify(deltas);

    this.broadcast("arena:result", {
      winnerId,
      loserId,
      reason,
      ratingDeltas: deltas,
      kills: { ...this.kills },
    });

    // Disconnect clients after a short delay
    setTimeout(() => this.disconnect(), 10_000);
  }

  private async endMatchDraw(): Promise<void> {
    const match    = this.state.match;
    match.phase    = "finished";
    match.winnerId = "";

    this.broadcast("arena:result", {
      winnerId: null,
      reason: "draw",
      ratingDeltas: {},
      kills: { ...this.kills },
    });

    setTimeout(() => this.disconnect(), 10_000);
  }

  // ── Message handlers ───────────────────────────────────────────────────────

  private handleMove(
    client: Client,
    data: { x: number; y: number; facingX: number; facingY: number },
  ): void {
    const playerId  = (client as Client & { _arenaPlayerId?: string })._arenaPlayerId;
    if (!playerId)  return;
    const match     = this.state.match;
    if (match.phase !== "active") return;
    const combatant = match.combatants.get(playerId);
    if (!combatant) return;

    // Basic bounds check (arena is 320×180)
    combatant.x       = Math.max(8, Math.min(312, data.x ?? combatant.x));
    combatant.y       = Math.max(8, Math.min(172, data.y ?? combatant.y));
    combatant.facingX = data.facingX ?? combatant.facingX;
    combatant.facingY = data.facingY ?? combatant.facingY;
  }

  private handleAttack(client: Client, data: { targetId: string }): void {
    const playerId  = (client as Client & { _arenaPlayerId?: string })._arenaPlayerId;
    if (!playerId)  return;
    const match     = this.state.match;
    if (match.phase !== "active") return;
    const attacker  = match.combatants.get(playerId);
    const target    = match.combatants.get(data.targetId);
    if (!attacker || !target) return;

    const now = Date.now();
    if ((this.lastAttackAt[playerId] ?? 0) + ATTACK_COOLDOWN_MS > now) return;
    this.lastAttackAt[playerId] = now;

    // Range check
    const dx = Math.abs(attacker.x - target.x);
    const dy = Math.abs(attacker.y - target.y);
    if (Math.sqrt(dx * dx + dy * dy) > ATTACK_RANGE_PX) return;

    // Invulnerability check
    if (target.invincibleUntil > now) return;

    const damage = Math.min(ATTACK_DAMAGE, MAX_HIT_DAMAGE);
    target.hp    = Math.max(0, target.hp - damage);
    target.invincibleUntil = now + PLAYER_INVULN_MS;
    attacker.isAttacking   = true;

    // Check for kill
    if (target.hp <= 0) {
      this.kills[playerId] = (this.kills[playerId] ?? 0) + 1;
      attacker.kills++;
      this.broadcast("arena:kill", { killerId: playerId, targetId: data.targetId });
      // In 1v1, a kill ends the match
      if (match.mode === "1v1") {
        this.endMatch(playerId, data.targetId, "kill");
      }
    }
  }

  private handleReady(client: Client): void {
    // No-op for now; readiness is tracked by join count
  }
}

// ── Exported queue helpers (used by REST endpoint) ────────────────────────────

export interface QueueJoinResult {
  queued: boolean;
  alreadyInQueue: boolean;
  matched: boolean;
  roomId?: string;
  matchedPlayers?: Array<{ playerId: string; name: string }>;
}

/**
 * Join the global matchmaking queue.
 * If a match is found, creates a new ArenaRoom and returns its roomId.
 */
export async function joinArenaQueue(
  client: Client,
  playerId: string,
  name: string,
  mode: ArenaMode,
  matchMaker: { createRoom: (name: string, opts: unknown) => Promise<{ roomId: string }> },
): Promise<QueueJoinResult> {
  // Prevent double-queuing
  if (globalQueue.some(e => e.playerId === playerId)) {
    return { queued: false, alreadyInQueue: true, matched: false };
  }

  // Get or create season + rating for queue display
  let rating = 1000;
  try {
    const season = await getOrCreateActiveSeason();
    const r      = await getOrCreateRating(playerId, season.id);
    rating       = r.rating;
  } catch { /* no DB — use default rating */ }

  globalQueue.push({ client, playerId, name, rating, mode, queuedAt: Date.now() });

  const matched = tryMatch(mode);
  if (!matched) {
    return { queued: true, alreadyInQueue: false, matched: false };
  }

  // Remove matched players from queue
  matched.forEach(e => dequeuePlayer(e.playerId));

  // Get season info
  let seasonId     = "";
  let seasonNumber = 1;
  let seasonName   = "Season 1";
  try {
    const season = await getOrCreateActiveSeason();
    seasonId     = season.id;
    seasonNumber = season.number;
    seasonName   = season.name;
  } catch { /* no DB */ }

  const maps  = ["gladiator_pit", "shadow_sanctum"] as const;
  const map   = maps[Math.floor(Math.random() * maps.length)];
  const room  = await matchMaker.createRoom("arena", {
    mode,
    map,
    players: matched.map(e => ({ playerId: e.playerId, name: e.name, rating: e.rating })),
    seasonId,
    seasonNumber,
    seasonName,
  });

  // Notify all matched clients
  for (const entry of matched) {
    try {
      entry.client.send("arena:matched", {
        roomId:   room.roomId,
        playerId: entry.playerId,
        players:  matched.map(e => ({ playerId: e.playerId, name: e.name })),
        mode,
        map,
      });
    } catch { /* client may have disconnected */ }
  }

  return {
    queued:         false,
    alreadyInQueue: false,
    matched:        true,
    roomId:         room.roomId,
    matchedPlayers: matched.map(e => ({ playerId: e.playerId, name: e.name })),
  };
}

/**
 * Leave the global matchmaking queue.
 */
export function leaveArenaQueue(playerId: string): boolean {
  const before = globalQueue.length;
  dequeuePlayer(playerId);
  return globalQueue.length < before;
}

/**
 * Returns current queue depths for display in UI.
 */
export function getQueueDepths(): { "1v1": number; "2v2": number } {
  return {
    "1v1": globalQueue.filter(e => e.mode === "1v1").length,
    "2v2": globalQueue.filter(e => e.mode === "2v2").length,
  };
}

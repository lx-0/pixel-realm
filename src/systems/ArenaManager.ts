/**
 * ArenaManager — singleton that manages PvP arena state.
 *
 * Responsibilities:
 *   - Arena instance lifecycle (create / destroy)
 *   - Matchmaking queue for 1v1 and 2v2 modes
 *   - ELO-style rating updates
 *   - Tier bracket resolution
 *   - In-memory leaderboard (hydrated from server when available)
 *   - Spectator slot registry
 *
 * All arena data is persisted in localStorage under the key 'arena_data'.
 */

import { ARENA, type ArenaMode, type ArenaTier, type ArenaMap } from '../config/constants';

// ── Data types ────────────────────────────────────────────────────────────────

export interface ArenaPlayer {
  id:       string;
  name:     string;
  rating:   number;
  wins:     number;
  losses:   number;
  kills:    number;
  deaths:   number;
}

export interface ArenaQueueEntry {
  player:      ArenaPlayer;
  mode:        ArenaMode;
  queuedAt:    number;  // Date.now()
}

export interface ArenaInstance {
  id:         string;
  mode:       ArenaMode;
  map:        ArenaMap;
  players:    ArenaPlayer[];  // 2 for 1v1, 4 for 2v2
  spectators: string[];       // player ids watching
  startedAt:  number;
  status:     'waiting' | 'active' | 'finished';
}

export interface ArenaMatchResult {
  instance:   ArenaInstance;
  winnerIds:  string[];
  loserIds:   string[];
  kills:      Record<string, number>;
  durationMs: number;
}

export interface ArenaLeaderboardEntry {
  rank:   number;
  player: ArenaPlayer;
  tier:   ArenaTier;
}

// ── Persistence key ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'arena_data';

interface ArenaSave {
  players: Record<string, ArenaPlayer>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getTier(rating: number): ArenaTier {
  const tiers = ARENA.TIERS;
  if (rating >= tiers.DIAMOND.min)  return 'DIAMOND';
  if (rating >= tiers.PLATINUM.min) return 'PLATINUM';
  if (rating >= tiers.GOLD.min)     return 'GOLD';
  if (rating >= tiers.SILVER.min)   return 'SILVER';
  return 'BRONZE';
}

export function getTierLabel(tier: ArenaTier): string {
  return ARENA.TIERS[tier].label;
}

export function getTierIcon(tier: ArenaTier): string {
  return ARENA.TIERS[tier].icon;
}

/** Expected win probability under ELO formula. */
function expectedScore(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

/** Compute new ELO ratings after a match (win = 1, loss = 0). */
function eloUpdate(ratingA: number, ratingB: number, aWon: boolean): [number, number] {
  const eA   = expectedScore(ratingA, ratingB);
  const eB   = 1 - eA;
  const sA   = aWon ? 1 : 0;
  const sB   = aWon ? 0 : 1;
  const newA = Math.round(ratingA + ARENA.ELO_K * (sA - eA));
  const newB = Math.round(ratingB + ARENA.ELO_K * (sB - eB));
  return [Math.max(0, newA), Math.max(0, newB)];
}

// ── ArenaManager ──────────────────────────────────────────────────────────────

export class ArenaManager {
  private static _instance: ArenaManager | null = null;
  static getInstance(): ArenaManager {
    if (!ArenaManager._instance) ArenaManager._instance = new ArenaManager();
    return ArenaManager._instance;
  }

  private players:   Record<string, ArenaPlayer> = {};
  private queue:     ArenaQueueEntry[]            = [];
  private instances: Map<string, ArenaInstance>   = new Map();

  private constructor() {
    this.load();
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private load(): void {
    try {
      const raw  = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const save = JSON.parse(raw) as ArenaSave;
      this.players = save.players ?? {};
    } catch {
      this.players = {};
    }
  }

  private save(): void {
    try {
      const save: ArenaSave = { players: this.players };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch { /* quota errors ignored */ }
  }

  // ── Player registry ────────────────────────────────────────────────────────

  /** Get or create an ArenaPlayer record. */
  getOrCreate(id: string, name: string): ArenaPlayer {
    if (!this.players[id]) {
      this.players[id] = {
        id, name,
        rating: ARENA.ELO_DEFAULT,
        wins: 0, losses: 0, kills: 0, deaths: 0,
      };
      this.save();
    }
    return this.players[id];
  }

  getPlayer(id: string): ArenaPlayer | undefined {
    return this.players[id];
  }

  // ── Matchmaking queue ─────────────────────────────────────────────────────

  /**
   * Enqueue a player. Returns the matched ArenaInstance if a match was found,
   * otherwise returns null (player remains in queue).
   */
  enqueue(player: ArenaPlayer, mode: ArenaMode): ArenaInstance | null {
    // Don't double-queue
    if (this.queue.some(e => e.player.id === player.id)) return null;
    this.queue.push({ player, mode, queuedAt: Date.now() });
    return this.tryMatch(mode);
  }

  dequeue(playerId: string): void {
    this.queue = this.queue.filter(e => e.player.id !== playerId);
  }

  /** Estimated wait time (seconds) based on queue depth for the mode. */
  estimatedWait(mode: ArenaMode): number {
    const depth = this.queue.filter(e => e.mode === mode).length;
    // rough heuristic: 10s base + 5s per extra player needed
    const needed = mode === '1v1' ? 2 : 4;
    return Math.max(5, (needed - depth - 1) * 10);
  }

  isQueued(playerId: string): boolean {
    return this.queue.some(e => e.player.id === playerId);
  }

  private tryMatch(mode: ArenaMode): ArenaInstance | null {
    const needed = mode === '1v1' ? 2 : 4;
    const pool   = this.queue.filter(e => e.mode === mode);
    if (pool.length < needed) return null;

    // Sort by rating, pick closest bracket
    pool.sort((a, b) => a.player.rating - b.player.rating);
    const matched = pool.slice(0, needed);
    matched.forEach(e => this.dequeue(e.player.id));

    const instance = this.createInstance(mode, matched.map(e => e.player));
    return instance;
  }

  // ── Instance lifecycle ────────────────────────────────────────────────────

  private createInstance(mode: ArenaMode, players: ArenaPlayer[]): ArenaInstance {
    const maps: ArenaMap[] = ['gladiator_pit', 'shadow_sanctum'];
    const map  = maps[Math.floor(Math.random() * maps.length)];
    const inst: ArenaInstance = {
      id: makeid(),
      mode,
      map,
      players,
      spectators: [],
      startedAt: Date.now(),
      status: 'waiting',
    };
    this.instances.set(inst.id, inst);
    return inst;
  }

  getInstance(id: string): ArenaInstance | undefined {
    return this.instances.get(id);
  }

  startInstance(id: string): void {
    const inst = this.instances.get(id);
    if (inst) inst.status = 'active';
  }

  addSpectator(instanceId: string, playerId: string): boolean {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== 'active') return false;
    if (!inst.spectators.includes(playerId)) inst.spectators.push(playerId);
    return true;
  }

  removeSpectator(instanceId: string, playerId: string): void {
    const inst = this.instances.get(instanceId);
    if (inst) inst.spectators = inst.spectators.filter(id => id !== playerId);
  }

  getActiveInstances(): ArenaInstance[] {
    return [...this.instances.values()].filter(i => i.status === 'active');
  }

  // ── Match resolution ─────────────────────────────────────────────────────

  /**
   * Resolve a finished match, update ratings and W/L records.
   * Returns the rating deltas keyed by player id.
   */
  resolveMatch(result: ArenaMatchResult): Record<string, number> {
    const inst = result.instance;
    inst.status = 'finished';

    const deltas: Record<string, number> = {};

    if (inst.mode === '1v1') {
      const [a, b]  = inst.players;
      const aWon    = result.winnerIds.includes(a.id);
      const [nA, nB] = eloUpdate(a.rating, b.rating, aWon);
      deltas[a.id]  = nA - a.rating;
      deltas[b.id]  = nB - b.rating;
      this.applyResult(a.id, nA, aWon, result.kills[a.id] ?? 0, result.kills[b.id] ?? 0);
      this.applyResult(b.id, nB, !aWon, result.kills[b.id] ?? 0, result.kills[a.id] ?? 0);
    } else {
      // 2v2: treat each pair as two separate 1v1 ELO pairs and average
      const team1 = inst.players.slice(0, 2);
      const team2 = inst.players.slice(2, 4);
      const team1Won = result.winnerIds.includes(team1[0].id);
      const avgRating = (arr: ArenaPlayer[]) => arr.reduce((s, p) => s + p.rating, 0) / arr.length;
      const [nT1, nT2] = eloUpdate(avgRating(team1), avgRating(team2), team1Won);
      team1.forEach(p => {
        const delta  = nT1 - avgRating(team1);
        const newRat = Math.max(0, p.rating + delta);
        deltas[p.id] = Math.round(delta);
        this.applyResult(p.id, Math.round(newRat), team1Won, result.kills[p.id] ?? 0, 0);
      });
      team2.forEach(p => {
        const delta  = nT2 - avgRating(team2);
        const newRat = Math.max(0, p.rating + delta);
        deltas[p.id] = Math.round(delta);
        this.applyResult(p.id, Math.round(newRat), !team1Won, result.kills[p.id] ?? 0, 0);
      });
    }

    this.save();
    return deltas;
  }

  private applyResult(id: string, newRating: number, won: boolean, kills: number, deaths: number): void {
    const p = this.players[id];
    if (!p) return;
    p.rating  = newRating;
    p.kills  += kills;
    p.deaths += deaths;
    if (won) p.wins++; else p.losses++;
  }

  // ── Leaderboard ──────────────────────────────────────────────────────────

  getLeaderboard(limit = 50): ArenaLeaderboardEntry[] {
    return Object.values(this.players)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map((p, i) => ({ rank: i + 1, player: p, tier: getTier(p.rating) }));
  }

  getPlayerRank(id: string): number {
    const sorted = Object.values(this.players)
      .sort((a, b) => b.rating - a.rating);
    const idx = sorted.findIndex(p => p.id === id);
    return idx >= 0 ? idx + 1 : 0;
  }
}

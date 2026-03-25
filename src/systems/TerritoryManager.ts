/**
 * TerritoryManager — client-side territory wars state manager.
 *
 * Responsibilities:
 *   - Fetch and cache territory state from the server
 *   - Track this player's guild buffs (XP/drop bonuses from owned territories)
 *   - Expose helpers for the UI panels and game scene
 *   - Apply capture point reporting after kills/objectives in contested zones
 */

import { TERRITORY_XP_MULTIPLIER, TERRITORY_DROP_MULTIPLIER, CAPTURE_POINTS_PER_KILL } from "../config/territory";

// ── Types (mirrors server responses) ─────────────────────────────────────────

export interface ActiveWarSummary {
  warId:            string;
  attackerGuildId:  string;
  attackerGuildName: string;
  defenderGuildId:  string | null;
  status:           string;
  windowStart:      Date;
  windowEnd:        Date;
  attackerPoints:   number;
  defenderPoints:   number;
}

export interface TerritoryInfo {
  id:            string;
  name:          string;
  description:   string;
  ownerGuildId:  string | null;
  ownerGuildName: string | null;
  ownerGuildTag:  string | null;
  capturedAt:    string | null;
  xpBonusPct:    number;
  dropBonusPct:  number;
  activeWar:     ActiveWarSummary | null;
}

export interface GuildBuffs {
  xpBonusPct:   number;
  dropBonusPct: number;
  territories:  string[];
}

// ── TerritoryManager singleton ────────────────────────────────────────────────

export class TerritoryManager {
  private static instance: TerritoryManager | null = null;

  private territories: TerritoryInfo[] = [];
  private guildBuffs: GuildBuffs = { xpBonusPct: 0, dropBonusPct: 0, territories: [] };
  private lastFetchAt: number = 0;
  private readonly CACHE_TTL_MS = 60_000; // 1-minute client cache
  private readonly SERVER_URL: string;

  private playerId:  string = "";
  private guildId:   string = "";

  private constructor(serverUrl: string) {
    this.SERVER_URL = serverUrl;
  }

  static getInstance(serverUrl = "http://localhost:2567"): TerritoryManager {
    if (!TerritoryManager.instance) {
      TerritoryManager.instance = new TerritoryManager(serverUrl);
    }
    return TerritoryManager.instance;
  }

  // ── Auth context ──────────────────────────────────────────────────────────

  setPlayer(playerId: string, guildId: string): void {
    this.playerId = playerId;
    this.guildId  = guildId;
  }

  // ── Fetch territory state ─────────────────────────────────────────────────

  async fetchTerritories(force = false): Promise<TerritoryInfo[]> {
    const now = Date.now();
    if (!force && this.territories.length > 0 && (now - this.lastFetchAt) < this.CACHE_TTL_MS) {
      return this.territories;
    }
    try {
      const res = await fetch(`${this.SERVER_URL}/territory`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { territories: TerritoryInfo[] };
      this.territories = data.territories;
      this.lastFetchAt = Date.now();
    } catch (err) {
      console.warn("[TerritoryManager] fetchTerritories failed:", err);
    }
    return this.territories;
  }

  async fetchGuildBuffs(guildId?: string): Promise<GuildBuffs> {
    const id = guildId ?? this.guildId;
    if (!id) return this.guildBuffs;
    try {
      const res = await fetch(`${this.SERVER_URL}/territory/buffs/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.guildBuffs = await res.json() as GuildBuffs;
    } catch (err) {
      console.warn("[TerritoryManager] fetchGuildBuffs failed:", err);
    }
    return this.guildBuffs;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  getTerritories(): TerritoryInfo[] {
    return this.territories;
  }

  getTerritory(id: string): TerritoryInfo | undefined {
    return this.territories.find((t) => t.id === id);
  }

  /** Returns territories currently owned by the player's guild. */
  getOwnedTerritories(): TerritoryInfo[] {
    if (!this.guildId) return [];
    return this.territories.filter((t) => t.ownerGuildId === this.guildId);
  }

  /** Returns territories with an active war involving the player's guild. */
  getActiveWars(): TerritoryInfo[] {
    if (!this.guildId) return [];
    return this.territories.filter((t) => {
      const w = t.activeWar;
      if (!w || w.status !== "active") return false;
      return w.attackerGuildId === this.guildId || w.defenderGuildId === this.guildId;
    });
  }

  /** XP multiplier from owned territories (1.0 = no bonus). */
  getXpMultiplier(): number {
    return TERRITORY_XP_MULTIPLIER(this.guildBuffs.xpBonusPct);
  }

  /** Drop rate multiplier from owned territories (1.0 = no bonus). */
  getDropMultiplier(): number {
    return TERRITORY_DROP_MULTIPLIER(this.guildBuffs.dropBonusPct);
  }

  /** Returns true if the player's guild is in an active war on this territory. */
  isInActiveWar(territoryId: string): boolean {
    if (!this.guildId) return false;
    const territory = this.getTerritory(territoryId);
    if (!territory?.activeWar || territory.activeWar.status !== "active") return false;
    const w = territory.activeWar;
    return w.attackerGuildId === this.guildId || w.defenderGuildId === this.guildId;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async declareWar(territoryId: string): Promise<{ success: boolean; error?: string; windowStart?: Date; windowEnd?: Date }> {
    if (!this.playerId || !this.guildId) return { success: false, error: "Not authenticated." };
    try {
      const res = await fetch(`${this.SERVER_URL}/territory/declare-war`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: this.playerId, guildId: this.guildId, territoryId }),
      });
      const data = await res.json() as { success?: boolean; error?: string; windowStart?: string; windowEnd?: string };
      if (!res.ok) return { success: false, error: data.error ?? "Failed to declare war" };
      // Invalidate cache so the next fetch is fresh
      this.lastFetchAt = 0;
      return {
        success:     data.success ?? true,
        windowStart: data.windowStart ? new Date(data.windowStart) : undefined,
        windowEnd:   data.windowEnd   ? new Date(data.windowEnd)   : undefined,
      };
    } catch (err) {
      console.warn("[TerritoryManager] declareWar failed:", err);
      return { success: false, error: "Network error." };
    }
  }

  /**
   * Report a kill or objective completion that earns capture points.
   * Called from ZoneRoom / GameScene when a PvP kill occurs in a contested zone.
   */
  async reportCapturePoints(warId: string, points = CAPTURE_POINTS_PER_KILL): Promise<void> {
    if (!this.playerId || !this.guildId) return;
    try {
      await fetch(`${this.SERVER_URL}/territory/capture-points`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: this.playerId, guildId: this.guildId, warId, points }),
      });
    } catch (err) {
      console.warn("[TerritoryManager] reportCapturePoints failed:", err);
    }
  }
}

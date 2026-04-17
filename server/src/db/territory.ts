/**
 * Territory wars data-access layer.
 *
 * Responsibilities:
 *   - Territory list + ownership queries
 *   - War declaration (creates a pending war queued for the next war window)
 *   - Capture point recording during active wars
 *   - War resolution: tally points, transfer ownership, apply buffs
 *   - Per-guild territory count (for leaderboard)
 *
 * War windows: three 2-hour windows per day at 08:00, 16:00, 22:00 UTC.
 * A declaration queues for the next upcoming window.
 * Only one war per territory may be active or pending at a time.
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  guildTerritories,
  guildWars,
  warCapturePoints,
  guilds,
  guildMemberships,
} from "./schema";
// nextWarWindow lives in server/src/config/territory so the server rootDir is respected
export { nextWarWindow } from "../config/territory";

// ── Public types ──────────────────────────────────────────────────────────────

export interface TerritoryInfo {
  id:            string;
  name:          string;
  description:   string;
  ownerGuildId:  string | null;
  ownerGuildName: string | null;
  ownerGuildTag:  string | null;
  capturedAt:    Date | null;
  xpBonusPct:    number;
  dropBonusPct:  number;
  activeWar:     ActiveWarSummary | null;
}

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

export interface WarDetails {
  id:               string;
  territoryId:      string;
  territoryName:    string;
  attackerGuildId:  string;
  attackerGuildName: string;
  defenderGuildId:  string | null;
  defenderGuildName: string | null;
  status:           string;
  windowStart:      Date;
  windowEnd:        Date;
  attackerPoints:   number;
  defenderPoints:   number;
  winnerGuildId:    string | null;
  declaredAt:       Date;
  resolvedAt:       Date | null;
}

export interface DeclareWarResult {
  success: boolean;
  warId?:  string;
  error?:  string;
  windowStart?: Date;
  windowEnd?:   Date;
}

export interface CapturePointResult {
  success: boolean;
  error?:  string;
  newTotal?: number;
}

// ── Get all territories ───────────────────────────────────────────────────────

export async function getTerritories(): Promise<TerritoryInfo[]> {
  const db = getDb();

  const rows = await db.execute(sql.raw(`
    SELECT
      t.id,
      t.name,
      t.description,
      t.owner_guild_id,
      t.captured_at,
      t.xp_bonus_pct,
      t.drop_bonus_pct,
      og.name  AS owner_guild_name,
      og.tag   AS owner_guild_tag,
      w.id     AS war_id,
      w.attacker_guild_id,
      ag.name  AS attacker_guild_name,
      w.defender_guild_id,
      w.status AS war_status,
      w.window_start,
      w.window_end,
      w.attacker_points,
      w.defender_points
    FROM guild_territories t
    LEFT JOIN guilds og ON og.id = t.owner_guild_id
    LEFT JOIN LATERAL (
      SELECT * FROM guild_wars gw
      WHERE gw.territory_id = t.id
        AND gw.status IN ('pending', 'active')
      ORDER BY gw.declared_at DESC
      LIMIT 1
    ) w ON true
    LEFT JOIN guilds ag ON ag.id = w.attacker_guild_id
    ORDER BY t.id
  `)) as unknown as Array<{
    id: string; name: string; description: string;
    owner_guild_id: string | null; captured_at: Date | null;
    xp_bonus_pct: number; drop_bonus_pct: number;
    owner_guild_name: string | null; owner_guild_tag: string | null;
    war_id: string | null; attacker_guild_id: string | null;
    attacker_guild_name: string | null; defender_guild_id: string | null;
    war_status: string | null; window_start: Date | null; window_end: Date | null;
    attacker_points: number | null; defender_points: number | null;
  }>;

  return rows.map((r) => ({
    id:            r.id,
    name:          r.name,
    description:   r.description,
    ownerGuildId:  r.owner_guild_id,
    ownerGuildName: r.owner_guild_name,
    ownerGuildTag:  r.owner_guild_tag,
    capturedAt:    r.captured_at,
    xpBonusPct:    r.xp_bonus_pct,
    dropBonusPct:  r.drop_bonus_pct,
    activeWar: r.war_id ? {
      warId:            r.war_id,
      attackerGuildId:  r.attacker_guild_id!,
      attackerGuildName: r.attacker_guild_name!,
      defenderGuildId:  r.defender_guild_id,
      status:           r.war_status!,
      windowStart:      r.window_start!,
      windowEnd:        r.window_end!,
      attackerPoints:   r.attacker_points ?? 0,
      defenderPoints:   r.defender_points ?? 0,
    } : null,
  }));
}

// ── Get territories owned by a guild ─────────────────────────────────────────

export async function getGuildTerritories(guildId: string): Promise<TerritoryInfo[]> {
  const all = await getTerritories();
  return all.filter((t) => t.ownerGuildId === guildId);
}

// ── Count territories owned by a guild (for leaderboard) ─────────────────────

export async function getGuildTerritoryCount(guildId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(guildTerritories)
    .where(eq(guildTerritories.ownerGuildId, guildId));
  return row?.count ?? 0;
}

// ── Declare war ───────────────────────────────────────────────────────────────

export async function declareWar(
  actorId: string,
  guildId: string,
  territoryId: string,
): Promise<DeclareWarResult> {
  const db = getDb();

  // Actor must be guild leader
  const [membership] = await db
    .select()
    .from(guildMemberships)
    .where(and(eq(guildMemberships.playerId, actorId), eq(guildMemberships.guildId, guildId)))
    .limit(1);
  if (!membership || membership.role !== "leader") {
    return { success: false, error: "Only the guild leader can declare territory wars." };
  }

  // Territory must exist
  const [territory] = await db
    .select()
    .from(guildTerritories)
    .where(eq(guildTerritories.id, territoryId))
    .limit(1);
  if (!territory) return { success: false, error: "Territory not found." };

  // Cannot declare war on your own territory
  if (territory.ownerGuildId === guildId) {
    return { success: false, error: "You already own this territory." };
  }

  // Only one pending/active war per territory at a time
  const [existingWar] = await db.execute(sql.raw(`
    SELECT id FROM guild_wars
    WHERE territory_id = '${territoryId}'
      AND status IN ('pending', 'active')
    LIMIT 1
  `)) as unknown as Array<{ id: string }>;
  if (existingWar) {
    return { success: false, error: "This territory already has an ongoing war. Wait for it to resolve." };
  }

  // A guild can only fight one war at a time
  const [guildsActiveWar] = await db.execute(sql.raw(`
    SELECT id FROM guild_wars
    WHERE (attacker_guild_id = '${guildId}' OR defender_guild_id = '${guildId}')
      AND status IN ('pending', 'active')
    LIMIT 1
  `)) as unknown as Array<{ id: string }>;
  if (guildsActiveWar) {
    return { success: false, error: "Your guild is already involved in an active war." };
  }

  const { start, end } = _nextWarWindow();

  const [war] = await db
    .insert(guildWars)
    .values({
      territoryId,
      attackerGuildId: guildId,
      defenderGuildId: territory.ownerGuildId ?? null,
      status: "pending",
      windowStart: start,
      windowEnd: end,
    })
    .returning({ id: guildWars.id });

  return { success: true, warId: war.id, windowStart: start, windowEnd: end };
}

// ── Activate pending wars whose window has opened ────────────────────────────

export async function activatePendingWars(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const result = await db.execute(sql.raw(`
    UPDATE guild_wars
    SET status = 'active'
    WHERE status = 'pending'
      AND window_start <= '${now.toISOString()}'
      AND window_end   >  '${now.toISOString()}'
  `)) as unknown as { rowCount: number };
  return result.rowCount ?? 0;
}

// ── Record capture points ─────────────────────────────────────────────────────

export async function recordCapturePoints(
  warId: string,
  playerId: string,
  guildId: string,
  points: number = 1,
): Promise<CapturePointResult> {
  const db = getDb();

  // War must be active
  const [war] = await db
    .select()
    .from(guildWars)
    .where(and(eq(guildWars.id, warId), eq(guildWars.status, "active")))
    .limit(1);
  if (!war) return { success: false, error: "War is not active." };

  // Player must belong to one of the two guilds
  if (war.attackerGuildId !== guildId && war.defenderGuildId !== guildId) {
    return { success: false, error: "Your guild is not participating in this war." };
  }

  // Insert capture point event
  await db.insert(warCapturePoints).values({ warId, playerId, guildId, points });

  // Aggregate and update totals
  const totals = await db.execute(sql.raw(`
    SELECT guild_id, SUM(points)::int AS total
    FROM war_capture_points
    WHERE war_id = '${warId}'
    GROUP BY guild_id
  `)) as unknown as Array<{ guild_id: string; total: number }>;

  const attackerTotal = totals.find((r) => r.guild_id === war.attackerGuildId)?.total ?? 0;
  const defenderTotal = totals.find((r) => r.guild_id === war.defenderGuildId)?.total ?? 0;

  await db
    .update(guildWars)
    .set({ attackerPoints: attackerTotal, defenderPoints: defenderTotal })
    .where(eq(guildWars.id, warId));

  const myTotal = guildId === war.attackerGuildId ? attackerTotal : defenderTotal;
  return { success: true, newTotal: myTotal };
}

// ── Resolve completed wars ────────────────────────────────────────────────────

export interface ResolveWarResult {
  warId:          string;
  territoryId:    string;
  winnerGuildId:  string | null;
  attackerPoints: number;
  defenderPoints: number;
  ownershipChanged: boolean;
}

export async function resolveExpiredWars(): Promise<ResolveWarResult[]> {
  const db = getDb();
  const now = new Date();

  // Find all active wars whose window has closed
  const expiredWars = await db.execute(sql.raw(`
    SELECT id, territory_id, attacker_guild_id, defender_guild_id,
           attacker_points, defender_points
    FROM guild_wars
    WHERE status = 'active'
      AND window_end <= '${now.toISOString()}'
  `)) as unknown as Array<{
    id: string; territory_id: string;
    attacker_guild_id: string; defender_guild_id: string | null;
    attacker_points: number; defender_points: number;
  }>;

  const results: ResolveWarResult[] = [];

  for (const war of expiredWars) {
    // Attacker wins on tie (challenger advantage) or higher points
    const attackerWins = war.attacker_points >= war.defender_points;
    const winnerGuildId = attackerWins ? war.attacker_guild_id : (war.defender_guild_id ?? null);
    const ownershipChanged = attackerWins;

    await db.execute(sql.raw(`
      UPDATE guild_wars
      SET status = 'completed',
          winner_guild_id = ${winnerGuildId ? `'${winnerGuildId}'` : "NULL"},
          resolved_at = '${now.toISOString()}'
      WHERE id = '${war.id}'
    `));

    if (ownershipChanged) {
      await db.execute(sql.raw(`
        UPDATE guild_territories
        SET owner_guild_id = '${war.attacker_guild_id}',
            captured_at    = '${now.toISOString()}',
            updated_at     = '${now.toISOString()}'
        WHERE id = '${war.territory_id}'
      `));
    } else {
      // Defender held — just touch updated_at
      await db.execute(sql.raw(`
        UPDATE guild_territories
        SET updated_at = '${now.toISOString()}'
        WHERE id = '${war.territory_id}'
      `));
    }

    results.push({
      warId:          war.id,
      territoryId:    war.territory_id,
      winnerGuildId,
      attackerPoints: war.attacker_points,
      defenderPoints: war.defender_points,
      ownershipChanged,
    });
  }

  return results;
}

// ── Get war details ───────────────────────────────────────────────────────────

export async function getWarById(warId: string): Promise<WarDetails | null> {
  const db = getDb();

  const rows = await db.execute(sql.raw(`
    SELECT
      w.id, w.territory_id, t.name AS territory_name,
      w.attacker_guild_id, ag.name AS attacker_guild_name,
      w.defender_guild_id, dg.name AS defender_guild_name,
      w.status, w.window_start, w.window_end,
      w.attacker_points, w.defender_points,
      w.winner_guild_id, w.declared_at, w.resolved_at
    FROM guild_wars w
    JOIN guild_territories t ON t.id = w.territory_id
    JOIN guilds ag ON ag.id = w.attacker_guild_id
    LEFT JOIN guilds dg ON dg.id = w.defender_guild_id
    WHERE w.id = '${warId}'
    LIMIT 1
  `)) as unknown as Array<{
    id: string; territory_id: string; territory_name: string;
    attacker_guild_id: string; attacker_guild_name: string;
    defender_guild_id: string | null; defender_guild_name: string | null;
    status: string; window_start: Date; window_end: Date;
    attacker_points: number; defender_points: number;
    winner_guild_id: string | null; declared_at: Date; resolved_at: Date | null;
  }>;

  const r = rows[0];
  if (!r) return null;

  return {
    id:               r.id,
    territoryId:      r.territory_id,
    territoryName:    r.territory_name,
    attackerGuildId:  r.attacker_guild_id,
    attackerGuildName: r.attacker_guild_name,
    defenderGuildId:  r.defender_guild_id,
    defenderGuildName: r.defender_guild_name,
    status:           r.status,
    windowStart:      r.window_start,
    windowEnd:        r.window_end,
    attackerPoints:   r.attacker_points,
    defenderPoints:   r.defender_points,
    winnerGuildId:    r.winner_guild_id,
    declaredAt:       r.declared_at,
    resolvedAt:       r.resolved_at,
  };
}

// ── Get territory buffs active for a guild ────────────────────────────────────

export interface GuildTerritoryBuffs {
  xpBonusPct:   number; // sum of all owned territory XP bonuses
  dropBonusPct: number; // sum of all owned territory drop bonuses
  territories:  string[]; // list of owned territory IDs
}

export async function getGuildBuffs(guildId: string): Promise<GuildTerritoryBuffs> {
  const db = getDb();

  const rows = await db
    .select({ xpBonusPct: guildTerritories.xpBonusPct, dropBonusPct: guildTerritories.dropBonusPct, id: guildTerritories.id })
    .from(guildTerritories)
    .where(eq(guildTerritories.ownerGuildId, guildId));

  return {
    xpBonusPct:   rows.reduce((sum, r) => sum + r.xpBonusPct, 0),
    dropBonusPct: rows.reduce((sum, r) => sum + r.dropBonusPct, 0),
    territories:  rows.map((r) => r.id),
  };
}

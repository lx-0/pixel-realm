/**
 * Faction reputation data access layer.
 *
 * Handles reading and writing per-player faction standings.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { getPool } from "./client";
import { playerFactionReputation } from "./schema";
import {
  FACTIONS,
  REP_CLAMP_MIN,
  REP_CLAMP_MAX,
  type FactionStanding,
  getStanding,
} from "../factions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FactionRepEntry {
  factionId: string;
  reputation: number;
  standing: FactionStanding;
}

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Seeds all 4 faction rows at 0 for a new player (idempotent — uses ON CONFLICT DO NOTHING).
 */
export async function initPlayerFactionReputations(playerId: string): Promise<void> {
  const db = getDb();
  const rows = FACTIONS.map((f) => ({
    playerId,
    factionId: f.id,
    reputation: 0,
  }));
  await db
    .insert(playerFactionReputation)
    .values(rows)
    .onConflictDoNothing();
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Returns all faction standings for a player, initialising missing rows as needed. */
export async function getPlayerFactionReputations(playerId: string): Promise<FactionRepEntry[]> {
  await initPlayerFactionReputations(playerId);

  const db = getDb();
  const rows = await db
    .select()
    .from(playerFactionReputation)
    .where(eq(playerFactionReputation.playerId, playerId));

  // Build a map so we return one entry per defined faction (preserving order)
  const repByFaction = new Map(rows.map((r) => [r.factionId, r.reputation]));

  return FACTIONS.map((f) => {
    const rep = repByFaction.get(f.id) ?? 0;
    return { factionId: f.id, reputation: rep, standing: getStanding(rep) };
  });
}

/** Returns the reputation value (and standing) for a single faction. */
export async function getPlayerFactionReputation(
  playerId: string,
  factionId: string,
): Promise<FactionRepEntry> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playerFactionReputation)
    .where(
      and(
        eq(playerFactionReputation.playerId, playerId),
        eq(playerFactionReputation.factionId, factionId),
      ),
    )
    .limit(1);

  const rep = rows[0]?.reputation ?? 0;
  return { factionId, reputation: rep, standing: getStanding(rep) };
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Adjusts a player's reputation with a faction by `delta`, clamped to [-100, +100].
 * Returns the new reputation value.
 */
export async function adjustFactionReputation(
  playerId: string,
  factionId: string,
  delta: number,
): Promise<number> {
  const pool = getPool();

  const result = await pool.query<{ reputation: number }>(
    `INSERT INTO player_faction_reputation (player_id, faction_id, reputation, updated_at)
     VALUES ($1, $2, GREATEST($3, LEAST($4, 0 + $5)), NOW())
     ON CONFLICT (player_id, faction_id)
     DO UPDATE SET
       reputation = GREATEST($3, LEAST($4, player_faction_reputation.reputation + $5)),
       updated_at = NOW()
     RETURNING reputation`,
    [playerId, factionId, REP_CLAMP_MIN, REP_CLAMP_MAX, delta],
  );

  return result.rows[0]?.reputation ?? 0;
}

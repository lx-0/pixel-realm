/**
 * Faction reputation data access layer.
 *
 * Handles reading and writing per-player faction standings, daily task
 * completions, and earned title tracking.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./client";
import { getPool } from "./client";
import {
  playerFactionReputation,
  factionDailyCompletions,
  playerFactionTitles,
} from "./schema";
import {
  FACTIONS,
  FACTION_BY_ID,
  REP_CLAMP_MIN,
  REP_CLAMP_MAX,
  type FactionStanding,
  getStanding,
  getEarnedTitles,
  canAccessVendor,
} from "../factions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FactionRepEntry {
  factionId: string;
  reputation: number;
  standing: FactionStanding;
}

export interface FactionDailyStatus {
  factionId: string;
  taskId: string;
  description: string;
  enemyType: string;
  killCount: number;
  repReward: number;
  goldReward: number;
  completed: boolean;
}

export interface FactionTitleEntry {
  titleId: string;
  title: string;
  factionId: string;
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

// ── Daily Tasks ───────────────────────────────────────────────────────────────

/** Returns today's UTC date string (YYYY-MM-DD). */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns daily task status for all factions for a player on today's UTC date.
 * Tasks reset each UTC day.
 */
export async function getPlayerDailyTaskStatus(playerId: string): Promise<FactionDailyStatus[]> {
  const today = todayUtc();
  const db = getDb();

  const completedRows = await db
    .select()
    .from(factionDailyCompletions)
    .where(
      and(
        eq(factionDailyCompletions.playerId, playerId),
        eq(factionDailyCompletions.completedDate, today),
      ),
    );

  const completedSet = new Set(completedRows.map((r) => r.factionId));

  return FACTIONS.map((f) => ({
    factionId:   f.id,
    taskId:      f.dailyTask.id,
    description: f.dailyTask.description,
    enemyType:   f.dailyTask.enemyType,
    killCount:   f.dailyTask.killCount,
    repReward:   f.dailyTask.repReward,
    goldReward:  f.dailyTask.goldReward,
    completed:   completedSet.has(f.id),
  }));
}

/**
 * Marks a faction's daily task as completed for today.
 * Returns false if already completed today (idempotent), true if newly completed.
 */
export async function completeFactionDailyTask(
  playerId: string,
  factionId: string,
): Promise<boolean> {
  const today = todayUtc();
  const db = getDb();

  const existing = await db
    .select()
    .from(factionDailyCompletions)
    .where(
      and(
        eq(factionDailyCompletions.playerId, playerId),
        eq(factionDailyCompletions.factionId, factionId),
        eq(factionDailyCompletions.completedDate, today),
      ),
    )
    .limit(1);

  if (existing.length > 0) return false;

  const faction = FACTION_BY_ID.get(factionId);
  if (!faction) return false;

  await db.insert(factionDailyCompletions).values({
    playerId,
    factionId,
    taskId: faction.dailyTask.id,
    completedDate: today,
  });

  return true;
}

// ── Titles ────────────────────────────────────────────────────────────────────

/** Returns all faction titles a player has unlocked. */
export async function getPlayerFactionTitles(playerId: string): Promise<FactionTitleEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playerFactionTitles)
    .where(eq(playerFactionTitles.playerId, playerId));

  return rows.map((r) => {
    // Find the display name from faction definitions
    const faction = FACTION_BY_ID.get(r.factionId);
    const titleDef = faction?.titleRewards.find((t) => t.titleId === r.titleId);
    return {
      titleId:   r.titleId,
      title:     titleDef?.title ?? r.titleId,
      factionId: r.factionId,
    };
  });
}

/**
 * Awards any newly-earned faction titles based on current reputation.
 * Returns titles that were newly awarded this call (empty array = nothing new).
 */
export async function awardEarnedFactionTitles(
  playerId: string,
  factionId: string,
  reputation: number,
): Promise<FactionTitleEntry[]> {
  const earned = getEarnedTitles(factionId, reputation);
  if (earned.length === 0) return [];

  const db = getDb();

  // Fetch already-unlocked titles for this faction
  const existing = await db
    .select()
    .from(playerFactionTitles)
    .where(
      and(
        eq(playerFactionTitles.playerId, playerId),
        eq(playerFactionTitles.factionId, factionId),
      ),
    );

  const existingIds = new Set(existing.map((r) => r.titleId));
  const newlyEarned = earned.filter((t) => !existingIds.has(t.titleId));

  if (newlyEarned.length === 0) return [];

  await db.insert(playerFactionTitles).values(
    newlyEarned.map((t) => ({
      playerId,
      titleId:   t.titleId,
      factionId,
    })),
  ).onConflictDoNothing();

  return newlyEarned.map((t) => ({
    titleId:   t.titleId,
    title:     t.title,
    factionId,
  }));
}

// ── Vendor ────────────────────────────────────────────────────────────────────

/**
 * Returns the vendor items available to a player from a given faction.
 * Filters by the player's current standing — items above their standing are excluded.
 */
export async function getFactionVendorItems(
  playerId: string,
  factionId: string,
) {
  const repEntry = await getPlayerFactionReputation(playerId, factionId);
  if (!canAccessVendor(repEntry.standing)) return null; // null = no access

  const faction = FACTION_BY_ID.get(factionId);
  if (!faction) return null;

  const standingOrder: FactionStanding[] = ["hostile", "unfriendly", "neutral", "friendly", "honored", "exalted"];
  const playerRank = standingOrder.indexOf(repEntry.standing);

  const available = faction.vendorItems.filter((item) => {
    const reqRank = standingOrder.indexOf(item.requiredStanding);
    return reqRank <= playerRank;
  });

  return { items: available, standing: repEntry.standing };
}

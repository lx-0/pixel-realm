/**
 * Arena data-access layer — server-authoritative PvP ranked arena.
 *
 * Responsibilities:
 *   - Season management: get/create the active season, advance seasons
 *   - ELO rating persistence: get/upsert per-player per-season ratings
 *   - Match recording: store match results and update ELO atomically
 *   - Leaderboard: top-N players by rating for a season
 *   - Season rewards: grant PvP currency by tier on season end
 *
 * ELO formula:
 *   E(A) = 1 / (1 + 10^((R_B - R_A) / 400))
 *   R_A' = R_A + K * (S_A - E_A)   where K=32, S_A ∈ {0, 1}
 *   Rating floor: 0.  Rating ceiling: none.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./client";
import { getRedis } from "./redis";
import {
  arenaSeasons,
  pvpRatings,
  arenaMatches,
  arenaSeasonRewards,
  playerState,
} from "./schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const ELO_K         = 32;
const ELO_DEFAULT   = 1000;
const CACHE_TTL_SEC = 60; // 1-minute TTL for arena leaderboard cache

// PvP currency awarded by final tier at season end
const SEASON_REWARD_BY_TIER: Record<string, number> = {
  BRONZE:   100,
  SILVER:   250,
  GOLD:     500,
  PLATINUM: 1000,
  DIAMOND:  2000,
  CHAMPION: 5000,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArenaRatingRecord {
  playerId:   string;
  seasonId:   string;
  rating:     number;
  wins:       number;
  losses:     number;
  kills:      number;
  deaths:     number;
  peakRating: number;
  updatedAt:  Date;
}

export interface MatchParticipant {
  playerId:      string;
  ratingBefore:  number;
  ratingAfter:   number;
  ratingDelta:   number;
  won:           boolean;
  kills:         number;
  deaths:        number;
}

export interface RecordMatchInput {
  seasonId:     string;
  mode:         "1v1" | "2v2";
  map:          string;
  winnerIds:    string[];
  loserIds:     string[];
  kills:        Record<string, number>; // playerId → kill count
  durationMs:   number;
}

export interface ArenaLeaderboardEntry {
  rank:       number;
  playerId:   string;
  username:   string;
  rating:     number;
  wins:       number;
  losses:     number;
  peakRating: number;
}

// ── ELO helpers ───────────────────────────────────────────────────────────────

function expectedScore(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function eloUpdate(rA: number, rB: number, aWon: boolean): [number, number] {
  const eA   = expectedScore(rA, rB);
  const eB   = 1 - eA;
  const sA   = aWon ? 1 : 0;
  const sB   = aWon ? 0 : 1;
  const newA = Math.round(rA + ELO_K * (sA - eA));
  const newB = Math.round(rB + ELO_K * (sB - eB));
  return [Math.max(0, newA), Math.max(0, newB)];
}

// ── Season management ─────────────────────────────────────────────────────────

/**
 * Returns the currently active arena season, or null if none exists.
 */
export async function getActiveSeason(): Promise<typeof arenaSeasons.$inferSelect | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(arenaSeasons)
    .where(eq(arenaSeasons.isActive, true))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns or creates the active arena season.
 * Creates Season 1 if no active season exists (idempotent bootstrap).
 */
export async function getOrCreateActiveSeason(): Promise<typeof arenaSeasons.$inferSelect> {
  const existing = await getActiveSeason();
  if (existing) return existing;

  const db = getDb();
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 3); // 3-month season

  const [created] = await db
    .insert(arenaSeasons)
    .values({
      number:   1,
      name:     "Season 1: Dawn of the Gladiators",
      startsAt: now,
      endsAt:   end,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;
  // Race condition: another instance inserted first
  const season = await getActiveSeason();
  if (!season) throw new Error("Failed to get or create active arena season");
  return season;
}

// ── Rating management ─────────────────────────────────────────────────────────

/**
 * Gets or creates a player's rating record for the given season.
 */
export async function getOrCreateRating(
  playerId: string,
  seasonId: string,
): Promise<ArenaRatingRecord> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pvpRatings)
    .where(and(eq(pvpRatings.playerId, playerId), eq(pvpRatings.seasonId, seasonId)))
    .limit(1);

  if (rows[0]) {
    return rows[0] as ArenaRatingRecord;
  }

  const [created] = await db
    .insert(pvpRatings)
    .values({ playerId, seasonId, rating: ELO_DEFAULT, peakRating: ELO_DEFAULT })
    .onConflictDoNothing()
    .returning();

  if (created) return created as ArenaRatingRecord;

  // Re-fetch after conflict
  const refetch = await db
    .select()
    .from(pvpRatings)
    .where(and(eq(pvpRatings.playerId, playerId), eq(pvpRatings.seasonId, seasonId)))
    .limit(1);
  if (!refetch[0]) throw new Error(`Failed to create pvp rating for player ${playerId}`);
  return refetch[0] as ArenaRatingRecord;
}

/**
 * Returns a player's current rating + tier for the active season.
 * Returns null if the player has never queued this season.
 */
export async function getPlayerArenaRating(playerId: string): Promise<{
  rating: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  peakRating: number;
  seasonId: string;
  seasonNumber: number;
  seasonName: string;
} | null> {
  const season = await getActiveSeason();
  if (!season) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(pvpRatings)
    .where(and(eq(pvpRatings.playerId, playerId), eq(pvpRatings.seasonId, season.id)))
    .limit(1);

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    rating:       r.rating,
    wins:         r.wins,
    losses:       r.losses,
    kills:        r.kills,
    deaths:       r.deaths,
    peakRating:   r.peakRating,
    seasonId:     season.id,
    seasonNumber: season.number,
    seasonName:   season.name,
  };
}

// ── Match recording ───────────────────────────────────────────────────────────

/**
 * Records a completed arena match, updates ELO ratings, pvp_wins, and
 * invalidates the leaderboard cache. Fully server-authoritative.
 *
 * Returns the per-player rating deltas keyed by playerId.
 */
export async function recordArenaMatch(
  input: RecordMatchInput,
): Promise<Record<string, number>> {
  const db = getDb();
  const { seasonId, winnerIds, loserIds, kills, durationMs, mode, map } = input;

  // Fetch current ratings for all participants
  const allIds = [...winnerIds, ...loserIds];
  const ratings: Record<string, ArenaRatingRecord> = {};
  await Promise.all(
    allIds.map(async (id) => {
      ratings[id] = await getOrCreateRating(id, seasonId);
    }),
  );

  // Compute new ELO ratings
  const newRatings: Record<string, number> = {};
  const deltas: Record<string, number> = {};

  if (mode === "1v1") {
    const [winnerId, loserId] = [winnerIds[0], loserIds[0]];
    const [newW, newL] = eloUpdate(ratings[winnerId].rating, ratings[loserId].rating, true);
    newRatings[winnerId] = newW;
    newRatings[loserId]  = newL;
    deltas[winnerId]     = newW - ratings[winnerId].rating;
    deltas[loserId]      = newL - ratings[loserId].rating;
  } else {
    // 2v2: compute pairwise ELO against each opponent, average the deltas
    const avgRating = (ids: string[]) =>
      ids.reduce((s, id) => s + ratings[id].rating, 0) / ids.length;
    const [avgWNew, avgLNew] = eloUpdate(avgRating(winnerIds), avgRating(loserIds), true);
    for (const id of winnerIds) {
      const delta = avgWNew - avgRating(winnerIds);
      newRatings[id] = Math.max(0, Math.round(ratings[id].rating + delta));
      deltas[id]     = newRatings[id] - ratings[id].rating;
    }
    for (const id of loserIds) {
      const delta = avgLNew - avgRating(loserIds);
      newRatings[id] = Math.max(0, Math.round(ratings[id].rating + delta));
      deltas[id]     = newRatings[id] - ratings[id].rating;
    }
  }

  // Build match participants array
  const participants: MatchParticipant[] = allIds.map((id) => ({
    playerId:     id,
    ratingBefore: ratings[id].rating,
    ratingAfter:  newRatings[id],
    ratingDelta:  deltas[id],
    won:          winnerIds.includes(id),
    kills:        kills[id] ?? 0,
    deaths:       kills[id] !== undefined ? 0 : 0, // kills map is winner-centric
  }));

  // Persist: update pvp_ratings + increment pvp_wins + insert match record
  await db.transaction(async (tx) => {
    // Update ratings for all participants
    for (const id of allIds) {
      const won  = winnerIds.includes(id);
      const newR = newRatings[id];
      const prev = ratings[id];
      await tx
        .update(pvpRatings)
        .set({
          rating:     newR,
          wins:       won ? sql`${pvpRatings.wins} + 1`   : pvpRatings.wins,
          losses:     won ? pvpRatings.losses              : sql`${pvpRatings.losses} + 1`,
          kills:      sql`${pvpRatings.kills} + ${kills[id] ?? 0}`,
          peakRating: newR > prev.peakRating ? newR : pvpRatings.peakRating,
          updatedAt:  new Date(),
        })
        .where(and(eq(pvpRatings.playerId, id), eq(pvpRatings.seasonId, seasonId)));
    }

    // Increment player_state.pvp_wins for winners
    for (const id of winnerIds) {
      await tx
        .update(playerState)
        .set({
          pvpWins:   sql`${playerState.pvpWins} + 1`,
          lastSeenAt: new Date(),
          updatedAt:  new Date(),
        })
        .where(eq(playerState.playerId, id));
    }

    // Record the match
    await tx.insert(arenaMatches).values({
      seasonId,
      mode,
      map,
      participants: participants as unknown as typeof arenaMatches.$inferInsert["participants"],
      durationMs,
    });
  });

  // Invalidate arena leaderboard cache
  await invalidateArenaLeaderboardCache(seasonId);

  return deltas;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

const LEADERBOARD_CACHE_KEY = (seasonId: string) => `arena:leaderboard:${seasonId}`;

async function invalidateArenaLeaderboardCache(seasonId: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(LEADERBOARD_CACHE_KEY(seasonId));
  } catch {
    // Non-fatal
  }
}

/**
 * Returns top-N players by rating for a given season (default: top 100).
 * Redis-cached for 1 minute.
 */
export async function getArenaLeaderboard(
  seasonId: string,
  limit = 100,
): Promise<ArenaLeaderboardEntry[]> {
  const cacheKey = LEADERBOARD_CACHE_KEY(seasonId);

  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      const all = JSON.parse(cached) as ArenaLeaderboardEntry[];
      return all.slice(0, limit);
    }
  } catch {
    // Redis unavailable
  }

  const db = getDb();
  const rows = await db.execute(sql.raw(`
    SELECT
      pr.player_id,
      p.username,
      pr.rating,
      pr.wins,
      pr.losses,
      pr.peak_rating
    FROM pvp_ratings pr
    JOIN players p ON p.id = pr.player_id
    WHERE pr.season_id = '${seasonId}'
      AND p.deleted_at IS NULL
    ORDER BY pr.rating DESC
    LIMIT 100
  `)) as unknown as Array<{
    player_id: string;
    username: string;
    rating: number;
    wins: number;
    losses: number;
    peak_rating: number;
  }>;

  const entries: ArenaLeaderboardEntry[] = rows.map((row, idx) => ({
    rank:       idx + 1,
    playerId:   row.player_id,
    username:   row.username,
    rating:     Number(row.rating),
    wins:       Number(row.wins),
    losses:     Number(row.losses),
    peakRating: Number(row.peak_rating),
  }));

  // Cache for 1 minute
  try {
    const redis = getRedis();
    await redis.set(cacheKey, JSON.stringify(entries), "EX", CACHE_TTL_SEC);
  } catch {
    // Non-fatal
  }

  return entries.slice(0, limit);
}

/**
 * Returns a player's rank in the active season's leaderboard.
 * Returns 0 if unranked.
 */
export async function getPlayerArenaRank(playerId: string): Promise<number> {
  const season = await getActiveSeason();
  if (!season) return 0;
  const board = await getArenaLeaderboard(season.id);
  return board.find((e) => e.playerId === playerId)?.rank ?? 0;
}

// ── Season rewards ────────────────────────────────────────────────────────────

/**
 * Returns the PvP currency reward for a given tier string.
 */
export function getPvpCurrencyForTier(tier: string): number {
  return SEASON_REWARD_BY_TIER[tier] ?? 100;
}

/**
 * Grants end-of-season PvP currency rewards to all ranked players.
 * Idempotent: skips players who already received rewards this season.
 * Returns the number of players rewarded.
 */
export async function grantSeasonRewards(seasonId: string): Promise<number> {
  const db = getDb();

  // Fetch all rated players for this season
  const rated = await db
    .select()
    .from(pvpRatings)
    .where(eq(pvpRatings.seasonId, seasonId));

  let rewarded = 0;
  for (const r of rated) {
    // Determine tier from peak rating (use peak so decayed players keep their rank)
    const tier = ratingToTier(r.peakRating);
    const currency = getPvpCurrencyForTier(tier);

    try {
      await db
        .insert(arenaSeasonRewards)
        .values({ playerId: r.playerId, seasonId, tier, pvpCurrencyAwarded: currency })
        .onConflictDoNothing();
      rewarded++;
    } catch {
      // Already rewarded — skip
    }
  }
  return rewarded;
}

/**
 * Ends the current season, grants rewards, and creates the next season.
 * The new season starts immediately with all players soft-reset (peakRating
 * carries over as the placement seed, raw rating decays toward 1000 by 50%).
 */
export async function advanceSeason(): Promise<typeof arenaSeasons.$inferSelect> {
  const db = getDb();
  const current = await getActiveSeason();
  if (!current) throw new Error("No active season to advance");

  // Grant rewards for the current season
  await grantSeasonRewards(current.id);

  // Deactivate current season
  await db
    .update(arenaSeasons)
    .set({ isActive: false })
    .where(eq(arenaSeasons.id, current.id));

  // Create next season (3-month windows)
  const nextStart = new Date();
  const nextEnd   = new Date(nextStart);
  nextEnd.setMonth(nextEnd.getMonth() + 3);

  const [next] = await db
    .insert(arenaSeasons)
    .values({
      number:   current.number + 1,
      name:     `Season ${current.number + 1}`,
      startsAt: nextStart,
      endsAt:   nextEnd,
      isActive: true,
    })
    .returning();

  // Soft-reset: carry forward a decayed rating seed for all prior-season players
  const priorRatings = await db
    .select()
    .from(pvpRatings)
    .where(eq(pvpRatings.seasonId, current.id));

  for (const r of priorRatings) {
    // Decay toward 1000 by 50% of the spread
    const decayed = Math.round(1000 + (r.peakRating - 1000) * 0.5);
    await db
      .insert(pvpRatings)
      .values({ playerId: r.playerId, seasonId: next.id, rating: decayed, peakRating: decayed })
      .onConflictDoNothing();
  }

  return next;
}

// ── Tier helper ───────────────────────────────────────────────────────────────

export function ratingToTier(rating: number): string {
  if (rating >= 2200) return "CHAMPION";
  if (rating >= 1800) return "DIAMOND";
  if (rating >= 1600) return "PLATINUM";
  if (rating >= 1400) return "GOLD";
  if (rating >= 1200) return "SILVER";
  return "BRONZE";
}

/**
 * Leaderboard data access layer with Redis-backed caching.
 *
 * Categories:
 *   xp        — Total XP from player_state
 *   kills     — PvE kills from player_state
 *   quests    — Completed quests from progression
 *   achievements — Achievement points from player_achievements
 *   crafting  — Total craft count from crafting_progress
 *
 * Periods:
 *   all    — All players, all time (no active filter)
 *   weekly — Only players active in the last 7 days
 *   daily  — Only players active in the last 24 hours
 *
 * Cache: Redis with 5-minute TTL per category+period combination.
 * Falls back to DB-only if Redis is unavailable.
 */

import { sql, eq } from "drizzle-orm";
import { getDb } from "./client";
import { getRedis } from "./redis";
import { playerState } from "./schema";

export type LeaderboardCategory = "xp" | "kills" | "quests" | "achievements" | "crafting" | "prestige" | "pvp_wins" | "guild";
export type LeaderboardPeriod = "all" | "weekly" | "daily";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
}

const CACHE_TTL_SECONDS = 300; // 5 minutes

function cacheKey(category: LeaderboardCategory, period: LeaderboardPeriod): string {
  return `leaderboard:${category}:${period}`;
}

/** Returns the SQL WHERE clause fragment for a given period (filters by lastSeenAt). */
function periodFilter(period: LeaderboardPeriod): string {
  if (period === "daily")  return `AND ps.last_seen_at >= NOW() - INTERVAL '1 day'`;
  if (period === "weekly") return `AND ps.last_seen_at >= NOW() - INTERVAL '7 days'`;
  return "";
}

/** Queries the DB for the top 100 entries for a given category + period. */
async function queryLeaderboard(
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  const pf = periodFilter(period);

  let rows: Array<{ player_id: string; username: string; score: bigint | number }>;

  if (category === "xp") {
    rows = await db.execute(sql.raw(`
      SELECT ps.player_id, p.username, ps.xp AS score
      FROM player_state ps
      JOIN players p ON p.id = ps.player_id
      WHERE ps.xp > 0 ${pf}
      ORDER BY ps.xp DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else if (category === "kills") {
    rows = await db.execute(sql.raw(`
      SELECT ps.player_id, p.username, ps.pve_kills AS score
      FROM player_state ps
      JOIN players p ON p.id = ps.player_id
      WHERE ps.pve_kills > 0 ${pf}
      ORDER BY ps.pve_kills DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else if (category === "quests") {
    rows = await db.execute(sql.raw(`
      SELECT pr.player_id, p.username, COUNT(*)::int AS score
      FROM progression pr
      JOIN players p ON p.id = pr.player_id
      JOIN player_state ps ON ps.player_id = pr.player_id
      WHERE pr.status = 'completed' ${pf}
      GROUP BY pr.player_id, p.username
      HAVING COUNT(*) > 0
      ORDER BY score DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else if (category === "achievements") {
    rows = await db.execute(sql.raw(`
      SELECT pa.player_id, p.username, SUM(points_map.points)::int AS score
      FROM player_achievements pa
      JOIN players p ON p.id = pa.player_id
      JOIN player_state ps ON ps.player_id = pa.player_id
      JOIN LATERAL (
        SELECT CASE pa.achievement_id
          WHEN 'first_blood'    THEN 1
          WHEN 'warrior_path'   THEN 3
          WHEN 'centurion'      THEN 4
          WHEN 'slayer'         THEN 5
          WHEN 'unstoppable'    THEN 8
          WHEN 'boss_slayer'    THEN 5
          WHEN 'wanderer'       THEN 2
          WHEN 'explorer'       THEN 3
          WHEN 'world_traveler' THEN 5
          WHEN 'quest_novice'   THEN 1
          WHEN 'quest_adept'    THEN 3
          WHEN 'quest_master'   THEN 5
          WHEN 'first_craft'    THEN 1
          WHEN 'artisan'        THEN 3
          WHEN 'master_crafter' THEN 5
          WHEN 'guild_founder'  THEN 3
          WHEN 'guild_recruiter' THEN 2
          ELSE 0
        END AS points
      ) points_map ON true
      WHERE pa.unlocked = true ${pf}
      GROUP BY pa.player_id, p.username
      HAVING SUM(points_map.points) > 0
      ORDER BY score DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else if (category === "prestige") {
    rows = await db.execute(sql.raw(`
      SELECT ps.player_id, p.username, ps.prestige_level AS score
      FROM player_state ps
      JOIN players p ON p.id = ps.player_id
      WHERE ps.prestige_level > 0 ${pf}
      ORDER BY ps.prestige_level DESC, ps.total_prestige_resets DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else if (category === "pvp_wins") {
    rows = await db.execute(sql.raw(`
      SELECT ps.player_id, p.username, ps.pvp_wins AS score
      FROM player_state ps
      JOIN players p ON p.id = ps.player_id
      WHERE ps.pvp_wins > 0 ${pf}
      ORDER BY ps.pvp_wins DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else if (category === "guild") {
    // Guild power = aggregate XP of all active guild members (period filter via last_seen_at)
    rows = await db.execute(sql.raw(`
      SELECT
        gm.guild_id AS player_id,
        g.name      AS username,
        SUM(ps.xp)::int AS score
      FROM guild_memberships gm
      JOIN guilds g ON g.id = gm.guild_id
      JOIN player_state ps ON ps.player_id = gm.player_id
      JOIN players p ON p.id = gm.player_id AND p.deleted_at IS NULL
      WHERE g.deleted_at IS NULL ${pf}
      GROUP BY gm.guild_id, g.name
      HAVING SUM(ps.xp) > 0
      ORDER BY score DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  } else {
    // crafting
    rows = await db.execute(sql.raw(`
      SELECT cp.player_id, p.username, SUM(cp.craft_count)::int AS score
      FROM crafting_progress cp
      JOIN players p ON p.id = cp.player_id
      JOIN player_state ps ON ps.player_id = cp.player_id
      WHERE cp.craft_count > 0 ${pf}
      GROUP BY cp.player_id, p.username
      HAVING SUM(cp.craft_count) > 0
      ORDER BY score DESC
      LIMIT 100
    `)) as unknown as typeof rows;
  }

  return rows.map((row, idx) => ({
    rank: idx + 1,
    playerId: row.player_id,
    username: row.username,
    score: Number(row.score),
  }));
}

/**
 * Fetches the leaderboard for a category + period.
 * Returns cached data if available; otherwise queries DB and caches result.
 */
export async function getLeaderboard(
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
): Promise<LeaderboardEntry[]> {
  const key = cacheKey(category, period);

  // Try Redis cache first
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as LeaderboardEntry[];
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  const entries = await queryLeaderboard(category, period);

  // Cache result in Redis
  try {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(entries), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Non-fatal
  }

  return entries;
}

/**
 * Returns a player's rank (1-based) for a given category + period.
 * Returns 0 if the player is not ranked.
 * For the guild category, playerId is ignored (guild boards are not player-specific).
 */
export async function getPlayerRank(
  playerId: string,
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
): Promise<number> {
  if (category === "guild") return 0;
  const entries = await getLeaderboard(category, period);
  const entry = entries.find((e) => e.playerId === playerId);
  return entry?.rank ?? 0;
}

/**
 * Increments pvp_wins for a player and invalidates the pvp_wins leaderboard cache.
 */
export async function recordPvpWin(playerId: string): Promise<void> {
  const db = getDb();
  await db
    .update(playerState)
    .set({
      pvpWins: sql`${playerState.pvpWins} + 1`,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(playerState.playerId, playerId));
  await invalidateLeaderboardCache("pvp_wins");
}

/**
 * Invalidates the cached leaderboard entries for all periods of a category.
 * Called after a score-relevant event (kill, craft, quest complete).
 */
export async function invalidateLeaderboardCache(category: LeaderboardCategory): Promise<void> {
  try {
    const redis = getRedis();
    const periods: LeaderboardPeriod[] = ["all", "weekly", "daily"];
    await Promise.all(periods.map((p) => redis.del(cacheKey(category, p))));
  } catch {
    // Non-fatal
  }
}

/**
 * Analytics data access layer.
 *
 * Tracks player sessions, zone visits, and aggregates telemetry for the
 * /api/analytics/summary internal dashboard endpoint.
 *
 * All writes are best-effort (non-fatal on DB failure) so analytics never
 * blocks gameplay. Reads are used only for internal dashboards.
 */

import { getPool } from "./client";

// ── Write helpers ─────────────────────────────────────────────────────────────

/** Start a new session for a player. Returns the new session id. */
export async function startSession(playerId: string): Promise<string> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO player_sessions (player_id) VALUES ($1) RETURNING id`,
    [playerId],
  );
  return result.rows[0].id;
}

/** End a session, computing duration. */
export async function endSession(sessionId: string, playerId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE player_sessions
     SET ended_at = NOW(),
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::int
     WHERE id = $1 AND player_id = $2 AND ended_at IS NULL`,
    [sessionId, playerId],
  );
}

/** Record a player entering a zone. Returns the visit id. */
export async function enterZone(
  playerId: string,
  sessionId: string,
  zoneId: string,
): Promise<string> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO zone_visits (player_id, session_id, zone_id) VALUES ($1, $2, $3) RETURNING id`,
    [playerId, sessionId, zoneId],
  );
  return result.rows[0].id;
}

/** Record a player leaving a zone, computing time-in-zone. */
export async function exitZone(visitId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE zone_visits
     SET exited_at = NOW(),
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - entered_at))::int
     WHERE id = $1 AND exited_at IS NULL`,
    [visitId],
  );
}

// ── Summary aggregation ───────────────────────────────────────────────────────

export interface ZoneStats {
  zoneId: string;
  visitCount: number;
  avgDurationSeconds: number | null;
  uniquePlayers: number;
}

export interface LevelBucket {
  bucket: string;
  playerCount: number;
}

export interface AnalyticsSummary {
  generatedAt: string;
  activePlayers: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  sessions: {
    total7d: number;
    avgDurationSeconds: number | null;
    returnRate7d: number | null; // fraction of 7d players who had >1 session
  };
  zonePopularity: ZoneStats[];
  levelDistribution: LevelBucket[];
  totalPlayers: number;
}

/** Aggregates analytics data for the internal dashboard. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const pool = getPool();

  const [activeCounts, sessionStats, returnRateRows, zoneRows, levelRows, totalRows] =
    await Promise.all([
      // Active unique players by time window
      pool.query<{ last24h: number; last7d: number; last30d: number }>(`
        SELECT
          COUNT(DISTINCT CASE WHEN started_at >= NOW() - INTERVAL '1 day'   THEN player_id END)::int AS last24h,
          COUNT(DISTINCT CASE WHEN started_at >= NOW() - INTERVAL '7 days'  THEN player_id END)::int AS last7d,
          COUNT(DISTINCT CASE WHEN started_at >= NOW() - INTERVAL '30 days' THEN player_id END)::int AS last30d
        FROM player_sessions
      `),

      // Session count + avg duration for last 7 days
      pool.query<{ total: number; avg_duration: string | null }>(`
        SELECT
          COUNT(*)::int AS total,
          AVG(duration_seconds)::float AS avg_duration
        FROM player_sessions
        WHERE started_at >= NOW() - INTERVAL '7 days'
          AND duration_seconds IS NOT NULL
      `),

      // Return rate: fraction of 7d players with >1 session
      pool.query<{ rate: string | null }>(`
        SELECT
          COUNT(DISTINCT player_id) FILTER (WHERE session_count > 1)::float
            / NULLIF(COUNT(DISTINCT player_id), 0) AS rate
        FROM (
          SELECT player_id, COUNT(*) AS session_count
          FROM player_sessions
          WHERE started_at >= NOW() - INTERVAL '7 days'
          GROUP BY player_id
        ) sub
      `),

      // Zone popularity (last 7 days, top 20 by visit count)
      pool.query<{
        zone_id: string;
        visit_count: number;
        avg_duration: string | null;
        unique_players: number;
      }>(`
        SELECT
          zone_id,
          COUNT(*)::int AS visit_count,
          AVG(duration_seconds)::float AS avg_duration,
          COUNT(DISTINCT player_id)::int AS unique_players
        FROM zone_visits
        WHERE entered_at >= NOW() - INTERVAL '7 days'
        GROUP BY zone_id
        ORDER BY visit_count DESC
        LIMIT 20
      `),

      // Level distribution in buckets of 10
      pool.query<{ bucket: string; player_count: number }>(`
        SELECT
          CONCAT(((level - 1) / 10) * 10 + 1, '-', ((level - 1) / 10 + 1) * 10) AS bucket,
          COUNT(*)::int AS player_count
        FROM player_state
        GROUP BY ((level - 1) / 10)
        ORDER BY ((level - 1) / 10)
      `),

      // Total registered players
      pool.query<{ total: number }>(`
        SELECT COUNT(*)::int AS total FROM players WHERE deleted_at IS NULL
      `),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    activePlayers: {
      last24h: activeCounts.rows[0]?.last24h ?? 0,
      last7d:  activeCounts.rows[0]?.last7d  ?? 0,
      last30d: activeCounts.rows[0]?.last30d ?? 0,
    },
    sessions: {
      total7d:            sessionStats.rows[0]?.total ?? 0,
      avgDurationSeconds: sessionStats.rows[0]?.avg_duration != null
        ? Number(sessionStats.rows[0].avg_duration) : null,
      returnRate7d: returnRateRows.rows[0]?.rate != null
        ? Number(returnRateRows.rows[0].rate) : null,
    },
    zonePopularity: zoneRows.rows.map((r) => ({
      zoneId:             r.zone_id,
      visitCount:         r.visit_count,
      avgDurationSeconds: r.avg_duration != null ? Number(r.avg_duration) : null,
      uniquePlayers:      r.unique_players,
    })),
    levelDistribution: levelRows.rows.map((r) => ({
      bucket:      r.bucket,
      playerCount: r.player_count,
    })),
    totalPlayers: totalRows.rows[0]?.total ?? 0,
  };
}

/**
 * Raid system — server-side lockout persistence.
 *
 * Weekly lockout: one clear per boss per player per week (ISO week, Mon–Sun).
 * Boss IDs: "raid_dragon" | "raid_shadow" | "raid_crystal"
 */

import { getPool } from "./client";

export type RaidBossId = "raid_dragon" | "raid_shadow" | "raid_crystal";

/** Returns the Monday-date string (YYYY-MM-DD) for the ISO week containing `date`. */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns true if the player already cleared this boss this week.
 */
export async function isRaidLocked(playerId: string, bossId: RaidBossId): Promise<boolean> {
  const pool = getPool();
  const weekStart = getWeekStart();
  const res = await pool.query(
    `SELECT 1 FROM raid_lockouts
     WHERE player_id = $1 AND boss_id = $2 AND week_start = $3
     LIMIT 1`,
    [playerId, bossId, weekStart],
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Records a raid boss clear for the player, locking them out for the rest of the week.
 * No-op if already locked out (upsert).
 */
export async function recordRaidClear(playerId: string, bossId: RaidBossId): Promise<void> {
  const pool = getPool();
  const weekStart = getWeekStart();
  await pool.query(
    `INSERT INTO raid_lockouts (player_id, boss_id, week_start)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [playerId, bossId, weekStart],
  );
}

/**
 * Returns which bosses the player is locked out from this week.
 */
export async function getRaidLockouts(playerId: string): Promise<RaidBossId[]> {
  const pool = getPool();
  const weekStart = getWeekStart();
  const res = await pool.query<{ boss_id: string }>(
    `SELECT boss_id FROM raid_lockouts
     WHERE player_id = $1 AND week_start = $2`,
    [playerId, weekStart],
  );
  return res.rows.map(r => r.boss_id as RaidBossId);
}

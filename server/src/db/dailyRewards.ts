/**
 * Daily login rewards and streak system.
 *
 * Each player can claim one reward per calendar day (UTC).
 * Consecutive daily logins build a streak; missing a day resets the streak.
 * A 1-day grace period is NOT applied — missing any day resets to 1.
 *
 * Rewards scale with streak length in a repeating 7-day cycle:
 *   Day 1: 50 gold
 *   Day 2: 100 gold + 50 XP
 *   Day 3: 150 gold + 100 XP
 *   Day 4: 200 gold + 150 XP
 *   Day 5: 250 gold + 200 XP
 *   Day 6: 350 gold + 250 XP
 *   Day 7: 500 gold + 300 XP + milestone bonus item
 *
 * Milestones (every 7th day) also award a bonus_item flag for the client to
 * display a special reward UI.  Day 14, 21, 28 … award the same milestone bonus.
 *
 * All operations are server-authoritative; no client can manipulate the streak
 * or reward values.
 */

import { getPool } from "./client";

// ── Reward table ──────────────────────────────────────────────────────────────

interface DayReward {
  gold: number;
  xp: number;
  bonusItem: boolean;
}

/**
 * Returns the reward for a given streak day (1-based).
 * The cycle repeats every 7 days; every 7th day is a milestone.
 */
export function getRewardForStreakDay(streakDay: number): DayReward {
  const cycleDay = ((streakDay - 1) % 7) + 1; // 1..7
  const isMilestone = cycleDay === 7;

  const BASE_REWARDS: Record<number, { gold: number; xp: number }> = {
    1: { gold:  50, xp:   0 },
    2: { gold: 100, xp:  50 },
    3: { gold: 150, xp: 100 },
    4: { gold: 200, xp: 150 },
    5: { gold: 250, xp: 200 },
    6: { gold: 350, xp: 250 },
    7: { gold: 500, xp: 300 },
  };

  const base = BASE_REWARDS[cycleDay];
  return { gold: base.gold, xp: base.xp, bonusItem: isMilestone };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: string | null; // "YYYY-MM-DD" UTC, or null if never claimed
  canClaimToday: boolean;
  nextReward: DayReward; // reward that will be awarded on next claim
}

export interface ClaimResult {
  claimed: boolean;        // false if already claimed today
  streakDay: number;
  goldAwarded: number;
  xpAwarded: number;
  bonusItem: boolean;
  currentStreak: number;
  longestStreak: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in UTC. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns yesterday's date as "YYYY-MM-DD" in UTC. */
function utcYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attempt to claim the daily reward for a player.
 *
 * - Returns `claimed: false` if the player already claimed today.
 * - Otherwise computes the streak, applies gold/XP to player_state, inserts
 *   a claim record, and returns the reward details.
 *
 * All changes happen in a single transaction.
 */
export async function claimDailyReward(playerId: string): Promise<ClaimResult> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const today = utcToday();
    const yesterday = utcYesterday();

    // Upsert the streak row (creates it on first ever claim)
    // We lock the row for update to prevent concurrent double-claims
    await client.query(
      `INSERT INTO player_login_streaks (player_id) VALUES ($1)
       ON CONFLICT (player_id) DO NOTHING`,
      [playerId],
    );

    const streakResult = await client.query<{
      current_streak: number;
      longest_streak: number;
      last_claim_date: string | null;
    }>(
      `SELECT current_streak, longest_streak, last_claim_date
       FROM player_login_streaks
       WHERE player_id = $1
       FOR UPDATE`,
      [playerId],
    );

    const row = streakResult.rows[0];
    const lastClaimDate = row.last_claim_date; // "YYYY-MM-DD" from postgres date

    // Already claimed today — return early
    if (lastClaimDate === today) {
      await client.query("ROLLBACK");
      const nextStreakDay = ((row.current_streak - 1) % 7) + 2; // preview next day
      return {
        claimed: false,
        streakDay: row.current_streak,
        goldAwarded: 0,
        xpAwarded: 0,
        bonusItem: false,
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
      };
    }

    // Compute new streak
    let newStreak: number;
    if (lastClaimDate === yesterday) {
      // Consecutive day
      newStreak = row.current_streak + 1;
    } else {
      // First claim ever, or streak broken
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, row.longest_streak);
    const reward = getRewardForStreakDay(newStreak);

    // Update streak row
    await client.query(
      `UPDATE player_login_streaks
       SET current_streak  = $1,
           longest_streak  = $2,
           last_claim_date = $3,
           updated_at      = NOW()
       WHERE player_id = $4`,
      [newStreak, newLongest, today, playerId],
    );

    // Apply gold and XP to player state (server-authoritative)
    await client.query(
      `UPDATE player_state
       SET gold       = gold + $1,
           xp         = xp + $2,
           updated_at = NOW()
       WHERE player_id = $3`,
      [reward.gold, reward.xp, playerId],
    );

    // Audit log
    await client.query(
      `INSERT INTO daily_reward_claims
         (player_id, streak_day, gold_awarded, xp_awarded, bonus_item)
       VALUES ($1, $2, $3, $4, $5)`,
      [playerId, newStreak, reward.gold, reward.xp, reward.bonusItem],
    );

    await client.query("COMMIT");

    return {
      claimed: true,
      streakDay: newStreak,
      goldAwarded: reward.gold,
      xpAwarded: reward.xp,
      bonusItem: reward.bonusItem,
      currentStreak: newStreak,
      longestStreak: newLongest,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Returns the current streak status for a player without claiming.
 * Creates the streak row if it doesn't exist yet.
 */
export async function getStreakStatus(playerId: string): Promise<StreakStatus> {
  const pool = getPool();
  const today = utcToday();

  const result = await pool.query<{
    current_streak: number;
    longest_streak: number;
    last_claim_date: string | null;
  }>(
    `INSERT INTO player_login_streaks (player_id) VALUES ($1)
     ON CONFLICT (player_id) DO UPDATE SET player_id = EXCLUDED.player_id
     RETURNING current_streak, longest_streak, last_claim_date`,
    [playerId],
  );

  const row = result.rows[0];
  const lastClaimDate = row.last_claim_date;
  const canClaimToday = lastClaimDate !== today;

  // Preview next reward: if canClaim, it's based on whether streak continues
  const yesterday = utcYesterday();
  const previewStreak =
    lastClaimDate === yesterday ? row.current_streak + 1 : 1;

  return {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastClaimDate: lastClaimDate ?? null,
    canClaimToday,
    nextReward: getRewardForStreakDay(canClaimToday ? previewStreak : row.current_streak + 1),
  };
}

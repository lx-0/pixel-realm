/**
 * Seasonal event framework — server-side data access.
 *
 * Events are time-limited (starts_at / ends_at), each with:
 *   - A theme string used by the LLM quest generator
 *   - Reward tiers: [{points, itemId, title?}, ...]
 *   - Quest chain ids generated for the event
 *
 * Players earn points by completing quests during an active event.
 * Rewards are claimed once the required point threshold is met.
 */

import { getPool } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RewardTier {
  points:  number;
  itemId:  string;
  title?:  string; // optional cosmetic title
  label:   string; // display name
}

export interface SeasonalEvent {
  id:           string;
  name:         string;
  description:  string;
  theme:        string;
  startsAt:     string; // ISO timestamp
  endsAt:       string; // ISO timestamp
  isActive:     boolean;
  rewardTiers:  RewardTier[];
  questChainIds: string[];
}

export interface EventParticipation {
  playerId:       string;
  eventId:        string;
  points:         number;
  claimedRewards: string[]; // itemIds already claimed
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/** Return the currently active seasonal event, or null. */
export async function getActiveSeasonalEvent(): Promise<SeasonalEvent | null> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    name: string;
    description: string;
    theme: string;
    starts_at: Date;
    ends_at: Date;
    is_active: boolean;
    reward_tiers: RewardTier[];
    quest_chain_ids: string[];
  }>(
    `SELECT id, name, description, theme, starts_at, ends_at, is_active,
            reward_tiers, quest_chain_ids
       FROM seasonal_events
      WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
      LIMIT 1`,
  );
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return {
    id:           r.id,
    name:         r.name,
    description:  r.description,
    theme:        r.theme,
    startsAt:     r.starts_at.toISOString(),
    endsAt:       r.ends_at.toISOString(),
    isActive:     r.is_active,
    rewardTiers:  r.reward_tiers ?? [],
    questChainIds: r.quest_chain_ids ?? [],
  };
}

/** Return all upcoming and active events (for admin/display). */
export async function listSeasonalEvents(): Promise<SeasonalEvent[]> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    name: string;
    description: string;
    theme: string;
    starts_at: Date;
    ends_at: Date;
    is_active: boolean;
    reward_tiers: RewardTier[];
    quest_chain_ids: string[];
  }>(
    `SELECT id, name, description, theme, starts_at, ends_at, is_active,
            reward_tiers, quest_chain_ids
       FROM seasonal_events
      WHERE ends_at >= NOW()
      ORDER BY starts_at ASC`,
  );
  return res.rows.map(r => ({
    id:           r.id,
    name:         r.name,
    description:  r.description,
    theme:        r.theme,
    startsAt:     r.starts_at.toISOString(),
    endsAt:       r.ends_at.toISOString(),
    isActive:     r.is_active,
    rewardTiers:  r.reward_tiers ?? [],
    questChainIds: r.quest_chain_ids ?? [],
  }));
}

/**
 * Get or initialise a player's participation record for the given event.
 */
export async function getOrJoinEvent(
  playerId: string,
  eventId: string,
): Promise<EventParticipation> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO player_event_participation (player_id, event_id, points, claimed_rewards)
     VALUES ($1, $2, 0, '[]')
     ON CONFLICT (player_id, event_id) DO NOTHING`,
    [playerId, eventId],
  );
  const res = await pool.query<{
    player_id: string;
    event_id: string;
    points: number;
    claimed_rewards: string[];
  }>(
    `SELECT player_id, event_id, points, claimed_rewards
       FROM player_event_participation
      WHERE player_id = $1 AND event_id = $2`,
    [playerId, eventId],
  );
  const r = res.rows[0];
  return {
    playerId:       r.player_id,
    eventId:        r.event_id,
    points:         r.points,
    claimedRewards: r.claimed_rewards ?? [],
  };
}

/**
 * Award points to a player for the given event.
 * Returns the new total.
 */
export async function awardEventPoints(
  playerId: string,
  eventId: string,
  points: number,
): Promise<number> {
  const pool = getPool();
  const res = await pool.query<{ points: number }>(
    `INSERT INTO player_event_participation (player_id, event_id, points, claimed_rewards)
     VALUES ($1, $2, $3, '[]')
     ON CONFLICT (player_id, event_id)
     DO UPDATE SET points = player_event_participation.points + $3,
                   updated_at = NOW()
     RETURNING points`,
    [playerId, eventId, points],
  );
  return res.rows[0]?.points ?? 0;
}

/**
 * Claim a reward tier for the player.
 * Returns false if already claimed or insufficient points.
 */
export async function claimEventReward(
  playerId: string,
  eventId: string,
  itemId: string,
  requiredPoints: number,
): Promise<boolean> {
  const pool = getPool();

  // Fetch current participation
  const res = await pool.query<{ points: number; claimed_rewards: string[] }>(
    `SELECT points, claimed_rewards FROM player_event_participation
      WHERE player_id = $1 AND event_id = $2`,
    [playerId, eventId],
  );
  const row = res.rows[0];
  if (!row) return false;
  if (row.points < requiredPoints) return false;
  if ((row.claimed_rewards ?? []).includes(itemId)) return false;

  const updated = [...(row.claimed_rewards ?? []), itemId];
  await pool.query(
    `UPDATE player_event_participation
        SET claimed_rewards = $3, updated_at = NOW()
      WHERE player_id = $1 AND event_id = $2`,
    [playerId, eventId, JSON.stringify(updated)],
  );
  return true;
}

/**
 * Returns top 100 players by event points for the given event (leaderboard use).
 */
export async function getEventLeaderboard(
  eventId: string,
): Promise<Array<{ playerId: string; username: string; score: number }>> {
  const pool = getPool();
  const res = await pool.query<{ player_id: string; username: string; score: number }>(
    `SELECT ep.player_id, p.username, ep.points AS score
       FROM player_event_participation ep
       JOIN players p ON p.id = ep.player_id
      WHERE ep.event_id = $1
      ORDER BY ep.points DESC
      LIMIT 100`,
    [eventId],
  );
  return res.rows.map(r => ({
    playerId: r.player_id,
    username: r.username,
    score:    r.score,
  }));
}

/** Create a new seasonal event (used by admin/seed scripts). */
export async function createSeasonalEvent(opts: {
  name:        string;
  description: string;
  theme:       string;
  startsAt:    Date;
  endsAt:      Date;
  rewardTiers: RewardTier[];
  isActive?:   boolean;
}): Promise<string> {
  const pool = getPool();
  const res = await pool.query<{ id: string }>(
    `INSERT INTO seasonal_events (name, description, theme, starts_at, ends_at, is_active, reward_tiers)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      opts.name,
      opts.description,
      opts.theme,
      opts.startsAt,
      opts.endsAt,
      opts.isActive ?? false,
      JSON.stringify(opts.rewardTiers),
    ],
  );
  return res.rows[0].id;
}

/** Append quest chain ids to an event (called after LLM generation). */
export async function appendEventQuestChains(
  eventId: string,
  chainIds: string[],
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE seasonal_events
        SET quest_chain_ids = quest_chain_ids || $2::jsonb
      WHERE id = $1`,
    [eventId, JSON.stringify(chainIds)],
  );
}

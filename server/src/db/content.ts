/**
 * content.ts — DB layer for content-depth features:
 *   NPC conversation memory, seasons, world events, quest chains.
 */

import { getPool } from "./client";

// ── NPC Conversation Memory ───────────────────────────────────────────────────

const MAX_NPC_SUMMARIES = 3;

/**
 * Return the last N summaries for a player-NPC pair (used in LLM prompt).
 */
export async function getNpcMemory(
  playerId: string,
  npcId: string,
): Promise<string[]> {
  const pool = getPool();
  const res = await pool.query<{ summaries: string[] }>(
    "SELECT summaries FROM npc_interactions WHERE player_id = $1 AND npc_id = $2",
    [playerId, npcId],
  );
  return res.rows[0]?.summaries ?? [];
}

/**
 * Append a new summary to the player-NPC memory, keeping only the last 3.
 * Summary is a short string like "Player helped collect mushrooms for the merchant."
 */
export async function appendNpcMemory(
  playerId: string,
  npcId: string,
  zoneId: string,
  summary: string,
): Promise<void> {
  const pool = getPool();
  // Fetch existing, append, trim
  const existing = await getNpcMemory(playerId, npcId);
  const updated = [...existing, summary].slice(-MAX_NPC_SUMMARIES);
  await pool.query(
    `INSERT INTO npc_interactions (player_id, npc_id, zone_id, summaries, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (player_id, npc_id)
     DO UPDATE SET summaries = $4, zone_id = $3, updated_at = NOW()`,
    [playerId, npcId, zoneId, JSON.stringify(updated)],
  );
}

// ── Seasons ───────────────────────────────────────────────────────────────────

export interface ActiveSeason {
  id:                  string;
  name:                string;
  storyPromptTemplate: string;
}

/** Return the currently active season, or null if none. */
export async function getActiveSeason(): Promise<ActiveSeason | null> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    name: string;
    story_prompt_template: string;
  }>(
    "SELECT id, name, story_prompt_template FROM seasons WHERE is_active = TRUE LIMIT 1",
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return { id: row.id, name: row.name, storyPromptTemplate: row.story_prompt_template };
}

// ── World Events ──────────────────────────────────────────────────────────────

export interface WorldEventRecord {
  id:          string;
  zoneId:      string;
  name:        string;
  description: string;
  eventData:   Record<string, unknown>;
  startsAt:    string;
  endsAt:      string | null;
}

/** Return all active world events for a zone. */
export async function getActiveWorldEvents(zoneId: string): Promise<WorldEventRecord[]> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    zone_id: string;
    name: string;
    description: string;
    event_data: Record<string, unknown>;
    starts_at: Date;
    ends_at: Date | null;
  }>(
    `SELECT id, zone_id, name, description, event_data, starts_at, ends_at
       FROM world_events
      WHERE zone_id = $1 AND is_active = TRUE
        AND (ends_at IS NULL OR ends_at > NOW())`,
    [zoneId],
  );
  return res.rows.map((r) => ({
    id:          r.id,
    zoneId:      r.zone_id,
    name:        r.name,
    description: r.description,
    eventData:   r.event_data,
    startsAt:    r.starts_at.toISOString(),
    endsAt:      r.ends_at ? r.ends_at.toISOString() : null,
  }));
}

/** Create or update a world event. Returns the id. */
export async function upsertWorldEvent(
  zoneId: string,
  name: string,
  description: string,
  eventData: Record<string, unknown> = {},
  endsAt?: Date,
): Promise<string> {
  const pool = getPool();
  const res = await pool.query<{ id: string }>(
    `INSERT INTO world_events (zone_id, name, description, event_data, ends_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [zoneId, name, description, JSON.stringify(eventData), endsAt ?? null],
  );
  return res.rows[0].id;
}

/** Deactivate a world event by id. */
export async function deactivateWorldEvent(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    "UPDATE world_events SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
    [id],
  );
}

// ── Quest Chains ──────────────────────────────────────────────────────────────

export interface QuestChainRecord {
  id:               string;
  zoneId:           string;
  playerLevelBucket: number;
  title:            string;
  theme:            string;
  questIds:         string[];
  expiresAt:        string;
}

const CHAIN_CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 h

/** Return a cached active chain for this zone+bucket, or null. */
export async function getCachedChain(
  zoneId: string,
  bucket: number,
): Promise<QuestChainRecord | null> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    zone_id: string;
    player_level_bucket: number;
    title: string;
    theme: string;
    quest_ids: string[];
    expires_at: Date;
  }>(
    `SELECT id, zone_id, player_level_bucket, title, theme, quest_ids, expires_at
       FROM quest_chains
      WHERE zone_id = $1 AND player_level_bucket = $2 AND expires_at > NOW()
      ORDER BY generated_at DESC
      LIMIT 1`,
    [zoneId, bucket],
  );
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    zoneId: r.zone_id,
    playerLevelBucket: r.player_level_bucket,
    title: r.title,
    theme: r.theme,
    questIds: r.quest_ids,
    expiresAt: r.expires_at.toISOString(),
  };
}

/** Store a generated quest chain and return its id. */
export async function storeQuestChain(
  zoneId: string,
  bucket: number,
  title: string,
  theme: string,
  questIds: string[],
): Promise<string> {
  const pool = getPool();
  const expiresAt = new Date(Date.now() + CHAIN_CACHE_TTL_MS);
  const res = await pool.query<{ id: string }>(
    `INSERT INTO quest_chains (zone_id, player_level_bucket, title, theme, quest_ids, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [zoneId, bucket, title, theme, JSON.stringify(questIds), expiresAt],
  );
  return res.rows[0].id;
}

/** Get or create a player's chain progress. Returns current_step and status. */
export async function getOrStartChainProgress(
  playerId: string,
  chainId: string,
): Promise<{ currentStep: number; status: string }> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO player_chain_progress (player_id, chain_id, current_step, status)
     VALUES ($1, $2, 0, 'active')
     ON CONFLICT (player_id, chain_id) DO NOTHING`,
    [playerId, chainId],
  );
  const res = await pool.query<{ current_step: number; status: string }>(
    "SELECT current_step, status FROM player_chain_progress WHERE player_id = $1 AND chain_id = $2",
    [playerId, chainId],
  );
  const row = res.rows[0];
  return { currentStep: row?.current_step ?? 0, status: row?.status ?? "active" };
}

/** Advance player to the next step in a chain. */
export async function advanceChainStep(
  playerId: string,
  chainId: string,
  nextStep: number,
  complete: boolean,
): Promise<void> {
  const pool = getPool();
  const status = complete ? "completed" : "active";
  await pool.query(
    `UPDATE player_chain_progress
        SET current_step = $3, status = $4, updated_at = NOW()
      WHERE player_id = $1 AND chain_id = $2`,
    [playerId, chainId, nextStep, status],
  );
}

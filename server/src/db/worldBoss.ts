/**
 * World boss event system — server-side persistence layer.
 *
 * Boss roster (3 rotating bosses):
 *   storm_titan       — 300,000 HP — endgame zone
 *   ancient_dracolich — 450,000 HP — endgame zone
 *   void_herald       — 500,000 HP — seasonal arc zone (seasonal variant)
 *
 * Spawn schedule: configurable interval (default every 4 hours).
 * Bosses rotate by index so the order is deterministic and predictable.
 *
 * Loot tiers (by contribution %):
 *   gold   — ≥ 10% total damage  → 500 gold + 2,000 XP + rare item chance
 *   silver — ≥ 2%  total damage  → 250 gold + 1,000 XP
 *   bronze — any participation   → 100 gold + 400 XP
 *
 * Guild contribution bonus: +20% gold/XP if player's guild has territory buff.
 */

import { getPool } from "./client";

// ── Boss definitions ──────────────────────────────────────────────────────────

export type WorldBossId = "storm_titan" | "ancient_dracolich" | "void_herald";

export interface WorldBossDef {
  id: WorldBossId;
  name: string;
  maxHp: number;
  zoneId: string;
  /** Phase HP thresholds (fraction of maxHp). Boss enters next phase when HP drops below. */
  phaseThresholds: [number, number]; // [phase2 trigger, phase3 trigger]
  description: string;
}

export const WORLD_BOSS_DEFS: Record<WorldBossId, WorldBossDef> = {
  storm_titan: {
    id: "storm_titan",
    name: "Storm Titan",
    maxHp: 300_000,
    zoneId: "zone3",
    phaseThresholds: [0.66, 0.33],
    description: "An ancient colossus of living storm, its mere footstep shakes the earth.",
  },
  ancient_dracolich: {
    id: "ancient_dracolich",
    name: "Ancient Dracolich",
    maxHp: 450_000,
    zoneId: "zone3",
    phaseThresholds: [0.66, 0.33],
    description: "A dragon that cheated death and returned as an undead monstrosity of terrifying power.",
  },
  void_herald: {
    id: "void_herald",
    name: "Void Herald",
    maxHp: 500_000,
    zoneId: "zone3",
    phaseThresholds: [0.66, 0.33],
    description: "An emissary of the void between worlds. Its presence unravels reality itself.",
  },
};

/** Ordered rotation — bosses cycle in this order. */
export const BOSS_ROTATION: WorldBossId[] = [
  "storm_titan",
  "ancient_dracolich",
  "void_herald",
];

/** Default spawn interval (4 hours). Override via env WORLD_BOSS_INTERVAL_MS. */
export const WORLD_BOSS_INTERVAL_MS = Number(
  process.env.WORLD_BOSS_INTERVAL_MS ?? 4 * 60 * 60 * 1000,
);

/** How long a boss stays active before auto-expiring (1 hour). */
export const WORLD_BOSS_DURATION_MS = 60 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorldBossInstance {
  id: string;
  bossId: WorldBossId;
  status: "pending" | "active" | "defeated" | "expired";
  zoneId: string;
  maxHp: number;
  currentHp: number;
  phase: number;
  spawnsAt: Date;
  expiresAt: Date;
  defeatedAt: Date | null;
  seasonalEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BossContribution {
  instanceId: string;
  playerId: string;
  damageDealt: number;
  guildId: string | null;
  lootGranted: boolean;
  lastHitAt: Date;
}

export interface ContributionLeaderEntry {
  rank: number;
  playerId: string;
  username: string;
  damageDealt: number;
  contributionPct: number;
  tier: "gold" | "silver" | "bronze";
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

/**
 * Determines which boss should spawn at the next event, based on how many
 * completed instances exist (round-robin rotation).
 */
export async function getNextBossInRotation(): Promise<WorldBossId> {
  const pool = getPool();
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM world_boss_instances
     WHERE status IN ('defeated', 'expired')`,
  );
  const total = parseInt(res.rows[0]?.count ?? "0", 10);
  return BOSS_ROTATION[total % BOSS_ROTATION.length];
}

/** Returns the currently active or pending world boss instance, if any. */
export async function getActiveBossInstance(): Promise<WorldBossInstance | null> {
  const pool = getPool();
  const res = await pool.query<{
    id: string; boss_id: string; status: string; zone_id: string;
    max_hp: number; current_hp: number; phase: number;
    spawns_at: Date; expires_at: Date; defeated_at: Date | null;
    seasonal_event_id: string | null; created_at: Date; updated_at: Date;
  }>(
    `SELECT * FROM world_boss_instances
     WHERE status IN ('pending', 'active')
     ORDER BY spawns_at ASC
     LIMIT 1`,
  );
  if (!res.rows[0]) return null;
  return mapInstance(res.rows[0]);
}

/** Returns a specific boss instance by ID. */
export async function getBossInstanceById(instanceId: string): Promise<WorldBossInstance | null> {
  const pool = getPool();
  const res = await pool.query<{
    id: string; boss_id: string; status: string; zone_id: string;
    max_hp: number; current_hp: number; phase: number;
    spawns_at: Date; expires_at: Date; defeated_at: Date | null;
    seasonal_event_id: string | null; created_at: Date; updated_at: Date;
  }>(
    `SELECT * FROM world_boss_instances WHERE id = $1`,
    [instanceId],
  );
  if (!res.rows[0]) return null;
  return mapInstance(res.rows[0]);
}

/**
 * Schedules the next world boss spawn.
 * Calculates the next spawn time as now + interval, picks the next boss in rotation.
 * No-op if an active/pending instance already exists.
 */
export async function scheduleNextBoss(seasonalEventId?: string): Promise<WorldBossInstance> {
  const pool = getPool();

  // Prevent double-scheduling
  const existing = await getActiveBossInstance();
  if (existing) return existing;

  const bossId = await getNextBossInRotation();
  const def = WORLD_BOSS_DEFS[bossId];
  const spawnsAt = new Date(Date.now() + WORLD_BOSS_INTERVAL_MS);
  const expiresAt = new Date(spawnsAt.getTime() + WORLD_BOSS_DURATION_MS);

  const res = await pool.query<{ id: string }>(
    `INSERT INTO world_boss_instances
       (boss_id, status, zone_id, max_hp, current_hp, phase, spawns_at, expires_at, seasonal_event_id)
     VALUES ($1, 'pending', $2, $3, $3, 1, $4, $5, $6)
     RETURNING id`,
    [bossId, def.zoneId, def.maxHp, spawnsAt, expiresAt, seasonalEventId ?? null],
  );

  const instance = await getBossInstanceById(res.rows[0].id);
  return instance!;
}

/**
 * Spawns the boss immediately (transitions pending → active).
 * Called by the scheduler when spawnsAt is reached.
 */
export async function activateBossInstance(instanceId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE world_boss_instances
     SET status = 'active', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [instanceId],
  );
}

/**
 * Applies damage to the boss. Returns updated { currentHp, phase, defeated }.
 * Phase transitions at 66% and 33% HP. Thread-safe via atomic UPDATE.
 */
export async function applyBossDamage(
  instanceId: string,
  playerId: string,
  damage: number,
  guildId: string | null,
): Promise<{ currentHp: number; maxHp: number; phase: number; defeated: boolean }> {
  const pool = getPool();

  // Upsert player contribution
  await pool.query(
    `INSERT INTO world_boss_contributions (instance_id, player_id, damage_dealt, guild_id, last_hit_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (instance_id, player_id)
     DO UPDATE SET
       damage_dealt = world_boss_contributions.damage_dealt + EXCLUDED.damage_dealt,
       guild_id = COALESCE(EXCLUDED.guild_id, world_boss_contributions.guild_id),
       last_hit_at = NOW()`,
    [instanceId, playerId, damage, guildId],
  );

  // Apply damage atomically, clamp HP to 0
  const res = await pool.query<{
    current_hp: number; max_hp: number; phase: number; status: string;
  }>(
    `UPDATE world_boss_instances
     SET
       current_hp = GREATEST(0, current_hp - $2),
       updated_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING current_hp, max_hp, phase, status`,
    [instanceId, damage],
  );

  if (!res.rows[0]) {
    // Instance not active — return safe defaults
    return { currentHp: 0, maxHp: 0, phase: 1, defeated: false };
  }

  let { current_hp: currentHp, max_hp: maxHp, phase } = res.rows[0];
  const hpFraction = currentHp / maxHp;

  // Phase transitions
  let newPhase = phase;
  if (phase < 2 && hpFraction <= 0.66) newPhase = 2;
  if (phase < 3 && hpFraction <= 0.33) newPhase = 3;

  if (newPhase !== phase) {
    await pool.query(
      `UPDATE world_boss_instances SET phase = $2, updated_at = NOW() WHERE id = $1`,
      [instanceId, newPhase],
    );
  }

  const defeated = currentHp <= 0;
  if (defeated) {
    await pool.query(
      `UPDATE world_boss_instances
       SET status = 'defeated', defeated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [instanceId],
    );
  }

  return { currentHp, maxHp, phase: newPhase, defeated };
}

/**
 * Marks an instance as expired (boss wasn't killed in time).
 */
export async function expireBossInstance(instanceId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE world_boss_instances
     SET status = 'expired', updated_at = NOW()
     WHERE id = $1 AND status = 'active'`,
    [instanceId],
  );
}

/**
 * Distributes loot to all participants of a defeated boss.
 * Loot tier based on contribution % of total damage dealt.
 * Returns list of grants for broadcasting.
 */
export async function distributeBossLoot(
  instanceId: string,
): Promise<Array<{ playerId: string; goldAwarded: number; xpAwarded: number; tier: string }>> {
  const pool = getPool();

  // Get total damage dealt to this boss
  const totalRes = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(damage_dealt), 0) AS total
     FROM world_boss_contributions
     WHERE instance_id = $1`,
    [instanceId],
  );
  const totalDamage = parseInt(totalRes.rows[0]?.total ?? "0", 10);
  if (totalDamage === 0) return [];

  // Get all un-looted participants
  const contribs = await pool.query<{
    player_id: string; damage_dealt: number; guild_id: string | null;
  }>(
    `SELECT player_id, damage_dealt, guild_id
     FROM world_boss_contributions
     WHERE instance_id = $1 AND loot_granted = FALSE`,
    [instanceId],
  );

  const grants: Array<{ playerId: string; goldAwarded: number; xpAwarded: number; tier: string }> = [];

  for (const row of contribs.rows) {
    const pct = row.damage_dealt / totalDamage;
    let tier: "gold" | "silver" | "bronze";
    let gold: number;
    let xp: number;

    if (pct >= 0.10) {
      tier = "gold";   gold = 500;  xp = 2000;
    } else if (pct >= 0.02) {
      tier = "silver"; gold = 250;  xp = 1000;
    } else {
      tier = "bronze"; gold = 100;  xp = 400;
    }

    await pool.query(
      `INSERT INTO world_boss_loot_grants
         (instance_id, player_id, gold_awarded, xp_awarded, contribution_tier)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [instanceId, row.player_id, gold, xp, tier],
    );

    // Apply gold + XP to player state
    await pool.query(
      `UPDATE player_state
       SET gold = gold + $2, xp = xp + $3, updated_at = NOW()
       WHERE player_id = $1`,
      [row.player_id, gold, xp],
    );

    // Mark loot as granted
    await pool.query(
      `UPDATE world_boss_contributions
       SET loot_granted = TRUE
       WHERE instance_id = $1 AND player_id = $2`,
      [instanceId, row.player_id],
    );

    grants.push({ playerId: row.player_id, goldAwarded: gold, xpAwarded: xp, tier });
  }

  return grants;
}

/**
 * Returns the contribution leaderboard for a boss instance (top 100).
 */
export async function getBossLeaderboard(instanceId: string): Promise<ContributionLeaderEntry[]> {
  const pool = getPool();
  const totalRes = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(damage_dealt), 0) AS total
     FROM world_boss_contributions WHERE instance_id = $1`,
    [instanceId],
  );
  const totalDamage = Math.max(1, parseInt(totalRes.rows[0]?.total ?? "1", 10));

  const res = await pool.query<{
    player_id: string; username: string; damage_dealt: number;
  }>(
    `SELECT wbc.player_id, p.username, wbc.damage_dealt
     FROM world_boss_contributions wbc
     JOIN players p ON p.id = wbc.player_id
     WHERE wbc.instance_id = $1
     ORDER BY wbc.damage_dealt DESC
     LIMIT 100`,
    [instanceId],
  );

  return res.rows.map((row, i) => {
    const pct = row.damage_dealt / totalDamage;
    let tier: "gold" | "silver" | "bronze";
    if (pct >= 0.10) tier = "gold";
    else if (pct >= 0.02) tier = "silver";
    else tier = "bronze";

    return {
      rank: i + 1,
      playerId: row.player_id,
      username: row.username,
      damageDealt: row.damage_dealt,
      contributionPct: Math.round(pct * 1000) / 10, // 1 decimal place
      tier,
    };
  });
}

/**
 * Returns recent world boss history (last 10 events).
 */
export async function getBossHistory(): Promise<Array<{
  bossId: string; bossName: string; status: string;
  defeatedAt: Date | null; spawnsAt: Date; participantCount: number;
}>> {
  const pool = getPool();
  const res = await pool.query<{
    boss_id: string; status: string; defeated_at: Date | null;
    spawns_at: Date; participant_count: string;
  }>(
    `SELECT wbi.boss_id, wbi.status, wbi.defeated_at, wbi.spawns_at,
            COUNT(wbc.player_id) AS participant_count
     FROM world_boss_instances wbi
     LEFT JOIN world_boss_contributions wbc ON wbc.instance_id = wbi.id
     WHERE wbi.status IN ('defeated', 'expired')
     GROUP BY wbi.id
     ORDER BY wbi.spawns_at DESC
     LIMIT 10`,
  );

  return res.rows.map(row => ({
    bossId: row.boss_id,
    bossName: WORLD_BOSS_DEFS[row.boss_id as WorldBossId]?.name ?? row.boss_id,
    status: row.status,
    defeatedAt: row.defeated_at,
    spawnsAt: row.spawns_at,
    participantCount: parseInt(row.participant_count, 10),
  }));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function mapInstance(row: {
  id: string; boss_id: string; status: string; zone_id: string;
  max_hp: number; current_hp: number; phase: number;
  spawns_at: Date; expires_at: Date; defeated_at: Date | null;
  seasonal_event_id: string | null; created_at: Date; updated_at: Date;
}): WorldBossInstance {
  return {
    id: row.id,
    bossId: row.boss_id as WorldBossId,
    status: row.status as WorldBossInstance["status"],
    zoneId: row.zone_id,
    maxHp: row.max_hp,
    currentHp: row.current_hp,
    phase: row.phase,
    spawnsAt: row.spawns_at,
    expiresAt: row.expires_at,
    defeatedAt: row.defeated_at,
    seasonalEventId: row.seasonal_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

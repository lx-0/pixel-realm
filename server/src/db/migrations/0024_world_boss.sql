-- Migration 0024: World boss event system
-- Tracks world boss spawn schedules, damage contributions,
-- loot distribution, and per-event leaderboards.

-- ── World Boss Instances (one row per spawn event) ────────────────────────────

CREATE TABLE IF NOT EXISTS world_boss_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'storm_titan' | 'ancient_dracolich' | 'void_herald'
  boss_id         VARCHAR(50) NOT NULL,
  -- 'pending' | 'active' | 'defeated' | 'expired'
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- endgame zone where boss spawns
  zone_id         VARCHAR(50) NOT NULL DEFAULT 'zone3',
  -- HP pool (scaled per boss, 100k–500k)
  max_hp          INTEGER NOT NULL DEFAULT 500000,
  current_hp      INTEGER NOT NULL DEFAULT 500000,
  -- current boss phase (1, 2, or 3)
  phase           INTEGER NOT NULL DEFAULT 1,
  -- spawn schedule
  spawns_at       TIMESTAMPTZ NOT NULL,
  -- auto-expire if not defeated within 1 hour
  expires_at      TIMESTAMPTZ NOT NULL,
  defeated_at     TIMESTAMPTZ,
  -- optional: link to active seasonal event
  seasonal_event_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wbi_status_spawns
  ON world_boss_instances (status, spawns_at);

-- ── World Boss Contributions (damage per player per instance) ─────────────────

CREATE TABLE IF NOT EXISTS world_boss_contributions (
  instance_id   UUID NOT NULL REFERENCES world_boss_instances(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  damage_dealt  INTEGER NOT NULL DEFAULT 0,
  -- guild at time of contribution (null = no guild)
  guild_id      UUID REFERENCES guilds(id) ON DELETE SET NULL,
  -- loot has been distributed to this player
  loot_granted  BOOLEAN NOT NULL DEFAULT FALSE,
  last_hit_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (instance_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_wbc_instance_damage
  ON world_boss_contributions (instance_id, damage_dealt DESC);

-- ── World Boss Loot Grants (record of what each player received) ──────────────

CREATE TABLE IF NOT EXISTS world_boss_loot_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL REFERENCES world_boss_instances(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  gold_awarded  INTEGER NOT NULL DEFAULT 0,
  xp_awarded    INTEGER NOT NULL DEFAULT 0,
  -- JSON: array of { itemId, quantity } for bonus item drops
  bonus_items   JSONB NOT NULL DEFAULT '[]',
  -- 'bronze' | 'silver' | 'gold' — contribution tier
  contribution_tier VARCHAR(10) NOT NULL DEFAULT 'bronze',
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

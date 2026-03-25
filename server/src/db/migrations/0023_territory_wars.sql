-- Migration 0023: Guild territory wars
-- Adds contestable territory zones, guild war declarations,
-- capture point events, and per-war scoring.

-- ── Guild Territories (the 6 contestable world zones) ─────────────────────────

CREATE TABLE IF NOT EXISTS guild_territories (
  id              VARCHAR(50) PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  owner_guild_id  UUID REFERENCES guilds(id) ON DELETE SET NULL,
  captured_at     TIMESTAMPTZ,
  xp_bonus_pct    INTEGER NOT NULL DEFAULT 10,
  drop_bonus_pct  INTEGER NOT NULL DEFAULT 5,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 6 territory zones (idempotent)
INSERT INTO guild_territories (id, name, description, xp_bonus_pct, drop_bonus_pct)
VALUES
  ('ironhold',       'Ironhold Fortress',  'An ancient fortress carved into the mountainside. Controls the northern trade routes.',    15, 5),
  ('shadow_peaks',   'Shadow Peaks',       'Treacherous passes shrouded in perpetual mist. Deadly shortcuts for those who dare.',       10, 10),
  ('golden_nexus',   'Golden Nexus',       'A thriving marketplace hub where all major trade routes converge.',                         10, 5),
  ('crystal_caverns','Crystal Caverns',    'Shimmering underground caves rich with rare ore deposits and glowing crystals.',             5,  15),
  ('dragons_rest',   'Dragon''s Rest',     'Scorched ruins where an ancient dragon once slept. Power radiates from the charred earth.', 20, 5),
  ('storm_crossing', 'Storm Crossing',     'A vital bridge over the Thunderfall River, choked with lightning-charged air.',             10, 8)
ON CONFLICT (id) DO NOTHING;

-- ── Guild Wars (war declarations) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guild_wars (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id      VARCHAR(50) NOT NULL REFERENCES guild_territories(id),
  attacker_guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  -- null means territory was unowned when war was declared
  defender_guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
  -- 'pending' | 'active' | 'completed' | 'cancelled'
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  window_start      TIMESTAMPTZ NOT NULL,
  window_end        TIMESTAMPTZ NOT NULL,
  attacker_points   INTEGER NOT NULL DEFAULT 0,
  defender_points   INTEGER NOT NULL DEFAULT 0,
  -- null until resolved
  winner_guild_id   UUID REFERENCES guilds(id) ON DELETE SET NULL,
  declared_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guild_wars_territory_status
  ON guild_wars (territory_id, status);

CREATE INDEX IF NOT EXISTS idx_guild_wars_window
  ON guild_wars (window_start, window_end);

-- ── War Capture Points (player contributions per war) ─────────────────────────

CREATE TABLE IF NOT EXISTS war_capture_points (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id     UUID NOT NULL REFERENCES guild_wars(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  guild_id   UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  points     INTEGER NOT NULL DEFAULT 1,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_war_capture_points_war_guild
  ON war_capture_points (war_id, guild_id);

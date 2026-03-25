-- Migration 0022: PvP ranked arena system
-- Adds server-authoritative arena seasons, per-season ELO ratings,
-- match history, and end-of-season reward tracking.

-- ── Arena Seasons ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arena_seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number     INTEGER NOT NULL UNIQUE,
  name       VARCHAR(60) NOT NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Season 1 (active from game launch through the end of the current year)
INSERT INTO arena_seasons (number, name, starts_at, ends_at, is_active)
VALUES (1, 'Season 1: Dawn of the Gladiators', NOW(), '2026-06-30 23:59:59+00', TRUE)
ON CONFLICT (number) DO NOTHING;

-- ── PvP Ratings (server-authoritative per season) ─────────────────────────────

CREATE TABLE IF NOT EXISTS pvp_ratings (
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id    UUID NOT NULL REFERENCES arena_seasons(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL DEFAULT 1000,
  wins         INTEGER NOT NULL DEFAULT 0,
  losses       INTEGER NOT NULL DEFAULT 0,
  kills        INTEGER NOT NULL DEFAULT 0,
  deaths       INTEGER NOT NULL DEFAULT 0,
  peak_rating  INTEGER NOT NULL DEFAULT 1000,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_ratings_season_rating
  ON pvp_ratings (season_id, rating DESC);

-- ── Arena Matches (match history) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arena_matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id    UUID NOT NULL REFERENCES arena_seasons(id) ON DELETE CASCADE,
  mode         VARCHAR(10) NOT NULL DEFAULT '1v1',
  map          VARCHAR(40) NOT NULL DEFAULT 'gladiator_pit',
  participants JSONB NOT NULL DEFAULT '[]',
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_matches_season
  ON arena_matches (season_id, played_at DESC);

-- ── Arena Season Rewards ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arena_season_rewards (
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id             UUID NOT NULL REFERENCES arena_seasons(id) ON DELETE CASCADE,
  tier                  VARCHAR(20) NOT NULL,
  pvp_currency_awarded  INTEGER NOT NULL DEFAULT 0,
  claimed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, season_id)
);

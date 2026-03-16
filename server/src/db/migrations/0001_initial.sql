-- PixelRealm initial schema
-- Migration: 0001_initial

-- Players (identity/auth)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) NOT NULL UNIQUE,
  username_lower VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player state (persisted game progress)
CREATE TABLE IF NOT EXISTS player_state (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  mana INTEGER NOT NULL DEFAULT 50,
  max_mana INTEGER NOT NULL DEFAULT 50,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  current_zone VARCHAR(50) NOT NULL DEFAULT 'zone1',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Item definitions (static seed data)
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  rarity VARCHAR(20) NOT NULL DEFAULT 'common'
);

-- Player inventory
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  slot INTEGER,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quest/progression tracking
CREATE TABLE IF NOT EXISTS progression (
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  quest_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  progress JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (player_id, quest_id)
);

-- Dynamic zone state (placed objects, world events)
CREATE TABLE IF NOT EXISTS zone_state (
  zone_id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_inventory_player_id ON inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_progression_player_id ON progression(player_id);
CREATE INDEX IF NOT EXISTS idx_player_state_updated ON player_state(updated_at);

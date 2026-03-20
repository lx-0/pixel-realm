-- PixelRealm quest system
-- Migration: 0002_quests

-- LLM-generated quests cache
CREATE TABLE IF NOT EXISTS generated_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(50) NOT NULL,
  player_level_bucket INTEGER NOT NULL,  -- 1=(lvl1-3), 2=(lvl4-6), 3=(lvl7-9), 4=(lvl10)
  quest_type VARCHAR(30) NOT NULL,       -- 'kill' | 'fetch' | 'explore' | 'escort' | 'puzzle'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]',
  rewards JSONB NOT NULL DEFAULT '{}',
  dialogue JSONB NOT NULL DEFAULT '{}',
  completion_conditions JSONB NOT NULL DEFAULT '{}',
  cache_key VARCHAR(100) NOT NULL UNIQUE, -- '{zoneId}:lb{bucket}:{questType}'
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generated_quests_cache ON generated_quests(cache_key);
CREATE INDEX IF NOT EXISTS idx_generated_quests_zone_level ON generated_quests(zone_id, player_level_bucket);
CREATE INDEX IF NOT EXISTS idx_generated_quests_expires ON generated_quests(expires_at);

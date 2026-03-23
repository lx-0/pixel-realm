-- Migration 0008: Faction reputation system
-- Adds player_faction_reputation table and faction_id to generated_quests

CREATE TABLE IF NOT EXISTS player_faction_reputation (
  player_id    UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  faction_id   VARCHAR(50) NOT NULL,
  reputation   INTEGER     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, faction_id)
);

-- Add faction_id column to generated_quests (nullable for backwards compatibility)
ALTER TABLE generated_quests
  ADD COLUMN IF NOT EXISTS faction_id VARCHAR(50);

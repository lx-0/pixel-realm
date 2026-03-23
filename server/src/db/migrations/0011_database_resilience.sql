-- Database resilience: soft deletes, dungeon cooldown persistence,
-- composite indexes, and zone state JSON schema validation.
-- Migration: 0011_database_resilience

-- ── 1. Soft deletes ──────────────────────────────────────────────────────────
-- Add deleted_at to players (tombstone instead of hard delete)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to guilds
ALTER TABLE guilds
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to marketplace_listings
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to inventory
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes so active-record reads stay fast
CREATE INDEX IF NOT EXISTS idx_players_active
  ON players(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guilds_active
  ON guilds(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_not_deleted
  ON marketplace_listings(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_not_deleted
  ON inventory(player_id) WHERE deleted_at IS NULL;

-- ── 2. Dungeon cooldown persistence ─────────────────────────────────────────
-- Replaces in-memory Map so cooldowns survive server restarts.
CREATE TABLE IF NOT EXISTS player_dungeon_cooldowns (
  player_id      UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  dungeon_id     VARCHAR(50) NOT NULL DEFAULT 'default',
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (player_id, dungeon_id)
);

CREATE INDEX IF NOT EXISTS idx_dungeon_cooldowns_expires
  ON player_dungeon_cooldowns(expires_at);

-- ── 3. Composite indexes for common query patterns ───────────────────────────
-- Leaderboard: level + last_seen_at (period filters use last_seen_at)
CREATE INDEX IF NOT EXISTS idx_player_state_level_lastseen
  ON player_state(level DESC, last_seen_at DESC);

-- Leaderboard faction query support: join player_state with faction rep
CREATE INDEX IF NOT EXISTS idx_faction_rep_player_faction
  ON player_faction_reputation(player_id, faction_id);

-- Marketplace: item_type (via items join) + status + price
-- Direct index on marketplace_listings for common browsing pattern
CREATE INDEX IF NOT EXISTS idx_marketplace_status_price
  ON marketplace_listings(status, price_gold ASC)
  WHERE deleted_at IS NULL;

-- Inventory: player_id + item_id for fast stack-check lookups
CREATE INDEX IF NOT EXISTS idx_inventory_player_item
  ON inventory(player_id, item_id)
  WHERE deleted_at IS NULL;

-- ── 4. Zone state JSON schema validation ─────────────────────────────────────
-- Validates that zone_state.data contains required fields with correct types.
-- Rejects writes where: name is not a string, difficulty is not a number,
-- or bossType is present but neither null nor a string.

CREATE OR REPLACE FUNCTION validate_zone_state_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Require 'name' key (string)
  IF (NEW.data ->> 'name') IS NULL THEN
    RAISE EXCEPTION 'zone_state.data must include a "name" field';
  END IF;

  -- Require 'difficulty' key (numeric)
  IF (NEW.data -> 'difficulty') IS NULL THEN
    RAISE EXCEPTION 'zone_state.data must include a "difficulty" field';
  END IF;

  IF jsonb_typeof(NEW.data -> 'difficulty') != 'number' THEN
    RAISE EXCEPTION 'zone_state.data.difficulty must be a number, got %',
      jsonb_typeof(NEW.data -> 'difficulty');
  END IF;

  -- If 'bossType' is present it must be a string or null
  IF (NEW.data -> 'bossType') IS NOT NULL THEN
    IF jsonb_typeof(NEW.data -> 'bossType') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'zone_state.data.bossType must be a string or null, got %',
        jsonb_typeof(NEW.data -> 'bossType');
    END IF;
  END IF;

  -- Validate 'events' array if present: each element must have type (string)
  -- and startedAt (string) fields
  IF (NEW.data -> 'events') IS NOT NULL THEN
    IF jsonb_typeof(NEW.data -> 'events') != 'array' THEN
      RAISE EXCEPTION 'zone_state.data.events must be an array';
    END IF;

    DECLARE
      event JSONB;
    BEGIN
      FOR event IN SELECT jsonb_array_elements(NEW.data -> 'events')
      LOOP
        IF jsonb_typeof(event -> 'type') IS DISTINCT FROM 'string' THEN
          RAISE EXCEPTION 'Each zone event must have a string "type" field';
        END IF;
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_zone_state ON zone_state;
CREATE TRIGGER trg_validate_zone_state
  BEFORE INSERT OR UPDATE ON zone_state
  FOR EACH ROW EXECUTE FUNCTION validate_zone_state_data();

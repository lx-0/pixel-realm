-- Migration 0021: seasonal event rotation support
-- Adds a stable season_key column and unique constraint to support
-- calendar-based upserts from the rotation service.

ALTER TABLE seasonal_events
  ADD COLUMN IF NOT EXISTS season_key varchar(10) DEFAULT NULL;

-- Backfill season_key for any rows that already exist based on name pattern
UPDATE seasonal_events SET season_key = 'spring' WHERE name ILIKE '%spring%' AND season_key IS NULL;
UPDATE seasonal_events SET season_key = 'summer' WHERE name ILIKE '%summer%' AND season_key IS NULL;
UPDATE seasonal_events SET season_key = 'fall'   WHERE name ILIKE '%fall%'   AND season_key IS NULL;
UPDATE seasonal_events SET season_key = 'winter' WHERE name ILIKE '%winter%' AND season_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasonal_events_season_key
  ON seasonal_events (season_key)
  WHERE season_key IS NOT NULL;

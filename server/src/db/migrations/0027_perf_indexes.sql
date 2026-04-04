-- Migration 0027: performance indexes
-- Add indexes on frequently-filtered columns used by leaderboard and loot queries.

-- player_state.last_seen_at is used in leaderboard period filters (daily/weekly).
CREATE INDEX IF NOT EXISTS idx_player_state_last_seen_at
  ON player_state (last_seen_at);

-- inventory.player_id + item_id lookup used by addItem stacking check.
-- The FK already creates an index on player_id in some engines; this composite
-- index speeds up the "does this player already have this item?" check.
CREATE INDEX IF NOT EXISTS idx_inventory_player_item
  ON inventory (player_id, item_id)
  WHERE equipped = false;

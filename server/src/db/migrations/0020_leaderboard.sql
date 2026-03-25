-- Migration 0020: global leaderboards — pvp_wins column
-- Adds server-tracked PvP win count to player_state so it can be ranked globally.
-- Arena matches resolved client-side report wins via POST /arena/match-result.

ALTER TABLE player_state
  ADD COLUMN IF NOT EXISTS pvp_wins integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_player_state_pvp_wins
  ON player_state (pvp_wins DESC)
  WHERE pvp_wins > 0;

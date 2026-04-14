-- Migration 0028: wallet linking (M14a)
-- Adds wallet address and link timestamp to players table.
-- wallet_address is optional (null = not linked) and unique across all players.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) UNIQUE,
  ADD COLUMN IF NOT EXISTS wallet_linked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_players_wallet_address
  ON players (wallet_address)
  WHERE wallet_address IS NOT NULL;

-- Leaderboard: add pve_kills counter to player_state
ALTER TABLE player_state ADD COLUMN IF NOT EXISTS pve_kills INTEGER NOT NULL DEFAULT 0;

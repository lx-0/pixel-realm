-- Migration 0015: prestige system
-- Adds prestige_level and total_prestige_resets to player_state.
-- prestige_level: how many times the player has prestiged (0 = never).
-- total_prestige_resets: lifetime reset counter (equals prestige_level unless we ever
--   add a reset-prestige mechanic in future; kept separate for audit purposes).

ALTER TABLE "player_state"
  ADD COLUMN IF NOT EXISTS "prestige_level"        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_prestige_resets" integer NOT NULL DEFAULT 0;

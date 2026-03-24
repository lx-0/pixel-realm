-- Migration 0016: guild raid lockout system
-- Tracks per-player weekly raid boss clears.
-- week_start is the Monday ISO date of the lockout week.

CREATE TABLE IF NOT EXISTS "raid_lockouts" (
  "player_id"  text    NOT NULL,
  "boss_id"    text    NOT NULL,
  "week_start" date    NOT NULL,
  PRIMARY KEY ("player_id", "boss_id", "week_start")
);

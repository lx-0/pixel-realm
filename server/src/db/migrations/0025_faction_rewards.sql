-- Migration 0025: Faction rewards — daily tasks and titles
-- Adds faction_daily_completions and player_faction_titles tables.

CREATE TABLE IF NOT EXISTS faction_daily_completions (
  player_id      UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  faction_id     VARCHAR(50) NOT NULL,
  task_id        VARCHAR(100) NOT NULL,
  -- UTC date (YYYY-MM-DD) — resets daily
  completed_date VARCHAR(10)  NOT NULL,
  PRIMARY KEY (player_id, faction_id, completed_date)
);

CREATE TABLE IF NOT EXISTS player_faction_titles (
  player_id   UUID         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title_id    VARCHAR(100) NOT NULL,
  faction_id  VARCHAR(50)  NOT NULL,
  unlocked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, title_id)
);

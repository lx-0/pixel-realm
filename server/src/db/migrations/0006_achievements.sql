-- Achievement tracking — stores per-player progress and unlock state for all achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  player_id      UUID         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50)  NOT NULL,
  progress       INTEGER      NOT NULL DEFAULT 0,
  unlocked       BOOLEAN      NOT NULL DEFAULT FALSE,
  unlocked_at    TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, achievement_id)
);

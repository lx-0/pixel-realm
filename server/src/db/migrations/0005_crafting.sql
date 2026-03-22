-- Crafting progress — tracks which recipes each player has used and how many times
CREATE TABLE IF NOT EXISTS crafting_progress (
  player_id        UUID         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  recipe_id        VARCHAR(100) NOT NULL,
  craft_count      INTEGER      NOT NULL DEFAULT 1,
  first_crafted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_crafted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, recipe_id)
);

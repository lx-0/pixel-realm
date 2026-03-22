-- Skill tree allocations per player
CREATE TABLE IF NOT EXISTS skill_allocations (
  player_id       UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  class_id        VARCHAR(20) NOT NULL DEFAULT 'warrior',
  unlocked_skills JSONB       NOT NULL DEFAULT '{}',
  skill_points    INTEGER     NOT NULL DEFAULT 0,
  hotbar          JSONB       NOT NULL DEFAULT '[]',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

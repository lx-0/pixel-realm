-- Migration 0019: daily login rewards and streak system
-- player_login_streaks: one row per player, tracks streak state
-- daily_reward_claims: audit log of every reward claimed

CREATE TABLE IF NOT EXISTS "player_login_streaks" (
  "player_id"       uuid        PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  "current_streak"  integer     NOT NULL DEFAULT 0,
  "longest_streak"  integer     NOT NULL DEFAULT 0,
  "last_claim_date" date,                    -- UTC date of most recent claim
  "created_at"      timestamptz NOT NULL DEFAULT NOW(),
  "updated_at"      timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "daily_reward_claims" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"    uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  "streak_day"   integer     NOT NULL,       -- streak length at time of claim
  "gold_awarded" integer     NOT NULL DEFAULT 0,
  "xp_awarded"   integer     NOT NULL DEFAULT 0,
  "bonus_item"   boolean     NOT NULL DEFAULT FALSE, -- TRUE at milestone days
  "claimed_at"   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_reward_claims_player_id
  ON daily_reward_claims (player_id);
CREATE INDEX IF NOT EXISTS idx_daily_reward_claims_claimed_at
  ON daily_reward_claims (claimed_at);

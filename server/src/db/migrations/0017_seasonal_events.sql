-- Migration 0017: seasonal event framework
-- seasonal_events: time-limited events with reward tiers and LLM quest chains.
-- player_event_participation: per-player progress and claimed rewards.

CREATE TABLE IF NOT EXISTS "seasonal_events" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"              varchar(100)  NOT NULL,
  "description"       text          NOT NULL DEFAULT '',
  "theme"             text          NOT NULL DEFAULT '',
  "starts_at"         timestamptz   NOT NULL,
  "ends_at"           timestamptz   NOT NULL,
  "is_active"         boolean       NOT NULL DEFAULT FALSE,
  "reward_tiers"      jsonb         NOT NULL DEFAULT '[]',
  "quest_chain_ids"   jsonb         NOT NULL DEFAULT '[]',
  "created_at"        timestamptz   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "player_event_participation" (
  "player_id"       text        NOT NULL,
  "event_id"        uuid        NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
  "points"          integer     NOT NULL DEFAULT 0,
  "claimed_rewards" jsonb       NOT NULL DEFAULT '[]',
  "joined_at"       timestamptz NOT NULL DEFAULT NOW(),
  "updated_at"      timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("player_id", "event_id")
);

CREATE INDEX IF NOT EXISTS idx_player_event_participation_event_id
  ON player_event_participation (event_id);

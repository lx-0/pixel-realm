-- Migration 0018: player analytics and telemetry
-- player_sessions: one row per authenticated play session
-- zone_visits: one row per zone visit within a session

CREATE TABLE IF NOT EXISTS "player_sessions" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"        uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  "started_at"       timestamptz NOT NULL DEFAULT NOW(),
  "ended_at"         timestamptz,
  "duration_seconds" integer     -- populated on session end
);

CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id
  ON player_sessions (player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_started_at
  ON player_sessions (started_at);

CREATE TABLE IF NOT EXISTS "zone_visits" (
  "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"        uuid         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  "session_id"       uuid         NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  "zone_id"          varchar(50)  NOT NULL,
  "entered_at"       timestamptz  NOT NULL DEFAULT NOW(),
  "exited_at"        timestamptz,
  "duration_seconds" integer      -- populated on zone exit
);

CREATE INDEX IF NOT EXISTS idx_zone_visits_zone_id
  ON zone_visits (zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_visits_entered_at
  ON zone_visits (entered_at);
CREATE INDEX IF NOT EXISTS idx_zone_visits_session_id
  ON zone_visits (session_id);

-- Migration 0026: client-side error reporting
-- client_errors: stores unhandled JS errors reported by TelemetryClient.
-- player_id and session_id are stored as text (not FKs) since they are
-- anonymous UUIDs managed client-side and may not correspond to DB records.

CREATE TABLE IF NOT EXISTS "client_errors" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"  text        NOT NULL,
  "session_id" text,
  "message"    text        NOT NULL,
  "source"     text,
  "line"       integer,
  "col"        integer,
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_errors_player_id
  ON client_errors (player_id);
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at
  ON client_errors (created_at);

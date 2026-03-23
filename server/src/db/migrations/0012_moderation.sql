-- 0012_moderation.sql
-- Chat moderation: bans, mutes, chat log, player reports

-- Player bans
CREATE TABLE IF NOT EXISTS player_bans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL DEFAULT '',
  banned_by   UUID,
  banned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ   -- NULL = permanent ban
);
CREATE INDEX IF NOT EXISTS idx_player_bans_player_id ON player_bans(player_id);

-- Player mutes (persistent admin mutes; spam mutes are in-memory)
CREATE TABLE IF NOT EXISTS player_mutes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL DEFAULT '',
  muted_by    UUID,          -- NULL = auto-muted by spam filter
  muted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_mutes_player_id ON player_mutes(player_id);

-- Chat log (rolling recent history; trimmed server-side to 1000 rows)
CREATE TABLE IF NOT EXISTS chat_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name  VARCHAR(20) NOT NULL,
  zone_id      VARCHAR(50) NOT NULL,
  message      TEXT NOT NULL,
  filtered     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_log_sent_at ON chat_log(sent_at DESC);

-- Player reports
CREATE TABLE IF NOT EXISTS player_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL DEFAULT '',
  zone_id      VARCHAR(50) NOT NULL,
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_player_reports_reported_id ON player_reports(reported_id);

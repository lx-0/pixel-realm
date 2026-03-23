-- Migration 0013: friend list and block system

CREATE TABLE IF NOT EXISTS friendships (
  requester_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx    ON friendships(status);

CREATE TABLE IF NOT EXISTS player_blocks (
  blocker_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS player_blocks_blocked_idx ON player_blocks(blocked_id);

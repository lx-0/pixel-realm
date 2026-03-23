-- Migration 0009: Player housing system
-- Adds land_plots (town plot ownership) and player_housing (house state + layout) tables

CREATE TABLE IF NOT EXISTS land_plots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id      VARCHAR(50) NOT NULL,
  plot_index   INTEGER     NOT NULL,
  owner_id     UUID        REFERENCES players(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  price_gold   INTEGER     NOT NULL DEFAULT 500,
  UNIQUE(zone_id, plot_index)
);

CREATE TABLE IF NOT EXISTS player_housing (
  player_id        UUID        PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  plot_id          UUID        NOT NULL REFERENCES land_plots(id) ON DELETE CASCADE,
  house_tier       INTEGER     NOT NULL DEFAULT 1,
  furniture_layout JSONB       NOT NULL DEFAULT '[]',
  permission       VARCHAR(20) NOT NULL DEFAULT 'public',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plots for each zone (4 plots per zone)
INSERT INTO land_plots (zone_id, plot_index, price_gold) VALUES
  ('zone1', 0, 500), ('zone1', 1, 500), ('zone1', 2, 500), ('zone1', 3, 500),
  ('zone2', 0, 750), ('zone2', 1, 750), ('zone2', 2, 750), ('zone2', 3, 750),
  ('zone3', 0, 1000), ('zone3', 1, 1000), ('zone3', 2, 1000), ('zone3', 3, 1000),
  ('zone4', 0, 1500), ('zone4', 1, 1500), ('zone4', 2, 1500), ('zone4', 3, 1500),
  ('zone5', 0, 2000), ('zone5', 1, 2000), ('zone5', 2, 2000), ('zone5', 3, 2000)
ON CONFLICT DO NOTHING;

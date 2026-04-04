-- Migration 0021: Player Town zone plots
-- Seeds 20 land plots for zone_town in a 4×5 grid layout.
-- Plots 0-7 are standard tier (500g), 8-15 are premium (1000g), 16-19 are estate (2000g).

INSERT INTO land_plots (zone_id, plot_index, price_gold) VALUES
  ('zone_town',  0,  500), ('zone_town',  1,  500), ('zone_town',  2,  500), ('zone_town',  3,  500),
  ('zone_town',  4,  500), ('zone_town',  5,  500), ('zone_town',  6,  500), ('zone_town',  7,  500),
  ('zone_town',  8, 1000), ('zone_town',  9, 1000), ('zone_town', 10, 1000), ('zone_town', 11, 1000),
  ('zone_town', 12, 1000), ('zone_town', 13, 1000), ('zone_town', 14, 1000), ('zone_town', 15, 1000),
  ('zone_town', 16, 2000), ('zone_town', 17, 2000), ('zone_town', 18, 2000), ('zone_town', 19, 2000)
ON CONFLICT DO NOTHING;

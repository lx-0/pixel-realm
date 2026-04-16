-- Migration 0027: Parcel buildings (M14e / PIX-172)
-- Tracks exterior building placements on NFT land parcels.
-- Buildings are identified by ERC-721 tokenId (no chain write required).
-- One of each type per parcel enforced by UNIQUE(token_id, building_type).

CREATE TABLE IF NOT EXISTS parcel_buildings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id      VARCHAR(100) NOT NULL,
  zone_id       VARCHAR(50) NOT NULL,
  plot_index    INTEGER NOT NULL,
  building_type VARCHAR(20) NOT NULL CHECK (building_type IN ('house', 'shop', 'garden')),
  placed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token_id, building_type)
);

CREATE INDEX IF NOT EXISTS idx_parcel_buildings_token_id ON parcel_buildings(token_id);
CREATE INDEX IF NOT EXISTS idx_parcel_buildings_zone_id ON parcel_buildings(zone_id);

-- PixelRealm player trading & marketplace system
-- Migration: 0003_trading

-- Marketplace listings (auction house)
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_gold INTEGER NOT NULL,          -- total asking price (gold)
  listing_fee INTEGER NOT NULL DEFAULT 0, -- fee charged on listing (gold sink)
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'sold' | 'expired' | 'cancelled'
  buyer_id UUID REFERENCES players(id),
  listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,      -- listings expire after 24 h
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_marketplace_active ON marketplace_listings(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_item ON marketplace_listings(item_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_expires ON marketplace_listings(expires_at) WHERE status = 'active';

-- Trade history (P2P and marketplace — used for dispute resolution)
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_type VARCHAR(20) NOT NULL, -- 'p2p' | 'marketplace'
  initiator_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  counterpart_id UUID REFERENCES players(id) ON DELETE SET NULL,
  initiator_items JSONB NOT NULL DEFAULT '[]',  -- [{itemId, quantity}]
  initiator_gold INTEGER NOT NULL DEFAULT 0,
  counterpart_items JSONB NOT NULL DEFAULT '[]',
  counterpart_gold INTEGER NOT NULL DEFAULT 0,
  marketplace_listing_id UUID REFERENCES marketplace_listings(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_history_initiator ON trade_history(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_counterpart ON trade_history(counterpart_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_listing ON trade_history(marketplace_listing_id);

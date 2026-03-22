import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

// ── Players (auth/identity) ───────────────────────────────────────────────────

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 20 }).notNull().unique(),
  usernameLower: varchar("username_lower", { length: 20 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Player State (game progress per player) ───────────────────────────────────

export const playerState = pgTable("player_state", {
  playerId: uuid("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  hp: integer("hp").notNull().default(100),
  maxHp: integer("max_hp").notNull().default(100),
  mana: integer("mana").notNull().default(50),
  maxMana: integer("max_mana").notNull().default(50),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  gold: integer("gold").notNull().default(0),
  currentZone: varchar("current_zone", { length: 50 }).notNull().default("zone1"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Item Definitions (seed data) ──────────────────────────────────────────────

export const items = pgTable("items", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // 'weapon' | 'armor' | 'consumable' | 'material'
  stats: jsonb("stats").notNull().default({}),
  description: text("description").notNull().default(""),
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
});

// ── Inventory (player → items) ────────────────────────────────────────────────

export const inventory = pgTable("inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 50 })
    .notNull()
    .references(() => items.id),
  quantity: integer("quantity").notNull().default(1),
  slot: integer("slot"), // null = bag, 0-9 = hotbar slot
  equipped: boolean("equipped").notNull().default(false),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Progression (quest tracking) ──────────────────────────────────────────────

export const progression = pgTable(
  "progression",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    questId: varchar("quest_id", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'completed' | 'failed'
    progress: jsonb("progress").notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.questId] }),
  }),
);

// ── Zone State (dynamic world state) ─────────────────────────────────────────

export const zoneState = pgTable("zone_state", {
  zoneId: varchar("zone_id", { length: 50 }).primaryKey(),
  data: jsonb("data").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Generated Quests (LLM quest cache) ────────────────────────────────────────

export const generatedQuests = pgTable("generated_quests", {
  id: uuid("id").defaultRandom().primaryKey(),
  zoneId: varchar("zone_id", { length: 50 }).notNull(),
  playerLevelBucket: integer("player_level_bucket").notNull(),
  questType: varchar("quest_type", { length: 30 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  objectives: jsonb("objectives").notNull().default([]),
  rewards: jsonb("rewards").notNull().default({}),
  dialogue: jsonb("dialogue").notNull().default({}),
  completionConditions: jsonb("completion_conditions").notNull().default({}),
  cacheKey: varchar("cache_key", { length: 100 }).notNull().unique(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ── Marketplace Listings (auction house) ──────────────────────────────────────

export const marketplaceListings = pgTable("marketplace_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 50 })
    .notNull()
    .references(() => items.id),
  quantity: integer("quantity").notNull().default(1),
  priceGold: integer("price_gold").notNull(),
  listingFee: integer("listing_fee").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  buyerId: uuid("buyer_id").references(() => players.id),
  listedAt: timestamp("listed_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ── Trade History (P2P and marketplace) ───────────────────────────────────────

export const tradeHistory = pgTable("trade_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tradeType: varchar("trade_type", { length: 20 }).notNull(), // 'p2p' | 'marketplace'
  initiatorId: uuid("initiator_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  counterpartId: uuid("counterpart_id").references(() => players.id, { onDelete: "set null" }),
  initiatorItems: jsonb("initiator_items").notNull().default([]),
  initiatorGold: integer("initiator_gold").notNull().default(0),
  counterpartItems: jsonb("counterpart_items").notNull().default([]),
  counterpartGold: integer("counterpart_gold").notNull().default(0),
  marketplaceListingId: uuid("marketplace_listing_id").references(() => marketplaceListings.id),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type PlayerState = typeof playerState.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type ProgressionRow = typeof progression.$inferSelect;
export type ZoneStateRow = typeof zoneState.$inferSelect;
export type GeneratedQuestRow = typeof generatedQuests.$inferSelect;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type TradeHistoryRow = typeof tradeHistory.$inferSelect;

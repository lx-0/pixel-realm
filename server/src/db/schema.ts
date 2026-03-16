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

// ── Inferred types ────────────────────────────────────────────────────────────

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type PlayerState = typeof playerState.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type ProgressionRow = typeof progression.$inferSelect;
export type ZoneStateRow = typeof zoneState.$inferSelect;

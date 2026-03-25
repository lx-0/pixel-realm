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
  email: varchar("email", { length: 255 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
  pveKills: integer("pve_kills").notNull().default(0),
  prestigeLevel: integer("prestige_level").notNull().default(0),
  totalPrestigeResets: integer("total_prestige_resets").notNull().default(0),
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
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
  factionId: varchar("faction_id", { length: 50 }),
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
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
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

// ── Crafting Progress (recipes learned + craft counts per player) ─────────────

export const craftingProgress = pgTable(
  "crafting_progress",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    recipeId: varchar("recipe_id", { length: 100 }).notNull(),
    craftCount: integer("craft_count").notNull().default(1),
    firstCraftedAt: timestamp("first_crafted_at", { withTimezone: true }).notNull().defaultNow(),
    lastCraftedAt: timestamp("last_crafted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.recipeId] }),
  }),
);

// ── Skill Allocations (skill tree progress per player) ────────────────────────

export const skillAllocations = pgTable("skill_allocations", {
  playerId: uuid("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  classId: varchar("class_id", { length: 20 }).notNull().default("warrior"),
  /** JSON: Record<skillId, 1> — set of unlocked skill ids */
  unlockedSkills: jsonb("unlocked_skills").notNull().default({}),
  /** Unspent skill points available to allocate */
  skillPoints: integer("skill_points").notNull().default(0),
  /** Ordered list of up to 6 active skill ids on hotbar (JSON string array) */
  hotbar: jsonb("hotbar").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Guilds ────────────────────────────────────────────────────────────────────

export const guilds = pgTable("guilds", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 40 }).notNull().unique(),
  tag: varchar("tag", { length: 6 }).notNull().unique(), // e.g. "PFG"
  description: text("description").notNull().default(""),
  leaderId: uuid("leader_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const guildMemberships = pgTable(
  "guild_memberships",
  {
    guildId: uuid("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"), // 'leader' | 'officer' | 'member'
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.guildId, table.playerId] }),
  }),
);

// ── Player Achievements (achievement progress + unlock state per player) ───────

export const playerAchievements = pgTable(
  "player_achievements",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id", { length: 50 }).notNull(),
    progress: integer("progress").notNull().default(0),
    unlocked: boolean("unlocked").notNull().default(false),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.achievementId] }),
  }),
);

// ── Faction Reputation (standings per player per faction) ─────────────────────

export const playerFactionReputation = pgTable(
  "player_faction_reputation",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    factionId: varchar("faction_id", { length: 50 }).notNull(),
    /** -100 (hostile) to +100 (exalted), starts at 0 (neutral) */
    reputation: integer("reputation").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.factionId] }),
  }),
);

// ── Land Plots (town plot ownership) ─────────────────────────────────────────

export const landPlots = pgTable(
  "land_plots",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    zoneId:      varchar("zone_id", { length: 50 }).notNull(),
    plotIndex:   integer("plot_index").notNull(),
    ownerId:     uuid("owner_id").references(() => players.id, { onDelete: "set null" }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    priceGold:   integer("price_gold").notNull().default(500),
  },
);

// ── Player Housing (house state + furniture layout per player) ────────────────

export const playerHousing = pgTable("player_housing", {
  playerId:        uuid("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  plotId:          uuid("plot_id")
    .notNull()
    .references(() => landPlots.id, { onDelete: "cascade" }),
  houseTier:       integer("house_tier").notNull().default(1),
  /** JSON array of { furnitureId, x, y, rotation } objects */
  furnitureLayout: jsonb("furniture_layout").notNull().default([]),
  /** 'public' | 'friends' | 'locked' */
  permission:      varchar("permission", { length: 20 }).notNull().default("public"),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Dungeon Cooldowns (persisted per-player cooldown after dungeon completion) ─

export const playerDungeonCooldowns = pgTable(
  "player_dungeon_cooldowns",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    dungeonId: varchar("dungeon_id", { length: 50 }).notNull().default("default"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.dungeonId] }),
  }),
);

// ── Player Bans ───────────────────────────────────────────────────────────────

export const playerBans = pgTable("player_bans", {
  id:        uuid("id").defaultRandom().primaryKey(),
  playerId:  uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  reason:    text("reason").notNull().default(""),
  bannedBy:  uuid("banned_by"),
  bannedAt:  timestamp("banned_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = permanent
});

// ── Player Mutes ──────────────────────────────────────────────────────────────

export const playerMutes = pgTable("player_mutes", {
  id:        uuid("id").defaultRandom().primaryKey(),
  playerId:  uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  reason:    text("reason").notNull().default(""),
  mutedBy:   uuid("muted_by"), // null = auto-muted by spam filter
  mutedAt:   timestamp("muted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ── Chat Log (rolling recent history) ────────────────────────────────────────

export const chatLog = pgTable("chat_log", {
  id:         uuid("id").defaultRandom().primaryKey(),
  playerId:   uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  playerName: varchar("player_name", { length: 20 }).notNull(),
  zoneId:     varchar("zone_id", { length: 50 }).notNull(),
  message:    text("message").notNull(),
  filtered:   boolean("filtered").notNull().default(false),
  sentAt:     timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Player Reports ────────────────────────────────────────────────────────────

export const playerReports = pgTable("player_reports", {
  id:         uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  reportedId: uuid("reported_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  reason:     text("reason").notNull().default(""),
  zoneId:     varchar("zone_id", { length: 50 }).notNull(),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── NPC Interaction Memory ────────────────────────────────────────────────────

export const npcInteractions = pgTable(
  "npc_interactions",
  {
    playerId:  uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    npcId:     varchar("npc_id", { length: 50 }).notNull(),
    zoneId:    varchar("zone_id", { length: 50 }).notNull(),
    /** JSON string[]: up to 3 short summaries of prior interactions, most recent last. */
    summaries: jsonb("summaries").notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.npcId] }),
  }),
);

// ── Seasons ───────────────────────────────────────────────────────────────────

export const seasons = pgTable("seasons", {
  id:                  uuid("id").defaultRandom().primaryKey(),
  name:                varchar("name", { length: 60 }).notNull(),
  startDate:           varchar("start_date", { length: 10 }).notNull(),
  endDate:             varchar("end_date", { length: 10 }).notNull(),
  storyPromptTemplate: text("story_prompt_template").notNull().default(""),
  isActive:            boolean("is_active").notNull().default(false),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── World Events ──────────────────────────────────────────────────────────────

export const worldEvents = pgTable("world_events", {
  id:          uuid("id").defaultRandom().primaryKey(),
  zoneId:      varchar("zone_id", { length: 50 }).notNull(),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull().default(""),
  isActive:    boolean("is_active").notNull().default(true),
  eventData:   jsonb("event_data").notNull().default({}),
  startsAt:    timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt:      timestamp("ends_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Quest Chains ──────────────────────────────────────────────────────────────

export const questChains = pgTable("quest_chains", {
  id:                 uuid("id").defaultRandom().primaryKey(),
  zoneId:             varchar("zone_id", { length: 50 }).notNull(),
  playerLevelBucket:  integer("player_level_bucket").notNull(),
  title:              varchar("title", { length: 200 }).notNull(),
  theme:              text("theme").notNull().default(""),
  questIds:           jsonb("quest_ids").notNull().default([]),
  generatedAt:        timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt:          timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const playerChainProgress = pgTable(
  "player_chain_progress",
  {
    playerId:    uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    chainId:     uuid("chain_id").notNull().references(() => questChains.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    status:      varchar("status", { length: 20 }).notNull().default("active"),
    startedAt:   timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.chainId] }),
  }),
);

// ── Friendships ───────────────────────────────────────────────────────────────

export const friendships = pgTable(
  "friendships",
  {
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    /** 'pending' | 'accepted' */
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.requesterId, table.addresseeId] }),
  }),
);

// ── Player Blocks ─────────────────────────────────────────────────────────────

export const playerBlocks = pgTable(
  "player_blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.blockerId, table.blockedId] }),
  }),
);

// ── Analytics ─────────────────────────────────────────────────────────────────

export const playerSessions = pgTable("player_sessions", {
  id:              uuid("id").defaultRandom().primaryKey(),
  playerId:        uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  startedAt:       timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt:         timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});

export const zoneVisits = pgTable("zone_visits", {
  id:              uuid("id").defaultRandom().primaryKey(),
  playerId:        uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  sessionId:       uuid("session_id").notNull().references(() => playerSessions.id, { onDelete: "cascade" }),
  zoneId:          varchar("zone_id", { length: 50 }).notNull(),
  enteredAt:       timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
  exitedAt:        timestamp("exited_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
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
export type SkillAllocationsRow = typeof skillAllocations.$inferSelect;
export type CraftingProgressRow = typeof craftingProgress.$inferSelect;
export type Guild = typeof guilds.$inferSelect;
export type GuildMembership = typeof guildMemberships.$inferSelect;
export type PlayerAchievement = typeof playerAchievements.$inferSelect;
export type PlayerFactionReputation = typeof playerFactionReputation.$inferSelect;
export type LandPlot = typeof landPlots.$inferSelect;
export type PlayerHousing = typeof playerHousing.$inferSelect;
export type PlayerDungeonCooldown = typeof playerDungeonCooldowns.$inferSelect;
export type PlayerBan = typeof playerBans.$inferSelect;
export type PlayerMute = typeof playerMutes.$inferSelect;
export type ChatLogRow = typeof chatLog.$inferSelect;
export type PlayerReport = typeof playerReports.$inferSelect;
export type NpcInteraction = typeof npcInteractions.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type WorldEvent = typeof worldEvents.$inferSelect;
export type QuestChain = typeof questChains.$inferSelect;
export type PlayerChainProgress = typeof playerChainProgress.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type PlayerBlock = typeof playerBlocks.$inferSelect;
export type PlayerSession = typeof playerSessions.$inferSelect;
export type ZoneVisit = typeof zoneVisits.$inferSelect;

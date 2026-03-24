import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ZoneRoom } from "./rooms/ZoneRoom";
import { DungeonRoom, DUNGEON_COOLDOWN_MS } from "./rooms/DungeonRoom";
import { getDungeonCooldownRemainingDb } from "./db/cooldowns";
import { startAuthServer } from "./auth/fastify";
import { runMigrations } from "./db/migrate";
import { seed } from "./db/seed";
import { createVerifier } from "fast-jwt";
import type { AccessTokenPayload } from "./auth/fastify";
import { config } from "./config";
import { banPlayer, mutePlayer, getRecentChatLog } from "./db/moderation";
import { getInventory } from "./db/inventory";
import { RECIPES, craftItem, getCraftingProgress } from "./db/crafting";
import {
  getActiveListings,
  createListing,
  buyListing,
  cancelListing,
  getTradeHistory,
} from "./db/marketplace";
import {
  createGuild,
  getGuildById,
  getPlayerGuild,
  invitePlayer,
  kickPlayer,
  leaveGuild,
  promotePlayer,
  demotePlayer,
} from "./db/guilds";
import {
  ACHIEVEMENTS,
  getPlayerAchievements,
  getAchievementPoints,
  processAchievementEvent,
  type AchievementEventType,
} from "./db/achievements";
import {
  getLeaderboard,
  type LeaderboardCategory,
  type LeaderboardPeriod,
} from "./db/leaderboard";
import {
  getLandPlots,
  getPlayerHousing,
  getHousingByPlot,
  claimPlot,
  saveLayout,
  setPermission,
  upgradeHouse,
  type FurnitureItem,
  type HousingPermission,
} from "./db/housing";
import { config } from "./config";
import { getUptimeSeconds, recordHttpRequest, renderPrometheusMetrics } from "./metrics";

// ── DB bootstrap ──────────────────────────────────────────────────────────────

async function initDb(): Promise<void> {
  try {
    await runMigrations();
    await seed();
  } catch (err) {
    if (config.isProduction) {
      // Fatal in production — we never run without persistence
      console.error("[DB] Init failed in production:", (err as Error).message);
      process.exit(1);
    }
    // Non-fatal in dev: log and continue so the game runs without a DB
    console.warn("[DB] Init failed (running without persistence):", (err as Error).message);
  }
}

initDb();

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json());

// Request logging middleware — captures method, path, status, and duration
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    recordHttpRequest(durationMs, res.statusCode);
    if (config.isProduction) {
      // Structured JSON for log aggregators (e.g. Datadog, CloudWatch)
      process.stdout.write(
        JSON.stringify({
          level: "info",
          time: new Date().toISOString(),
          msg: "request",
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs,
        }) + "\n",
      );
    } else {
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`);
    }
  });
  next();
});

// Health check — returns server status, uptime, and live Colyseus room stats
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const rooms = await matchMaker.query({});
    const connectedPlayers = rooms.reduce((sum, r) => sum + (r.clients ?? 0), 0);
    res.json({
      status:           "ok",
      ts:               Date.now(),
      uptimeSeconds:    getUptimeSeconds(),
      activeRooms:      rooms.length,
      connectedPlayers,
    });
  } catch {
    // matchMaker not yet ready — still healthy, just no room stats
    res.json({ status: "ok", ts: Date.now(), uptimeSeconds: getUptimeSeconds(), activeRooms: 0, connectedPlayers: 0 });
  }
});

// Metrics — Prometheus text format for monitoring dashboards / Grafana scrape
app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    const rooms = await matchMaker.query({});
    const connectedPlayers = rooms.reduce((sum, r) => sum + (r.clients ?? 0), 0);
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(renderPrometheusMetrics({ activeRooms: rooms.length, connectedPlayers }));
  } catch {
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(renderPrometheusMetrics({ activeRooms: 0, connectedPlayers: 0 }));
  }
});

// GET /inventory/:userId — returns the player's inventory items
app.get("/inventory/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const items = await getInventory(userId);
    res.json(items);
  } catch (err) {
    console.warn("[REST] Failed to fetch inventory:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// GET /crafting/recipes — returns all available crafting recipes
app.get("/crafting/recipes", (_req, res) => {
  res.json(RECIPES);
});

// POST /crafting/craft — craft an item, consuming ingredients from inventory
app.post("/crafting/craft", async (req, res) => {
  const { userId, recipeId } = req.body as { userId?: string; recipeId?: string };
  if (!userId || !recipeId || userId.length > 100 || recipeId.length > 100) {
    res.status(400).json({ error: "Missing or invalid userId / recipeId" });
    return;
  }
  try {
    const result = await craftItem(userId, recipeId);
    if (!result.success && !result.craftFailed) {
      // Missing materials or unknown recipe — client error
      res.status(422).json({ error: result.message });
    } else {
      // Either success or high-tier failure (materials consumed) — both return 200
      // Track achievement progress after any craft attempt (even failures consume materials)
      getCraftingProgress(userId).then((progress) => {
        const totalCrafts = progress.reduce((s, p) => s + p.craftCount, 0);
        const distinctRecipes = progress.length;
        processAchievementEvent(userId, "item_crafted", { totalCrafts, distinctRecipes }).catch(() => {/* non-fatal */});
      }).catch(() => {/* non-fatal */});
      res.json(result);
    }
  } catch (err) {
    console.warn("[REST] Crafting failed:", (err as Error).message);
    res.status(500).json({ error: "Crafting failed" });
  }
});

// GET /crafting/progress/:userId — returns the player's crafting history
app.get("/crafting/progress/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const progress = await getCraftingProgress(userId);
    res.json(progress);
  } catch (err) {
    console.warn("[REST] Failed to fetch crafting progress:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch crafting progress" });
  }
});

// ── Marketplace REST endpoints ────────────────────────────────────────────────

// GET /marketplace/listings — browse active listings
app.get("/marketplace/listings", async (_req, res) => {
  try {
    const listings = await getActiveListings();
    res.json(listings);
  } catch (err) {
    console.warn("[REST] marketplace/listings failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// POST /marketplace/list — create a new listing
app.post("/marketplace/list", async (req, res) => {
  const { userId, inventoryId, quantity, priceGold } =
    req.body as { userId?: string; inventoryId?: string; quantity?: number; priceGold?: number };

  if (!userId || !inventoryId || !quantity || !priceGold
      || userId.length > 100 || inventoryId.length > 100
      || quantity < 1 || priceGold < 1 || priceGold > 1_000_000) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await createListing(userId, inventoryId, quantity, priceGold);
    if (!result.success) {
      res.status(422).json({ error: result.error });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.warn("[REST] marketplace/list failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// POST /marketplace/buy/:listingId — purchase a listing
app.post("/marketplace/buy/:listingId", async (req, res) => {
  const { listingId } = req.params as { listingId: string };
  const { userId } = req.body as { userId?: string };

  if (!userId || userId.length > 100 || !listingId || listingId.length > 100) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await buyListing(listingId, userId);
    if (!result.success) {
      res.status(422).json({ error: result.error });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    console.warn("[REST] marketplace/buy failed:", (err as Error).message);
    res.status(500).json({ error: "Purchase failed" });
  }
});

// DELETE /marketplace/listings/:listingId — cancel own listing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(app as any).delete("/marketplace/listings/:listingId", async (req: Request, res: Response) => {
  const { listingId } = req.params as { listingId: string };
  const { userId } = req.body as { userId?: string };

  if (!userId || userId.length > 100 || !listingId || listingId.length > 100) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await cancelListing(listingId, userId);
    if (!result.success) {
      res.status(422).json({ error: result.error });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    console.warn("[REST] marketplace/cancel failed:", (err as Error).message);
    res.status(500).json({ error: "Cancel failed" });
  }
});

// GET /trade/history/:userId — trade log for dispute resolution
app.get("/trade/history/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const history = await getTradeHistory(userId);
    res.json(history);
  } catch (err) {
    console.warn("[REST] trade/history failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch trade history" });
  }
});

// ── Guild REST endpoints ───────────────────────────────────────────────────────

// POST /guild/create — create a new guild
app.post("/guild/create", async (req, res) => {
  const { userId, name, tag, description = "" } =
    req.body as { userId?: string; name?: string; tag?: string; description?: string };
  if (!userId || !name || !tag || userId.length > 100 || name.length > 40 || tag.length > 6) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await createGuild(userId, name, tag, description);
    if (!result.success) res.status(422).json({ error: result.error });
    else {
      processAchievementEvent(userId, "guild_created").catch(() => {/* non-fatal */});
      res.json({ success: true, guildId: result.guildId });
    }
  } catch (err) {
    console.warn("[REST] guild/create failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to create guild" });
  }
});

// GET /guild/:guildId — fetch guild info + roster
app.get("/guild/:guildId", async (req, res) => {
  const { guildId } = req.params as { guildId: string };
  if (!guildId || guildId.length > 100) { res.status(400).json({ error: "Invalid guildId" }); return; }
  try {
    const guild = await getGuildById(guildId);
    if (!guild) res.status(404).json({ error: "Guild not found" });
    else res.json(guild);
  } catch (err) {
    console.warn("[REST] guild/:id failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch guild" });
  }
});

// GET /guild/player/:userId — get this player's guild (or null)
app.get("/guild/player/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) { res.status(400).json({ error: "Invalid userId" }); return; }
  try {
    const info = await getPlayerGuild(userId);
    res.json(info ?? null);
  } catch (err) {
    console.warn("[REST] guild/player/:id failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch guild info" });
  }
});

// POST /guild/invite — invite a player by username
app.post("/guild/invite", async (req, res) => {
  const { userId, targetUsername, guildId } =
    req.body as { userId?: string; targetUsername?: string; guildId?: string };
  if (!userId || !targetUsername || !guildId
      || userId.length > 100 || targetUsername.length > 32 || guildId.length > 100) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await invitePlayer(userId, targetUsername, guildId);
    if (!result.success) res.status(422).json({ error: result.error });
    else {
      // Count total invites this player has sent (approximate: just increment server-side)
      processAchievementEvent(userId, "player_invited", { totalInvited: 1 }).catch(() => {/* non-fatal */});
      res.json({ success: true });
    }
  } catch (err) {
    console.warn("[REST] guild/invite failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to invite player" });
  }
});

// POST /guild/kick — kick a member
app.post("/guild/kick", async (req, res) => {
  const { userId, targetPlayerId, guildId } =
    req.body as { userId?: string; targetPlayerId?: string; guildId?: string };
  if (!userId || !targetPlayerId || !guildId
      || userId.length > 100 || targetPlayerId.length > 100 || guildId.length > 100) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await kickPlayer(userId, targetPlayerId, guildId);
    if (!result.success) res.status(422).json({ error: result.error });
    else res.json({ success: true });
  } catch (err) {
    console.warn("[REST] guild/kick failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to kick player" });
  }
});

// POST /guild/leave — leave the guild
app.post("/guild/leave", async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId || userId.length > 100) { res.status(400).json({ error: "Invalid userId" }); return; }
  try {
    const result = await leaveGuild(userId);
    if (!result.success) res.status(422).json({ error: result.error });
    else res.json({ success: true });
  } catch (err) {
    console.warn("[REST] guild/leave failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to leave guild" });
  }
});

// POST /guild/promote — promote a member
app.post("/guild/promote", async (req, res) => {
  const { userId, targetPlayerId, guildId } =
    req.body as { userId?: string; targetPlayerId?: string; guildId?: string };
  if (!userId || !targetPlayerId || !guildId
      || userId.length > 100 || targetPlayerId.length > 100 || guildId.length > 100) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await promotePlayer(userId, targetPlayerId, guildId);
    if (!result.success) res.status(422).json({ error: result.error });
    else res.json({ success: true });
  } catch (err) {
    console.warn("[REST] guild/promote failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to promote player" });
  }
});

// POST /guild/demote — demote an officer
app.post("/guild/demote", async (req, res) => {
  const { userId, targetPlayerId, guildId } =
    req.body as { userId?: string; targetPlayerId?: string; guildId?: string };
  if (!userId || !targetPlayerId || !guildId
      || userId.length > 100 || targetPlayerId.length > 100 || guildId.length > 100) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  try {
    const result = await demotePlayer(userId, targetPlayerId, guildId);
    if (!result.success) res.status(422).json({ error: result.error });
    else res.json({ success: true });
  } catch (err) {
    console.warn("[REST] guild/demote failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to demote player" });
  }
});

// ── Achievement REST endpoints ─────────────────────────────────────────────────

// GET /achievements/definitions — static list of all achievement definitions
app.get("/achievements/definitions", (_req, res) => {
  res.json(ACHIEVEMENTS);
});

// GET /achievements/:userId — player's achievement progress + unlock state
app.get("/achievements/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const achievements = await getPlayerAchievements(userId);
    const points = achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.points, 0);
    res.json({ achievements, points });
  } catch (err) {
    console.warn("[REST] achievements/:userId failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// GET /achievements/:userId/points — just the total points
app.get("/achievements/:userId/points", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const points = await getAchievementPoints(userId);
    res.json({ points });
  } catch (err) {
    console.warn("[REST] achievements/points failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch points" });
  }
});

// POST /achievements/event — record a progress event and return newly unlocked achievements
app.post("/achievements/event", async (req, res) => {
  const { userId, type, data = {} } =
    req.body as { userId?: string; type?: string; data?: Record<string, unknown> };
  if (!userId || !type || userId.length > 100 || type.length > 50) {
    res.status(400).json({ error: "Missing or invalid userId / type" });
    return;
  }
  try {
    const result = await processAchievementEvent(userId, type as AchievementEventType, data);
    res.json(result);
  } catch (err) {
    console.warn("[REST] achievements/event failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to process achievement event" });
  }
});

// ── Dungeon REST endpoints ────────────────────────────────────────────────────

// GET /dungeon/cooldown/:userId — check per-player dungeon cooldown status
app.get("/dungeon/cooldown/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const remainingMs = await getDungeonCooldownRemainingDb(userId);
    res.json({
      onCooldown: remainingMs > 0,
      remainingMs,
      totalMs: DUNGEON_COOLDOWN_MS,
    });
  } catch (err) {
    console.error("[dungeon cooldown] DB error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ── Leaderboard REST endpoints ────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<LeaderboardCategory>(["xp", "kills", "quests", "achievements", "crafting", "prestige"]);
const VALID_PERIODS    = new Set<LeaderboardPeriod>(["all", "weekly", "daily"]);

// GET /leaderboard/:category?period=all|weekly|daily
// Returns top 100 entries for the given category + period.
app.get("/leaderboard/:category", async (req, res) => {
  const category = req.params.category as LeaderboardCategory;
  const period   = (req.query.period ?? "all") as LeaderboardPeriod;

  if (!VALID_CATEGORIES.has(category)) {
    res.status(400).json({ error: "Invalid category. Must be one of: xp, kills, quests, achievements, crafting, prestige" });
    return;
  }
  if (!VALID_PERIODS.has(period)) {
    res.status(400).json({ error: "Invalid period. Must be one of: all, weekly, daily" });
    return;
  }

  try {
    const entries = await getLeaderboard(category, period);
    res.json({ category, period, entries });
  } catch (err) {
    console.warn("[REST] leaderboard failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ── Housing REST endpoints ────────────────────────────────────────────────────

// GET /housing/plots/:zoneId — list all plots for a zone
app.get("/housing/plots/:zoneId", async (req, res) => {
  const { zoneId } = req.params as { zoneId: string };
  if (!zoneId || zoneId.length > 50) {
    res.status(400).json({ error: "Invalid zoneId" });
    return;
  }
  try {
    const plots = await getLandPlots(zoneId);
    res.json(plots);
  } catch (err) {
    console.warn("[REST] housing/plots failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch plots" });
  }
});

// GET /housing/:userId — get a player's housing state
app.get("/housing/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const housing = await getPlayerHousing(userId);
    if (!housing) {
      res.status(404).json({ error: "No house found" });
      return;
    }
    res.json(housing);
  } catch (err) {
    console.warn("[REST] housing/:userId failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch housing" });
  }
});

// GET /housing/visit/:plotId — get housing data for visiting another player's house
app.get("/housing/visit/:plotId", async (req, res) => {
  const { plotId } = req.params as { plotId: string };
  if (!plotId || plotId.length > 100) {
    res.status(400).json({ error: "Invalid plotId" });
    return;
  }
  try {
    const housing = await getHousingByPlot(plotId);
    if (!housing) {
      res.status(404).json({ error: "No house at this plot" });
      return;
    }
    res.json(housing);
  } catch (err) {
    console.warn("[REST] housing/visit failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch plot housing" });
  }
});

// POST /housing/claim — purchase a land plot
app.post("/housing/claim", async (req, res) => {
  const { userId, plotId } = req.body as { userId?: string; plotId?: string };
  if (!userId || !plotId || userId.length > 100 || plotId.length > 100) {
    res.status(400).json({ error: "Missing or invalid userId / plotId" });
    return;
  }
  try {
    const housing = await claimPlot(userId, plotId);
    res.json(housing);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Plot already owned" || msg === "Player already owns a plot" || msg === "Insufficient gold" || msg === "Plot not found") {
      res.status(409).json({ error: msg });
      return;
    }
    console.warn("[REST] housing/claim failed:", msg);
    res.status(500).json({ error: "Failed to claim plot" });
  }
});

// PATCH /housing/:userId/layout — save furniture layout
app.patch("/housing/:userId/layout", async (req, res) => {
  const { userId } = req.params as { userId: string };
  const { layout } = req.body as { layout?: FurnitureItem[] };
  if (!userId || userId.length > 100 || !Array.isArray(layout)) {
    res.status(400).json({ error: "Invalid userId or layout" });
    return;
  }
  try {
    await saveLayout(userId, layout);
    res.json({ ok: true });
  } catch (err) {
    console.warn("[REST] housing/layout failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to save layout" });
  }
});

// PATCH /housing/:userId/permission — update visit permission
app.patch("/housing/:userId/permission", async (req, res) => {
  const { userId } = req.params as { userId: string };
  const { permission } = req.body as { permission?: string };
  const valid: HousingPermission[] = ["public", "friends", "locked"];
  if (!userId || userId.length > 100 || !permission || !valid.includes(permission as HousingPermission)) {
    res.status(400).json({ error: "Invalid userId or permission" });
    return;
  }
  try {
    await setPermission(userId, permission as HousingPermission);
    res.json({ ok: true });
  } catch (err) {
    console.warn("[REST] housing/permission failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to update permission" });
  }
});

// POST /housing/:userId/upgrade — upgrade house tier
app.post("/housing/:userId/upgrade", async (req, res) => {
  const { userId } = req.params as { userId: string };
  if (!userId || userId.length > 100) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const tier = await upgradeHouse(userId);
    res.json({ houseTier: tier });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Insufficient gold" || msg === "Already at max tier" || msg === "Player has no house") {
      res.status(409).json({ error: msg });
      return;
    }
    console.warn("[REST] housing/upgrade failed:", msg);
    res.status(500).json({ error: "Failed to upgrade house" });
  }
});

// ── Admin endpoints ───────────────────────────────────────────────────────────

const verifyAdminJwt = createVerifier({ key: config.jwtSecret });

/** Middleware: verifies the Bearer JWT and requires role === "admin". */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }
  try {
    const payload = verifyAdminJwt(auth.slice(7)) as AccessTokenPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    (req as Request & { adminPayload: AccessTokenPayload }).adminPayload = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// POST /admin/kick/:playerId — disconnect player from current zone room(s)
app.post("/admin/kick/:playerId", adminAuth, async (req: Request, res: Response) => {
  const { playerId } = req.params as { playerId: string };
  if (!playerId || playerId.length > 100) {
    res.status(400).json({ error: "Invalid playerId" });
    return;
  }
  try {
    const rooms = await matchMaker.query({ name: "zone" });
    let kicked = false;
    for (const roomData of rooms) {
      const room = matchMaker.getRoomById(roomData.roomId);
      if (!room) continue;
      // Access the Colyseus room's clients and disconnect the matching player
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zoneRoom = room as any;
      if (!zoneRoom.clients) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const client of zoneRoom.clients as any[]) {
        const auth = client.auth as { userId?: string } | undefined;
        if (auth?.userId === playerId) {
          client.leave(4003); // 4003 = kicked by admin
          kicked = true;
        }
      }
    }
    res.json({ success: true, kicked });
  } catch (err) {
    console.warn("[Admin] kick failed:", (err as Error).message);
    res.status(500).json({ error: "Kick failed" });
  }
});

// POST /admin/ban/:playerId — add to ban list, prevent future login/join
app.post("/admin/ban/:playerId", adminAuth, async (req: Request, res: Response) => {
  const { playerId } = req.params as { playerId: string };
  const { reason = "", durationDays } = req.body as { reason?: string; durationDays?: number };
  if (!playerId || playerId.length > 100) {
    res.status(400).json({ error: "Invalid playerId" });
    return;
  }
  try {
    const adminId = ((req as Request & { adminPayload: AccessTokenPayload }).adminPayload).sub;
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86_400_000) : undefined;
    await banPlayer(playerId, reason, adminId, expiresAt);

    // Also kick them from active rooms
    const rooms = await matchMaker.query({ name: "zone" }).catch(() => []);
    for (const roomData of rooms) {
      const room = matchMaker.getRoomById(roomData.roomId);
      if (!room) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zoneRoom = room as any;
      if (!zoneRoom.clients) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const client of zoneRoom.clients as any[]) {
        const auth = client.auth as { userId?: string } | undefined;
        if (auth?.userId === playerId) client.leave(4004); // 4004 = banned
      }
    }

    res.json({ success: true, permanent: !expiresAt, expiresAt: expiresAt ?? null });
  } catch (err) {
    console.warn("[Admin] ban failed:", (err as Error).message);
    res.status(500).json({ error: "Ban failed" });
  }
});

// GET /admin/chat-log — recent chat history with player IDs
app.get("/admin/chat-log", adminAuth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  try {
    const rows = await getRecentChatLog(isNaN(limit) ? 100 : limit);
    res.json(rows);
  } catch (err) {
    console.warn("[Admin] chat-log failed:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch chat log" });
  }
});

// POST /admin/mute/:playerId — temporary chat mute (duration in minutes)
app.post("/admin/mute/:playerId", adminAuth, async (req: Request, res: Response) => {
  const { playerId } = req.params as { playerId: string };
  const { durationMinutes = 10, reason = "" } = req.body as { durationMinutes?: number; reason?: string };
  if (!playerId || playerId.length > 100) {
    res.status(400).json({ error: "Invalid playerId" });
    return;
  }
  const minutes = Math.max(1, Math.min(Number(durationMinutes), 10_080)); // 1 min – 7 days
  if (isNaN(minutes)) {
    res.status(400).json({ error: "Invalid durationMinutes" });
    return;
  }
  try {
    const adminId = ((req as Request & { adminPayload: AccessTokenPayload }).adminPayload).sub;
    await mutePlayer(playerId, reason, adminId, minutes);
    res.json({ success: true, durationMinutes: minutes });
  } catch (err) {
    console.warn("[Admin] mute failed:", (err as Error).message);
    res.status(500).json({ error: "Mute failed" });
  }
});

// ── HTTP + Colyseus server ────────────────────────────────────────────────────

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register the ZoneRoom with auto-create-per-zone matchmaking.
// Clients join via: client.joinOrCreate("zone", { zoneId: "zone1" })
// Colyseus will reuse an existing room for that zoneId or create a new one.
// Each unique zoneId becomes a separate room instance (lobby semantics).
// filterBy makes room matching use zoneId as a partition key so clients
// calling joinOrCreate("zone", { zoneId: "zone1" }) always land in the
// same room for that zone.
gameServer.define("zone", ZoneRoom).filterBy(["zoneId"]);

// Register the DungeonRoom. Each tier creates a fresh instance (not shared across tiers).
// Clients join via: client.joinOrCreate("dungeon", { tier: 1, token })
// Max 4 players per dungeon instance. Instances clean up when all players leave.
gameServer.define("dungeon", DungeonRoom).filterBy(["tier"]);

// ── Start ─────────────────────────────────────────────────────────────────────

gameServer.listen(config.port).then(() => {
  console.log(`[PixelRealm] Colyseus server listening on ws://0.0.0.0:${config.port}`);
  console.log(`[PixelRealm] HTTP health at http://0.0.0.0:${config.port}/health`);
}).catch((err) => {
  console.error("[PixelRealm] Failed to start server:", err);
  process.exit(1);
});

// ── Auth server (Fastify) ─────────────────────────────────────────────────────

startAuthServer().catch((err) => {
  console.error("[Auth] Failed to start auth server:", err);
  if (config.isProduction) {
    // Auth is required in production — exit if it fails to start
    process.exit(1);
  }
  // Non-fatal in dev: game server keeps running even if auth fails to start
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[PixelRealm] ${signal} received — starting graceful shutdown`);

  // Stop accepting new connections
  httpServer.close();

  try {
    // Drain all Colyseus rooms (saves state, disconnects clients cleanly)
    await gameServer.gracefullyShutdown(false);
    console.log("[PixelRealm] Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    console.error("[PixelRealm] Error during shutdown:", (err as Error).message);
    process.exit(1);
  }
}

process.on("SIGTERM", () => { shutdown("SIGTERM").catch(() => process.exit(1)); });
process.on("SIGINT",  () => { shutdown("SIGINT").catch(() => process.exit(1)); });

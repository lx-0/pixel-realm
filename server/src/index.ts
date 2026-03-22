import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ZoneRoom } from "./rooms/ZoneRoom";
import { startAuthServer } from "./auth/fastify";
import { runMigrations } from "./db/migrate";
import { seed } from "./db/seed";
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
import { config } from "./config";

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

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

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
    else res.json({ success: true, guildId: result.guildId });
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
    else res.json({ success: true });
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

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

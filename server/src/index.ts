import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ZoneRoom } from "./rooms/ZoneRoom";
import { startAuthServer } from "./auth/fastify";
import { runMigrations } from "./db/migrate";
import { seed } from "./db/seed";

const PORT = Number(process.env.PORT ?? 2567);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ── DB bootstrap ──────────────────────────────────────────────────────────────

async function initDb(): Promise<void> {
  try {
    await runMigrations();
    await seed();
  } catch (err) {
    // Non-fatal: log and continue so the game runs without a DB in dev
    console.warn("[DB] Init failed (running without persistence):", (err as Error).message);
  }
}

initDb();

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

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

gameServer.listen(PORT).then(() => {
  console.log(`[PixelRealm] Colyseus server listening on ws://localhost:${PORT}`);
  console.log(`[PixelRealm] HTTP health at http://localhost:${PORT}/health`);
}).catch((err) => {
  console.error("[PixelRealm] Failed to start server:", err);
  process.exit(1);
});

// ── Auth server (Fastify) ─────────────────────────────────────────────────────

startAuthServer().catch((err) => {
  console.error("[Auth] Failed to start auth server:", err);
  // Non-fatal: game server keeps running even if auth fails to start
});

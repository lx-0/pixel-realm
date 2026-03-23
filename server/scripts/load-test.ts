/**
 * PixelRealm — Colyseus WebSocket Load Test
 *
 * Simulates 50–100 concurrent player connections to the game server,
 * measures connection time, message throughput, and latency, and reports
 * any connection leaks or instability.
 *
 * Usage (server must be running — `npm run dev` in server/):
 *   npm run load-test
 *   npm run load-test -- --clients 100 --duration 30
 *
 * Options:
 *   --host      <string>  Server hostname         (default: localhost)
 *   --port      <number>  Colyseus port            (default: 2567)
 *   --clients   <number>  Concurrent connections   (default: 50)
 *   --duration  <number>  Test duration in seconds (default: 30)
 *   --ramp      <number>  Ramp-up duration in ms   (default: 5000)
 *   --verbose             Print per-client errors
 *
 * The load test:
 *   1. Mints a test JWT for each simulated player using the dev secret.
 *   2. Calls the Colyseus HTTP matchmaking API to create/join a zone room.
 *   3. Opens a WebSocket connection and sends periodic move messages encoded
 *      with msgpack (matching the Colyseus 0.15 binary wire format).
 *   4. Tracks connection success, latency (WS ping/pong), message throughput,
 *      and disconnections.
 *   5. Prints a final summary with percentile stats and bottleneck observations.
 *
 * NOTE: This test creates ephemeral player records in the database.
 * Records are prefixed "loadtest-" and can be deleted post-test with:
 *   DELETE FROM player_state WHERE user_id LIKE 'loadtest-%';
 *   DELETE FROM players WHERE id LIKE 'loadtest-%';
 */

import * as crypto from "node:crypto";
import * as process from "node:process";
import { sign } from "jsonwebtoken";
import { encode as msgpackEncode } from "@msgpack/msgpack";
import WebSocket from "ws";

// ── Colyseus protocol constants (mirrors @colyseus/core Protocol enum) ────────

const Protocol = {
  HANDSHAKE:        9,
  JOIN_ROOM:        10,
  ERROR:            0,
  LEAVE_ROOM:       11,
  ROOM_DATA:        12,
  ROOM_STATE:       13,
  ROOM_STATE_PATCH: 14,
  ROOM_DATA_SCHEMA: 15,
  ROOM_DATA_BYTES:  16,
} as const;

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  host:        "localhost",
  port:        2567,
  clients:     50,
  durationSec: 30,
  rampMs:      5000,
};

const JWT_SECRET    = process.env.JWT_SECRET ?? "pixelrealm-dev-secret-change-in-prod";
const ZONES         = ["zone1", "zone2", "zone3", "zone4", "zone5"];
const MOVE_INTERVAL = 200;  // ms — how often each client sends a move message
const PING_INTERVAL = 2000; // ms — WebSocket ping/pong for latency measurement

// ── CLI argument parsing ──────────────────────────────────────────────────────

interface Config {
  host:        string;
  port:        number;
  clients:     number;
  durationSec: number;
  rampMs:      number;
  verbose:     boolean;
}

function parseArgs(): Config {
  const argv = process.argv.slice(2);
  const flag = (name: string, def: string): string => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
  };
  return {
    host:        flag("--host",     DEFAULTS.host),
    port:        Number(flag("--port",     String(DEFAULTS.port))),
    clients:     Number(flag("--clients",  String(DEFAULTS.clients))),
    durationSec: Number(flag("--duration", String(DEFAULTS.durationSec))),
    rampMs:      Number(flag("--ramp",     String(DEFAULTS.rampMs))),
    verbose:     argv.includes("--verbose"),
  };
}

// ── JWT minting ───────────────────────────────────────────────────────────────

function mintToken(userId: string, username: string): string {
  return sign(
    {
      sub:      userId,
      username: username,
      jti:      crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
}

// ── Colyseus matchmaking ──────────────────────────────────────────────────────

interface MatchResult {
  sessionId: string;
  roomId:    string;
}

async function joinOrCreate(
  host:     string,
  port:     number,
  roomType: string,
  options:  Record<string, string>,
): Promise<MatchResult> {
  const resp = await fetch(`http://${host}:${port}/matchmake/joinOrCreate/${roomType}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(options),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Matchmake HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as Record<string, any>;

  // Colyseus 0.15 response shape: { sessionId, room: { roomId, processId, ... } }
  const sessionId: string = data.sessionId;
  const roomId:    string = data.room?.roomId;

  if (!sessionId || !roomId) {
    throw new Error(`Unexpected matchmake response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return { sessionId, roomId };
}

// ── Colyseus message encoding ─────────────────────────────────────────────────
// Colyseus 0.15 binary protocol: first byte = protocol code, rest = msgpack([type, payload])

function encodeRoomData(type: string, payload: unknown): Buffer {
  const encoded = msgpackEncode([type, payload]);
  const buf = Buffer.alloc(1 + encoded.byteLength);
  buf[0] = Protocol.ROOM_DATA;
  Buffer.from(encoded).copy(buf, 1);
  return buf;
}

// ── Per-client statistics ─────────────────────────────────────────────────────

interface ClientResult {
  clientId:        number;
  connected:       boolean;
  connectMs:       number;   // time from start to WS open
  matchmakeMs:     number;   // matchmaking HTTP round-trip
  messagesRx:      number;   // bytes-level messages received from server
  messagesTx:      number;   // move messages sent to server
  latencies:       number[]; // ping-pong round-trip times (ms)
  disconnectedEarly: boolean;
  errors:          string[];
}

// ── Single client simulation ──────────────────────────────────────────────────

async function runClient(
  clientId:    number,
  cfg:         Config,
  durationMs:  number,
): Promise<ClientResult> {
  const result: ClientResult = {
    clientId,
    connected:         false,
    connectMs:         0,
    matchmakeMs:       0,
    messagesRx:        0,
    messagesTx:        0,
    latencies:         [],
    disconnectedEarly: false,
    errors:            [],
  };

  const userId   = `loadtest-${clientId}-${crypto.randomUUID().slice(0, 8)}`;
  const username = `LTPlayer${clientId}`;
  const zoneId   = ZONES[clientId % ZONES.length];
  const token    = mintToken(userId, username);

  const t0 = Date.now();

  try {
    // ── Step 1: Colyseus matchmaking ────────────────────────────────────────
    const { sessionId, roomId } = await joinOrCreate(cfg.host, cfg.port, "zone", {
      zoneId,
      playerName: username,
      token,
    });
    result.matchmakeMs = Date.now() - t0;

    // ── Step 2: WebSocket connection ────────────────────────────────────────
    const wsUrl = `ws://${cfg.host}:${cfg.port}/${roomId}?sessionId=${sessionId}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let moveTimer: ReturnType<typeof setInterval> | null = null;
      let pingTimer: ReturnType<typeof setInterval> | null = null;
      let doneTimer: ReturnType<typeof setTimeout> | null = null;
      let finished  = false;
      let pingTs    = 0;

      const cleanup = (err?: Error) => {
        if (finished) return;
        finished = true;
        if (moveTimer) clearInterval(moveTimer);
        if (pingTimer) clearInterval(pingTimer);
        if (doneTimer) clearTimeout(doneTimer);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
        }
        if (err) reject(err); else resolve();
      };

      ws.on("open", () => {
        result.connected  = true;
        result.connectMs  = Date.now() - t0;

        // Periodic move messages
        moveTimer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const msg = encodeRoomData("move", {
            x:       100 + Math.random() * 120,
            y:       50  + Math.random() * 80,
            facingX: Math.random() > 0.5 ? 1 : -1,
            facingY: 0,
          });
          ws.send(msg, { binary: true });
          result.messagesTx++;
        }, MOVE_INTERVAL);

        // Latency via WebSocket ping/pong
        pingTimer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          pingTs = Date.now();
          ws.ping();
        }, PING_INTERVAL);

        // Auto-close after test duration
        doneTimer = setTimeout(() => cleanup(), durationMs);
      });

      ws.on("pong", () => {
        if (pingTs > 0) {
          result.latencies.push(Date.now() - pingTs);
          pingTs = 0;
        }
      });

      ws.on("message", () => {
        result.messagesRx++;
      });

      ws.on("error", (err: Error) => {
        result.errors.push(err.message);
        cleanup(err);
      });

      ws.on("close", (_code: number, reason: Buffer) => {
        if (!finished) {
          result.disconnectedEarly = true;
          const msg = reason?.toString() ?? "unknown";
          if (msg) result.errors.push(`Closed early: ${msg}`);
          cleanup();
        }
      });
    });

  } catch (err) {
    result.errors.push((err as Error).message);
  }

  return result;
}

// ── Statistics helpers ────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

async function main() {
  const cfg = parseArgs();

  console.log("━".repeat(60));
  console.log(" PixelRealm Colyseus Load Test");
  console.log("━".repeat(60));
  console.log(`  Target   : ws://${cfg.host}:${cfg.port}`);
  console.log(`  Clients  : ${cfg.clients}`);
  console.log(`  Duration : ${cfg.durationSec}s`);
  console.log(`  Ramp-up  : ${cfg.rampMs}ms`);
  console.log("━".repeat(60));

  // ── Health check ────────────────────────────────────────────────────────
  try {
    const hc = await fetch(`http://${cfg.host}:${cfg.port}/health`);
    if (!hc.ok) throw new Error(`HTTP ${hc.status}`);
    console.log("  Health   : OK ✓");
  } catch (err) {
    console.error(`\n  ERROR: Server not reachable at http://${cfg.host}:${cfg.port}/health`);
    console.error(`  Start the server first: cd server && npm run dev`);
    console.error(`  Detail: ${(err as Error).message}`);
    process.exit(1);
  }

  const memBefore = process.memoryUsage();
  const startTs   = Date.now();

  // ── Ramp up connections ──────────────────────────────────────────────────
  console.log(`\n  Ramping up ${cfg.clients} clients over ${cfg.rampMs}ms …\n`);

  const delayBetween = cfg.rampMs / cfg.clients;
  const durationMs   = cfg.durationSec * 1000;
  const promises: Promise<ClientResult>[] = [];

  for (let i = 0; i < cfg.clients; i++) {
    const delay = Math.floor(i * delayBetween);
    const p = new Promise<ClientResult>((res) => {
      setTimeout(async () => {
        // Remaining duration after ramp-up delay
        const remaining = Math.max(durationMs - delay, 5000);
        res(await runClient(i, cfg, remaining));
      }, delay);
    });
    promises.push(p);

    // Progress dots
    if ((i + 1) % 10 === 0 || i + 1 === cfg.clients) {
      process.stdout.write(`  Scheduled ${i + 1}/${cfg.clients} clients\r`);
    }
  }

  const results = await Promise.all(promises);
  const totalMs = Date.now() - startTs;
  const memAfter = process.memoryUsage();

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const connected    = results.filter(r => r.connected);
  const failed       = results.filter(r => !r.connected);
  const earlyDisc    = results.filter(r => r.disconnectedEarly);
  const allErrors    = results.flatMap(r => r.errors);

  const connectTimes = connected.map(r => r.connectMs).sort((a, b) => a - b);
  const matchTimes   = connected.map(r => r.matchmakeMs).sort((a, b) => a - b);
  const allLatencies = results.flatMap(r => r.latencies).sort((a, b) => a - b);

  const totalTx      = results.reduce((s, r) => s + r.messagesTx, 0);
  const totalRx      = results.reduce((s, r) => s + r.messagesRx, 0);
  const txPerSec     = totalTx / (totalMs / 1000);
  const rxPerSec     = totalRx / (totalMs / 1000);

  const memDeltaMB   = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

  // Error frequency map
  const errorMap = new Map<string, number>();
  for (const e of allErrors) {
    const key = e.slice(0, 80);
    errorMap.set(key, (errorMap.get(key) ?? 0) + 1);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log("\n\n" + "━".repeat(60));
  console.log(" LOAD TEST RESULTS");
  console.log("━".repeat(60));

  console.log("\n📊 Connection Summary");
  console.log(`   Total attempted    : ${cfg.clients}`);
  console.log(`   Connected OK       : ${connected.length} (${pct(connected.length, cfg.clients)})`);
  console.log(`   Failed to connect  : ${failed.length} (${pct(failed.length, cfg.clients)})`);
  console.log(`   Disconnected early : ${earlyDisc.length} (${pct(earlyDisc.length, cfg.clients)})`);

  console.log("\n⏱  Connection Time (ms)");
  console.log(`   Matchmake avg      : ${avg(matchTimes).toFixed(1)}`);
  console.log(`   Matchmake p95      : ${percentile(matchTimes, 95)}`);
  console.log(`   WS connect avg     : ${avg(connectTimes).toFixed(1)}`);
  console.log(`   WS connect p95     : ${percentile(connectTimes, 95)}`);
  console.log(`   WS connect p99     : ${percentile(connectTimes, 99)}`);

  if (allLatencies.length > 0) {
    console.log("\n🏓 Ping/Pong Latency (ms)  — WebSocket round-trip");
    console.log(`   Samples            : ${allLatencies.length}`);
    console.log(`   Average            : ${avg(allLatencies).toFixed(1)}`);
    console.log(`   Median (p50)       : ${percentile(allLatencies, 50)}`);
    console.log(`   p95                : ${percentile(allLatencies, 95)}`);
    console.log(`   p99                : ${percentile(allLatencies, 99)}`);
    console.log(`   Max                : ${Math.max(...allLatencies)}`);
  }

  console.log("\n📨 Message Throughput");
  console.log(`   Move msgs sent     : ${totalTx.toLocaleString()} (${txPerSec.toFixed(1)}/s)`);
  console.log(`   Server msgs recv   : ${totalRx.toLocaleString()} (${rxPerSec.toFixed(1)}/s)`);
  console.log(`   Msgs/client/s sent : ${(txPerSec / Math.max(connected.length, 1)).toFixed(2)}`);

  console.log("\n💾 Memory (load test process)");
  console.log(`   Heap before        : ${(memBefore.heapUsed / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Heap after         : ${(memAfter.heapUsed  / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Delta              : ${memDeltaMB >= 0 ? "+" : ""}${memDeltaMB.toFixed(1)} MB`);

  if (allErrors.length > 0) {
    console.log(`\n⚠️  Errors (${allErrors.length} total)`);
    for (const [msg, count] of [...errorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`   × ${count}x  ${msg}`);
    }
    if (cfg.verbose) {
      console.log("\n   Per-client errors:");
      for (const r of failed) {
        console.log(`   [client ${r.clientId}] ${r.errors.join(", ")}`);
      }
    }
  }

  console.log("\n📋 Capacity Assessment");
  const successRate = connected.length / cfg.clients;
  if (successRate >= 0.98) {
    console.log(`   ✅ Server handled all ${cfg.clients} concurrent connections cleanly.`);
  } else if (successRate >= 0.90) {
    console.log(`   ⚠️  Minor degradation: ${failed.length} failures at ${cfg.clients} clients.`);
    console.log("      Investigate server logs for rejection reasons.");
  } else {
    console.log(`   ❌ Significant failures at ${cfg.clients} clients — server may be at capacity.`);
    console.log("      Reduce --clients and re-run to find the stable ceiling.");
  }

  if (earlyDisc.length > 0) {
    console.log(`   ⚠️  ${earlyDisc.length} clients disconnected before test ended — possible timeout or eviction.`);
  }

  const avgLatMs = avg(allLatencies);
  if (avgLatMs > 100) {
    console.log(`   ⚠️  Average ping latency ${avgLatMs.toFixed(0)}ms is high — server loop may be under CPU pressure.`);
  } else if (avgLatMs > 0) {
    console.log(`   ✅ Latency looks healthy (avg ${avgLatMs.toFixed(0)}ms).`);
  }

  console.log("\n🗑  Cleanup");
  console.log("   Test player records were created in the DB (prefix: loadtest-).");
  console.log("   To remove them:");
  console.log("   DELETE FROM player_state WHERE user_id LIKE 'loadtest-%';");
  console.log("   DELETE FROM players WHERE id LIKE 'loadtest-%';");

  console.log("\n" + "━".repeat(60));
  console.log(` Total wall time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log("━".repeat(60) + "\n");

  process.exit(failed.length > cfg.clients * 0.1 ? 1 : 0);
}

function pct(n: number, total: number): string {
  return `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((err) => {
  console.error("Load test crashed:", err);
  process.exit(1);
});

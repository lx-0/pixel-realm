# PixelRealm — Server Load Test & Capacity Analysis

## Overview

This document describes the WebSocket load test tooling, methodology, expected results, and
recommendations for the PixelRealm Colyseus multiplayer server.

---

## Running the Load Test

The server must be running locally before executing the test.

```bash
# Terminal 1 — start the server
cd server
npm run dev

# Terminal 2 — run the load test (defaults: 50 clients, 30s)
cd server
npm run load-test

# Custom parameters
npm run load-test -- --clients 100 --duration 60 --verbose
```

### CLI Options

| Flag          | Default     | Description                              |
|---------------|-------------|------------------------------------------|
| `--host`      | `localhost` | Server hostname                          |
| `--port`      | `2567`      | Colyseus WebSocket port                  |
| `--clients`   | `50`        | Number of concurrent connections         |
| `--duration`  | `30`        | Test duration in seconds                 |
| `--ramp`      | `5000`      | Ramp-up period in ms (spread connections)|
| `--verbose`   | off         | Print per-client error details           |

---

## What the Test Measures

### 1. Connection Scalability
Each simulated client performs the full Colyseus join flow:
1. Mints a JWT using the dev secret (`pixelrealm-dev-secret-change-in-prod`)
2. POSTs to `/matchmake/joinOrCreate/zone` with `{ zoneId, playerName, token }`
3. Opens a WebSocket to the assigned room using the returned `roomId` + `sessionId`

Clients are distributed evenly across the five zones (`zone1`–`zone5`), so the test exercises
multi-room scaling — not just a single room hitting `maxClients = 16`.

### 2. Message Throughput
Each connected client sends a binary-encoded `move` message every 200 ms using the Colyseus
wire format (first byte = `Protocol.ROOM_DATA = 12`, remaining bytes = msgpack `[type, payload]`).
The test counts both outbound move messages and inbound server state patches.

### 3. Latency
WebSocket `ping` frames are sent every 2 s per client. The corresponding `pong` round-trip time
is recorded as a latency sample. p50 / p95 / p99 latencies are reported at the end.

### 4. Connection Stability
The test flags any client that disconnects before the test duration ends (possible server-side
eviction or crash), and counts matchmaking failures.

### 5. Memory Growth
Before/after heap snapshot of the load test *process* is logged. To check server-side memory,
watch `process.memoryUsage()` in the server terminal or wire up PIX-115's `/metrics` endpoint.

---

## Architecture Notes

### Room Distribution

With `maxClients = 16` per ZoneRoom and 5 zones, the theoretical maximum without instance
scaling is **80 concurrent players** (5 zones × 16 clients). At 100 clients some rooms will
hit the 16-client cap and Colyseus will create a second instance for that zone.

The load test distributes clients with `zoneId = ZONES[clientId % 5]` so the impact of room
overflow is observable.

### Database Load

Each client simulates a new player. The server calls `initPlayerState(userId)` on every join,
which issues an upsert. Under 100 concurrent joins this results in ~100 rapid DB writes. The
PostgreSQL connection pool has `max = 10` connections, so joins will queue. Watch for timeout
errors in the load test output — these indicate pool exhaustion.

### Redis Load

Auth token JWTs are stateless (no Redis session lookup in `verifyRoomToken`), so Redis pressure
comes only from leaderboard cache invalidation on XP gain, not from the join flow itself.

---

## Expected Results (Local Dev Environment)

Measured baseline for a local macOS/Linux dev machine (no DB/Redis under load):

| Metric                   | 50 Clients | 100 Clients | 200 Clients |
|--------------------------|-----------|-------------|-------------|
| Connection success rate  | ~100%     | ~95–100%    | ~85–95%     |
| Matchmake avg (ms)       | 30–80     | 80–200      | 200–500     |
| WS connect p95 (ms)      | 100–200   | 200–600     | 600–1500    |
| Ping/pong latency avg    | 2–8 ms    | 5–20 ms     | 15–50 ms    |
| Move msgs/s (total)      | ~250      | ~500        | ~1000       |
| Early disconnects        | 0         | 0–5         | 5–20        |

> **Note:** 200 clients exceeds the architectural limit of 80 simultaneous players
> (5 zones × 16 max clients/room). At this load Colyseus spawns second room instances
> per zone as rooms fill; the warm-up window for new instances causes the higher matchmake
> latency and elevated early-disconnect count. This is expected behaviour.

> **Note:** These are indicative figures. Actual numbers depend heavily on whether PostgreSQL
> and Redis are running locally and their respective loads.

---

## Known Bottlenecks & Fixes

### 1. DB Connection Pool Exhaustion ✅ Fixed

**Symptom:** Matchmake errors or slow joins when many clients connect simultaneously.

**Root cause:** `server/src/db/client.ts` previously set `max: 10` connections. With 100
simultaneous `initPlayerState` calls, queries queue. Each `onJoin` holds a pool connection
across multiple sequential DB calls.

**Applied fixes (PIX-437):**
- Pool size increased from `max: 10` → `max: 25` in `server/src/db/client.ts`.
- All best-effort per-player loads (guild, pets, factions, seasonal event, friends) are now
  issued concurrently via `Promise.allSettled` in `ZoneRoom.onJoin`, reducing pool hold time
  per join from ~5 sequential queries to a single parallel batch.

### 2. Room Cap at 16 Clients per Zone

**Symptom:** Matchmake failures (`"No rooms found"` or 400) when a zone is full.

**Root cause:** `ZoneRoom.maxClients = 16`. Colyseus will auto-create a new room instance for
the same zone (lobby semantics via `filterBy(["zoneId"])`), but the new instance needs to
warm up (run migrations, spawn initial enemies) before clients can join it.

**Impact:** A brief window where joins fail for a popular zone. Not a critical issue at launch
scale (16 per room × 5 zones = 80 players), but worth monitoring.

### 3. Persistent save on Disconnect ✅ Fixed

**Symptom:** Slow server shutdown or lag spikes when many clients disconnect simultaneously.

**Root cause:** `onLeave` calls `savePlayerState` and `saveSkillState` for each departing
client. Under mass disconnect (e.g., server restart) this fires N saves in parallel, stressing
the DB pool.

**Applied fix (PIX-437):** `closeDb()` is now called after `gameServer.gracefullyShutdown()`
in the SIGTERM/SIGINT handler (`server/src/index.ts`), ensuring the DB pool is held open
long enough for all in-flight saves to drain before the process exits.

---

## Max Concurrent Player Capacity

Based on the architecture:

| Layer               | Limit                        | Notes                                |
|---------------------|------------------------------|--------------------------------------|
| Room instance       | 16 clients                   | ZoneRoom.maxClients                  |
| Zone rooms          | 5 active zones               | zone1–zone5 (fixed)                  |
| DB pool (dev)       | ~10 concurrent joins         | Pool max = 10; joins queue           |
| Server memory       | ~200–400 MB for 100 clients  | Each room state ~1–2 MB              |
| Node.js event loop  | 100+ clients fine            | Async I/O, non-blocking 20Hz tick    |

**Recommended launch capacity: 50–80 concurrent players.**

For itch.io indie launch scale this is more than sufficient. Growth path to 200+ players would
require horizontal Colyseus processes + a load balancer (Colyseus supports this via the
`@colyseus/presence` Redis adapter).

---

## Cleanup After Testing

The load test creates ephemeral player records in PostgreSQL with the prefix `loadtest-`:

```sql
DELETE FROM player_state  WHERE user_id LIKE 'loadtest-%';
DELETE FROM players       WHERE id      LIKE 'loadtest-%';
```

Or if using the Drizzle CLI:
```bash
cd server && psql $DATABASE_URL -c "DELETE FROM player_state WHERE user_id LIKE 'loadtest-%';"
```

---

## Related Tickets

- [PIX-114](/PIX/issues/PIX-114) — this load test implementation
- [PIX-115](/PIX/issues/PIX-115) — server health endpoints and runtime metrics

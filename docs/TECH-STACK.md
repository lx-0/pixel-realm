# Tech Stack

## Chosen Stack

| Layer           | Technology              | Version  | Notes                                          |
|-----------------|-------------------------|----------|------------------------------------------------|
| Language        | TypeScript              | ~5.x     | Client and server; strict mode enabled         |
| Game Engine     | Phaser 3                | ~3.80    | 2D browser MMORPG; WebGL + Canvas fallback     |
| Build Tool      | Vite                    | ~5.x     | Dev server, HMR, TS transpilation, bundling    |
| Game Server     | Colyseus                | ~0.15    | Authoritative multiplayer room/state sync      |
| API Server      | Fastify                 | ~4.x     | REST API for auth, inventory, economy, quests  |
| Runtime         | Node.js                 | 20 LTS   | Server-side JS/TS runtime                      |
| Database        | PostgreSQL              | 16       | Persistent data: players, items, guilds, world |
| Cache / PubSub  | Redis                   | 7.x      | Session state, real-time pub/sub, leaderboards |
| LLM Integration | Anthropic Claude API    | latest   | Server-side quest/NPC/event generation         |
| NFT / Chain     | EVM L2 (Polygon/Base)   | TBD      | Deferred — ERC-721/1155 item minting           |
| Hosting (FE)    | Cloudflare Pages        | —        | Static + CDN, global low-latency               |
| Hosting (Game)  | Fly.io                  | —        | WebSocket-capable Node containers              |
| Database Host   | Supabase                | —        | Managed PostgreSQL + auth                      |
| Cache Host      | Upstash                 | —        | Serverless Redis (per-request pricing)         |
| CI/CD           | GitHub Actions          | —        | Build, test, deploy pipeline                   |

---

## Rationale

### Phaser 3 — Game Engine

PixelRealm is a 2D tile-based pixel MMORPG rendered in the browser. Phaser 3 is the natural fit:

- Built-in scene management, Arcade physics, tilemap loader (Tiled JSON), spritesheet animations, audio, and input handling eliminate the need to build these game primitives from scratch.
- WebGL rendering with Canvas fallback matches the pixel-art art direction (320×180 internal canvas scaled up).
- Tilemap support via `this.make.tilemap` is directly required by the 16×16 tile world.
- Physics groups, collision detection, and camera following are all first-class features.
- Large community, active maintenance, and extensive documentation accelerate the MVP.

### TypeScript

Type safety is critical for a complex MMORPG system (combat formulas, inventory state, network messages, quest data). Strict TypeScript reduces bugs at the boundary between client, game server, and API server — especially for shared types across packages.

### Vite

Vite provides near-instant hot module replacement during development and produces optimized ES module bundles for production. Native TypeScript support without a separate tsc build step. The dev server proxies game server WebSocket connections easily during local development.

### Colyseus — Multiplayer Game Server

Colyseus is purpose-built for browser multiplayer games:

- Authoritative server with `@colyseus/schema` for efficient binary state delta sync — important at MMORPG player counts.
- Room lifecycle (create, join, leave, matchmaking) maps naturally to zone instances.
- TypeScript-native and pairs directly with Phaser clients.
- Handles reconnection, room persistence, and broadcast primitives needed for PixelRealm's zone architecture.

### Fastify — REST API

Used alongside Colyseus for non-real-time operations: player auth, inventory management, marketplace, NFT minting, and LLM quest retrieval. Fastify is lightweight, TypeScript-friendly, and handles JSON schema validation natively.

### PostgreSQL

All persistent game state (character data, item ownership, quest progress, guilds, land ownership, economy transactions) lives in PostgreSQL. Relational integrity is essential for an economy with NFT ownership chains and guild treasuries.

### Redis

Handles ephemeral but fast-access data: active session tokens, leaderboard sorted sets, pub/sub for cross-zone events (world invasions, dynamic world events), and caching LLM-generated content to control API costs.

### Anthropic Claude API — LLM Integration

Server-side only; the API key never reaches the client. Claude generates:

- Daily quest board content personalized per player faction/rep/history.
- Dynamic NPC dialogue adapted to player standing.
- World event narratives (invasions, seasonal arcs).

Caching in Redis prevents redundant API calls. Budget controls enforce a per-player/per-day generation cap.

### NFT / Blockchain — Deferred

Direction: EVM-compatible L2 (Polygon or Base) for negligible transaction fees. Items and land parcels use ERC-721 (unique) or ERC-1155 (stackable). Client uses ethers.js for wallet connection. Detailed design deferred to a post-MVP milestone; core game runs without it.

### Hosting

- **Cloudflare Pages** for the static Phaser client bundle — global CDN, free tier, instant cache invalidation on deploy.
- **Fly.io** for Colyseus game server containers — WebSocket persistence, multi-region, per-second billing, horizontal scaling via Fly Machines.
- **Supabase** for managed PostgreSQL with built-in Row Level Security (useful for NFT ownership queries) and a free tier suitable for early development.
- **Upstash** for serverless Redis — no idle cost, HTTP-over-Redis API for edge compatibility.

---

## Trade-offs

### Phaser 3 vs PixiJS

PixiJS is a faster raw renderer, but it is a rendering engine only — not a game framework. For PixelRealm, PixiJS would require building scene management, arcade physics, tilemap loading, audio, and input systems from scratch. At MMORPG complexity and MVP timeline, Phaser 3's complete toolbox wins over PixiJS's rendering speed. PixiJS would be reconsidered only if benchmark profiling showed Phaser's renderer was a bottleneck (unlikely at 320×180 internal resolution).

### Phaser 3 vs Three.js

Three.js is a 3D engine. PixelRealm is 2D pixel art. No trade-off to make — Three.js is the wrong tool.

### Colyseus vs raw Socket.io

Socket.io would require building room state management, delta serialization, and matchmaking logic manually. Colyseus provides all of this with TypeScript-native schema types. The only downside is framework lock-in; accepted because the Colyseus API is stable and the alternative (custom infra) carries higher implementation risk.

### PostgreSQL vs MongoDB

MongoDB was considered for flexible game item schemas (items have heterogeneous stat blocks). Rejected in favor of PostgreSQL + JSONB columns for semi-structured item data. Relational integrity for ownership, trading, and auction history is too important to trade for document flexibility.

### Claude API vs open-source LLM

Self-hosted open-source models (Llama 3, Mistral) would eliminate per-token costs but require GPU infrastructure budget, model ops, and latency tuning. For MVP, Claude API is the right call — low ops overhead, high output quality for narrative tasks, easy to swap later if cost becomes an issue.

---

## Key Dependencies

| Package                  | Purpose                                          | License    |
|--------------------------|--------------------------------------------------|------------|
| `phaser`                 | 2D game engine (rendering, physics, input, maps) | MIT        |
| `@colyseus/core`         | Authoritative multiplayer game server            | MIT        |
| `@colyseus/schema`       | Binary delta state serialization                 | MIT        |
| `@colyseus/monitor`      | Dev dashboard for rooms/connections              | MIT        |
| `fastify`                | REST API server                                  | MIT        |
| `@fastify/websocket`     | WebSocket upgrade for Fastify routes             | MIT        |
| `vite`                   | Build tool and dev server                        | MIT        |
| `typescript`             | Type-safe JS for client + server                 | Apache-2.0 |
| `@anthropic-ai/sdk`      | Claude API client for LLM content generation     | MIT        |
| `pg` / `postgres`        | PostgreSQL client for Node.js                    | MIT        |
| `ioredis`                | Redis client for Node.js                         | MIT        |
| `ethers`                 | Ethereum/EVM wallet + contract interaction       | MIT        |
| `zod`                    | Runtime schema validation (API payloads)         | MIT        |
| `vitest`                 | Unit/integration test runner                     | MIT        |

---

_Evaluated 2026-03-16. Revisit blockchain detail at post-MVP milestone._

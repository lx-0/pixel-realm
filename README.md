# PixelRealm

A browser-based pixelated MMORPG where the world, quests, and NPCs perpetually evolve through LLM-generated content. Explore biome-rich zones, battle monsters, craft gear, and form guilds — all in a living world that writes new stories every day. Rare items and land parcels are NFTs, enabling true player ownership and a player-driven economy.

**Play now:** [https://lx-0.github.io/pixel-realm/](https://lx-0.github.io/pixel-realm/)

---

## Tech Stack

| Layer        | Technology       | Notes                                  |
| ------------ | ---------------- | -------------------------------------- |
| Language     | TypeScript 5.x   | Strict mode, client + server           |
| Game Engine  | Phaser 3.80      | 2D WebGL/Canvas, pixel art mode        |
| Build Tool   | Vite 5.x         | HMR, fast builds, TS transpilation     |
| Game Server  | Colyseus 0.15    | Multiplayer room/state sync (upcoming) |
| API Server   | Fastify 4.x      | REST for auth, inventory (upcoming)    |
| Runtime      | Node.js 20 LTS   | Server-side                            |
| Database     | PostgreSQL 16    | Managed via Supabase (upcoming)        |
| Cache        | Redis 7.x        | Sessions, leaderboards (upcoming)      |
| LLM          | Anthropic Claude | Server-side quest/NPC generation       |

See [`docs/TECH-STACK.md`](../../docs/TECH-STACK.md) for full rationale and trade-offs.

---

## Prerequisites

- **Node.js 20+** — [https://nodejs.org](https://nodejs.org)
- **npm 10+** (bundled with Node.js)

---

## Setup

```bash
# Clone the repository (or navigate to it)
cd projects/PixelRealm

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start Vite dev server with HMR (port 3000)     |
| `npm run build`       | TypeScript check + production bundle → `dist/` |
| `npm run preview`     | Serve the production build locally             |
| `npm run typecheck`   | Type-check without emitting files              |
| `npm run test`        | Run unit tests via Vitest                      |
| `npm run test:e2e`    | Run E2E smoke tests (Playwright, headless)     |
| `npm run test:e2e:ui` | Open Playwright UI for interactive test runs   |

---

## E2E Smoke Tests

The smoke suite (`tests/e2e/smoke.spec.ts`) covers the critical gameplay path end-to-end using [Playwright](https://playwright.dev). Eight tests are included:

| # | Test | Requires |
|---|------|----------|
| 1 | Game client loads without JS errors | Vite only |
| 2 | Register + login returns JWT | Auth server (`E2E_AUTH_URL`) |
| 3 | Menu loads and Play is reachable | Vite only |
| 4 | Tutorial zone starts (solo mode) | Vite only |
| 5 | WASD input moves player | Vite only |
| 6 | Attacking an enemy awards XP | Vite only |
| 7 | Inventory panel opens without crash | Vite only |
| 8 | Save state persists across reload | Vite only |

### Running locally (Vite only)

```bash
# Install Playwright browsers on first run
npx playwright install --with-deps chromium

# Run smoke tests (Vite dev server starts automatically)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

### Running with the full stack (auth + Colyseus + DB)

Test 2 requires the auth server. Start the full stack first:

```bash
# Start postgres + redis
docker compose up -d

# Start the game + auth server
cd server && npm run dev &

# Run with auth URL configured
E2E_AUTH_URL=http://localhost:3001 npm run test:e2e
```

### CI

E2E tests run automatically on every push and pull request via GitHub Actions:

- **`smoke-client`** — Vite-only tests, no external services (fast, <5 min)
- **`smoke-fullstack`** — Full stack with postgres + redis service containers

Playwright HTML reports and failure screenshots are uploaded as CI artifacts.

---

## Project Structure

```
PixelRealm/
├── index.html              # HTML entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/                 # Static assets (served as-is)
└── src/
    ├── main.ts             # Phaser game config + scene registration
    ├── config/
    │   └── constants.ts    # Tuning parameters (speeds, HP, economy)
    └── scenes/
        ├── BootScene.ts    # Generates placeholder textures, boots to Menu
        ├── MenuScene.ts    # Title screen
        └── GameScene.ts    # Core gameplay loop (move + enemy AI)
```

---

## Controls

| Action           | Keyboard           |
| ---------------- | ------------------ |
| Move             | WASD / Arrow keys  |
| (Combat — soon)  | Spacebar / 1–6     |
| (Interact — soon)| F                  |

---

## Development Status

**v0.1.0 — Initial scaffold**

- [x] Phaser 3 + TypeScript + Vite project initialized
- [x] BootScene → MenuScene → GameScene flow
- [x] Player movement (WASD / arrows)
- [x] Basic enemy patrol + aggro AI
- [x] Pixel-art render mode (320×180 @ 4× zoom)
- [ ] Real pixel-art asset pipeline
- [ ] Colyseus multiplayer server
- [ ] Fastify REST API
- [ ] LLM quest generation
- [ ] NFT item minting
- [ ] Full combat system

See the [roadmap](../../ROADMAP.md) for upcoming milestones.

---

## Contributing

Direct-to-main workflow. Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add player inventory system
fix: resolve collision detection bug in dungeon
docs: update setup instructions
```

See [`docs/git-workflow.md`](../../docs/git-workflow.md) for full conventions.

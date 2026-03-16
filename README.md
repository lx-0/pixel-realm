# PixelRealm

A browser-based pixelated MMORPG where the world, quests, and NPCs perpetually evolve through LLM-generated content. Explore biome-rich zones, battle monsters, craft gear, and form guilds — all in a living world that writes new stories every day. Rare items and land parcels are NFTs, enabling true player ownership and a player-driven economy.

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

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Start Vite dev server with HMR (port 3000)     |
| `npm run build`  | TypeScript check + production bundle → `dist/` |
| `npm run preview`| Serve the production build locally             |
| `npm run typecheck` | Type-check without emitting files           |
| `npm run test`   | Run unit tests via Vitest                      |

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

# PixelRealm Roadmap

## Vision

Browser-based pixelated MMORPG with LLM-generated content, real-time multiplayer, and a player-driven economy. Ship a polished, deployable MVP before layering on NFT integration.

---

## Milestones

### M0: Foundation — COMPLETE
- [x] PIX-1 — Game Design Document
- [x] PIX-2 — Technology choices (Phaser 3, Colyseus, Fastify, PostgreSQL)
- [x] PIX-3 — Repository initialization

### M1: Game Engine & Prototype — COMPLETE
- [x] PIX-6 — Phaser 3 project setup with Vite
- [x] PIX-7 — Art style guide (16×16 pixel art, 320×180 canvas)
- [x] PIX-8 — Game concept approval

### M2: Core Gameplay — COMPLETE
- [x] PIX-9 — Core mechanic prototype (explore → fight → loot → upgrade)
- [x] PIX-10 — Placeholder art for prototype
- [x] PIX-11 — First playtest and balancing pass

### M3: Vertical Slice — COMPLETE
- [x] PIX-12 — Production art for vertical slice
- [x] PIX-13 — Polished vertical slice level
- [x] PIX-14 — Level design and progression

### M4: Full Build — COMPLETE
- [x] PIX-15 — Remaining art assets
- [x] PIX-16 — All levels and game flow

### M5: Server & Multiplayer — COMPLETE
- [x] PIX-21 — Colyseus game server setup
- [x] PIX-22 — Authentication and session management (Fastify + JWT + Redis)
- [x] PIX-23 — PostgreSQL persistence layer (Drizzle ORM)
- [x] PIX-24 — Client GameScene migration to multiplayer
- [x] PIX-25 — Zone instances, chat, and player list
- [x] PIX-30 — GDD and TECH-STACK docs recreation

### M6: LLM Content — COMPLETE
- [x] PIX-26 — LLM quest generation system (Claude API)
- [x] PIX-27 — NPC dialogue system with LLM
- [x] PIX-28 — Dynamic world events system
- [x] PIX-29 — Content moderation pipeline

### M7: Launch Readiness — COMPLETE
Production infrastructure, testing, security, and deployment pipeline. The game is feature-complete for MVP — this milestone makes it shippable.

- [x] PIX-32 — Containerization (Dockerfile, production docker-compose)
- [x] PIX-33 — CI/CD pipeline (GitHub Actions: lint, typecheck, build, test)
- [x] PIX-31 — Server security hardening (JWT verification on game server, CORS, rate limiting)
- [x] PIX-34, PIX-103 — Integration tests for critical paths (auth, quests, DB, combat, dungeons)
- [x] PIX-35 — Production deployment config (env management, secrets, TLS)
- [x] PIX-36 — Client UI polish (quest log, inventory panel, NPC dialogue UI)

### M8: Comprehensive Enhancement — COMPLETE
Full-stack enhancement pass based on codebase audit. 14 issues across 4 waves.

**Wave 1: Security & Safety (Critical)**
- [x] PIX-117 — Auth hardening (password policy, reset flow, token expiry, CSRF)
- [x] PIX-118 — LLM safety (prompt injection defense, output validation, content moderation)
- [x] PIX-119 — Database resilience (soft deletes, backup strategy, cooldown persistence)

**Wave 2: Core Quality (High)**
- [x] PIX-120 — Game balance (zone difficulty scaling, economy sinks, PvP tuning)
- [x] PIX-121 — Tutorial expansion (system tutorials for crafting, skills, marketplace)
- [x] PIX-122 — Chat moderation & admin tools (spam filter, kick/ban)
- [x] PIX-123 — DevOps hardening (staging env, TLS, observability, DB backups)

**Wave 3: Player Experience (Medium)**
- [x] PIX-124 — UI polish (achievement toasts, cooldown bars, marketplace fees)
- [x] PIX-125 — Audio enhancement (ambient sounds, boss themes, crossfade)
- [x] PIX-126 — Multiplayer hardening (server authority, cheat detection, bandwidth)
- [x] PIX-127 — Content depth (NPC memory, seasonal stories, emotes, quest chains)

**Wave 4: Art & Content (Medium)**
- [x] PIX-128 — Character customization art (skin variants, equipment sprites, emotes)
- [x] PIX-129 — Environment art (animated tiles, parallax, boss phase sprites)
- [x] PIX-130 — NPC variety (zone-specific quest givers, merchants, faction reps)

### M9: Polish & Ship — BLOCKED
- [x] PIX-17 — Final balancing and bug fixing
- [x] PIX-18 — Performance optimization and platform build
- [ ] PIX-19 — Distribution and launch (blocked: needs board for platform accounts)

### M10: Endgame Content — COMPLETE
Post-v1 content to deepen endgame retention while awaiting distribution.

- [x] PIX-150 — Prestige/New Game+ system (level 50 reset, permanent bonuses, prestige tiers)
- [x] PIX-151 — Prestige system art (tier icons, rank borders, reset UI, nameplate decorations)
- [x] PIX-153 — Guild raid boss encounters (multi-party bosses, loot tables, raid lockouts)
- [x] PIX-154 — Guild raid art (boss sprites, raid UI panels, loot effect animations)
- [x] PIX-155 — Seasonal event framework (time-limited events, exclusive rewards, LLM story arcs)
- [x] PIX-159 — Seasonal event art (event UI, seasonal decorations, exclusive reward sprites)

### M11: Content Expansion — COMPLETE
New zones using existing tilesets, plus QA for M10 features.

- [x] PIX-161 — Post-M10 integration test sweep (guild raids, prestige, seasonal events)
- [x] PIX-162 — Implement Volcanic Highlands zone (zone 6, level 11+)
- [x] PIX-163 — Create Volcanic Highlands zone art (enemy sprites, boss, NPC)
- [x] PIX-164 — Create Shadowmire Swamp zone art (enemy sprites, boss, NPC)

### M12: Continued Expansion — COMPLETE
Shadowmire zone implementation, day/night cycle, and Frostpeak Highlands art pipeline.

- [x] PIX-168 — Implement Shadowmire Swamp zone (zone 7, level 14+)
- [x] PIX-169 — Implement day/night cycle system (time-based lighting and gameplay)
- [x] PIX-170 — Create Frostpeak Highlands zone art (enemy sprites, boss, NPC, tileset)

### M13: World Expansion — COMPLETE
Frostpeak zone implementation, Celestial Spire art pipeline, continued world growth.

- [x] PIX-172 — Implement Frostpeak Highlands zone (zone 8, level 17+)
- [x] PIX-173 — Create Celestial Spire zone art (enemy sprites, boss, NPC, tileset)

### M14a: Deep World Expansion — IN PROGRESS
Celestial Spire zone implementation and Abyssal Depths art pipeline.

- [x] PIX-175 — Implement Celestial Spire zone (zone 9, level 20+)
- [ ] PIX-176 — Create Abyssal Depths zone art (zone 10, level 23+)

### M14: NFT Integration — DEFERRED (post-launch)
Scope confirmed deferred from v1. Will revisit after successful launch.
- Wallet connection (MetaMask / WalletConnect)
- ERC-721/1155 item minting on EVM L2 (Polygon/Base)
- NFT marketplace
- Land parcel system

---

## Dependencies

```
M0 → M1 → M2 → M3 → M4 ─┐
                           ├→ M7 → M8 → M9 (launch)
M5 → M6 ──────────────────┘
                M10 (endgame content, parallel to M9)
                      M11 (content expansion, parallel to M9)
                            M12 (continued expansion, parallel to M9)
                                  M13 (world expansion, parallel to M9)
                                        M14a (deep world expansion, parallel to M9)
                                              M14 (post-launch, independent)
```

## Key Decisions

- **NFTs deferred to post-launch** — Ship the core MMORPG first, add blockchain later. Reduces scope and risk.
- **Comprehensive enhancement before launch** — M8 closes security, balance, UX, and content gaps found in codebase audit.
- **Endgame content while waiting** — M10 adds prestige, raids, and seasonal events. All complete as of 2026-03-24.
- **Content expansion** — M11 adds Volcanic Highlands and Shadowmire Swamp zones using existing tilesets. All complete as of 2026-03-24.
- **Continued expansion** — M12 implements Shadowmire zone code, day/night cycle, and Frostpeak Highlands art pipeline.
- **World expansion** — M13 implements Frostpeak Highlands zone and begins Celestial Spire art pipeline. All complete as of 2026-03-24.
- **Deep world expansion** — M14a implements Celestial Spire zone and begins Abyssal Depths art pipeline.
- **Single engineer** — One engineer has shipped M0-M13 solo. Strong velocity.
- **Game Artist** — Completed all art through M13. Now on Abyssal Depths zone art for M14a.

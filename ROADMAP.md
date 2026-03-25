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

### M14a: Deep World Expansion — COMPLETE
Zones 9–12 implementation and art pipeline (Celestial Spire through Void Sanctum).

- [x] PIX-175 — Implement Celestial Spire zone (zone 9, level 20+)
- [x] PIX-176 — Create Abyssal Depths zone art (zone 10, level 23+)
- [x] PIX-181 — Implement Abyssal Depths zone (zone 10, level 23+)
- [x] PIX-182 — Create Dragonbone Wastes zone art (zone 11, level 26+)
- [x] PIX-183 — Implement Dragonbone Wastes zone (zone 11, level 26+)
- [x] PIX-184 — Rebuild distribution zip with latest zone content (v0.2.0)
- [x] PIX-186 — Create Void Sanctum zone art (zone 12, level 29+)

### M15: Endgame World Expansion — COMPLETE
Void Sanctum zone implementation and Eclipsed Throne zone pipeline.

- [x] PIX-187 — Implement Void Sanctum zone (zone 12, level 29+)
- [x] PIX-190 — Create Eclipsed Throne zone art (zone 13, level 32+)
- [x] PIX-191 — Implement Eclipsed Throne zone (zone 13, level 32+)
- [x] PIX-199 — Rebuild distribution zip with all zone content (v0.3.0)

### M16: Shattered Dominion Expansion — COMPLETE
Shattered Dominion zone art and implementation pipeline (zone 14, level 35+).

- [x] PIX-193 — Create Shattered Dominion zone art (zone 14, level 35+)
- [x] PIX-194 — Implement Shattered Dominion zone (zone 14, level 35+)
- [x] PIX-202 — Per-session combat statistics tracking and expanded game-over summary
- [x] PIX-203 — Character stat sheet with damage formula breakdown and passive bonuses
- [x] PIX-200 — Achievement system update for zones 7–13

### M17: Primordial Core & Ethereal Nexus — COMPLETE
Primordial Core zone implementation (zone 15, level 38+) and Ethereal Nexus art pipeline (zone 16, level 41+).

- [x] PIX-205 — Create Primordial Core zone art (zone 15, level 38+)
- [x] PIX-207 — Implement Primordial Core zone (zone 15, level 38+)
- [x] PIX-209 — Create Ethereal Nexus zone art (zone 16, level 41+)
- [x] PIX-206 — Rebuild distribution zip as v0.4.0 with zone 15 content

### M18: Ethereal Nexus & Twilight Citadel — COMPLETE
Ethereal Nexus zone implementation (zone 16, level 41+) and Twilight Citadel art pipeline (zone 17, level 44+).

- [x] PIX-212 — Implement Ethereal Nexus zone (zone 16, level 41+)
- [x] PIX-213 — Create Twilight Citadel zone art (zone 17, level 44+)
- [x] PIX-214 — Update roadmap (M17 complete, add M18 milestone)
- [x] PIX-215 — Rebuild distribution zip as v0.5.0 with zone 16 content

### M19: Twilight Citadel & Oblivion Spire — COMPLETE
Twilight Citadel zone implementation (zone 17, level 44+) and Oblivion Spire art pipeline (zone 18, level 47+).

- [x] PIX-217 — Implement Twilight Citadel zone (zone 17, level 44+)
- [x] PIX-218 — Create Oblivion Spire zone art (zone 18, level 47+)

### M20: Oblivion Spire & Final Zone — COMPLETE
Oblivion Spire zone implementation (zone 18, level 47+), Astral Pinnacle art pipeline (zone 19, level 50 final zone), roadmap update, and distribution rebuild.

- [x] PIX-220 — Implement Oblivion Spire zone (zone 18, level 47+)
- [x] PIX-221 — Create Astral Pinnacle zone art (zone 19, level 50 final endgame zone)
- [x] PIX-222 — Rebuild distribution zip as v0.6.0 with zone 17-18 content

### M21: Astral Pinnacle & Game Completion — COMPLETE
Astral Pinnacle zone implementation (zone 19, level 50 final zone) and final distribution rebuild as v0.7.0.

- [x] PIX-224 — Implement Astral Pinnacle zone (zone 19, level 50 final endgame zone)
- [x] PIX-225 — Update roadmap (M20 complete, add M21 final zone milestone)
- [x] PIX-226 — Rebuild distribution zip as v0.7.0 with zone 19 content

### M22: Pre-Launch QA & Polish — COMPLETE
Final quality pass before distribution. Fill test and achievement gaps for late-game zones.

- [x] PIX-232 — Integration tests for zones 16-19 (Ethereal Nexus through Astral Pinnacle)
- [x] PIX-233 — Update achievement system for zones 14-19
- [x] PIX-234 — Rebuild distribution zip as v0.8.0 with achievement and test updates

### M23: Launch Preparation — COMPLETE
Final deployment prep and polish while awaiting distribution unblock (PIX-19).

- [x] PIX-237 — Prepare itch.io deployment pipeline (butler config, deploy script, dist verification)
- [x] PIX-238 — Final v0.8.0 QA (full test suite, lint, typecheck, build verification)
- [x] PIX-239 — Create loading screen art and favicon (pixel art splash and browser icons)

### M24: Pre-Launch Polish — COMPLETE
Quality-of-life improvements and expanded platform reach while awaiting distribution unblock (PIX-19).

- [x] PIX-241 — Add mobile touch controls for browser play (virtual joystick, action buttons, responsive UI)
- [x] PIX-242 — Performance audit and optimization for 19-zone game (load times, memory, frame rates)
- [x] PIX-243 — Create itch.io store page promotional art (cover image, banner, feature graphics)

### M25: Release Candidate & Launch Assets — COMPLETE
Final release candidate build and marketing assets while awaiting board credentials for itch.io distribution (PIX-19).

- [x] PIX-245 — Build v1.0.0 release candidate distribution package and verify deployment readiness
- [x] PIX-246 — Add Open Graph meta tags and social sharing preview for web client
- [x] PIX-247 — Create social media launch announcement graphics (Twitter/X cards, gameplay montage screenshots)

### M26: Post-RC Quality & Launch Readiness — COMPLETE
Final quality sweep and player-facing polish while awaiting board credentials for itch.io distribution (PIX-19).

- [x] PIX-249 — Promote v1.0.0-rc1 to v1.0.0 stable (version bump, full test suite, rebuild dist)
- [x] PIX-250 — Create itch.io game page content (description, features, controls, screenshot captions)

### M27: Post-Launch Readiness — COMPLETE
Server-side observability, seasonal content pipeline, and roadmap housekeeping to keep the live game healthy.

- [x] PIX-253 — Update roadmap (mark M26 complete, add M27 post-launch readiness milestone)
- [x] PIX-254 — Add server-side player analytics and telemetry endpoints
- [x] PIX-255 — Create spring seasonal event art (event enemies, decorations, reward sprites, event banner)

### M28: Post-Launch Improvements — IN PROGRESS
Player retention features and quality-of-life improvements to deepen engagement after launch.

- [x] PIX-258 — Update roadmap (mark M27 complete, add M28 post-launch improvements milestone)
- [x] PIX-259 — Implement daily login rewards and streak system
- [x] PIX-260 — Create summer seasonal event art pack (event enemies, decorations, reward sprites, event banner)
- [x] PIX-262 — Implement friends list and social system (friend requests, online status, whisper chat, party invites)
- [ ] PIX-263 — Implement global leaderboards and rankings (level, achievements, prestige, guild power)
- [x] PIX-264 — Create fall seasonal event art pack (Harvest Golem, Scarecrow Shade, autumn decorations)

### M29: Live Events & Competitive Play — TODO
Complete the four-season art cycle, activate live seasonal rotation, and begin PvP arena pipeline.

- [ ] PIX-266 — Create winter seasonal event art pack (Frost Wraith, Ice Golem, winter decorations)
- [ ] PIX-267 — Implement seasonal event content rotation system (calendar-based auto-activation, seasonal shop, event UI)
- [ ] PIX-268 — Create PvP arena art assets (arena backgrounds, rank badges, matchmaking UI, arena NPC)

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
                                              M15 (endgame world expansion, parallel to M9)
                                                    M16 (Shattered Dominion, parallel to M9)
                                                          M17 (Primordial Core + Ethereal Nexus, parallel to M9)
                                                                M18 (Ethereal Nexus + Twilight Citadel, parallel to M9)
                                                                      M19 (Twilight Citadel + Oblivion Spire, parallel to M9)
                                                                            M20 (Oblivion Spire + Astral Pinnacle, parallel to M9)
                                                                                  M21 (Astral Pinnacle + Game Completion, parallel to M9)
                                                                                        M22 (Pre-Launch QA & Polish, parallel to M9)
                                                                                              M23 (Launch Preparation, parallel to M9)
                                                                                                    M24 (Pre-Launch Polish, parallel to M9)
                                                                                                          M25 (Release Candidate & Launch Assets, parallel to M9)
                                                                                                                M26 (Post-RC Quality & Launch Readiness, parallel to M9)
                                                                                                                      M27 (Post-Launch Readiness, parallel to M9)
                                                                                                                                  M28 (Post-Launch Improvements, parallel to M9)
                                                                                                                                        M29 (Live Events & Competitive Play, parallel to M9)
                                                                                                                            M14 (post-launch, independent)
```

## Key Decisions

- **NFTs deferred to post-launch** — Ship the core MMORPG first, add blockchain later. Reduces scope and risk.
- **Comprehensive enhancement before launch** — M8 closes security, balance, UX, and content gaps found in codebase audit.
- **Endgame content while waiting** — M10 adds prestige, raids, and seasonal events. All complete as of 2026-03-24.
- **Content expansion** — M11 adds Volcanic Highlands and Shadowmire Swamp zones using existing tilesets. All complete as of 2026-03-24.
- **Continued expansion** — M12 implements Shadowmire zone code, day/night cycle, and Frostpeak Highlands art pipeline.
- **World expansion** — M13 implements Frostpeak Highlands zone and begins Celestial Spire art pipeline. All complete as of 2026-03-24.
- **Deep world expansion** — M14a completed zones 9–12 (Celestial Spire through Void Sanctum). All complete as of 2026-03-24.
- **Endgame world expansion** — M15 completed Void Sanctum zone and Eclipsed Throne art. Implementation in progress.
- **Shattered Dominion** — M16 completed zone 14 (level 35+), plus combat stats, stat sheet, and achievement updates.
- **Primordial Core & Ethereal Nexus** — M17 completed zone 15 implementation, zone 16 art, and v0.4.0 distribution. All complete as of 2026-03-25.
- **Ethereal Nexus & Twilight Citadel** — M18 completed zone 16 implementation, zone 17 art, and v0.5.0 distribution. All complete as of 2026-03-25.
- **Twilight Citadel & Oblivion Spire** — M19 completed zone 17 implementation and zone 18 art. All complete as of 2026-03-25.
- **Oblivion Spire & Final Zone** — M20 completed zone 18 implementation, Astral Pinnacle art (zone 19), and v0.6.0 distribution. All complete as of 2026-03-25.
- **Astral Pinnacle & Game Completion** — M21 completed zone 19 (level 50 final endgame zone) and final v0.7.0 distribution. All complete as of 2026-03-25. Game content is fully shipped.
- **Pre-Launch QA & Polish** — M22 completed test coverage for zones 16-19, achievements for zones 14-19, and v0.8.0 distribution rebuild. All complete as of 2026-03-25.
- **Launch Preparation** — M23 completed deployment pipeline, final QA, and loading screen assets. All complete as of 2026-03-25.
- **Pre-Launch Polish** — M24 completed mobile touch controls, performance optimization, and promotional assets. All complete as of 2026-03-25.
- **Release Candidate & Launch Assets** — M25 builds v1.0.0 RC, adds social sharing meta tags, and creates launch announcement graphics while awaiting board credentials for itch.io distribution.
- **Post-RC Quality & Launch Readiness** — M26 promoted v1.0.0-rc1 to stable and created itch.io game page content. All complete as of 2026-03-25.
- **Post-Launch Readiness** — M27 adds server-side analytics/telemetry (PIX-254) and a spring seasonal event art pass (PIX-255) to keep the live game healthy and content-rich. All complete as of 2026-03-25.
- **Post-Launch Improvements** — M28 adds player retention features: daily login rewards (PIX-259), summer seasonal art (PIX-260), friends list and social system (PIX-262), leaderboards (PIX-263), and fall seasonal art (PIX-264). Focus is deepening social engagement and competitive retention loops.
- **Live Events & Competitive Play** — M29 completes the four-season art cycle (PIX-266 winter art), activates live seasonal rotation (PIX-267), and starts the PvP arena art pipeline (PIX-268). Seasonal rotation turns four milestones of art investment into a live engagement loop.
- **Single engineer** — One engineer has shipped M0–M24 solo. Strong velocity.
- **Game Artist** — Completed art through zone 19 (Astral Pinnacle). All zones fully illustrated.

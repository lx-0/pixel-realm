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

### M28: Post-Launch Improvements — COMPLETE
Player retention features and quality-of-life improvements to deepen engagement after launch.

- [x] PIX-258 — Update roadmap (mark M27 complete, add M28 post-launch improvements milestone)
- [x] PIX-259 — Implement daily login rewards and streak system
- [x] PIX-260 — Create summer seasonal event art pack (event enemies, decorations, reward sprites, event banner)
- [x] PIX-262 — Implement friends list and social system (friend requests, online status, whisper chat, party invites)
- [x] PIX-263 — Implement global leaderboards and rankings (level, achievements, prestige, guild power)
- [x] PIX-264 — Create fall seasonal event art pack (Harvest Golem, Scarecrow Shade, autumn decorations)

### M29: Live Events & Competitive Play — COMPLETE
Complete the four-season art cycle, activate live seasonal rotation, and begin PvP arena pipeline.

- [x] PIX-266 — Create winter seasonal event art pack (Frost Wraith, Ice Golem, winter decorations)
- [x] PIX-267 — Implement seasonal event content rotation system (calendar-based auto-activation, seasonal shop, event UI)
- [x] PIX-268 — Create PvP arena art assets (arena backgrounds, rank badges, matchmaking UI, arena NPC)

### M30: PvP Arena & Competitive Systems — COMPLETE
PvP ranked arena implementation and next post-launch competitive features.

- [x] PIX-271 — Implement PvP ranked arena system (matchmaking, ranked tiers, ELO, arena combat, seasonal rewards)

### M31: Guild Territory Wars — COMPLETE
Guild vs guild territory control system to deepen guild engagement and create meaningful PvP objectives beyond 1v1 arena.

- [x] PIX-274 — Add guild territory wars art assets (territory flags, war UI, siege sprites, contested/secured indicators)
- [x] PIX-272 — Implement guild territory wars (territory map, war declaration, capture mechanics, territory buffs, leaderboard integration)
- [x] PIX-276 — Update roadmap (mark M29/M30 complete, add M31 guild wars milestone)

### M31b: Companion Pets — COMPLETE
Companion pet system adding collectible pets with stat bonuses and XP progression.

- [x] PIX-277 — Create companion pet system art assets (pet sprites, UI panels, evolution effects)
- [x] PIX-278 — Implement companion pet system (pet collection, bonuses, XP, evolution)

### M32: Hardcore Mode & Adaptive Audio — COMPLETE
Remaining GDD features: optional permadeath mode and dynamic music system.

- [x] PIX-280 — Implement hardcore permadeath mode (permadeath toggle, separate leaderboard, cosmetic rewards)
- [x] PIX-281 — Create hardcore mode art assets (death effects, leaderboard UI, permadeath badges)
- [x] PIX-282 — Implement adaptive music system (biome themes, combat intensity layers, time-of-day transitions)

### M33: Ranger & Artisan Classes — COMPLETE
Implement the remaining 2 of 4 GDD classes (Ranger, Artisan) with full archetype skill trees.

- [x] PIX-284 — Implement Ranger class with 3 archetype skill trees (Sharpshooter, Shadowstalker, Beastmaster)
- [x] PIX-285 — Create Ranger class art assets (character sprites, skill effects, archetype badges)
- [x] PIX-287 — Create Artisan class art assets (character sprites, skill effects, archetype badges)
- [x] PIX-288 — Implement Artisan class with 3 archetype skill trees (Blacksmith, Alchemist, Enchanter)

### M34: Class Integration & Balance — COMPLETE
Integration testing, balance pass, and distribution rebuild for the 4-class roster.

- [x] PIX-290 — Class selection screen and 4-class character creation art
- [x] PIX-291 — M33 integration tests for Ranger and Artisan classes
- [x] PIX-292 — 4-class balance pass (passive bonuses, skill scaling, roster equilibrium)
- [x] PIX-293 — Rebuild distribution as v1.1.0 with Ranger and Artisan class content

### M35: Endgame Replayability & Class Polish — COMPLETE
Procedural dungeons, class-specific gear visuals, and world boss events to deepen endgame retention post-v1.1.0.

- [x] PIX-305 — Implement procedural dungeon generator for repeatable endgame content
- [x] PIX-306 — Create class-specific equipment and weapon sprite sets
- [x] PIX-307 — Implement world boss event system with scheduled spawns
- [x] PIX-309 — Create procedural dungeon tileset and room template art
- [x] PIX-310 — Create world boss sprites and battle event art

### M36: Social Systems & v1.2.0 — COMPLETE
Reputation/faction system and v1.2.0 distribution rebuild. Art pipeline feeds into code implementation.

- [x] PIX-312 — Rebuild distribution as v1.2.0 with endgame replayability content
- [x] PIX-313 — Create reputation and faction system art assets
- [x] PIX-314 — Implement reputation and faction system
- [x] PIX-315 — Create player housing art assets

### M37: Player Economy & Mounts — COMPLETE
Mount system, player housing implementation, and auction house to deepen the player-driven economy and world engagement.

- [x] PIX-318 — Create mount system art assets
- [x] PIX-319 — Create auction house and trading post art assets
- [x] PIX-320 — Implement player housing system

### M38: Economy, Mounts & LLM UI Polish — COMPLETE
Mount system implementation, auction house, LLM dynamic content UI, and dungeon biome integration. All art assets complete — focus is code implementation.

- [x] PIX-325 — Implement mount system with rideable travel mounts
- [x] PIX-326 — Implement auction house and player-to-player trading post
- [x] PIX-327 — Implement LLM dynamic content UI — quest board, NPC portraits, event banners

### M39: World Systems & Player Expression — COMPLETE
World map navigation, bestiary collection, and cosmetic shop art pipeline. Fills the remaining GDD feature gaps for player expression and world exploration UX.

- [x] PIX-336 — Create world map and fast-travel waystone art assets
- [x] PIX-337 — Create bestiary and monster compendium UI art
- [x] PIX-338 — Create cosmetic shop and character appearance customization art
- [x] PIX-340 — Implement world map and fast-travel waystone navigation system
- [x] PIX-341 — Implement bestiary and monster compendium collection system
- [x] PIX-342 — Implement cosmetic shop and character appearance customization

### M40: Combat Depth, Activities & Communication — COMPLETE
Dodge/roll combat mechanics, fishing mini-game, and mailbox/notification infrastructure. All art assets complete — pure code implementation.

- [x] PIX-346 — Create dodge/roll and sprint combat animation sprites for all 4 classes
- [x] PIX-347 — Create fishing mini-game art assets
- [x] PIX-348 — Create mailbox and notification system UI art
- [x] PIX-352 — Implement dodge/roll and sprint combat mechanics for all 4 classes
- [x] PIX-353 — Implement fishing mini-game system
- [x] PIX-354 — Implement mailbox and notification system

### M41: Art Polish & v1.3.0 Release — COMPLETE
Updated promotional art, achievement icons, tutorial visuals, and final distribution rebuild for all M37-M40 features.

- [x] PIX-408 — Create updated promotional art and feature screenshots for v1.3.0 release
- [x] PIX-409 — Create achievement and milestone icon set for M37-M40 game systems
- [x] PIX-410 — Create tutorial and tooltip art for M37-M40 game systems
- [x] PIX-411 — Rebuild distribution as v1.3.0 with M37-M40 feature content

### M42: Accessibility & Launch Polish — COMPLETE
Accessibility features and upgraded marketing art to broaden reach and strengthen the itch.io launch. Parallel to distribution unblock (PIX-19).

- [x] PIX-421 — Create zone-specific loading screen art for all 19 biomes
- [x] PIX-423 — Integrate zone-specific loading screen backgrounds into zone transitions
- [x] PIX-424 — Create animated title screen and main menu key art for v1.3.0 launch
- [x] PIX-425 — Create NPC portrait gallery and dialogue box art refresh
- [x] PIX-426 — Create accessibility UI art (high-contrast sprites, colorblind-safe indicators, input method icons)
- [x] PIX-427 — Create class showcase portraits and itch.io feature banner art for v1.3.0 launch
- [x] PIX-428 — Implement accessibility features (colorblind mode, keyboard shortcut overlay, UI scaling)

### M43: v1.4.0 Distribution & Pre-Launch Hardening — COMPLETE
Package v1.4.0 with M42 accessibility and polish content. Final QA sweep and promotional updates before launch.

- [x] PIX-430 — Rebuild distribution as v1.4.0 with M42 accessibility and launch polish content
- [x] PIX-431 — Full v1.4.0 QA (regression test suite, accessibility feature verification, build check)
- [x] PIX-432 — Create v1.4.0 promotional screenshots showcasing accessibility features and new title screen
- [x] PIX-433 — Update itch.io store page description with v1.4.0 accessibility and polish highlights

### M44: Pre-Launch Readiness & Marketing — IN PROGRESS
Internationalization, performance validation, and marketing assets while awaiting distribution unblock (PIX-19).

- [ ] PIX-436 — Implement i18n framework and extract English strings into locale files
- [ ] PIX-437 — Server load testing and performance benchmarking for launch readiness
- [ ] PIX-438 — Create press kit and marketing asset package for launch
- [ ] PIX-439 — Create animated pixel art game trailer sequence for launch promotion

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
                                                                                                                                              M30 (PvP Arena & Competitive Systems, parallel to M9)
                                                                                                                                                    M31 (Guild Territory Wars, parallel to M9)
                                                                                                                                                          M31b (Companion Pets, parallel to M9)
                                                                                                                                                                M32 (Hardcore Mode & Adaptive Audio, parallel to M9)
                                                                                                                                                                      M33 (Ranger & Artisan Classes, parallel to M9)
                                                                                                                                                                            M34 (Class Integration & Balance, parallel to M9)
                                                                                                                                                                                  M35 (Endgame Replayability & Class Polish, parallel to M9)
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
- **Post-Launch Improvements** — M28 adds player retention features: daily login rewards (PIX-259), summer seasonal art (PIX-260), friends list and social system (PIX-262), leaderboards (PIX-263), and fall seasonal art (PIX-264). Focus is deepening social engagement and competitive retention loops. All complete as of 2026-03-25.
- **Live Events & Competitive Play** — M29 completed the four-season art cycle (PIX-266 winter art), activated live seasonal rotation (PIX-267), and shipped PvP arena art assets (PIX-268). Seasonal rotation turns four milestones of art investment into a live engagement loop. In progress as of 2026-03-25.
- **PvP Arena & Competitive Systems** — M30 implemented the PvP ranked arena system (PIX-271) with matchmaking, ranked tiers (Bronze→Diamond), ELO rating, arena combat, and seasonal rewards. Builds on the art assets shipped in M29. Complete as of 2026-03-25.
- **Guild Territory Wars** — M31 adds guild vs guild territory control: 6 contestable world zones, scheduled war windows (08:00/16:00/22:00 UTC), capture scoring, territory ownership with XP/drop buffs, and leaderboard integration. Complete as of 2026-03-25.
- **Companion Pets** — M31b added companion pet collection, stat bonuses, XP, and evolution system. Complete as of 2026-03-25.
- **Hardcore Mode & Adaptive Audio** — M32 shipped hardcore permadeath mode (PIX-280) and adaptive music system (PIX-282). Art assets (PIX-281) in progress with Game Artist. Complete (code) as of 2026-03-26.
- **Ranger & Artisan Classes** — M33 implements the remaining 2 of 4 GDD classes. All 4 GDD classes now fully implemented with 12 archetype skill trees (60 total skills). Complete as of 2026-03-26.
- **Class Integration & Balance** — M34 adds integration tests, 4-class balance pass, class selection art, and v1.1.0 distribution rebuild. Complete as of 2026-03-26.
- **Endgame Replayability & Class Polish** — M35 adds procedural dungeons (PIX-305), class-specific equipment art (PIX-306), and world boss events (PIX-307). Focus is deepening endgame retention and completing the visual identity of the 4-class system. Art complete, code in progress as of 2026-03-26.
- **Social Systems & v1.2.0** — M36 adds reputation/faction system (PIX-313 art done, PIX-314 code), player housing art (PIX-315 done), and v1.2.0 distribution rebuild (PIX-312). Focus is adding social depth and long-term progression beyond level cap. Art complete, code in progress as of 2026-03-27.
- **Player Economy & Mounts** — M37 art complete (PIX-318 mounts, PIX-319 auction house). Player housing code (PIX-320) in progress. Art done as of 2026-03-27.
- **Economy, Mounts & LLM UI Polish** — M38 adds mount system code (PIX-325), auction house code (PIX-326), and LLM dynamic content UI (PIX-327). All art assets complete — pure code implementation milestone. Created 2026-03-27.
- **Single engineer** — One engineer has shipped M0–M34 solo. Strong velocity. Engineer runs stalled since 2026-03-26 — 4 queued runs not executing.
- **Game Artist** — Completed art through M38. All zones, endgame, faction, housing, mount, auction house, dungeon biome, and LLM UI content fully illustrated. M39 art pipeline started (world map, bestiary, cosmetic shop) as of 2026-03-27.
- **World Systems & Player Expression** — M39 art complete (PIX-336 world map, PIX-337 bestiary, PIX-338 cosmetic shop). Implementation tasks created (PIX-340, PIX-341, PIX-342). Art done as of 2026-03-27, code pending Engineer unblock.
- **Combat Depth, Activities & Communication** — M40 art complete (PIX-346 dodge/roll sprites, PIX-347 fishing art, PIX-348 mailbox UI). Implementation tasks created (PIX-352, PIX-353, PIX-354). Art done as of 2026-03-27.
- **Engineer unblocked** — As of 2026-03-29, Engineer completed M35–M40 code. All GDD features implemented. Only PIX-411 (v1.3.0 rebuild) remains.
- **M41: Art Polish & v1.3.0** — All M41 tasks complete. v1.3.0 distribution rebuilt with all M37-M40 features (player housing, mounts, auction house, LLM UI, world map, bestiary, cosmetic shop, dodge/roll, fishing). 1122 tests pass. All complete as of 2026-03-29.
- **Feature-complete & v1.3.0 shipped** — As of 2026-03-29, all GDD features through M40 are fully implemented and packaged in v1.3.0. Game is feature-complete. Pending itch.io launch (PIX-19, board-blocked).
- **M42: Accessibility & Launch Polish** — Complete as of 2026-03-30. Added colorblind mode, keyboard shortcut overlay, UI scaling (PIX-428), zone-specific loading screens (PIX-421, PIX-423), animated title screen (PIX-424), NPC portrait refresh (PIX-425), accessibility UI art (PIX-426), and class showcase art (PIX-427).
- **M43: v1.4.0 Distribution & Pre-Launch Hardening** — Rebuild distribution with M42 content, full QA sweep, promotional screenshots, and itch.io page update. All complete as of 2026-03-30.
- **M44: Pre-Launch Readiness & Marketing** — i18n framework, server load testing, press kit, and animated trailer. Keeps team productive while awaiting PIX-19 distribution unblock. Created 2026-03-30.

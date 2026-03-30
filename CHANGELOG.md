# Changelog

All notable changes to PixelRealm are documented in this file.

## [1.4.0] - 2026-03-30

M42 accessibility & launch polish pack: zone loading screens, animated title screen, NPC portrait gallery, accessibility UI art, class showcase art, colorblind mode, keyboard shortcut overlay, and UI scaling.

### M42: Accessibility & Launch Polish
- **Zone Loading Screens ([PIX-421](/PIX/issues/PIX-421))**: 23 zone-specific loading screen backgrounds for all 19 biomes plus dungeon, coastal, desert, and forest variants.
- **Animated Title Screen ([PIX-424](/PIX/issues/PIX-424))**: Animated title logo, main menu key art with hero panels for all 4 classes, version badge, decorative divider.
- **NPC Portrait Gallery ([PIX-425](/PIX/issues/PIX-425))**: 38 NPC portraits (merchant + questgiver per zone), dialogue box frame, dialogue indicator sprites.
- **Accessibility UI Art ([PIX-426](/PIX/issues/PIX-426))**: High-contrast HUD variants, colorblind-safe status indicators (shape+pattern), input method icons, scalable 1x/2x UI frames.
- **Class Showcase Art ([PIX-427](/PIX/issues/PIX-427))**: 4 class showcase portraits (64×64), 12 archetype thumbnails (32×32), itch.io feature banner (630×500).
- **Accessibility Features ([PIX-428](/PIX/issues/PIX-428))**: Colorblind mode (deuteranopia/protanopia/tritanopia), UI scale settings (1x/1.5x/2x), keyboard shortcut overlay (? key), screen reader ARIA hints.

### Tests
- Total test coverage: **45 test files, 1376 tests** (all passing).

### Distribution
- Version bumped to 1.4.0.
- `pixelrealm-v1.4.0.zip` built from production Vite bundle.
- All M42 assets verified in dist: zone loading screens, animated title, NPC portraits, accessibility UI, class showcase.

## [1.3.0] - 2026-03-29

M37–M40 feature pack: player housing, mount system, auction house, LLM dynamic UI, world map, bestiary, cosmetic shop, dodge/roll, and fishing mini-game.

### M37: Player Economy & Mounts
- **Player Housing (PIX-320)**: Land plot purchase, furniture placement grid (10×8), tier-1/2 house upgrades, visit permission system (public/friends/locked).
- **Mount System (PIX-325)**: 6 mounts (common→legendary), stable NPC, cast-time mounting animation, speed bonuses, dismount on hit, mount collection panel.

### M38: Economy, Mounts & LLM UI Polish
- **Auction House (PIX-326)**: Marketplace listings with 5% listing fee, buy/cancel flows, trade history, filter by rarity/type, auctioneer NPC, bid history panel.
- **LLM Dynamic Content UI (PIX-327)**: Quest board with AI-generated quests, dynamic NPC portraits, seasonal event banners, LLM safety guardrails.

### M39: World Systems & Player Expression
- **World Map (PIX-340)**: Interactive zone navigation with fog-of-war, fast travel (10g/zone), discovered zone tracking.
- **Bestiary (PIX-341)**: Monster compendium with kill-count tracking, enemy stat reveal, 50 boss achievements, bestiary panel.
- **Cosmetic Shop (PIX-342)**: Character appearance customization (hair, skin, outfit, accessories), preview mannequin, gold-purchased cosmetics, cosmetic persistence.

### M40: Combat Depth, Activities & Communication
- **Dodge/Roll (PIX-352)**: Z-key dodge roll with 220ms dash, 300ms i-frames, 1500ms cooldown, 8MP mana cost, dust trail VFX.
- **Fishing Mini-Game (PIX-353)**: Full state machine (cast→wait→bite→reel→catch), 15 fish species across 19 zones, 3 rod tiers, tension-bar reel mechanic.

### Tests
- Integration test suites added for all 4 new systems: mounts (27 tests), auction house (13 tests), fishing (27 tests), dodge/stamina (21 tests).
- Total test coverage: **38 test files, 1122 tests** (all passing).

### Distribution
- Version bumped to 1.3.0.
- `pixelrealm-v1.3.0.zip` built from production Vite bundle.
- TypeScript errors fixed: `stamina` field explicit `number` type, `StatSheetPanel` sprint constant corrected.

## [1.2.0] - 2026-03-29

M35 endgame replayability — procedural dungeons and world boss events.

### M35: Endgame Replayability

**Procedural Dungeon Generator (PIX-305)**
- Server: `DungeonRoom` generates variable-length room sequences (5–9 rooms) via seeded RNG — every instance is unique (combat, arena, elite, treasure, boss chambers).
- New room types: arena (two-wave gauntlet) and elite (1–2 high-HP champions).
- Tier 4 (Nightmare): endgame difficulty requiring level 40+, pulling enemies from zones 10–18 with a 6-boss endgame pool (abyssal_kraken_lord through astral_sovereign).
- Dungeon completion grants bonus XP scaled by tier × rooms cleared; achievement progress persisted via `dungeon_completed` event.
- Four new dungeon achievements: Dungeon Delver, Dungeon Runner, Dungeon Master, Nightmare Conqueror.
- Client: `DungeonScene` — Colyseus connection, procedurally-coloured rooms, player/enemy sync, boss HP bar, room progress HUD, solo fallback.
- Dungeon portal (void archway) spawned in endgame zones (zone10+); `[E]` opens `DungeonEntrancePanel` with 4-tier selection.

**World Boss Event System (PIX-307)**
- DB migration 0024: `world_boss_instances`, `world_boss_contributions`, `world_boss_loot_grants` tables.
- Three world boss definitions: storm_titan, ancient_dracolich, void_herald — round-robin rotation.
- Atomic HP damage, phase transitions (3 phases), contribution-based loot distribution (gold/silver/bronze tiers).
- `WorldBossRoom`: shared Colyseus room (up to 200 players), attack rate limiting, phase change broadcasts.
- `worldBossScheduler`: minute-tick scheduler announces incoming boss to all ZoneRooms, activates on spawn, re-schedules after defeat/expiry.
- REST endpoints: `GET /world-boss/active`, `/world-boss/history`, `/world-boss/:instanceId/leaderboard`.
- Client: `WorldBossScene` — arena background, boss HP bar + phase indicators, attack button, contribution leaderboard sidebar, victory/expiry splash.

### Art Assets
- Procedural dungeon tilesets: stone, crystal, lava, ruins, ancient ruins (PIX-397).
- World boss event UI: announcement banners, HP frame, victory splash, reward tier badges (PIX-358, PIX-356).
- World map illustration and waystone navigation art (PIX-399).
- Mounted player riding animation sprites for all 4 classes (PIX-398).
- Dodge/roll and sprint combat animation sprites (PIX-365).
- Cosmetic shop and character customization art (PIX-366).
- Bestiary and monster compendium UI art (PIX-367).
- Reputation and faction system UI art (PIX-401).

### Technical
- 1026 server-side tests passing across all zones, classes, and systems.
- Lint: 0 errors (68 warnings, all pre-existing).
- TypeScript: no type errors (fixed TS6133/TS2339 issues in WorldBossScene and DungeonScene).
- Build: clean Vite production build.
- Client bundle: ~508 kB app JS + ~1.48 MB Phaser (gzip: ~135 kB + ~340 kB).

---

## [1.1.0] - 2026-03-26

Ranger and Artisan class expansion — completes the full 4-class roster from the GDD.

### M33: Ranger & Artisan Classes
- Ranger class with 3 archetype skill trees: Sharpshooter, Shadowstalker, Beastmaster (PIX-284).
- Artisan class with 3 archetype skill trees: Blacksmith, Alchemist, Enchanter (PIX-288).
- Ranger class art assets: character sprites, skill effects, archetype badges (PIX-285).
- Artisan class art assets: character sprites, skill effects, archetype badges (PIX-287).

### M34: Class Integration & Balance
- Class selection screen and 4-class character creation art (PIX-290).
- M33 integration tests for Ranger and Artisan classes (PIX-291).
- 4-class balance pass: passive bonuses, skill scaling, roster equilibrium (PIX-292).
- Champion arena tier (2200+ ELO) added to ranked PvP.

### Technical
- 1026 server-side tests passing across all zones, classes, and systems.
- Lint: 0 errors.
- TypeScript: no type errors.
- Build: clean Vite production build.

---

## [1.0.0] - 2026-03-25

Release candidate for v1.0.0 — the full PixelRealm MMORPG launch build. Covers all work from M0 (foundation) through M24 (pre-launch polish).

### Summary of Milestones M0–M24

**M0: Foundation**
- Game Design Document, technology selection (Phaser 3, Colyseus, Fastify, PostgreSQL), repository initialization.

**M1: Game Engine & Prototype**
- Phaser 3 project setup with Vite, 16×16 pixel art style guide (320×180 canvas), concept approval.

**M2: Core Gameplay**
- Core mechanic prototype (explore → fight → loot → upgrade), placeholder art, first playtest and balance pass.

**M3: Vertical Slice**
- Production art, polished vertical slice level, level design and progression.

**M4: Full Build**
- All remaining art assets, all levels and game flow.

**M5: Server & Multiplayer**
- Colyseus game server, JWT + Redis auth, PostgreSQL persistence (Drizzle ORM), client multiplayer migration, zone instances, chat, player list.

**M6: LLM Content**
- LLM quest generation (Claude API), NPC dialogue system, dynamic world events, content moderation pipeline.

**M7: Launch Readiness**
- Dockerfile + production docker-compose, GitHub Actions CI/CD (lint/typecheck/build/test), JWT security hardening, integration test suite, production env/secrets/TLS config, client UI polish.

**M8: Comprehensive Enhancement**
- Auth hardening (password policy, reset flow, token expiry, CSRF).
- LLM safety (prompt injection defense, output validation, content moderation).
- Database resilience (soft deletes, backup strategy, cooldown persistence).
- Game balance (zone scaling, economy sinks, PvP tuning).
- Tutorial expansion (crafting, skills, marketplace).
- Chat moderation and admin tools (spam filter, kick/ban).
- DevOps hardening (staging env, TLS, observability, DB backups).
- UI polish (achievement toasts, cooldown bars, marketplace fees).
- Audio enhancement (ambient sounds, boss themes, crossfade).
- Multiplayer hardening (server authority, cheat detection, bandwidth).
- Content depth (NPC memory, seasonal stories, emotes, quest chains).
- Character customization art, animated environment tiles, NPC variety.

**M9: Polish & Ship**
- Final balancing and bug fixing, performance optimization.

**M10: Endgame Content**
- Prestige/New Game+ system (level 50 reset, permanent bonuses, prestige tiers).
- Guild raid boss encounters (multi-party, loot tables, raid lockouts).
- Seasonal event framework (time-limited events, LLM story arcs, exclusive rewards).

**M11: Content Expansion**
- M10 integration test sweep.
- Zone 6: Volcanic Highlands (level 11+).
- Zone 7: Shadowmire Swamp art pipeline.

**M12: Continued Expansion**
- Zone 7: Shadowmire Swamp implementation (level 14+).
- Day/night cycle system.
- Zone 8: Frostpeak Highlands art pipeline.

**M13: World Expansion**
- Zone 8: Frostpeak Highlands implementation (level 17+).
- Zone 9: Celestial Spire art pipeline.

**M14a: Deep World Expansion**
- Zones 9–12 implementation and art: Celestial Spire (20+), Abyssal Depths (23+), Dragonbone Wastes (26+), Void Sanctum (29+).
- Distribution v0.2.0.

**M15: Endgame World Expansion**
- Zone 12: Void Sanctum implementation (level 29+).
- Zone 13: Eclipsed Throne art and implementation (level 32+).
- Distribution v0.3.0.

**M16: Shattered Dominion Expansion**
- Zone 14: Shattered Dominion (level 35+).
- Per-session combat statistics tracking and game-over summary.
- Character stat sheet with damage formula breakdown.
- Achievement system updated for zones 7–13.

**M17: Primordial Core & Ethereal Nexus**
- Zone 15: Primordial Core (level 38+).
- Zone 16: Ethereal Nexus art pipeline.
- Distribution v0.4.0.

**M18: Ethereal Nexus & Twilight Citadel**
- Zone 16: Ethereal Nexus implementation (level 41+).
- Zone 17: Twilight Citadel art pipeline.
- Distribution v0.5.0.

**M19: Twilight Citadel & Oblivion Spire**
- Zone 17: Twilight Citadel implementation (level 44+).
- Zone 18: Oblivion Spire art pipeline.

**M20: Oblivion Spire & Final Zone**
- Zone 18: Oblivion Spire implementation (level 47+).
- Zone 19: Astral Pinnacle art pipeline (level 50 final zone).
- Distribution v0.6.0.

**M21: Astral Pinnacle & Game Completion**
- Zone 19: Astral Pinnacle implementation (level 50, final endgame zone). Full 19-zone world complete.
- Distribution v0.7.0.

**M22: Pre-Launch QA & Polish**
- Integration tests for zones 16–19.
- Achievement system updated for zones 14–19.
- Distribution v0.8.0.

**M23: Launch Preparation**
- itch.io deployment pipeline (butler config, deploy script, dist verification).
- Final QA pass (829 tests, lint, typecheck, build verification).
- Loading screen pixel art and favicon assets.

**M24: Pre-Launch Polish**
- Mobile touch controls (virtual joystick, action buttons, responsive UI).
- Performance optimization across 19-zone game (load times, memory, frame rates, unused asset cleanup).
- itch.io promotional art (cover image, banner, feature graphics).

### Technical
- 829 server-side tests passing across all zones and systems.
- Lint: 0 errors (36 pre-existing warnings).
- TypeScript: no type errors.
- Build: clean Vite production build.
- Client bundle: ~434 kB app JS + ~1.48 MB Phaser (gzip: ~116 kB + ~340 kB).

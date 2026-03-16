# Game Design Document

## Concept

**Title:** PixelRealm
**Genre:** MMORPG (Massively Multiplayer Online Role-Playing Game)
**Platform:** Web (HTML5 / Browser)
**Target audience:** Mid-core gamers aged 18–35 who enjoy exploration, crafting, and social MMO gameplay; crypto/NFT enthusiasts interested in true item ownership; players who appreciate emergent storytelling and procedurally generated content.
**Pitch:** PixelRealm is a browser-based pixelated MMORPG where the world, quests, and NPCs are perpetually evolving through LLM-generated content. Players explore biome-rich zones, battle monsters, craft gear, and form guilds — all in a living world that writes new stories every day. Every rare item, plot of land, and unique piece of gear is an NFT, giving players true ownership and a player-driven economy. No two sessions are alike: the LLM crafts personalized quest lines, adapts NPC dialogue to your reputation, and generates dynamic world events that respond to what players collectively do.

---

## Core Mechanic

**Explore → Fight → Loot → Upgrade → Explore**

The player navigates a tile-based pixel world using WASD/arrow keys. When they encounter an enemy or enter combat range, they **input** an attack (click or spacebar). The character **actions** with an animated strike or spell, giving immediate **feedback** via hit sparks, damage numbers, and audio cues. The **consequence** is enemy HP loss, potential item drop, and XP gain — which feeds into gear crafting and stat upgrades that let the player tackle harder zones, continuing the loop.

Every piece of gear and land parcel is optionally mintable as an NFT, making loot consequential beyond the session.

---

## Game Loop

### Moment-to-moment (5 seconds)
The player moves through the pixel world, attacks enemies with timed inputs, collects resource drops, and uses abilities on cooldown. Combat is semi-real-time: players select targets and use hotbar skills; timing skill casts for maximum effect is rewarded with combo bonuses.

### Session loop (15 minutes)
A session begins with the player logging into their home zone. They:
1. Check the **LLM-generated daily quest board** for new mission hooks.
2. Travel to a quest zone (dungeon, wilderness biome, or player town).
3. Complete combat encounters and loot runs.
4. Return to town to craft/upgrade gear, trade with other players, or interact with dynamic NPC storylines.
5. Session closes with XP tallied, quest progress saved, and any NFT items confirmed on-chain.

A satisfying session always ends with measurable progress: a level-up, a crafted item, a quest completed, or a rare drop.

### Meta loop (multi-session)
Players return for:
- **Character progression** — leveling classes, unlocking skill trees, ascending to prestige tiers.
- **LLM world events** — the server's AI periodically generates world-altering events (invasions, treasure hunts, faction wars) that last days and affect the global map.
- **Economy and trading** — crafting rare NFT items, trading on the marketplace, flipping land parcels.
- **Guild content** — raid bosses, guild territory control, guild-vs-guild battles with NFT stakes.
- **Seasonal story arcs** — the LLM writes ongoing lore chapters each season, giving players a narrative reason to log in.

---

## Mechanics

| Mechanic | Description | Introduced | Interacts with |
| :------- | :---------- | :--------- | :------------- |
| Combat | Semi-real-time: move + target + hotbar skills with cooldowns | Tutorial zone | Skills, loot, XP |
| LLM Quest Generation | Server-side LLM creates personalized quests based on player history, faction rep, and world state | Level 3 | Reputation, world events, NPC dialogue |
| Crafting | Combine drops and resources at crafting stations to produce gear, potions, and tools | Level 5 | Loot, economy, NFT minting |
| NFT Item Minting | Players may optionally mint rare/unique items and land parcels as on-chain NFTs | Level 10 | Economy, marketplace |
| Reputation System | Faction standings (Merchants, Mages Guild, Bandit Clans, etc.) alter NPC behavior and quest availability | Level 5 | LLM quests, NPC dialogue |
| Player Housing / Land | Own plots of land in player towns; build shops, crafting hubs, decoration | Level 15 | Economy, social, NFT |
| Guild System | Form guilds, claim territory, run guild raids, stake NFTs in GvG | Level 10 | Social, economy, endgame |
| Dynamic World Events | LLM-triggered global events (invasions, boss spawns, seasonal arcs) | Ongoing | All systems |
| Skill Trees | Three archetypes per class (Warrior, Mage, Ranger, Artisan); branching passive/active unlocks | Level 5 | Combat, progression |

---

## Progression

**Levels 1–10 (Tutorial & Onboarding):** Linear zone progression, guided quests, combat basics. Drops are standard (non-NFT).

**Levels 10–30 (Mid-game):** Biome exploration opens up. Skill tree branches available. Crafting unlocked. First NFT minting available. LLM quests personalize to player choices.

**Levels 30–50 (Endgame):** Dungeons, elite zones, guild raids, territory control. LLM world events escalate in scope. Economy becomes player-driven. Gear power plateaus — horizontal progression via unique cosmetics, rare blueprints, and land upgrades.

**Prestige / Seasons:** Every 3 months a new season resets some progression elements (while preserving NFT assets), introduces new LLM-authored story arcs, and adds a fresh class or biome.

Gates are **primarily skill-based** at lower levels (learn combat timing, explore zones) and **content-gated** at endgame (guild membership, rare crafting mats).

---

## Win / Lose

**Session fail states:**
- Character death drops a small % of carried (non-equipped) resources to the ground — retrievable by the player for 2 minutes before despawning.
- Dungeon wipe returns the party to the entrance with a cooldown penalty.
- No permanent item loss for non-staked items; NFT-staked items in GvG can be won/lost per agreed stake rules.

**Session win state:**
- Quest completed, XP gained, loot secured, crafting progressed.

**Overall game — no "win" state (MMORPG):**
- The meta goal is character mastery, economic success, and community status (guild ranking, marketplace rep, leaderboard standing).
- Seasonal story arcs have narrative endings, giving players a sense of completion per season.

**Recovery mechanics:**
- Respawn at nearest waystone with a 30-second immunity window.
- "Escape Scroll" consumable (craftable) for emergency teleport out of danger.
- Hardcore mode (optional) with permadeath for high-stakes players.

---

## Controls

| Action | Keyboard | Mouse | Touch (future) |
| :----- | :------- | :---- | :------------- |
| Move | WASD / Arrow keys | Click-to-move (right-click) | D-pad overlay |
| Attack (auto) | Spacebar | Left-click enemy | Tap enemy |
| Skill 1–6 | 1–6 hotkeys | Click hotbar | Tap hotbar |
| Interact / Talk | F | Left-click NPC | Tap NPC |
| Inventory | I | — | Tap bag icon |
| Map | M | — | Tap map icon |
| Quest Log | J | — | Tap quest icon |
| Chat | Enter | — | Tap chat |
| Sprint | Shift (hold) | — | Double-tap D-pad |
| Dodge / Roll | Q | — | Swipe |
| Target nearest | Tab | — | — |

---

## Art Direction

**Style:** 16×16 tile-based pixel art, character sprites at 16×24, scaling ×3 for 48×72 display size. Inspired by classic SNES-era RPGs (Final Fantasy VI, Secret of Mana) with a modern color palette.

**Resolution:** 320×180 internal game canvas, scaled to full browser window with pixel-perfect integer scaling.

**Color language:**

| Color | Meaning |
| :---- | :------ |
| Cyan / Blue | Player character, friendly NPCs, safe zones |
| Red / Orange | Enemies, danger, fire hazards |
| Green | Health, nature, loot drops |
| Yellow / Gold | Quest markers, rare/legendary items, XP |
| Purple | Magic, mana, mystical elements |
| Gray / Brown | Neutral world terrain, walls, stones |
| White pulse | Hit confirmation, damage feedback |
| Dark vignette | Dangerous/cursed areas |

**Key visual targets:**
- Lush, readable overworld tiles with distinct biomes (forest greens, desert ochres, ice blues, volcanic reds)
- Character silhouettes clearly distinguishable at 16×24 even in crowds
- NFT-minted items have a subtle gold shimmer particle effect to signal rarity and ownership
- Day/night cycle with warm/cool lighting shifts using palette swapping

**References:** Stardew Valley (pixel warmth, readability), Pokémon FireRed (character expression in small sprites), Runescape early era (MMO UI density), Terraria (biome diversity), Shovel Knight (modern pixel fidelity).

---

## Audio Direction

**Music:**
- Style: Chiptune-inspired orchestral (MIDI + live instruments layered), similar to Undertale / Celeste
- Adaptive system: music layers in percussion and lead melody as combat intensity rises; strips back to ambient pads during exploration
- Biome themes: each zone (forest, desert, dungeon, city, ocean) has a distinct leitmotif
- Town music dynamically changes based on time-of-day and active world events (triumphant during victory events, ominous during invasions)

**SFX:**
| Sound | Trigger | Style |
| :---- | :------ | :---- |
| Sword swing | Basic attack | Sharp, satisfying chop |
| Spell cast | Magic ability | Whoosh + resonant tone matching element |
| Hit confirm | Damage dealt | Short punch + pitch based on damage amount |
| Level up | XP threshold | Classic ascending chime |
| Item loot | Pickup | Coin jingle, rarity affects pitch/layers |
| NFT mint | Minting transaction confirmed | Distinct harmonic chime + sparkle |
| Quest accept | New quest | Fanfare sting |
| Death | Player KO | Descending tone, muffled ambience |
| UI clicks | Button presses | Subtle tick, non-intrusive |
| Chat message | Player receives message | Soft bell |

---

## Tuning Parameters

### Player

| Parameter | Default | Range | Affects |
| :-------- | :------ | :---- | :------ |
| Base HP | 100 | 100–2000 (scales with level) | Survivability |
| Base Mana | 50 | 50–1000 | Skill usage frequency |
| Move Speed | 120 px/s | 80–200 | Exploration pace, kiting |
| Attack Speed | 1.0 attacks/s | 0.5–3.0 | DPS ceiling |
| XP per kill (base) | 10 | 5–500 | Level-up pace |
| Drop rate (common) | 30% | 10–60% | Economy supply |
| Drop rate (rare) | 5% | 1–15% | Economy scarcity, NFT supply |
| Death resource loss % | 5% | 0–20% | Risk/reward tension |
| Skill cooldown (base) | 8s | 3–30s | Build diversity |

### Enemies

| Parameter | Default | Range | Affects |
| :-------- | :------ | :---- | :------ |
| HP scaling per zone tier | ×1.5 per tier | ×1.2–×2.5 | Difficulty curve |
| Aggro range | 80 px | 40–160 px | Encounter frequency |
| Patrol speed | 60 px/s | 30–120 px/s | Zone feel, difficulty |
| Elite spawn rate | 10% | 5–25% | Challenge, loot quality |
| Boss respawn timer | 24 hours | 12–72 hours | Economy, event scarcity |
| AI reaction time | 200 ms | 100–500 ms | Combat difficulty |

### Economy

| Parameter | Default | Range | Affects |
| :-------- | :------ | :---- | :------ |
| Marketplace transaction fee | 2.5% | 1–5% | Economy sink |
| Crafting failure rate (low-tier) | 0% | 0–0% | Player frustration |
| Crafting failure rate (high-tier) | 15% | 5–30% | Risk in rare crafting |
| Gold sink: fast travel cost | 10g per zone | 5–50g | Gold supply, engagement |
| NFT mint gas equivalent | 0 (subsidized) | 0–variable | Adoption friction |
| Land plot auction floor | 500g | 100–5000g | Land economy |
| Guild treasury tax | 5% of loot | 0–20% | Guild resource pool |
| LLM quest reward scaling | ×1.2 vs standard | ×1.0–×2.0 | Incentive to engage LLM quests |

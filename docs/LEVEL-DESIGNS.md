# PixelRealm — Level Design Document

**Version:** 1.0
**Date:** 2026-03-16
**Status:** Active

---

## Overview

PixelRealm uses a zone-based level design model rather than discrete "levels." Players progress through a world of biome zones, each with distinct layout, encounters, mechanics, and narrative context. Character level (1–50) determines which zones are accessible and what content is enabled.

This document covers:
1. Zone-by-Zone Breakdown (layout, encounters, mechanics, difficulty)
2. Progression Curve (difficulty scaling across all 50 levels)
3. Unlock Schedule (what players earn and when)
4. Pacing Map (tension/relief rhythm across the full experience)

---

## Part 1 — Zone-by-Zone Breakdown

Zones are organized into five tiers corresponding to character level ranges. Each zone has a home biome, a set of encounter types, at least one quest hub, and a zone boss.

---

### TIER 1 — Tutorial & Onboarding (Levels 1–10)

**Design goal:** Teach the core loop (Move → Attack → Loot → Upgrade) in a safe, linear corridor. Each sub-zone introduces exactly one new mechanic before the player enters open world content.

---

#### Zone 1: Verdant Hollow (Levels 1–3)

| Property | Value |
|---|---|
| Biome | Forest |
| Tileset | `tileset_forest.png` |
| World size | 2×2 zone tiles (320×180 each) |
| Ambient | Birdsong, light wind |
| Palette shift | Day only (no night cycle yet) |

**Layout:**
```
[Start Clearing] → [Merchant Cabin] → [Slime Burrow] → [First Waystone]
```
Linear east-west corridor. Narrow tree-bordered path forces encounter engagement. One fork leads to a loot chest (teaches exploration reward). No maze — the player can't get lost.

**Encounters:**
| Enemy | Count | HP | Damage | Notes |
|---|---|---|---|---|
| Green Slime | 8 | 30 | 5 | 2-hit kill; teaches basic attack timing |
| Mushroom Creep | 4 | 50 | 8 | Moves in short bursts; teaches dodge rhythm |

**Boss: Slime King**
- HP: 300 | Damage: 15 | Aggro range: 100 px
- Phase 1: Wanders, occasionally splits into 2 Mini Slimes
- Phase 2 (<50% HP): Splits again, 4 total Mini Slimes, faster movement
- Drop: Iron Band (uncommon accessory), XP ×3 bonus

**Mechanics introduced:**
- WASD movement + diagonal normalization
- Spacebar basic attack
- HP bar (player and enemy)
- Item pickup (auto-collect on overlap)
- Waystone fast travel (unlocks after boss kill)

**Difficulty target:** Low. Player should win every encounter on first try. No death expected.

**Quest hub:** Merchant Cabin (NPC: Elda the Trader)
- Quest: "Clear the Slime Burrow" — kill 5 slimes → reward: 50g, Leather Vest
- Quest: "Find my lost satchel" — loot chest at fork → reward: 25g, 2× Health Potion

---

#### Zone 2: Dusty Trail (Levels 3–5)

| Property | Value |
|---|---|
| Biome | Plains / Desert edge |
| Tileset | `tileset_plains.png` |
| World size | 3×2 zone tiles |
| Ambient | Wind, dry heat shimmer |
| Palette shift | Day + Dusk (15-min day cycle introduced) |

**Layout:**
```
         [Bandit Camp (optional)]
             ↑
[Waystone] → [Crossroads Town] → [Canyon Pass] → [Desert Outpost]
                                      ↓
                               [Hidden Ravine]
```
First branching layout. The Bandit Camp branch is optional but rewards well. Canyon Pass is the critical path. Hidden Ravine contains a craftable blueprint scroll (teaches crafting preview).

**Encounters:**
| Enemy | Count | HP | Damage | Notes |
|---|---|---|---|---|
| Dust Beetle | 12 | 45 | 10 | High aggro range (120 px); teaches active kiting |
| Sand Bandit | 6 | 80 | 18 | Ranged rock throw (first ranged enemy); teaches dodge-then-approach |
| Cactus Sentry | 3 | 120 | 0 (reflects) | Teaches "don't attack this type" |

**Boss: Bandit Chief Korran**
- HP: 600 | Damage: 25 (melee) / 12 (thrown knife, 150 px range)
- Phase 1: Melee circles player
- Phase 2 (<40% HP): Calls 3 Sand Bandits; switches to ranged throw
- Drop: Steel Dagger (rare weapon, +5 ATK), Skill Point ×1

**Mechanics introduced:**
- Day/Dusk cycle (visual only at this stage; no gameplay effect yet)
- Ranged enemies (dodge window displayed via telegraph red arc)
- First Skill Point (opens Skill Tree UI — passive only: +10% HP or +5% ATK)
- LLM Quest Board at Crossroads Town (one auto-generated quest per day)

**Difficulty target:** Easy-Medium. First ranged enemy death expected for ~40% of new players. Respawn within zone, no penalty.

---

#### Zone 3: Ironveil Ruins (Levels 5–7)

| Property | Value |
|---|---|
| Biome | Dungeon (outdoor ruins) |
| Tileset | `tileset_dungeon_outdoor.png` |
| World size | 3×3 zone tiles |
| Ambient | Distant rumbles, echo |
| Palette shift | Day + Night (full cycle unlocked) |

**Layout:**
```
[Ruins Gate] → [Outer Court] → [Library Hall] ←→ [Artifact Vault]
                     ↓                                   ↓
              [Underground Passage] ——————————→ [Boss Chamber]
```
First non-linear zone. Players can approach the boss chamber via the main path (Library → Vault → Chamber) or a shortcut (Underground Passage). The shortcut skips two encounter rooms but is darker and has no waystone inside.

**Encounters:**
| Enemy | Count | HP | Damage | Notes |
|---|---|---|---|---|
| Ruin Wraith | 8 | 90 | 20 | Phases in/out (0.5s intangible); teaches timing windows |
| Stone Golem | 4 | 200 | 35 | Slow but high HP; teaches focus-fire |
| Cursed Archer | 6 | 70 | 22 (ranged) | Shoots every 2s; teaches cover-seeking |

**Boss: Archon Thessar (corrupted mage)**
- HP: 1,200 | Damage: 30 melee / 40 spell burst
- Mechanic: 4 crystal pillars spawn at zone corners; Archon is immune while all 4 stand
- Player must destroy pillars to damage boss (teaches environmental interaction)
- Phase 2 (<50% HP): Pillars respawn at 50% HP; boss gains homing orb attack
- Drop: Spellweave Cloak (rare armor), Crafting Recipe: Iron Ingot → Steel Plate

**Mechanics introduced:**
- Night cycle (enemy aggro range +20% at night, ambient darkness, town closes shops)
- Crafting station (Ironveil Forge at Ruins Gate): combine 3 Iron Ore → 1 Iron Ingot
- Environmental hazard interaction (crystal pillars)
- Reputation introduction: completing zone quest +50 "Mages Guild" rep

**Difficulty target:** Medium. Players should die at least once to Archon's pillar phase. Zone is completable without dying to regular enemies if player has upgraded from Zone 1–2 loot.

---

#### Zone 4: Saltmarsh Harbor (Levels 7–10)

| Property | Value |
|---|---|
| Biome | Ocean / Coastal |
| Tileset | `tileset_ocean.png` |
| World size | 4×3 zone tiles |
| Ambient | Waves, seagulls, distant ship horn |
| Palette shift | Full cycle + storm event (random, visual only) |

**Layout:**
```
[Harbor Docks] → [Fish Market] → [Merchant Fleet HQ]
      ↓                ↓
[Sea Cave Entrance] → [Coral Grotto] → [Sunken Vault] → [Kraken Boss Arena]
```
Widest Tier 1 zone. The Fish Market is the social hub — players can trade here. Sea Cave introduces underwater movement (no combat underwater in v1; swim to chest, surface to fight).

**Encounters:**
| Enemy | Count | HP | Damage | Notes |
|---|---|---|---|---|
| Sea Crab | 15 | 60 | 12 | Sideways scuttle AI; very predictable |
| Siren Wisp | 6 | 110 | 28 | Charm effect: player moves toward wisp for 2s; teaches status resist |
| Corsair Raider | 8 | 140 | 32 | Blocks attacks with shield 40% of time; teach attack from flanks |
| Coral Guardian | 3 | 300 | 45 | Attached to fixed coral columns; teaches positional combat |

**Boss: Maw of the Deep (Kraken)**
- HP: 2,500 | Damage: 40 (tentacle slam) / 60 (ink spray, slows 50% for 3s)
- Mechanic: 4 tentacles extend from arena walls; player must sever tentacles to reach central eye (only damageable point)
- Phase 2 (<30% HP): 2 tentacles regenerate; eye gains shield every 20s (break via last severed tentacle stump)
- Drop: Kraken Scale Mail (rare armor, +water resist), Waystone Anchor (enables ocean fast-travel between harbor zones), NFT eligibility unlocked (Level 10 gate)

**Mechanics introduced:**
- Charm status effect and status resist mechanic
- Player-to-player trade (Fish Market trading post)
- First guild invitation popup (can join a guild; guild system fully unlocked at Level 10)
- NFT minting eligibility (Level 10 gate) — shown as preview, not yet active

**Difficulty target:** Medium-Hard. Kraken is designed to kill first-timers (~70% first-attempt death rate). Clear recovery: respawn at Harbor Docks, no dungeon wipe penalty yet (Tier 2+ introduces wipe penalties).

**Tier 1 completion reward:**
- Title: "Seafarer"
- Unlock: Guild creation, NFT minting, LLM quest personalization (quests now track player's faction rep and history)

---

### TIER 2 — Mid-Game: Biome Exploration (Levels 10–30)

**Design goal:** Open the world. Players choose their biome path. Difficulty spikes meaningfully; death has stakes (dropped resources). Crafting, skill trees, and reputation become central to progression.

Zone order within Tier 2 is **player-chosen** from the Crossroads of Worlds hub (Level 10 unlock). Recommended order: Forest Deep → Ember Waste → Frostpeak → Shadow Bog → Sky Reaches. All are designed to be viable in any order with appropriate gear from prior zones.

---

#### Zone 5: Forest Deep (Levels 10–15)

| Property | Value |
|---|---|
| Biome | Dense Forest / Ancient Grove |
| Tileset | `tileset_forest_deep.png` |
| World size | 5×4 zone tiles |
| Ambient | Dense canopy drip, nocturnal insects |
| Special | First zone with hidden sub-areas (invisible path tiles) |

**Layout:**
```
[Ancient Grove Gate]
     ↓
[Canopy Village] ←→ [Fungal Hollow] ←→ [Druid Circle]
     ↓                    ↓
[Root Labyrinth] ——→ [Heartwood] ——→ [World Tree Chamber]
```
Canopy Village is a faction hub (Druids of the Ancient Grove). Fungal Hollow has resource nodes for alchemy. Root Labyrinth is the first true maze — automap required.

**Encounters:**
| Enemy | Count (avg) | HP | Damage | Notes |
|---|---|---|---|---|
| Thornback Wolf | 18 | 150 | 40 | Pack AI: if 3+ in aggro range, coordinate flank attack |
| Ancient Dryad | 8 | 260 | 55 (melee) + root trap | Root traps immobilize player 2s; teaches positional awareness |
| Corrupted Treant | 4 | 500 | 70 (AoE stomp) | Ground-shake telegraph (0.7s) before stomp |
| Spore Bomb | 6 | 80 | 0 (explodes on death) | Teach: don't kill near allies or in doorways |

**Boss: Malgrath, the Corrupted Heartwood**
- HP: 6,000 | Damage: 60 stomp / 80 thorn spray (cone)
- Phase 1: Ground-shake AoE, spawns Thornback Wolves
- Phase 2 (<60% HP): Gains thorn spray; root traps appear in arena randomly
- Phase 3 (<25% HP): Arena shrinks (roots encroach); movement space reduced by 30%
- Drop: Heartwood Staff (rare magic weapon), Ancient Grove faction +200 rep, Blueprint: Nature's Armor set

**Mechanics introduced:**
- Reputation gates: Canopy Village crafting station requires 100+ Druid rep
- Dungeon wipe penalty: party wipe at boss returns to zone entrance, 5-minute cooldown
- Automap (zone overview map hotkey M — shows explored tiles)
- Potion crafting (Fungal Hollow node drops used in alchemy recipes)

**Difficulty target:** Hard. Pack AI wolves will kill players who don't control crowd. Treant AoE kills unprepared players frequently.

---

#### Zone 6: Ember Waste (Levels 13–18)

| Property | Value |
|---|---|
| Biome | Volcanic / Lava |
| Tileset | `tileset_volcanic.png` |
| World size | 4×5 zone tiles |
| Ambient | Low rumble, crackling, distant eruptions |
| Hazard | Lava tiles: 10 dmg/s on contact; player must path around or use Fire Resist buff |

**Layout:**
```
[Cinder Gate] → [Forge Town] → [Lava Plains] → [Obsidian Spire]
                    ↓                                   ↓
              [Sulfur Caves] ——————————————→ [Caldera Boss Arena]
```
Forge Town is the economy hub — best smithing NPCs in Tier 2. Sulfur Caves have rare ore nodes (Obsidian, Magmaite) for endgame weapon crafting.

**Encounters:**
| Enemy | Count (avg) | HP | Damage | Notes |
|---|---|---|---|---|
| Ember Imp | 20 | 120 | 35 + burn (5/s, 3s) | Burn status introduced |
| Lava Golem | 6 | 700 | 90 (ground slam) | Immune to fire damage |
| Magma Serpent | 8 | 350 | 55 | Burrowing AI: disappears underground 3s, resurfaces near player |
| Firebomb Bat | 10 | 60 | 40 (explosion on death) | Flock AI; patrol near lava |

**Boss: Caldera Tyrant Ignarr**
- HP: 9,500 | Damage: 80 melee / 120 meteor strike (telegraphed AoE, 1.5s warning)
- Mechanic: Arena has 6 lava vents; every 30s one activates (deals 15/s standing on it). Boss uses vents strategically.
- Phase 2 (<50% HP): Ignarr gains continuous burn aura (5 dmg/s in 60px radius)
- Drop: Magmaite Greatsword (rare), Caldera's Ember (crafting material for Fire Resist gear), Forge Town rep +300

**Mechanics introduced:**
- Burn/Poison status effects and consumable antidotes
- Fire Resist stat (gear affixes introduced here)
- Player Housing preview: purchase a lot in Forge Town for 500g (builds later)
- First world event hint: "Ignarr weakens the ward — the Ember Tide comes in 3 days" (LLM world event trigger)

**Difficulty target:** Hard. Lava tiles create constant spatial pressure. Meteor AoE kills 90% of first-timers at least once.

---

#### Zone 7: Frostpeak Highlands (Levels 16–22)

| Property | Value |
|---|---|
| Biome | Ice / Tundra |
| Tileset | `tileset_ice.png` |
| World size | 5×5 zone tiles |
| Ambient | Howling wind, blizzard effect (periodic) |
| Hazard | Blizzard: every 5 minutes, 30s duration — visibility halved, movement speed -15% |

**Layout:**
```
[Summit Village] ←→ [Frozen Lake] ←→ [Glacier Ridge] ←→ [Blizzard Pass]
      ↓                                                         ↓
[Ice Caves] ——→ [Crystal Depths] ——→ [Permafrost Vault] ——→ [Colossus Throne]
```
Largest Tier 2 zone. Summit Village has the most advanced crafting NPCs (Ice-steel gear). Crystal Depths has puzzles (pressure-plate door triggers — first puzzle mechanic).

**Encounters:**
| Enemy | Count (avg) | HP | Damage | Notes |
|---|---|---|---|---|
| Frost Wolf | 22 | 200 | 50 | Freeze attack (1.5s immobilize, 3s cooldown per wolf) |
| Ice Elemental | 10 | 400 | 70 | Splits into 2 smaller elementals at 50% HP |
| Blizzard Drake | 4 | 800 | 100 (breath AoE) | Flying — ranged attacks only during flight phase |
| Glacier Titan | 2 | 1,500 | 130 (stomp AoE 120px) | Slow; giant boss enemy type |

**Boss: Colossus of Permafrost**
- HP: 15,000 | Damage: 110 punch / 160 ice breath (wide cone, 2s telegraph)
- Giant boss type (48×48 sprite): occupies 25% of arena
- Mechanic: Ice pillars spawn around arena; reflect ice breath back at boss for phase transition (puzzle mechanic)
- Phase 2 (<45% HP): Colossus begins slow arena freeze — floor becomes slippery (reduce traction) and shrinks safe area over 3 minutes
- Drop: Permafrost Crown (legendary armor, Cold Resist +40%), Frostpeak Sigil (crafting key material), Achievement: "Giant Slayer"

**Mechanics introduced:**
- Puzzle mechanics (pressure plates, reflect-back boss interactions)
- Achievement system (first achievement)
- Legendary gear tier (gold-bordered, NFT-eligible)
- Cold/Freeze resist stat

---

#### Zone 8: Shadow Bog (Levels 20–26)

| Property | Value |
|---|---|
| Biome | Cursed Swamp |
| Tileset | `tileset_swamp.png` |
| World size | 4×4 zone tiles |
| Ambient | Insect drone, bubbling mud, distant wailing |
| Hazard | Bog tiles: -25% movement speed, +10% enemy aggro range (enemies detect player faster) |
| Night modifier | At night, cursed will-o-wisps spawn (wander, deal 8 shadow dmg/s in 30px radius) |

**Layout:**
```
[Bogwarden's Post] → [Mudflat] → [Sunken Village] → [Necromancer's Reach]
                         ↓               ↓
                    [Hex Grotto] → [Drowned Cathedral] → [Lich Boss Chamber]
```
Shadow Bog is the most narrative-heavy zone. Sunken Village has lore terminals (LLM-generated story fragments for the Bog's backstory). Necromancer's Reach is a faction dungeon for the Mages Guild questline.

**Encounters:**
| Enemy | Count (avg) | HP | Damage | Notes |
|---|---|---|---|---|
| Bog Lurker | 20 | 220 | 55 + poison | Bog tiles regenerate lurkers (5s respawn if player leaves tile) |
| Shadow Wraith | 12 | 300 | 70 + blind (2s) | Blind reduces player visibility range by 60% |
| Cursed Knight | 8 | 600 | 95 | Shield blocks frontal attacks; must hit from behind or break shield (3 hits) |
| Lich Acolyte | 6 | 400 | 80 + summon (2 skeletons) | Kills summons first to reduce pressure |

**Boss: Lich Lord Vaetheron**
- HP: 20,000 | Damage: 90 necro bolt / 140 death field (arena pulse every 45s)
- Mechanic: Vaetheron becomes immune and retreats to crystal cage; player must defeat his 4 phylactery guardians to break immunity (DPS race mechanic — if guardians aren't killed within 60s, Vaetheron heals 3,000 HP)
- Phase 2 (<35% HP): Death field every 20s; raises dead enemies from the battle as zombie minions
- Drop: Staff of Unraveling (legendary magic weapon), Undead Slayer Title, Mages Guild rep +500

**Mechanics introduced:**
- Blind / vision-reduction status
- DPS race mechanic (timed immunity break)
- Lore terminals and narrative collectibles
- Mages Guild faction quest arc begins

**Difficulty target:** Very Hard. Lich phase 2 zombie wave combined with death field kills most groups without coordination. First true test of party synergy for multiplayer.

---

#### Zone 9: Sky Reaches (Levels 24–30)

| Property | Value |
|---|---|
| Biome | Sky / Cloud Islands |
| Tileset | `tileset_sky.png` |
| World size | 6×4 zone tiles |
| Ambient | Whistling wind, eagle cries, distant thunder |
| Hazard | Fall zones: step off island edge → fall damage based on height; Featherfall consumable (craftable) negates |
| Special | Sky Fortress: procedurally generated interior layout (new each reset, 7-day timer) |

**Layout:**
```
[Cloud Landing] → [Sky Village] → [Storm Platform] → [Eagle Aerie]
                       ↓                                    ↓
              [Floating Ruins] → [Sky Fortress (instance)] → [Storm Throne]
```
Sky Village is a premium crafting hub — highest-quality Tier 2 gear. Sky Fortress is the first instanced dungeon (party of up to 4; layout reshuffles every week).

**Encounters:**
| Enemy | Count (avg) | HP | Damage | Notes |
|---|---|---|---|---|
| Storm Hawk | 25 | 250 | 60 | Flying, dive-bomb attack (fast, narrow AoE) |
| Sky Colossus Fragment | 8 | 700 | 110 | Gravity slam (pulls player toward enemy) |
| Wind Djinn | 6 | 500 | 85 + windblast (knockback 100px) | Windblast can push player off island edges |
| Thunder Drake | 4 | 1,000 | 120 + lightning chain | Chain jumps to 2 nearby players |

**Boss: Storm King Aerenthor**
- HP: 35,000 | Damage: 130 melee / 180 lightning storm (multiple strike zones, 3s telegraph)
- Mechanic: Storm platform rotates mid-fight (floor tiles change); safe zones shift every 20s
- Phase 2 (<40% HP): Aerenthor takes flight — only ranged attacks hit; melee players must use Sky Platform jump pads to close distance
- Phase 3 (<15% HP): ALL platforms electrify — player must stand on the single safe cloud (last 10s burst phase)
- Drop: Aerenthor's Mantle (legendary cloak), Sky Reaches Access Key (opens Sky Fortress instance), Achievement: "Storm Rider"

**Mechanics introduced:**
- Instanced dungeon system (party grouping, private instance)
- Flying enemies requiring ranged response
- Platform rotation / dynamic arena floor
- Jump pads (positional traversal mechanic)

**Tier 2 completion reward:**
- Title: "World Walker"
- Unlock: Guild raid content, Player Housing construction, NFT land parcels go on sale, Sky Fortress weekly reset

---

### TIER 3 — Endgame (Levels 30–50)

**Design goal:** Horizontal progression replaces vertical. Gear power plateaus; players optimize for cosmetics, rare blueprints, land ownership, and guild standing. Content is harder but rewards shift from power to prestige. World events and LLM storylines drive daily engagement.

---

#### Zone 10: Void Rift (Levels 30–38)

| Property | Value |
|---|---|
| Biome | Void / Dimension breach |
| Tileset | `tileset_void.png` |
| World size | 5×5 zone tiles |
| Ambient | Dimensional static, reality distortion audio |
| Hazard | Rift tears: 10 tiles randomly become void (instakill) for 10s; 30s between occurrences |

**Layout:**
```
[Rift Observation Post] → [Reality Seam] → [Shattered Plane] → [Echo Chamber]
                                                   ↓
                              [Void Core (endgame instance)] → [Nullborn Arena]
```
Void Core is the hardest instance in the game (8-player raid). Echo Chamber contains lore about the LLM world events origin.

**Encounters:**
| Enemy | Count (avg) | HP | Damage | Notes |
|---|---|---|---|---|
| Void Stalker | 30 | 350 | 80 + phase shift | Phase shift: teleports 80px toward player mid-attack |
| Reality Phantom | 15 | 500 | 110 | Mirrors player movement (moves same direction after 0.3s delay) |
| Nullborn Titan | 6 | 2,500 | 160 (AoE pulse 200px) | Once per 60s: pulls ALL players to center of arena |
| Rift Crawler | 10 | 600 | 90 | Spawns from void tiles — can't be agroed until void activates |

**Boss: Nullborn Sovereign**
- HP: 80,000 | Damage: 200 melee / 250 reality erasure (massive AoE, requires 8-player dodge)
- Mechanic: True 8-player raid encounter. Multiple simultaneous role tasks (tank boss, kill adds, disable rift anchors, revive downed allies)
- Phase 2 (<50% HP): Half of arena becomes permanent void; players fight in shrinking safe zone
- Phase 3 (<20% HP): Sovereign clones itself (2 targets); DPS must split and synchronized kill within 10s
- Drop: Void Fragment (legendary crafting material), Reality Anchor (unique guild trophy item), Nullborn Sovereign Title (prestige)

---

#### Zone 11: Sunken Titan's Trench (Levels 34–42)

| Property | Value |
|---|---|
| Biome | Deep Ocean |
| Tileset | `tileset_deep_ocean.png` |
| World size | 4×6 zone tiles |
| Ambient | Pressure throbs, alien ambience, bioluminescent glow |
| Hazard | Pressure buildup: every 30s in deep zones, -10 HP pulse unless wearing Deep Sea gear |

**Layout:**
```
[Trenchwarden Base] → [Abyssal Shelf] → [Leviathan's Jaw] → [Titan Corpse Cavern]
                             ↓
               [Biolume Grotto] → [Depth Raid (8-player)] → [Titan Heart Chamber]
```

**Boss: The Sleeping Titan (Undead Colossus)**
- HP: 200,000 | Party of 8 required
- Three-phase raid: Phase 1 (clear Titan's organ rooms), Phase 2 (race up Titan spine as it rises), Phase 3 (aerial fight on Titan's shoulder as he surfaces)
- Drop: Titan's Heartstone (raid trophy, guild display item), Titan's Tear (legendary material), Achievement: "Titan's Bane"

---

#### Zone 12: Guild Territory Zones (Levels 30–50, ongoing)

| Property | Value |
|---|---|
| Type | Contested PvP zones (opt-in) |
| Locations | 6 territory hexes scattered across world map |
| Reset | Weekly |
| Stakes | Guilds that hold territory receive: passive gold income, crafting station bonuses, exclusive blueprint access |

**Mechanics:**
- Guild vs. Guild (GvG) battle: guilds schedule combat windows (from guild management UI)
- Territory capture: plant guild banner at control point; hold for 5 minutes with at least 3 guild members present
- NFT stakes option: guilds may stake guild NFT items; loser forfeits item to winner (consensual only)
- Territory perks: crafting speed +20%, gold tax income per day, exclusive dye blueprints

---

#### Zone 13: Season Arc Zones (Levels 40–50, seasonal)

Each 3-month season introduces a new zone with LLM-authored storyline. Season 1 sample:

**The Amber Plague (Season 1)**

| Property | Value |
|---|---|
| Biome | Corrupted Plains (Tier 1 zones afflicted by plague event) |
| World size | Overlaid on existing zones (environmental corruption visual) |
| Duration | 90 days |

**Season Encounter: Plague Swarm**
- Spawns in any Zone 1–4 at night during the season
- HP: 800 | Damage: 100 + plague (stacking -5% damage output per stack, 10 max)
- Drops: Amber Vial (seasonal currency)

**Season Boss: The Amber Sovereign (Level 50 world boss)**
- Spawns in Crossroads of Worlds hub every 48 hours
- HP: 500,000 (scales with number of participating players; target: 20-40 players)
- Drops: Amber Crown (seasonal legendary), Amber Land Deed (seasonal NFT), Season Title

**Season rewards (cumulative points):**
- 1,000 pts: Season Avatar Border
- 5,000 pts: Amber Weapon Skin (cosmetic NFT)
- 15,000 pts: Amber Estate Blueprint (player housing)
- 30,000 pts: "Plague Ender" title + season trophy for guild hall

---

## Part 2 — Progression Curve

### Character Power Scaling

| Level Range | Zone Tier | Enemy HP (avg) | Player HP (avg) | Player DPS (avg) | Kill Time |
|---|---|---|---|---|---|
| 1–3 | T1 Z1 | 30–50 | 100 | 50/s | 0.6–1.0s |
| 3–7 | T1 Z2–3 | 45–200 | 150–200 | 65/s | 0.7–3.0s |
| 7–10 | T1 Z4 | 60–300 | 200–280 | 80/s | 0.75–3.75s |
| 10–15 | T2 Z5 | 150–500 | 350–450 | 110/s | 1.4–4.5s |
| 15–22 | T2 Z6–7 | 200–1500 | 450–650 | 150/s | 1.3–10s |
| 22–30 | T2 Z8–9 | 250–35,000 | 650–1,000 | 200/s | 1.25s–175s (boss) |
| 30–38 | T3 Z10 | 350–80,000 | 1,200–1,600 | 280/s | 1.25s–286s (raid boss) |
| 38–50 | T3 Z11–13 | 600–500,000 | 1,600–2,000 | 350/s | 1.7s–1,428s (world boss) |

**Curve philosophy:**
- Regular enemy kill time should stay in the **0.75–2.5s** range throughout. Enemies get more HP but player DPS scales proportionally.
- Boss kill times scale dramatically with tier: T1 bosses are ~30s solo fights; T3 raid bosses are 5–25 minute group encounters.
- Gear upgrades account for ~60% of player power growth; skill tree investments account for ~25%; player skill accounts for ~15%.

### XP Curve

Level-up XP requirement follows: `XP_required(L) = 100 × L^1.6`

| Level | XP to next | Cumulative XP |
|---|---|---|
| 1 | 100 | 0 |
| 5 | 760 | 1,855 |
| 10 | 2,512 | 9,938 |
| 20 | 7,962 | 56,000 |
| 30 | 16,730 | 180,000 |
| 40 | 29,000 | 430,000 |
| 50 | (prestige) | 800,000 |

**Session XP yield:** A focused 15-minute session should yield approximately 1.5–2 levels at L1–10, 0.5–1 level at L10–30, and 0.1–0.3 levels at L30–50 (endgame is intentionally slower).

---

## Part 3 — Unlock Schedule

| Level | Unlocks |
|---|---|
| 1 | Movement, basic attack, HP bar, item pickup, waystone fast travel |
| 3 | Day/Dusk cycle, ranged enemy encounters, Skill Tree UI (passive tier 1) |
| 5 | Crafting stations, LLM quest board, reputation system preview |
| 7 | Night cycle (full), status effects (burn/poison/freeze), automap |
| 10 | Guild system, NFT minting eligibility, Player Housing preview, LLM quest personalization |
| 12 | Skill Tree tier 2 (active skills: Fireball, Shield Bash, Arrow Shot by class) |
| 15 | Advanced crafting (legendary material tier), Player Housing construction |
| 18 | Skill Tree tier 3 (class specialization: 3 branches per class) |
| 20 | Dungeon wipe penalty → Party revive crystal mechanic (one-use per run) |
| 22 | Achievement system, instanced dungeons (private), Guild raid unlock |
| 25 | NFT land parcels available for purchase |
| 28 | Skill Tree tier 4 (prestige passives: class-defining capstones) |
| 30 | Endgame opens: Void Rift, GvG territory zones, horizontal progression mode |
| 35 | 8-player raid content, Guild treasury features, Marketplace advanced filters |
| 40 | Season Arc zone access, World boss participation |
| 45 | Hardcore mode unlock (permadeath, separate leaderboard) |
| 50 | Prestige: choose to reset to Level 1 with a permanent bonus (+5% XP, cosmetic border, Prestige title) |

### Skill Tree Overview

Each of the 4 classes (Warrior, Mage, Ranger, Artisan) has 3 specialization branches:

| Class | Branch A | Branch B | Branch C |
|---|---|---|---|
| Warrior | Berserker (raw DPS, low defense) | Paladin (tanking, support auras) | Warlord (AoE, crowd control) |
| Mage | Elementalist (elemental damage, area spells) | Arcanist (single-target, debuffs) | Summoner (minion AI, buff pets) |
| Ranger | Sniper (long-range, stealth) | Trickster (traps, poison, mobility) | Beastmaster (pet companion, pack tactics) |
| Artisan | Smith (crafted gear bonuses, weapon enhance) | Alchemist (potions, buffs, debuffs) | Merchant (economy buffs, gold generation) |

Branch locked at Level 18; second branch unlock at Level 35 (hybrid build).

---

## Part 4 — Pacing Map

The following maps tension (combat intensity, stakes, difficulty) against relief (exploration, narrative, social, crafting) across the full player journey.

### Tension/Relief Rhythm — Visual Overview

```
TENSION ↑

  █████  T1 BOSS 4       ████    T2 BOSS 7    ████  T2 BOSS 9
  ████             ███████           ███████               ███████ T3 RAID
  ████      ████████                 ████████               ████████
  ████   ███                         █████              ████████
  ████  █               █████          █████          ████████
  ████ █          ██████     █       ███    █        ████  ████
  ████████   █████████████████████████████████████████████████████
──────────────────────────────────────────────────────────────── → LEVEL
L1    L5    L10   L15   L20   L25   L30   L35   L40   L45   L50

RELIEF ↓ (crafting, questing, housing, social, narrative)
```

### Detailed Pacing By Zone

| Zone | Levels | Tension Phase | Relief Phase | LLM Narrative Hook |
|---|---|---|---|---|
| Verdant Hollow | 1–3 | Tutorial combat (low) | Merchant NPC intro, exploration reward | "Welcome to PixelRealm" onboarding quest |
| Dusty Trail | 3–5 | First ranged combat spike | Crossroads Town trade, first LLM quest board | "Bandits are disrupting the trade road" |
| Ironveil Ruins | 5–7 | Environment puzzle tension | Crafting forge, Mages Guild intro | "Ancient ruin holds secrets of the Old Kingdom" |
| Saltmarsh Harbor | 7–10 | Kraken raid intensity | Fish Market social hub, guild preview | "The Kraken stirs — merchants pay well for its defeat" |
| *(Tier 1 → Tier 2 transition)* | 10 | Guild formation, major choice moment | World map opens, Housing unlocked | World opens — player's choices begin to matter |
| Forest Deep | 10–15 | Pack AI difficulty spike | Canopy Village culture, alchemy crafting | "The grove is corrupted — druids seek a champion" |
| Ember Waste | 13–18 | Lava hazard pressure | Forge Town economy hub, first world event | "Ignarr's defeat weakens the ward; the Ember Tide rises" |
| Frostpeak | 16–22 | Blizzard + puzzle tension | Summit Village crafting, Achievement milestone | "Legends tell of a Titan frozen at the peak for 10,000 years" |
| Shadow Bog | 20–26 | DPS race + vision loss | Lore terminals, Mages Guild arc climax | "Vaetheron was once a hero — what turned him?" |
| Sky Reaches | 24–30 | Dynamic arena + platform risk | Sky Village crafting, first instanced dungeon | "Storm King claims the sky belongs to no mortal" |
| *(Tier 2 → Tier 3 transition)* | 30 | Plateau — tension decreases | Horizontal progression begins, GvG opens | World shifts to player-driven narrative |
| Void Rift | 30–38 | Highest solo danger, rift instakills | Guild cooperation unlocks new narrative | "The rift tears at reality — where does it lead?" |
| Titan's Trench | 34–42 | Raid difficulty peak | Guild trophy display, prestige items | "The Sleeping Titan — some gods should never wake" |
| Guild Territory | 30–50 | PvP tension (weekly) | Guilds collaborate between wars | Player-driven political narratives |
| Season Arc | 40–50 | World boss escalation | Seasonal story climax, prestige rewards | LLM-authored multi-chapter seasonal arc |
| Prestige | 50 | Final identity choice | Permanent benefit locked in | "A legend chooses their legacy" |

### Beat Map — First Hour

| Minute | Activity | Feeling | Designer Goal |
|---|---|---|---|
| 0:00 | Create character, enter world at Verdant Hollow | Wonder, slightly lost | First impression: beautiful, safe world |
| 2:00 | First slime kill → item pickup sparkle, XP orb | Satisfying, immediate | Establish kill → reward loop |
| 5:00 | Reach Merchant Cabin, receive first quest | Purposeful | Give the player a goal |
| 8:00 | Fork in path → optional chest route | Curious, rewarded | Teach exploration has value |
| 12:00 | Mushroom Creep encounter — first death (for ~30% of players) | Brief frustration → recovery | First-death is a teaching moment, not a punishment |
| 18:00 | Slime King boss encounter | Excitement, challenge | First memorable fight |
| 22:00 | Slime King defeated — waystone unlocks | Achievement, progression | Player owns their first landmark |
| 30:00 | Enter Dusty Trail, first LLM quest board visible | Novel, curious | Hint that the world is alive and personalized |
| 45:00 | Ranged enemy (Sand Bandit) kills player | Surprise → adaptation | Expands the tactical model |
| 55:00 | Bandit Chief Korran boss — second memorable fight | Escalation | Player sees the game has more depth |
| 60:00 | Level 5 reached, Skill Point earned | Agency | Player expresses preference for first time |

### Weekly Engagement Loop

| Day | Designed Activity |
|---|---|
| Mon | LLM daily quests refresh; new quest hooks |
| Tue | Normal progression / crafting |
| Wed | Sky Fortress instance reset (new layout); guild raid scheduling |
| Thu | World event check (LLM may trigger Ember Tide, Amber Plague pulse, etc.) |
| Fri | Guild Territory GvG battle windows peak (most players online) |
| Sat | World Boss spawn (if scheduled by LLM event) |
| Sun | Season arc chapter reveal (if in active season); weekly crafting bonus |

---

## Appendix A — Enemy Roster Summary

| Enemy | Zone | HP Range | Damage | Special |
|---|---|---|---|---|
| Green Slime | Z1 | 30 | 5 | Splits on boss death |
| Mushroom Creep | Z1 | 50 | 8 | Burst movement |
| Dust Beetle | Z2 | 45 | 10 | High aggro |
| Sand Bandit | Z2 | 80 | 18 | Ranged |
| Cactus Sentry | Z2 | 120 | 0 | Reflect |
| Ruin Wraith | Z3 | 90 | 20 | Phasing |
| Stone Golem | Z3 | 200 | 35 | Tank |
| Cursed Archer | Z3 | 70 | 22 | Ranged cover |
| Sea Crab | Z4 | 60 | 12 | Predictable AI |
| Siren Wisp | Z4 | 110 | 28 | Charm |
| Corsair Raider | Z4 | 140 | 32 | Shield block |
| Thornback Wolf | Z5 | 150 | 40 | Pack flanking |
| Ancient Dryad | Z5 | 260 | 55 | Root trap |
| Ember Imp | Z6 | 120 | 35+burn | Burn status |
| Magma Serpent | Z6 | 350 | 55 | Burrowing |
| Frost Wolf | Z7 | 200 | 50 | Freeze |
| Ice Elemental | Z7 | 400 | 70 | Splits at 50% |
| Bog Lurker | Z8 | 220 | 55+poison | Tile regen |
| Shadow Wraith | Z8 | 300 | 70+blind | Blind |
| Storm Hawk | Z9 | 250 | 60 | Flying dive |
| Wind Djinn | Z9 | 500 | 85+knockback | Knockback off edges |
| Void Stalker | Z10 | 350 | 80+phase | Teleport |
| Nullborn Titan | Z10 | 2,500 | 160 | Arena pull |

---

## Appendix B — Boss Reference

| Boss | Zone | HP | Players | Drop |
|---|---|---|---|---|
| Slime King | Z1 | 300 | 1 | Iron Band, XP ×3 |
| Bandit Chief Korran | Z2 | 600 | 1 | Steel Dagger, Skill Point |
| Archon Thessar | Z3 | 1,200 | 1–2 | Spellweave Cloak, Recipe |
| Maw of the Deep (Kraken) | Z4 | 2,500 | 1–4 | Kraken Scale Mail, Waystone Anchor |
| Malgrath, Corrupted Heartwood | Z5 | 6,000 | 1–4 | Heartwood Staff, Blueprint |
| Caldera Tyrant Ignarr | Z6 | 9,500 | 1–4 | Magmaite Greatsword, Crafting Mat |
| Colossus of Permafrost | Z7 | 15,000 | 1–4 | Permafrost Crown (legendary) |
| Lich Lord Vaetheron | Z8 | 20,000 | 1–6 | Staff of Unraveling (legendary) |
| Storm King Aerenthor | Z9 | 35,000 | 1–6 | Aerenthor's Mantle (legendary) |
| Nullborn Sovereign | Z10 | 80,000 | 8 (raid) | Void Fragment, Reality Anchor |
| The Sleeping Titan | Z11 | 200,000 | 8 (raid) | Titan's Heartstone, Titan's Tear |
| Amber Sovereign | Season 1 | 500,000 | 20–40 (world) | Amber Crown (seasonal legendary) |

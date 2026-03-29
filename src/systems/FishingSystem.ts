/**
 * FishingSystem — core fishing logic, data tables, and state machine.
 *
 * State machine:
 *   idle → casting → waiting → biting → reeling → success | fail → idle
 *
 * Phases:
 *  1. casting:  Player holds/releases to set cast power (bar fills).
 *  2. waiting:  Random bite delay based on zone / bait / skill level.
 *  3. biting:   Splash animation; player has BITE_WINDOW_MS to start reel.
 *  4. reeling:  Timing mini-game — tension bar moves, player taps to keep in zone.
 *  5. result:   Fish (or junk) is caught; XP + item awarded.
 *
 * External callers (FishingPanel / GameScene) drive state transitions by
 * calling startCast(), releaseCast(), startReel(), reelTick(), and cancel().
 * This class owns only state; rendering is handled by FishingPanel.
 */

// ── Fish database ─────────────────────────────────────────────────────────────

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'junk';

export interface FishDef {
  id:          string;
  name:        string;
  rarity:      FishRarity;
  baseWeight:  number;    // relative spawn weight (higher = more common)
  xpReward:    number;
  goldValue:   number;
  itemId:      string;    // inventory item id
  assetKey:    string;    // sprite key
  zones:       string[];  // zone ids where this fish appears ([] = all)
  description: string;
}

export const FISH_DEFS: FishDef[] = [
  // Common
  { id: 'forest_trout',      name: 'Forest Trout',      rarity: 'common',    baseWeight: 30, xpReward:  8, goldValue: 5,   itemId: 'fish_forest_trout',     assetKey: 'item_fish_forest_trout',     zones: ['zone1', 'zone2'],           description: 'A speckled trout from forest streams.' },
  { id: 'forest_bass',       name: 'Verdant Bass',      rarity: 'common',    baseWeight: 28, xpReward:  9, goldValue: 6,   itemId: 'fish_forest_bass',      assetKey: 'item_fish_forest_bass',      zones: ['zone1', 'zone2'],           description: 'Striped like the canopy above.' },
  { id: 'river_perch',       name: 'River Perch',       rarity: 'common',    baseWeight: 32, xpReward:  7, goldValue: 4,   itemId: 'fish_river_perch',      assetKey: 'item_fish_river_perch',      zones: ['zone1', 'zone2', 'zone3'],  description: 'Plentiful in shallow waters.' },
  { id: 'desert_catfish',    name: 'Desert Catfish',    rarity: 'common',    baseWeight: 25, xpReward: 10, goldValue: 8,   itemId: 'fish_desert_catfish',   assetKey: 'item_fish_desert_catfish',   zones: ['zone2', 'zone3'],           description: 'Adapted to surprisingly rare oasis pools.' },
  { id: 'desert_sandfish',   name: 'Sandfish',          rarity: 'uncommon',  baseWeight: 18, xpReward: 15, goldValue: 14,  itemId: 'fish_desert_sandfish',  assetKey: 'item_fish_desert_sandfish',  zones: ['zone3', 'zone4'],           description: 'Technically a lizard, but tastes like fish.' },
  // Uncommon
  { id: 'ocean_clownfish',   name: 'Saltmarsh Clown',   rarity: 'uncommon',  baseWeight: 20, xpReward: 18, goldValue: 20,  itemId: 'fish_ocean_clownfish',  assetKey: 'item_fish_ocean_clownfish',  zones: ['zone4', 'zone5'],           description: 'Bright orange, impossible to miss.' },
  { id: 'ocean_tuna',        name: 'Saltmarsh Tuna',    rarity: 'uncommon',  baseWeight: 15, xpReward: 22, goldValue: 25,  itemId: 'fish_ocean_tuna',       assetKey: 'item_fish_ocean_tuna',       zones: ['zone4', 'zone5'],           description: 'Powerful swimmer, excellent in stews.' },
  { id: 'frost_salmon',      name: 'Frost Salmon',      rarity: 'uncommon',  baseWeight: 18, xpReward: 20, goldValue: 22,  itemId: 'fish_frost_salmon',     assetKey: 'item_fish_frost_salmon',     zones: ['zone5', 'zone6'],           description: 'Glows faintly under moonlight.' },
  { id: 'ice_pike',          name: 'Ice Pike',          rarity: 'rare',      baseWeight: 10, xpReward: 35, goldValue: 45,  itemId: 'fish_ice_pike',         assetKey: 'item_fish_ice_pike',         zones: ['zone6', 'zone7'],           description: 'Teeth like icicles, scales like mirrors.' },
  // Rare
  { id: 'volcanic_eel',      name: 'Volcanic Eel',      rarity: 'rare',      baseWeight:  8, xpReward: 40, goldValue: 60,  itemId: 'fish_volcanic_eel',     assetKey: 'item_fish_volcanic_eel',     zones: ['zone8', 'zone9'],           description: 'Swims in molten channels without burning.' },
  { id: 'lava_guppy',        name: 'Lava Guppy',        rarity: 'rare',      baseWeight:  9, xpReward: 38, goldValue: 55,  itemId: 'fish_lava_guppy',       assetKey: 'item_fish_lava_guppy',       zones: ['zone8', 'zone9'],           description: 'Tiny but absurdly hot. Handle with care.' },
  // Legendary
  { id: 'void_anglerfish',   name: 'Void Anglerfish',   rarity: 'legendary', baseWeight:  3, xpReward: 100, goldValue: 250, itemId: 'fish_void_anglerfish', assetKey: 'item_fish_void_anglerfish',  zones: ['zone15', 'zone16', 'zone17'], description: 'Its lure illuminates the abyss. Extremely rare.' },
  { id: 'void_jellyfish',    name: 'Abyss Jellyfish',   rarity: 'legendary', baseWeight:  2, xpReward: 120, goldValue: 300, itemId: 'fish_void_jellyfish',  assetKey: 'item_fish_void_jellyfish',   zones: ['zone15', 'zone16', 'zone18'], description: 'Translucent body reveals galaxies within.' },
  // Junk (always available, no zone restriction)
  { id: 'old_boot',          name: 'Old Boot',          rarity: 'junk',      baseWeight: 15, xpReward:  2, goldValue: 1,   itemId: 'junk_old_boot',         assetKey: 'item_catch_old_boot',        zones: [],                           description: 'Someone lost this long ago.' },
  { id: 'sunken_treasure',   name: 'Sunken Chest',      rarity: 'rare',      baseWeight:  4, xpReward: 50, goldValue: 150, itemId: 'item_treasure_chest',   assetKey: 'item_catch_treasure',        zones: [],                           description: 'Not a fish, but a welcome surprise.' },
];

// ── Rod database ──────────────────────────────────────────────────────────────

export interface RodDef {
  id:         string;
  name:       string;
  rarityBonus: number;  // +% chance of rare/legendary
  reelSpeed:  number;   // affects tension bar speed (lower = easier)
  assetKey:   string;
  goldCost:   number;
}

export const ROD_DEFS: RodDef[] = [
  { id: 'rod_basic',      name: 'Basic Rod',      rarityBonus: 0,   reelSpeed: 1.0, assetKey: 'item_rod_basic',      goldCost: 50  },
  { id: 'rod_reinforced', name: 'Reinforced Rod', rarityBonus: 0.1, reelSpeed: 0.85, assetKey: 'item_rod_reinforced', goldCost: 200 },
  { id: 'rod_master',     name: "Master's Rod",   rarityBonus: 0.25, reelSpeed: 0.7, assetKey: 'item_rod_master',     goldCost: 600 },
];

// ── Fishing state machine ─────────────────────────────────────────────────────

export type FishingState = 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'success' | 'fail';

export interface FishingResult {
  fish:    FishDef;
  weight:  number; // in kg, cosmetic
  isNew:   boolean;
  xp:      number;
  gold:    number;
}

const BITE_WINDOW_MS    = 1500;  // how long the bite indicator stays active
const REEL_ZONE_WIDTH   = 0.30;  // 30% of tension bar is the "safe zone"
const REEL_TICK_GAIN    = 0.12;  // progress gain per reel tick
const REEL_TENSION_DRIFT = 0.018; // tension zone drifts per ms
const REEL_FAIL_THRESHOLD = 10;  // consecutive failed ticks before fish escapes

export class FishingSystem {
  state: FishingState = 'idle';

  /** 0–1 cast power (set during casting phase). */
  castPower   = 0;
  /** 0–1 reel progress (fill toward 1 to catch). */
  reelProgress = 0;
  /** 0–1 tension zone center position on the bar. */
  tensionZonePos = 0.5;
  /** Number of ticks outside the zone. */
  outsideTicks = 0;
  /** Current rod being used. */
  currentRodId = 'rod_basic';
  /** Current zone id (affects fish table). */
  currentZoneId = '';
  /** Fishing skill level (1+). */
  skillLevel = 1;

  private biteTimer: ReturnType<typeof setTimeout> | null = null;
  private tensionDriftDir = 1;

  // Callbacks set by callers
  onStateChange?: (state: FishingState) => void;
  onCatch?: (result: FishingResult) => void;
  onFail?:  () => void;

  // ── State transitions ─────────────────────────────────────────────────────

  startCast(): void {
    if (this.state !== 'idle') return;
    this.castPower   = 0;
    this.reelProgress = 0;
    this.setState('casting');
  }

  /** Call each tick during casting to fill power. Returns current power. */
  chargeCast(deltaMs: number): number {
    if (this.state !== 'casting') return this.castPower;
    this.castPower = Math.min(1, this.castPower + deltaMs / 1200);
    return this.castPower;
  }

  releaseCast(): void {
    if (this.state !== 'casting') return;
    this.setState('waiting');
    // Bite arrives after random delay reduced by skill and cast power
    const baseDelay = Phaser.Math.Between(1800, 5000);
    const skillMod  = 1 - Math.min(0.5, (this.skillLevel - 1) * 0.04);
    const powerMod  = 1 - this.castPower * 0.3;
    const delay     = Math.round(baseDelay * skillMod * powerMod);
    this.biteTimer  = setTimeout(() => this.triggerBite(), delay);
  }

  private triggerBite(): void {
    if (this.state !== 'waiting') return;
    this.setState('biting');
    // If player doesn't react within window, fish escapes
    this.biteTimer = setTimeout(() => {
      if (this.state === 'biting') {
        this.setState('fail');
        this.onFail?.();
        this.reset();
      }
    }, BITE_WINDOW_MS);
  }

  startReel(): void {
    if (this.state !== 'biting') return;
    if (this.biteTimer) { clearTimeout(this.biteTimer); this.biteTimer = null; }
    this.reelProgress  = 0;
    this.tensionZonePos = 0.5;
    this.outsideTicks   = 0;
    this.tensionDriftDir = Math.random() > 0.5 ? 1 : -1;
    this.setState('reeling');
  }

  /**
   * Called each game-loop tick while reeling.
   * @param tapActive  Whether the reel key is being pressed this tick.
   * @param deltaMs    Frame delta in ms.
   * Returns whether the catch succeeded (true) or failed (false) this tick.
   */
  reelTick(tapActive: boolean, deltaMs: number): 'in_progress' | 'success' | 'fail' {
    if (this.state !== 'reeling') return 'in_progress';

    const rod = ROD_DEFS.find(r => r.id === this.currentRodId) ?? ROD_DEFS[0];

    // Drift the tension zone
    const drift = REEL_TENSION_DRIFT * rod.reelSpeed * deltaMs;
    this.tensionZonePos += drift * this.tensionDriftDir;
    if (this.tensionZonePos > 0.85) { this.tensionZonePos = 0.85; this.tensionDriftDir = -1; }
    if (this.tensionZonePos < 0.15) { this.tensionZonePos = 0.15; this.tensionDriftDir = 1; }

    const inZone = tapActive &&
      this.reelProgress >= this.tensionZonePos - REEL_ZONE_WIDTH / 2 - 0.05 &&
      this.reelProgress <= this.tensionZonePos + REEL_ZONE_WIDTH / 2 + 0.05;

    if (tapActive) {
      if (inZone) {
        this.outsideTicks = 0;
        this.reelProgress = Math.min(1, this.reelProgress + REEL_TICK_GAIN);
      } else {
        this.outsideTicks++;
        // Pulling outside zone pushes progress back slightly
        this.reelProgress = Math.max(0, this.reelProgress - REEL_TICK_GAIN * 0.3);
      }
    }

    if (this.outsideTicks >= REEL_FAIL_THRESHOLD) {
      this.setState('fail');
      this.onFail?.();
      this.reset();
      return 'fail';
    }

    if (this.reelProgress >= 1) {
      const fish   = this.rollFish();
      const result: FishingResult = {
        fish,
        weight:  +(Math.random() * 4 + 0.2).toFixed(1),
        isNew:   false, // set by caller who checks the catch log
        xp:      fish.xpReward + (this.skillLevel - 1) * 2,
        gold:    fish.goldValue,
      };
      this.setState('success');
      this.onCatch?.(result);
      this.reset();
      return 'success';
    }

    return 'in_progress';
  }

  cancel(): void {
    if (this.biteTimer) { clearTimeout(this.biteTimer); this.biteTimer = null; }
    this.reset();
  }

  // ── Fish roll ─────────────────────────────────────────────────────────────

  private rollFish(): FishDef {
    const rod = ROD_DEFS.find(r => r.id === this.currentRodId) ?? ROD_DEFS[0];
    const skillBonus = Math.min(0.3, (this.skillLevel - 1) * 0.015);
    const rarityBonus = rod.rarityBonus + skillBonus;

    // Filter fish by zone
    const pool = FISH_DEFS.filter(f =>
      f.zones.length === 0 || f.zones.includes(this.currentZoneId),
    );

    // Adjust weights for rarity
    const weighted = pool.map(f => {
      let w = f.baseWeight;
      if (f.rarity === 'rare')      w *= (1 + rarityBonus * 1.5);
      if (f.rarity === 'legendary') w *= (1 + rarityBonus * 3);
      return { fish: f, w };
    });

    const totalW = weighted.reduce((s, x) => s + x.w, 0);
    let rand     = Math.random() * totalW;
    for (const { fish, w } of weighted) {
      rand -= w;
      if (rand <= 0) return fish;
    }
    return pool[0];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private setState(s: FishingState): void {
    this.state = s;
    this.onStateChange?.(s);
  }

  private reset(): void {
    if (this.biteTimer) { clearTimeout(this.biteTimer); this.biteTimer = null; }
    this.setState('idle');
    this.castPower    = 0;
    this.reelProgress = 0;
    this.outsideTicks = 0;
  }

  destroy(): void {
    this.cancel();
  }
}

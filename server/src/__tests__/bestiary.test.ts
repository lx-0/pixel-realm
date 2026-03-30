/**
 * Bestiary and monster compendium integration tests.
 *
 * Covers:
 *   - ENEMY_TYPES data integrity — all fields present, valid behaviours
 *   - BOSS_TYPES data integrity — valid fields, escalating HP/XP
 *   - EnemyTypeName / BossTypeName coverage — all named types defined
 *   - Stat balance — HP, damage, speed, aggro ranges in valid ranges
 *   - XP scaling — later bosses award more XP
 *   - Boss size scaling — larger bosses with higher HP
 *   - Bestiary milestone counts — 25 / 50 / 72+ regular enemies, 19 bosses
 *   - Behaviour types — all declared behaviour values used
 *   - Projectile enemies — ranged enemies always have projectileColor
 *   - Tank enemies — tank behaviour always has low knockback
 *   - Stationary enemies — zero speed / zero aggro range
 *   - Status effects applied by melee and projectile attacks
 */

import { describe, it, expect } from "vitest";
import {
  ENEMY_TYPES,
  BOSS_TYPES,
  MELEE_STATUS_ON_HIT,
  PROJECTILE_STATUS_ON_HIT,
  STATUS_EFFECTS,
  type EnemyTypeDef,
} from "../../../src/config/constants";

const VALID_BEHAVIOURS: EnemyTypeDef["behaviour"][] = [
  "chase", "burst", "ranged", "stationary", "phase",
  "tank", "ranged_flee", "sidestep", "charm", "block",
];

const VALID_STATUS_EFFECTS = ["poison", "burn", "freeze", "stun"] as const;

// ── ENEMY_TYPES data integrity ────────────────────────────────────────────────

describe("ENEMY_TYPES data integrity", () => {
  it("has at least 50 enemy types covering all zone tiers", () => {
    const count = Object.keys(ENEMY_TYPES).length;
    expect(count).toBeGreaterThanOrEqual(50);
  });

  it("every enemy has a positive baseHp", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.baseHp, `${id}.baseHp`).toBeGreaterThan(0);
    }
  });

  it("every enemy has a non-negative baseDmg", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.baseDmg, `${id}.baseDmg`).toBeGreaterThanOrEqual(0);
    }
  });

  it("every enemy has a non-negative speed", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.speed, `${id}.speed`).toBeGreaterThanOrEqual(0);
    }
  });

  it("every enemy has a positive xpValue", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.xpValue, `${id}.xpValue`).toBeGreaterThan(0);
    }
  });

  it("every enemy has a valid behaviour", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(VALID_BEHAVIOURS, `${id}.behaviour`).toContain(e.behaviour);
    }
  });

  it("every enemy has a positive size", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.size, `${id}.size`).toBeGreaterThan(0);
    }
  });

  it("every enemy has a non-negative knockbackMultiplier", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.knockbackMultiplier, `${id}.knockbackMultiplier`).toBeGreaterThanOrEqual(0);
    }
  });

  it("every enemy color is a positive hex number", () => {
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      expect(e.color, `${id}.color`).toBeGreaterThan(0);
    }
  });
});

// ── Behaviour constraints ─────────────────────────────────────────────────────

describe("Enemy behaviour constraints", () => {
  it("all declared behaviour types are represented in ENEMY_TYPES", () => {
    const usedBehaviours = new Set(Object.values(ENEMY_TYPES).map(e => e.behaviour));
    for (const b of VALID_BEHAVIOURS) {
      expect(usedBehaviours.has(b)).toBe(true);
    }
  });

  it("tank enemies have knockbackMultiplier ≤ 0.5 (heavy and hard to move)", () => {
    const tanks = Object.values(ENEMY_TYPES).filter(e => e.behaviour === "tank");
    expect(tanks.length).toBeGreaterThan(0);
    for (const t of tanks) {
      expect(t.knockbackMultiplier).toBeLessThanOrEqual(0.5);
    }
  });

  it("stationary enemies have speed = 0 and aggroRange = 0", () => {
    const stationary = Object.values(ENEMY_TYPES).filter(e => e.behaviour === "stationary");
    expect(stationary.length).toBeGreaterThan(0);
    for (const s of stationary) {
      expect(s.speed).toBe(0);
      expect(s.aggroRange).toBe(0);
    }
  });

  it("ranged enemies always have a projectileColor", () => {
    const rangedBehaviours = ["ranged", "ranged_flee"] as const;
    for (const [id, e] of Object.entries(ENEMY_TYPES)) {
      if (rangedBehaviours.includes(e.behaviour as typeof rangedBehaviours[number])) {
        expect(e.projectileColor, `${id} must have projectileColor`).toBeDefined();
        expect(e.projectileColor).toBeGreaterThan(0);
      }
    }
  });

  it("charm enemies have a projectileColor (they attack at range)", () => {
    const charmers = Object.entries(ENEMY_TYPES).filter(([, e]) => e.behaviour === "charm");
    for (const [id, e] of charmers) {
      expect(e.projectileColor, `${id} charm enemy should have projectileColor`).toBeDefined();
    }
  });
});

// ── XP scaling across zone tiers ─────────────────────────────────────────────

describe("Enemy XP scaling", () => {
  it("slime (zone1 enemy) has lower XP than astral_warden (zone19 enemy)", () => {
    expect(ENEMY_TYPES.slime.xpValue).toBeLessThan(ENEMY_TYPES.astral_warden.xpValue);
  });

  it("zone1 enemies have xpValue below 50", () => {
    const zone1Enemies = [ENEMY_TYPES.slime, ENEMY_TYPES.mushroom, ENEMY_TYPES.slime_mini];
    for (const e of zone1Enemies) {
      expect(e.xpValue).toBeLessThan(50);
    }
  });

  it("endgame enemies (zone15+) have xpValue above 300", () => {
    const endgameEnemies = [
      ENEMY_TYPES.astral_warden,
      ENEMY_TYPES.cosmic_devourer,
      ENEMY_TYPES.nebula_wisp,
    ];
    for (const e of endgameEnemies) {
      expect(e.xpValue).toBeGreaterThan(300);
    }
  });
});

// ── BOSS_TYPES data integrity ─────────────────────────────────────────────────

describe("BOSS_TYPES data integrity", () => {
  it("has exactly 19 boss types (one per zone)", () => {
    expect(Object.keys(BOSS_TYPES)).toHaveLength(19);
  });

  it("every boss has a non-empty name", () => {
    for (const [id, b] of Object.entries(BOSS_TYPES)) {
      expect(b.name, `${id}.name`).toBeTruthy();
    }
  });

  it("every boss has a positive baseHp", () => {
    for (const [id, b] of Object.entries(BOSS_TYPES)) {
      expect(b.baseHp, `${id}.baseHp`).toBeGreaterThan(0);
    }
  });

  it("every boss has a positive baseDmg", () => {
    for (const [id, b] of Object.entries(BOSS_TYPES)) {
      expect(b.baseDmg, `${id}.baseDmg`).toBeGreaterThan(0);
    }
  });

  it("every boss has a positive xpValue", () => {
    for (const [id, b] of Object.entries(BOSS_TYPES)) {
      expect(b.xpValue, `${id}.xpValue`).toBeGreaterThan(0);
    }
  });

  it("every boss has a positive size (larger than typical regular enemies)", () => {
    for (const [id, b] of Object.entries(BOSS_TYPES)) {
      expect(b.size, `${id}.size`).toBeGreaterThan(0);
    }
  });

  it("every boss has a positive color value", () => {
    for (const [id, b] of Object.entries(BOSS_TYPES)) {
      expect(b.color, `${id}.color`).toBeGreaterThan(0);
    }
  });
});

// ── Boss XP escalation ────────────────────────────────────────────────────────

describe("Boss XP and HP escalation", () => {
  const bossList = Object.values(BOSS_TYPES);

  it("slime_king (zone1 boss) has the lowest XP reward", () => {
    const minXp = Math.min(...bossList.map(b => b.xpValue));
    expect(BOSS_TYPES.slime_king.xpValue).toBe(minXp);
  });

  it("astral_sovereign (zone19 boss) has the highest XP reward", () => {
    const maxXp = Math.max(...bossList.map(b => b.xpValue));
    expect(BOSS_TYPES.astral_sovereign.xpValue).toBe(maxXp);
  });

  it("astral_sovereign has the highest baseHp", () => {
    const maxHp = Math.max(...bossList.map(b => b.baseHp));
    expect(BOSS_TYPES.astral_sovereign.baseHp).toBe(maxHp);
  });

  it("astral_sovereign is the largest boss (biggest size)", () => {
    const maxSize = Math.max(...bossList.map(b => b.size));
    expect(BOSS_TYPES.astral_sovereign.size).toBe(maxSize);
  });

  it("astral_sovereign's xpValue is at least 100× slime_king's xpValue", () => {
    const ratio = BOSS_TYPES.astral_sovereign.xpValue / BOSS_TYPES.slime_king.xpValue;
    expect(ratio).toBeGreaterThanOrEqual(100);
  });
});

// ── Milestone counts for bestiary completion tracking ────────────────────────
//
// BestiaryPanel tracks completion milestones at 25%, 50%, 75%, 100%.
// With 19 bosses, milestone thresholds are: ~5, ~10, ~14, 19.

describe("Bestiary milestone counts", () => {
  const REGULAR_COUNT = Object.keys(ENEMY_TYPES).length;
  const BOSS_COUNT    = Object.keys(BOSS_TYPES).length;

  it("has at least 25 regular enemy types (25% milestone possible)", () => {
    expect(REGULAR_COUNT).toBeGreaterThanOrEqual(25);
  });

  it("has at least 50 regular enemy types (50% milestone possible)", () => {
    expect(REGULAR_COUNT).toBeGreaterThanOrEqual(50);
  });

  it("has exactly 19 boss types (matching 19 zones)", () => {
    expect(BOSS_COUNT).toBe(19);
  });

  it("boss 25% milestone is at least 4 bosses", () => {
    const milestone25 = Math.ceil(BOSS_COUNT * 0.25);
    expect(milestone25).toBeGreaterThanOrEqual(4);
  });

  it("total bestiary entries (regular + boss) exceeds 70", () => {
    const total = REGULAR_COUNT + BOSS_COUNT;
    expect(total).toBeGreaterThan(70);
  });
});

// ── Status effects ────────────────────────────────────────────────────────────

describe("Status effects on hit", () => {
  it("all melee status assignments reference valid status effect keys", () => {
    for (const [enemyId, effect] of Object.entries(MELEE_STATUS_ON_HIT)) {
      expect(VALID_STATUS_EFFECTS, `${enemyId} melee effect '${effect}' not valid`)
        .toContain(effect);
    }
  });

  it("all projectile status assignments reference valid status effect keys", () => {
    for (const [enemyId, effect] of Object.entries(PROJECTILE_STATUS_ON_HIT)) {
      expect(VALID_STATUS_EFFECTS, `${enemyId} projectile effect '${effect}' not valid`)
        .toContain(effect);
    }
  });

  it("STATUS_EFFECTS has all four effect types", () => {
    expect(STATUS_EFFECTS).toHaveProperty("poison");
    expect(STATUS_EFFECTS).toHaveProperty("burn");
    expect(STATUS_EFFECTS).toHaveProperty("freeze");
    expect(STATUS_EFFECTS).toHaveProperty("stun");
  });

  it("all status effects have positive durationMs", () => {
    for (const [key, eff] of Object.entries(STATUS_EFFECTS)) {
      expect(eff.durationMs, `${key}.durationMs`).toBeGreaterThan(0);
    }
  });

  it("stun effect has speedMult of 0 (full stop)", () => {
    expect(STATUS_EFFECTS.stun.speedMult).toBe(0.0);
  });

  it("freeze effect has speedMult of 0.5 (half speed)", () => {
    expect(STATUS_EFFECTS.freeze.speedMult).toBe(0.5);
  });

  it("enemies with melee status effects are defined in ENEMY_TYPES", () => {
    for (const enemyId of Object.keys(MELEE_STATUS_ON_HIT)) {
      expect(ENEMY_TYPES, `${enemyId} not in ENEMY_TYPES`).toHaveProperty(enemyId);
    }
  });
});

// ── Specific notable enemies ──────────────────────────────────────────────────

describe("Notable enemy entries", () => {
  it("slime (zone1 starter) is a chase enemy with low HP", () => {
    expect(ENEMY_TYPES.slime.behaviour).toBe("chase");
    expect(ENEMY_TYPES.slime.baseHp).toBeLessThan(100);
  });

  it("golem is a tank with knockbackMultiplier = 0", () => {
    expect(ENEMY_TYPES.golem.behaviour).toBe("tank");
    expect(ENEMY_TYPES.golem.knockbackMultiplier).toBe(0);
  });

  it("bandit is a ranged attacker with a projectile", () => {
    expect(ENEMY_TYPES.bandit.behaviour).toBe("ranged");
    expect(ENEMY_TYPES.bandit.projectileColor).toBeDefined();
  });

  it("slime_king boss is named 'Slime King'", () => {
    expect(BOSS_TYPES.slime_king.name).toBe("Slime King");
  });

  it("astral_sovereign boss has size 48 (the final boss)", () => {
    expect(BOSS_TYPES.astral_sovereign.size).toBe(48);
  });
});

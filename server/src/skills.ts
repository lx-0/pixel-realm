/**
 * Skill tree definitions for all four class archetypes:
 * Warrior, Mage, Ranger, and Artisan.
 *
 * Each class has 3 archetype branches, each branch has 5 skills
 * (mix of active abilities and passive bonuses).
 * Skills are tiered 1-5; tier N requires the tier N-1 skill in the same branch.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClassId = 'warrior' | 'mage' | 'ranger' | 'artisan';

export type ArchetypeId =
  | 'berserker' | 'guardian' | 'paladin'          // Warrior archetypes
  | 'pyromancer' | 'frostbinder' | 'arcanist'     // Mage archetypes
  | 'sharpshooter' | 'shadowstalker' | 'beastmaster' // Ranger archetypes
  | 'blacksmith' | 'alchemist' | 'enchanter';     // Artisan archetypes

export type SkillType = 'active' | 'passive';

export interface PassiveBonus {
  maxHpFlat?: number;               // flat HP added to max HP
  maxManaFlat?: number;             // flat mana added to max mana
  damagePct?: number;               // % bonus to attack damage (0.15 = +15%)
  speedPct?: number;                // % bonus to move speed
  manaRegenFlat?: number;           // extra mana regen per second
  critChancePct?: number;           // % chance to deal double damage
  attackCdReductionPct?: number;    // % reduction to attack cooldown
  allCdReductionPct?: number;       // % reduction to all skill cooldowns
  damageReductionPct?: number;      // % damage reduction when hit
  healOnKill?: number;              // flat HP restored on each non-boss kill
}

export interface SkillDef {
  id: string;
  classId: ClassId;
  archetypeId: ArchetypeId;
  name: string;
  description: string;
  type: SkillType;
  tier: number;                     // 1–5 position in the branch
  prerequisiteId: string | null;    // skill id of required prerequisite (null = tier 1)
  // Active-only fields
  cooldownMs?: number;
  manaCost?: number;
  // Passive-only fields
  passiveBonus?: PassiveBonus;
}

// ── Warrior — Berserker (aggressive melee) ────────────────────────────────────

const BERSERKER: SkillDef[] = [
  {
    id: 'reckless_strike',
    classId: 'warrior', archetypeId: 'berserker',
    name: 'Reckless Strike',
    description: 'Unleash a powerful blow dealing 200% melee damage to the nearest enemy.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 5000, manaCost: 10,
  },
  {
    id: 'battle_frenzy',
    classId: 'warrior', archetypeId: 'berserker',
    name: 'Battle Frenzy',
    description: '+12% attack damage and +10% attack speed.',
    type: 'passive', tier: 2, prerequisiteId: 'reckless_strike',
    passiveBonus: { damagePct: 0.12, attackCdReductionPct: 0.10 },
  },
  {
    id: 'blade_fury',
    classId: 'warrior', archetypeId: 'berserker',
    name: 'Blade Fury',
    description: 'Spin-attack dealing 150% damage to all nearby enemies.',
    type: 'active', tier: 3, prerequisiteId: 'battle_frenzy',
    cooldownMs: 8000, manaCost: 18,
  },
  {
    id: 'bloodthirst',
    classId: 'warrior', archetypeId: 'berserker',
    name: 'Bloodthirst',
    description: '+18% attack damage. Kills restore 8 HP.',
    type: 'passive', tier: 4, prerequisiteId: 'blade_fury',
    passiveBonus: { damagePct: 0.18, healOnKill: 8 },
  },
  {
    id: 'berserk_mode',
    classId: 'warrior', archetypeId: 'berserker',
    name: 'Berserk Mode',
    description: 'Enter a 6s rage: +50% damage and +20% speed. High cooldown.',
    type: 'active', tier: 5, prerequisiteId: 'bloodthirst',
    cooldownMs: 30000, manaCost: 30,
  },
];

// ── Warrior — Guardian (tank / defense) ───────────────────────────────────────

const GUARDIAN: SkillDef[] = [
  {
    id: 'iron_skin',
    classId: 'warrior', archetypeId: 'guardian',
    name: 'Iron Skin',
    description: '+40 max HP and 8% damage reduction.',
    type: 'passive', tier: 1, prerequisiteId: null,
    passiveBonus: { maxHpFlat: 40, damageReductionPct: 0.08 },
  },
  {
    id: 'shield_bash',
    classId: 'warrior', archetypeId: 'guardian',
    name: 'Shield Bash',
    description: 'Stun the nearest enemy for 1.5 seconds.',
    type: 'active', tier: 2, prerequisiteId: 'iron_skin',
    cooldownMs: 7000, manaCost: 12,
  },
  {
    id: 'fortify',
    classId: 'warrior', archetypeId: 'guardian',
    name: 'Fortify',
    description: '+60 max HP and 12% additional damage reduction.',
    type: 'passive', tier: 3, prerequisiteId: 'shield_bash',
    passiveBonus: { maxHpFlat: 60, damageReductionPct: 0.12 },
  },
  {
    id: 'taunt',
    classId: 'warrior', archetypeId: 'guardian',
    name: 'Taunt',
    description: 'Force all enemies in the zone to target you for 4 seconds.',
    type: 'active', tier: 4, prerequisiteId: 'fortify',
    cooldownMs: 12000, manaCost: 15,
  },
  {
    id: 'last_stand',
    classId: 'warrior', archetypeId: 'guardian',
    name: 'Last Stand',
    description: '+80 max HP. When below 25% HP, gain 30% damage reduction for 5s.',
    type: 'passive', tier: 5, prerequisiteId: 'taunt',
    passiveBonus: { maxHpFlat: 80, damageReductionPct: 0.0 }, // extra DR handled in combat logic
  },
];

// ── Warrior — Paladin (divine / support) ──────────────────────────────────────

const PALADIN: SkillDef[] = [
  {
    id: 'holy_mending',
    classId: 'warrior', archetypeId: 'paladin',
    name: 'Holy Mending',
    description: 'Instantly restore 50 HP.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 12000, manaCost: 20,
  },
  {
    id: 'divine_light',
    classId: 'warrior', archetypeId: 'paladin',
    name: 'Divine Light',
    description: '+25 max HP and +4 mana regen per second.',
    type: 'passive', tier: 2, prerequisiteId: 'holy_mending',
    passiveBonus: { maxHpFlat: 25, manaRegenFlat: 4 },
  },
  {
    id: 'sacred_strike',
    classId: 'warrior', archetypeId: 'paladin',
    name: 'Sacred Strike',
    description: 'Holy melee hit dealing 180% damage and applying burn.',
    type: 'active', tier: 3, prerequisiteId: 'divine_light',
    cooldownMs: 8000, manaCost: 15,
  },
  {
    id: 'aura_of_valor',
    classId: 'warrior', archetypeId: 'paladin',
    name: 'Aura of Valor',
    description: '+30 max HP and +6 mana regen per second.',
    type: 'passive', tier: 4, prerequisiteId: 'sacred_strike',
    passiveBonus: { maxHpFlat: 30, manaRegenFlat: 6 },
  },
  {
    id: 'divine_shield',
    classId: 'warrior', archetypeId: 'paladin',
    name: 'Divine Shield',
    description: 'Become invulnerable for 3 seconds. Long cooldown.',
    type: 'active', tier: 5, prerequisiteId: 'aura_of_valor',
    cooldownMs: 45000, manaCost: 40,
  },
];

// ── Mage — Pyromancer (fire / DoT) ────────────────────────────────────────────

const PYROMANCER: SkillDef[] = [
  {
    id: 'fireball',
    classId: 'mage', archetypeId: 'pyromancer',
    name: 'Fireball',
    description: 'Hurl a blazing orb dealing 60 damage and applying burn.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 4000, manaCost: 14,
  },
  {
    id: 'flame_attunement',
    classId: 'mage', archetypeId: 'pyromancer',
    name: 'Flame Attunement',
    description: '+15% spell / attack damage and +20 max mana.',
    type: 'passive', tier: 2, prerequisiteId: 'fireball',
    passiveBonus: { damagePct: 0.15, maxManaFlat: 20 },
  },
  {
    id: 'inferno_ring',
    classId: 'mage', archetypeId: 'pyromancer',
    name: 'Inferno Ring',
    description: 'Erupt in fire — deal 80 damage to all nearby enemies and apply burn.',
    type: 'active', tier: 3, prerequisiteId: 'flame_attunement',
    cooldownMs: 10000, manaCost: 25,
  },
  {
    id: 'combustion',
    classId: 'mage', archetypeId: 'pyromancer',
    name: 'Combustion',
    description: '+20% attack damage. Burning targets take 20% extra damage.',
    type: 'passive', tier: 4, prerequisiteId: 'inferno_ring',
    passiveBonus: { damagePct: 0.20 },
  },
  {
    id: 'meteor_strike',
    classId: 'mage', archetypeId: 'pyromancer',
    name: 'Meteor Strike',
    description: 'Call down a meteor dealing 150 AoE damage. Very long cooldown.',
    type: 'active', tier: 5, prerequisiteId: 'combustion',
    cooldownMs: 25000, manaCost: 50,
  },
];

// ── Mage — Frostbinder (CC / ice) ────────────────────────────────────────────

const FROSTBINDER: SkillDef[] = [
  {
    id: 'ice_lance',
    classId: 'mage', archetypeId: 'frostbinder',
    name: 'Ice Lance',
    description: 'Fire a frost bolt dealing 45 damage and freezing the target.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 5000, manaCost: 12,
  },
  {
    id: 'biting_cold',
    classId: 'mage', archetypeId: 'frostbinder',
    name: 'Biting Cold',
    description: '+15 max HP, +25 max mana. Frozen enemies take 20% extra damage.',
    type: 'passive', tier: 2, prerequisiteId: 'ice_lance',
    passiveBonus: { maxHpFlat: 15, maxManaFlat: 25 },
  },
  {
    id: 'blizzard',
    classId: 'mage', archetypeId: 'frostbinder',
    name: 'Blizzard',
    description: 'Summon a blizzard that slows all nearby enemies by 50% for 4s.',
    type: 'active', tier: 3, prerequisiteId: 'biting_cold',
    cooldownMs: 12000, manaCost: 28,
  },
  {
    id: 'permafrost',
    classId: 'mage', archetypeId: 'frostbinder',
    name: 'Permafrost',
    description: '+30 max mana and +3 mana regen per second.',
    type: 'passive', tier: 4, prerequisiteId: 'blizzard',
    passiveBonus: { maxManaFlat: 30, manaRegenFlat: 3 },
  },
  {
    id: 'glacial_nova',
    classId: 'mage', archetypeId: 'frostbinder',
    name: 'Glacial Nova',
    description: 'Massive ice explosion: 100 damage AoE and freeze all enemies for 3s.',
    type: 'active', tier: 5, prerequisiteId: 'permafrost',
    cooldownMs: 20000, manaCost: 45,
  },
];

// ── Mage — Arcanist (burst / utility) ────────────────────────────────────────

const ARCANIST: SkillDef[] = [
  {
    id: 'arcane_bolt',
    classId: 'mage', archetypeId: 'arcanist',
    name: 'Arcane Bolt',
    description: 'Fire a high-velocity bolt dealing 70 damage.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 4500, manaCost: 16,
  },
  {
    id: 'mana_flow',
    classId: 'mage', archetypeId: 'arcanist',
    name: 'Mana Flow',
    description: '+35 max mana and +3 mana regen per second.',
    type: 'passive', tier: 2, prerequisiteId: 'arcane_bolt',
    passiveBonus: { maxManaFlat: 35, manaRegenFlat: 3 },
  },
  {
    id: 'arcane_shield',
    classId: 'mage', archetypeId: 'arcanist',
    name: 'Arcane Shield',
    description: 'Absorb the next 120 incoming damage. 15s cooldown.',
    type: 'active', tier: 3, prerequisiteId: 'mana_flow',
    cooldownMs: 15000, manaCost: 22,
  },
  {
    id: 'arcane_mastery',
    classId: 'mage', archetypeId: 'arcanist',
    name: 'Arcane Mastery',
    description: '+20% to all skill damage. -20% cooldown on all skills.',
    type: 'passive', tier: 4, prerequisiteId: 'arcane_shield',
    passiveBonus: { damagePct: 0.20, allCdReductionPct: 0.20 },
  },
  {
    id: 'arcane_surge',
    classId: 'mage', archetypeId: 'arcanist',
    name: 'Arcane Surge',
    description: 'For 10s all spells deal 2× damage and cost no mana.',
    type: 'active', tier: 5, prerequisiteId: 'arcane_mastery',
    cooldownMs: 40000, manaCost: 0,
  },
];

// ── Ranger — Sharpshooter (ranged DPS / crits) ──────────────────────────────

const SHARPSHOOTER: SkillDef[] = [
  {
    id: 'piercing_shot',
    classId: 'ranger', archetypeId: 'sharpshooter',
    name: 'Piercing Shot',
    description: 'Fire a penetrating arrow dealing 55 damage to the nearest enemy.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 4000, manaCost: 10,
  },
  {
    id: 'keen_eye',
    classId: 'ranger', archetypeId: 'sharpshooter',
    name: 'Keen Eye',
    description: '+10% crit chance and +10% attack damage.',
    type: 'passive', tier: 2, prerequisiteId: 'piercing_shot',
    passiveBonus: { critChancePct: 0.10, damagePct: 0.10 },
  },
  {
    id: 'arrow_rain',
    classId: 'ranger', archetypeId: 'sharpshooter',
    name: 'Arrow Rain',
    description: 'Rain arrows on all nearby enemies dealing 70 damage each.',
    type: 'active', tier: 3, prerequisiteId: 'keen_eye',
    cooldownMs: 10000, manaCost: 22,
  },
  {
    id: 'quiver_mastery',
    classId: 'ranger', archetypeId: 'sharpshooter',
    name: 'Quiver Mastery',
    description: '+15% crit chance and +15% attack speed.',
    type: 'passive', tier: 4, prerequisiteId: 'arrow_rain',
    passiveBonus: { critChancePct: 0.15, attackCdReductionPct: 0.15 },
  },
  {
    id: 'eagle_eye',
    classId: 'ranger', archetypeId: 'sharpshooter',
    name: 'Eagle Eye',
    description: 'Mark a target for death: next 3 attacks on it deal 3× damage. 25s CD.',
    type: 'active', tier: 5, prerequisiteId: 'quiver_mastery',
    cooldownMs: 25000, manaCost: 30,
  },
];

// ── Ranger — Shadowstalker (stealth / evasion / poison) ─────────────────────

const SHADOWSTALKER: SkillDef[] = [
  {
    id: 'smoke_bomb',
    classId: 'ranger', archetypeId: 'shadowstalker',
    name: 'Smoke Bomb',
    description: 'Throw a smoke bomb granting 3s evasion — enemies lose target.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 8000, manaCost: 12,
  },
  {
    id: 'fleet_step',
    classId: 'ranger', archetypeId: 'shadowstalker',
    name: 'Fleet Step',
    description: '+15% movement speed and +5% damage reduction.',
    type: 'passive', tier: 2, prerequisiteId: 'smoke_bomb',
    passiveBonus: { speedPct: 0.15, damageReductionPct: 0.05 },
  },
  {
    id: 'poison_blade',
    classId: 'ranger', archetypeId: 'shadowstalker',
    name: 'Poison Blade',
    description: 'Strike the nearest enemy for 40 damage and apply poison (DoT).',
    type: 'active', tier: 3, prerequisiteId: 'fleet_step',
    cooldownMs: 6000, manaCost: 14,
  },
  {
    id: 'camouflage',
    classId: 'ranger', archetypeId: 'shadowstalker',
    name: 'Camouflage',
    description: '+20% movement speed and +10% damage reduction.',
    type: 'passive', tier: 4, prerequisiteId: 'poison_blade',
    passiveBonus: { speedPct: 0.20, damageReductionPct: 0.10 },
  },
  {
    id: 'shadow_strike',
    classId: 'ranger', archetypeId: 'shadowstalker',
    name: 'Shadow Strike',
    description: 'Vanish and reappear behind the target dealing 120 damage. Long cooldown.',
    type: 'active', tier: 5, prerequisiteId: 'camouflage',
    cooldownMs: 20000, manaCost: 28,
  },
];

// ── Ranger — Beastmaster (summons / nature buffs) ───────────────────────────

const BEASTMASTER: SkillDef[] = [
  {
    id: 'call_companion',
    classId: 'ranger', archetypeId: 'beastmaster',
    name: 'Call Companion',
    description: 'Summon a wolf companion that attacks the nearest enemy for 35 damage.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 6000, manaCost: 14,
  },
  {
    id: 'tracker',
    classId: 'ranger', archetypeId: 'beastmaster',
    name: 'Tracker',
    description: '+30 max HP and +3 mana regen per second.',
    type: 'passive', tier: 2, prerequisiteId: 'call_companion',
    passiveBonus: { maxHpFlat: 30, manaRegenFlat: 3 },
  },
  {
    id: 'natures_grasp',
    classId: 'ranger', archetypeId: 'beastmaster',
    name: "Nature's Grasp",
    description: 'Roots all nearby enemies for 2s, preventing movement.',
    type: 'active', tier: 3, prerequisiteId: 'tracker',
    cooldownMs: 12000, manaCost: 20,
  },
  {
    id: 'swift_feet',
    classId: 'ranger', archetypeId: 'beastmaster',
    name: 'Swift Feet',
    description: '+40 max HP and +10% attack damage.',
    type: 'passive', tier: 4, prerequisiteId: 'natures_grasp',
    passiveBonus: { maxHpFlat: 40, damagePct: 0.10 },
  },
  {
    id: 'stampede',
    classId: 'ranger', archetypeId: 'beastmaster',
    name: 'Stampede',
    description: 'Unleash a beast stampede dealing 100 AoE damage to all nearby enemies.',
    type: 'active', tier: 5, prerequisiteId: 'swift_feet',
    cooldownMs: 22000, manaCost: 35,
  },
];

// ── Artisan — Blacksmith (melee / forging buffs) ────────────────────────────

const BLACKSMITH: SkillDef[] = [
  {
    id: 'hammer_strike',
    classId: 'artisan', archetypeId: 'blacksmith',
    name: 'Hammer Strike',
    description: 'Slam the nearest enemy with a forge hammer dealing 50 damage.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 5000, manaCost: 10,
  },
  {
    id: 'tempered_steel',
    classId: 'artisan', archetypeId: 'blacksmith',
    name: 'Tempered Steel',
    description: '+35 max HP and +8% damage reduction.',
    type: 'passive', tier: 2, prerequisiteId: 'hammer_strike',
    passiveBonus: { maxHpFlat: 35, damageReductionPct: 0.08 },
  },
  {
    id: 'forge_blast',
    classId: 'artisan', archetypeId: 'blacksmith',
    name: 'Forge Blast',
    description: 'Blast all nearby enemies with forge sparks dealing 65 AoE damage.',
    type: 'active', tier: 3, prerequisiteId: 'tempered_steel',
    cooldownMs: 9000, manaCost: 20,
  },
  {
    id: 'anvil_guard',
    classId: 'artisan', archetypeId: 'blacksmith',
    name: 'Anvil Guard',
    description: '+50 max HP and +12% damage reduction.',
    type: 'passive', tier: 4, prerequisiteId: 'forge_blast',
    passiveBonus: { maxHpFlat: 50, damageReductionPct: 0.12 },
  },
  {
    id: 'master_craft',
    classId: 'artisan', archetypeId: 'blacksmith',
    name: 'Master Craft',
    description: 'Forge an enchanted weapon: +40% damage for 8s. Long cooldown.',
    type: 'active', tier: 5, prerequisiteId: 'anvil_guard',
    cooldownMs: 30000, manaCost: 30,
  },
];

// ── Artisan — Alchemist (potions / AoE / healing) ──────────────────────────

const ALCHEMIST: SkillDef[] = [
  {
    id: 'potion_throw',
    classId: 'artisan', archetypeId: 'alchemist',
    name: 'Potion Throw',
    description: 'Hurl a volatile potion dealing 45 damage and applying burn.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 4500, manaCost: 12,
  },
  {
    id: 'brew_mastery',
    classId: 'artisan', archetypeId: 'alchemist',
    name: 'Brew Mastery',
    description: '+12% attack damage and +20 max mana.',
    type: 'passive', tier: 2, prerequisiteId: 'potion_throw',
    passiveBonus: { damagePct: 0.12, maxManaFlat: 20 },
  },
  {
    id: 'elixir_burst',
    classId: 'artisan', archetypeId: 'alchemist',
    name: 'Elixir Burst',
    description: 'Throw an explosive elixir dealing 75 AoE damage to nearby enemies.',
    type: 'active', tier: 3, prerequisiteId: 'brew_mastery',
    cooldownMs: 10000, manaCost: 24,
  },
  {
    id: 'concoction_heal',
    classId: 'artisan', archetypeId: 'alchemist',
    name: 'Concoction Heal',
    description: '+4 mana regen per second.',
    type: 'passive', tier: 4, prerequisiteId: 'elixir_burst',
    passiveBonus: { manaRegenFlat: 4 },
  },
  {
    id: 'volatile_mix',
    classId: 'artisan', archetypeId: 'alchemist',
    name: 'Volatile Mix',
    description: 'Unleash a massive chemical explosion: 130 AoE damage and burn. Very long CD.',
    type: 'active', tier: 5, prerequisiteId: 'concoction_heal',
    cooldownMs: 25000, manaCost: 45,
  },
];

// ── Artisan — Enchanter (buffs / debuffs / rune magic) ─────────────────────

const ENCHANTER: SkillDef[] = [
  {
    id: 'rune_bolt',
    classId: 'artisan', archetypeId: 'enchanter',
    name: 'Rune Bolt',
    description: 'Fire a rune-charged bolt dealing 50 damage at range.',
    type: 'active', tier: 1, prerequisiteId: null,
    cooldownMs: 4500, manaCost: 14,
  },
  {
    id: 'mana_infusion',
    classId: 'artisan', archetypeId: 'enchanter',
    name: 'Mana Infusion',
    description: '+30 max mana and +3 mana regen per second.',
    type: 'passive', tier: 2, prerequisiteId: 'rune_bolt',
    passiveBonus: { maxManaFlat: 30, manaRegenFlat: 3 },
  },
  {
    id: 'arcane_bind',
    classId: 'artisan', archetypeId: 'enchanter',
    name: 'Arcane Bind',
    description: 'Stun the nearest enemy for 2s with enchanted chains.',
    type: 'active', tier: 3, prerequisiteId: 'mana_infusion',
    cooldownMs: 10000, manaCost: 18,
  },
  {
    id: 'spell_weave',
    classId: 'artisan', archetypeId: 'enchanter',
    name: 'Spell Weave',
    description: '+15% attack damage and -15% cooldown on all skills.',
    type: 'passive', tier: 4, prerequisiteId: 'arcane_bind',
    passiveBonus: { damagePct: 0.15, allCdReductionPct: 0.15 },
  },
  {
    id: 'enchant_mastery',
    classId: 'artisan', archetypeId: 'enchanter',
    name: 'Enchant Mastery',
    description: 'Enchant your weapons: +35% damage and +20% speed for 10s. Long CD.',
    type: 'active', tier: 5, prerequisiteId: 'spell_weave',
    cooldownMs: 35000, manaCost: 35,
  },
];

// ── Master registry ───────────────────────────────────────────────────────────

export const ALL_SKILLS: SkillDef[] = [
  ...BERSERKER,
  ...GUARDIAN,
  ...PALADIN,
  ...PYROMANCER,
  ...FROSTBINDER,
  ...ARCANIST,
  ...SHARPSHOOTER,
  ...SHADOWSTALKER,
  ...BEASTMASTER,
  ...BLACKSMITH,
  ...ALCHEMIST,
  ...ENCHANTER,
];

/** Lookup a skill by id — throws if not found. */
export function getSkill(id: string): SkillDef {
  const s = ALL_SKILLS.find(sk => sk.id === id);
  if (!s) throw new Error(`Unknown skill id: ${id}`);
  return s;
}

export const SKILL_BY_ID: ReadonlyMap<string, SkillDef> = new Map(
  ALL_SKILLS.map(s => [s.id, s]),
);

/** Return all archetypes for a class, in display order. */
export const CLASS_ARCHETYPES: Record<ClassId, ArchetypeId[]> = {
  warrior: ['berserker', 'guardian', 'paladin'],
  mage:    ['pyromancer', 'frostbinder', 'arcanist'],
  ranger:  ['sharpshooter', 'shadowstalker', 'beastmaster'],
  artisan: ['blacksmith', 'alchemist', 'enchanter'],
};

export const CLASS_NAMES: Record<ClassId, string> = {
  warrior: 'Warrior',
  mage:    'Mage',
  ranger:  'Ranger',
  artisan: 'Artisan',
};

export const ARCHETYPE_NAMES: Record<ArchetypeId, string> = {
  berserker:      'Berserker',
  guardian:       'Guardian',
  paladin:        'Paladin',
  pyromancer:     'Pyromancer',
  frostbinder:    'Frostbinder',
  arcanist:       'Arcanist',
  sharpshooter:   'Sharpshooter',
  shadowstalker:  'Shadowstalker',
  beastmaster:    'Beastmaster',
  blacksmith:     'Blacksmith',
  alchemist:      'Alchemist',
  enchanter:      'Enchanter',
};

/**
 * Compute total passive bonuses from a set of unlocked skill ids.
 * Bonuses from multiple skills stack additively.
 */
export function computePassiveBonuses(unlockedIds: string[]): Required<PassiveBonus> {
  const total: Required<PassiveBonus> = {
    maxHpFlat: 0,
    maxManaFlat: 0,
    damagePct: 0,
    speedPct: 0,
    manaRegenFlat: 0,
    critChancePct: 0,
    attackCdReductionPct: 0,
    allCdReductionPct: 0,
    damageReductionPct: 0,
    healOnKill: 0,
  };
  for (const id of unlockedIds) {
    const sk = SKILL_BY_ID.get(id);
    if (!sk || sk.type !== 'passive' || !sk.passiveBonus) continue;
    const b = sk.passiveBonus;
    total.maxHpFlat            += b.maxHpFlat            ?? 0;
    total.maxManaFlat          += b.maxManaFlat          ?? 0;
    total.damagePct            += b.damagePct            ?? 0;
    total.speedPct             += b.speedPct             ?? 0;
    total.manaRegenFlat        += b.manaRegenFlat        ?? 0;
    total.critChancePct        += b.critChancePct        ?? 0;
    total.attackCdReductionPct += b.attackCdReductionPct ?? 0;
    total.allCdReductionPct    += b.allCdReductionPct    ?? 0;
    total.damageReductionPct   += b.damageReductionPct   ?? 0;
    total.healOnKill           += b.healOnKill           ?? 0;
  }
  return total;
}

/** Maximum skill points available at max level (1 per level from lv2). */
export const MAX_SKILL_POINTS = 9; // levels 2–10

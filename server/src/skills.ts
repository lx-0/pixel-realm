/**
 * Skill tree definitions for Warrior and Mage class archetypes.
 *
 * Each class has 3 archetype branches, each branch has 5 skills
 * (mix of active abilities and passive bonuses).
 * Skills are tiered 1-5; tier N requires the tier N-1 skill in the same branch.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClassId = 'warrior' | 'mage';

export type ArchetypeId =
  | 'berserker' | 'guardian' | 'paladin'   // Warrior archetypes
  | 'pyromancer' | 'frostbinder' | 'arcanist'; // Mage archetypes

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
    passiveBonus: { damagePct: 0.18 },
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
    description: '+25 max mana. Frozen enemies take 20% extra damage.',
    type: 'passive', tier: 2, prerequisiteId: 'ice_lance',
    passiveBonus: { maxManaFlat: 25 },
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
    description: 'Absorb the next 80 incoming damage. 15s cooldown.',
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

// ── Master registry ───────────────────────────────────────────────────────────

export const ALL_SKILLS: SkillDef[] = [
  ...BERSERKER,
  ...GUARDIAN,
  ...PALADIN,
  ...PYROMANCER,
  ...FROSTBINDER,
  ...ARCANIST,
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
};

export const CLASS_NAMES: Record<ClassId, string> = {
  warrior: 'Warrior',
  mage:    'Mage',
};

export const ARCHETYPE_NAMES: Record<ArchetypeId, string> = {
  berserker:   'Berserker',
  guardian:    'Guardian',
  paladin:     'Paladin',
  pyromancer:  'Pyromancer',
  frostbinder: 'Frostbinder',
  arcanist:    'Arcanist',
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
  }
  return total;
}

/** Maximum skill points available at max level (1 per level from lv2). */
export const MAX_SKILL_POINTS = 9; // levels 2–10

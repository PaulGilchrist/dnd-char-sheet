import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAttacks } from './attackCalc2024.js';

// ---------------------------------------------------------------------------
// Module-level stubs
// ---------------------------------------------------------------------------

const findEquippedWeaponsStub = vi.fn();
const buildWeaponAttackStub = vi.fn((opts) => ({
  name: opts.weaponName,
  damage: opts.includeAbilityBonusInDamage !== false
    ? `${opts.weapon.damage.damage_dice}+${opts.abilityBonus}`
    : opts.weapon.damage.damage_dice,
  damageType: opts.weapon.damage.damage_type,
  damageFormula: 'Damage Formula',
  hitBonus: opts.abilityBonus + opts.proficiency,
  hitBonusFormula: 'Hit Bonus Formula',
  range: opts.weapon.range?.normal ?? 5,
  type: opts.actionType,
  weaponType: opts.weaponType,
}));
const buildMonkAttacksStub = vi.fn((_opts) => [
  {
    name: 'Unarmed Strike',
    damage: `${_opts.diceStr}+${_opts.dexterityBonus}`,
    damageType: 'Bludgeoning',
    damageFormula: 'Damage Formula',
    hitBonus: _opts.dexterityBonus + _opts.proficiency,
    hitBonusFormula: 'Hit Bonus Formula',
    range: 5,
    type: 'Action',
  },
  {
    name: 'Unarmed Strike',
    damage: `${_opts.diceStr}+${_opts.dexterityBonus}`,
    damageType: 'Bludgeoning',
    damageFormula: 'Damage Formula',
    hitBonus: _opts.dexterityBonus + _opts.proficiency,
    hitBonusFormula: 'Hit Bonus Formula',
    range: 5,
    type: 'Bonus Action',
  },
]);

vi.mock('./attackCalc.js', () => ({
  parseMagicItemName: (name) =>
    name && name.charAt(0) === '+'
      ? { baseName: name.substring(3), magicBonus: Number(name.charAt(1)) || 0 }
      : { baseName: name, magicBonus: 0 },
  findEquippedWeapons: (...args) => findEquippedWeaponsStub(...args),
  buildWeaponAttack: (...args) => buildWeaponAttackStub(...args),
  buildMonkAttacks: (...args) => buildMonkAttacksStub(...args),
  parseDamageDice: (diceStr) => {
    const match = String(diceStr).match(/(\d+)d(\d+)/);
    if (!match) return 0;
    const [, count, sides] = match;
    return parseInt(count, 10) * (parseInt(sides, 10) + 1) / 2;
  },
}));

vi.mock('../../character/classRules2024.js', () => ({
  default: {
    getMartialArtsDie: vi.fn(() => 8),
  },
}));

vi.mock('../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultPlayerStats = (overrides = {}) => ({
  level: 1,
  abilities: [
    { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
    { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
  ],
  inventory: { equipped: [] },
  automation: { passives: [], bonusActions: [] },
  activeBuffs: [],
  class: { name: 'Fighter' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('attackCalc2024 - fighting styles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Archery fighting style', () => {
    it('applies Archery fighting style +2 to ranged weapon attack hit bonus', () => {
      findEquippedWeaponsStub
        .mockReturnValueOnce(['Shortbow'])
        .mockReturnValueOnce([]);

      const allEquipment = [
        {
          name: 'Shortbow',
          equipment_category: 'Weapon',
          weapon_range: 'Ranged',
          damage: { damage_dice: '1d6', damage_type: 'Piercing' },
          range: { normal: 80 },
        },
      ];
      const playerStats = defaultPlayerStats({
        level: 1,
        abilities: [
          { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
          { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        ],
        class: { name: 'Fighter', fightingStyles: ['Archery'] },
      });

      getAttacks(allEquipment, [], playerStats);

      expect(buildWeaponAttackStub).toHaveBeenCalledWith(
        expect.objectContaining({
          extraHitBonus: 2,
          extraHitBonusLabel: 'Archery Fighting Style (2)',
        })
      );
    });
  });

  describe('Dueling fighting style', () => {
    it('applies Dueling fighting style +2 damage to single melee weapon attack', () => {
      findEquippedWeaponsStub
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['Longsword']);

      const allEquipment = [
        {
          name: 'Longsword',
          equipment_category: 'Weapon',
          weapon_range: 'Melee',
          damage: { damage_dice: '1d8', damage_type: 'Slashing' },
          range: { normal: 5 },
        },
      ];
      const playerStats = defaultPlayerStats({
        level: 1,
        abilities: [
          { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
          { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        ],
        class: { name: 'Fighter', fightingStyles: ['Dueling'] },
      });

      getAttacks(allEquipment, [], playerStats);

      expect(buildWeaponAttackStub).toHaveBeenCalledWith(
        expect.objectContaining({
          extraDamage: '+2',
          extraDamageLabel: 'Dueling Fighting Style (2)',
        })
      );
    });

    it('does not apply Dueling when a ranged weapon is also equipped', () => {
      findEquippedWeaponsStub
        .mockReturnValueOnce(['Shortbow'])
        .mockReturnValueOnce(['Longsword']);

      const allEquipment = [
        {
          name: 'Shortbow',
          equipment_category: 'Weapon',
          weapon_range: 'Ranged',
          damage: { damage_dice: '1d6', damage_type: 'Piercing' },
          range: { normal: 80 },
        },
        {
          name: 'Longsword',
          equipment_category: 'Weapon',
          weapon_range: 'Melee',
          damage: { damage_dice: '1d8', damage_type: 'Slashing' },
          range: { normal: 5 },
        },
      ];
      const playerStats = defaultPlayerStats({
        level: 1,
        abilities: [
          { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
          { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        ],
        class: { name: 'Fighter', fightingStyles: ['Dueling'] },
      });

      getAttacks(allEquipment, [], playerStats);

      expect(buildWeaponAttackStub).not.toHaveBeenCalledWith(
        expect.objectContaining({ extraDamage: '+2' })
      );
    });
  });
});

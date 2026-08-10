import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAttacks } from './attackCalc2024.js';

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
  getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../combat/automation/automationPassives.js', () => ({
  collectWeaponMastery: vi.fn(() => ({ baseMastery: null, extraMasteries: [] })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => undefined),
}));

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

describe('attackCalc2024 - light ranged weapons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('places single light ranged weapon as Action attack', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce(['Hand Crossbow'])
      .mockReturnValueOnce([]);

    const allEquipment = [
      {
        name: 'Hand Crossbow',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 30, long: 120 },
        properties: ['Light', 'Ammunition', 'Loading'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Hand Crossbow');
    expect(result[0].type).toBe('Action');
    expect(buildWeaponAttackStub).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'Action',
        abilityName: 'Dexterity',
        abilityBonus: 3,
      })
    );
  });

  it('places two light ranged weapons: highest damage as Action, rest as Bonus Action', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce(['Hand Crossbow', 'Dart'])
      .mockReturnValueOnce([]);

    const allEquipment = [
      {
        name: 'Hand Crossbow',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 30, long: 120 },
        properties: ['Light', 'Ammunition', 'Loading'],
      },
      {
        name: 'Dart',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 20, long: 80 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Hand Crossbow (1d6 avg 3.5) > Dart (1d4 avg 2.5), so Hand Crossbow = Action, Dart = Bonus Action
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Hand Crossbow');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('Dart');
    expect(result[1].type).toBe('Bonus Action');
  });

  it('applies Archery fighting style to light ranged weapon attacks', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce(['Hand Crossbow'])
      .mockReturnValueOnce([]);

    const allEquipment = [
      {
        name: 'Hand Crossbow',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 30, long: 120 },
        properties: ['Light', 'Ammunition', 'Loading'],
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

  it('applies Crossbow Expert to Hand Crossbow bonus action attacks (ability bonus in damage)', () => {
    // Make Dart higher damage so it becomes the Action and Hand Crossbow becomes Bonus Action
    findEquippedWeaponsStub
      .mockReturnValueOnce(['Dart', 'Hand Crossbow'])
      .mockReturnValueOnce([]);

    const allEquipment = [
      {
        name: 'Dart',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d8', damage_type: 'Piercing' },
        range: { normal: 20, long: 80 },
        properties: ['Light', 'Thrown'],
      },
      {
        name: 'Hand Crossbow',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 30, long: 120 },
        properties: ['Light', 'Ammunition', 'Loading'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
      feats: ['Crossbow Expert'],
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Hand Crossbow bonus action should have ability bonus in damage due to Crossbow Expert
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Dart');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('Hand Crossbow');
    expect(result[1].type).toBe('Bonus Action');
    expect(result[1].damage).toContain('+3');
    expect(buildWeaponAttackStub).toHaveBeenLastCalledWith(
      expect.objectContaining({
        includeAbilityBonusInDamage: true,
      })
    );
  });

  it('does not apply Crossbow Expert ability bonus to non-Hand Crossbow bonus actions', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce(['Dart', 'Sling'])
      .mockReturnValueOnce([]);

    const allEquipment = [
      {
        name: 'Dart',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 20, long: 80 },
        properties: ['Light', 'Thrown'],
      },
      {
        name: 'Sling',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 30, long: 120 },
        properties: ['Light', 'Ammunition'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [{ effect: 'crossbow_expert', name: 'Crossbow Expert' }],
        bonusActions: [],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Sling bonus action should NOT have ability bonus in damage (not Hand Crossbow)
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Sling');
    expect(result[1].type).toBe('Bonus Action');
    // Without includeAbilityBonusInDamage, the stub returns just the dice
    expect(buildWeaponAttackStub).toHaveBeenLastCalledWith(
      expect.objectContaining({
        includeAbilityBonusInDamage: false,
      })
    );
  });
});

describe('attackCalc2024 - light melee weapons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('places single light melee weapon as Action attack', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dagger');
    expect(result[0].type).toBe('Action');
  });

  it('places two light melee weapons: highest damage as Action, rest as Bonus Action', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('Action');
    expect(result[1].type).toBe('Bonus Action');
  });

  it('applies Two-Weapon Fighting passive to off-hand light melee bonus action damage', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [{ effect: 'two_weapon_fighting', name: 'Dual Wielding' }],
        bonusActions: [],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Off-hand weapon should have ability bonus in damage from two_weapon_fighting
    expect(result).toHaveLength(2);
    expect(result[1].type).toBe('Bonus Action');
    expect(result[1].damage).toContain('+3');
    expect(buildWeaponAttackStub).toHaveBeenLastCalledWith(
      expect.objectContaining({
        includeAbilityBonusInDamage: true,
      })
    );
  });

  it('applies Dueling fighting style with single light melee weapon and no ranged weapons', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
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

  it('applies Blessed Warrior fighting style hit bonus to melee attacks', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Cleric', fightingStyles: ['Blessed Warrior'] },
    });

    getAttacks(allEquipment, [], playerStats);

    expect(buildWeaponAttackStub).toHaveBeenCalledWith(
      expect.objectContaining({
        extraHitBonus: 2,
        extraHitBonusLabel: 'Blessed Warrior (2)',
      })
    );
  });

  it('applies Druidic Warrior fighting style damage bonus to melee attacks', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Druid', fightingStyles: ['Druidic Warrior'] },
    });

    getAttacks(allEquipment, [], playerStats);

    expect(buildWeaponAttackStub).toHaveBeenCalledWith(
      expect.objectContaining({
        extraDamage: '+2',
        extraDamageLabel: 'Druidic Warrior (2)',
      })
    );
  });

  it('combines Dueling + Blessed Warrior damage and hit bonuses', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter', fightingStyles: ['Dueling', 'Blessed Warrior'] },
    });

    getAttacks(allEquipment, [], playerStats);

    expect(buildWeaponAttackStub).toHaveBeenCalledWith(
      expect.objectContaining({
        extraDamage: '+2',
        extraDamageLabel: 'Dueling Fighting Style (2)',
        extraHitBonus: 2,
        extraHitBonusLabel: 'Blessed Warrior (2)',
      })
    );
  });

  it('combines Dueling + Druidic Warrior damage bonuses', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Druid', fightingStyles: ['Dueling', 'Druidic Warrior'] },
    });

    getAttacks(allEquipment, [], playerStats);

    // The code joins ['+2', '+2'] with ' + ' producing '+2 + +2'
    expect(buildWeaponAttackStub).toHaveBeenCalledWith(
      expect.objectContaining({
        extraDamage: '+2 + +2',
        extraDamageLabel: 'Dueling Fighting Style (2) + Druidic Warrior (2)',
      })
    );
  });

  it('does not apply Dueling when both light melee and ranged weapons are equipped', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce(['Dart'])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dart',
        equipment_category: 'Weapon',
        weapon_range: 'Ranged',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 20, long: 80 },
        properties: ['Light', 'Thrown'],
      },
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
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

  it('applies Two-Weapon Fighting passive to light melee off-hand in < 2 weapons path', () => {
    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 1,
      abilities: [
        { name: 'Strength', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
        { name: 'Dexterity', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [{ effect: 'two_weapon_fighting', name: 'Dual Wielding' }],
        bonusActions: [],
      },
    });

    // Single light melee weapon → all Action (no off-hand)
    const result = getAttacks(allEquipment, [], playerStats);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dagger');
    expect(result[0].type).toBe('Action');
  });
});

describe('attackCalc2024 - Nick mastery and Dual Wielder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes off-hand bonus action to Action when Nick mastery is available and used this round', async () => {
    const { getCurrentCombatRound } = await import('../../encounters/combatData.js');
    const { getRuntimeValue } = await import('../../../hooks/runtime/useRuntimeState.js');
    const { collectWeaponMastery } = await import('../../combat/automation/automationPassives.js');

    vi.mocked(getCurrentCombatRound).mockReturnValue(3);
    vi.mocked(getRuntimeValue).mockReturnValue(3);
    vi.mocked(collectWeaponMastery).mockReturnValue({
      baseMastery: 'Nick',
      extraMasteries: [],
    });

    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle', 'Acidic Spear']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
      {
        name: 'Acidic Spear',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 5,
      name: 'Test Character',
      campaignName: 'test-campaign',
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [{ effect: 'two_weapon_fighting', name: 'Dual Wielding' }],
        bonusActions: [],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Acidic Spear (1d6) = Action, Dagger (1d4) = Action, Sickle (1d4) = Action because Nick used this round
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Acidic Spear');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('Dagger');
    expect(result[1].type).toBe('Action');
    expect(result[2].name).toBe('Sickle');
    expect(result[2].type).toBe('Action');
  });

  it('keeps off-hand as Bonus Action when Nick mastery is not available', async () => {
    const { getCurrentCombatRound } = await import('../../encounters/combatData.js');
    const { getRuntimeValue } = await import('../../../hooks/runtime/useRuntimeState.js');
    const { collectWeaponMastery } = await import('../../combat/automation/automationPassives.js');

    vi.mocked(getCurrentCombatRound).mockReturnValue(3);
    vi.mocked(getRuntimeValue).mockReturnValue(3);
    vi.mocked(collectWeaponMastery).mockReturnValue({
      baseMastery: null,
      extraMasteries: [],
    });

    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle', 'Acidic Spear']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
      {
        name: 'Acidic Spear',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 5,
      name: 'Test Character',
      campaignName: 'test-campaign',
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [{ effect: 'two_weapon_fighting', name: 'Dual Wielding' }],
        bonusActions: [],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Acidic Spear (1d6) = Action, Dagger/Sickle = Bonus Action (no Nick)
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Acidic Spear');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('Dagger');
    expect(result[1].type).toBe('Bonus Action');
    expect(result[2].name).toBe('Sickle');
    expect(result[2].type).toBe('Bonus Action');
  });

  it('keeps off-hand as Bonus Action when Nick not used this round', async () => {
    const { getCurrentCombatRound } = await import('../../encounters/combatData.js');
    const { getRuntimeValue } = await import('../../../hooks/runtime/useRuntimeState.js');
    const { collectWeaponMastery } = await import('../../combat/automation/automationPassives.js');

    vi.mocked(getCurrentCombatRound).mockReturnValue(3);
    vi.mocked(getRuntimeValue).mockReturnValue(2); // different round
    vi.mocked(collectWeaponMastery).mockReturnValue({
      baseMastery: 'Nick',
      extraMasteries: [],
    });

    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle', 'Acidic Spear']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
      {
        name: 'Acidic Spear',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 5,
      name: 'Test Character',
      campaignName: 'test-campaign',
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [{ effect: 'two_weapon_fighting', name: 'Dual Wielding' }],
        bonusActions: [],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Nick available but not used this round, so off-hands stay as Bonus Action
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Acidic Spear');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('Dagger');
    expect(result[1].type).toBe('Bonus Action');
    expect(result[2].name).toBe('Sickle');
    expect(result[2].type).toBe('Bonus Action');
  });

  it('adds Dual Wielder extra attack with magic bonus damage formula', async () => {
    const { collectWeaponMastery } = await import('../../combat/automation/automationPassives.js');
    vi.mocked(collectWeaponMastery).mockReturnValue({
      baseMastery: null,
      extraMasteries: [],
    });

    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['+2 Dagger', '+1 Sickle', '+3 Acidic Spear']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
      {
        name: 'Acidic Spear',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 5,
      name: 'Test Character',
      campaignName: 'test-campaign',
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [],
        bonusActions: [
          { type: 'bonus_attacks', trigger: 'attack_action_with_light_weapon' },
        ],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Acidic Spear (+3 magic) = Action, Dagger = Bonus Action + Dual Wielder, Sickle = Bonus Action + Dual Wielder = 5
    expect(result).toHaveLength(5);
    expect(result[0].name).toBe('+3 Acidic Spear');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('+2 Dagger');
    expect(result[1].type).toBe('Bonus Action');
    expect(result[2].name).toBe('Dual Wielder Extra Attack');
    expect(result[2].damageFormula).toContain('Weapon Magic Bonus');
    expect(result[2].damage).toContain('+2');
    expect(result[3].name).toBe('+1 Sickle');
    expect(result[3].type).toBe('Bonus Action');
    expect(result[4].name).toBe('Dual Wielder Extra Attack');
  });

  it('adds Dual Wielder extra attack without magic bonus when weapon is not magical', async () => {
    const { collectWeaponMastery } = await import('../../combat/automation/automationPassives.js');
    vi.mocked(collectWeaponMastery).mockReturnValue({
      baseMastery: null,
      extraMasteries: [],
    });

    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle', 'Acidic Spear']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
      {
        name: 'Acidic Spear',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 5,
      name: 'Test Character',
      campaignName: 'test-campaign',
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [],
        bonusActions: [
          { type: 'bonus_attacks', trigger: 'attack_action_with_light_weapon' },
        ],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    expect(result).toHaveLength(5);
    expect(result[1].name).toBe('Dagger');
    expect(result[1].type).toBe('Bonus Action');
    expect(result[2].name).toBe('Dual Wielder Extra Attack');
    expect(result[2].damageFormula).not.toContain('Weapon Magic Bonus');
    expect(result[2].damage).toBe('1d4');
    expect(result[3].name).toBe('Sickle');
    expect(result[3].type).toBe('Bonus Action');
    expect(result[4].name).toBe('Dual Wielder Extra Attack');
  });

  it('skips Nick check when playerStats has no campaignName (localhost)', async () => {
    const { collectWeaponMastery } = await import('../../combat/automation/automationPassives.js');
    vi.mocked(collectWeaponMastery).mockReturnValue({
      baseMastery: 'Nick',
      extraMasteries: [],
    });

    findEquippedWeaponsStub
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['Dagger', 'Sickle', 'Acidic Spear']);

    const allEquipment = [
      {
        name: 'Dagger',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse', 'Thrown'],
      },
      {
        name: 'Sickle',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d4', damage_type: 'Slashing' },
        range: { normal: 5 },
        properties: ['Light', 'Finesse'],
      },
      {
        name: 'Acidic Spear',
        equipment_category: 'Weapon',
        weapon_range: 'Melee',
        damage: { damage_dice: '1d6', damage_type: 'Piercing' },
        range: { normal: 5 },
        properties: ['Light', 'Thrown'],
      },
    ];
    const playerStats = defaultPlayerStats({
      level: 5,
      name: 'Test Character',
      // No campaignName - Nick check should be skipped
      abilities: [
        { name: 'Strength', baseScore: 16, abilityImprovements: 0, miscBonus: 0, bonus: 3 },
        { name: 'Dexterity', baseScore: 10, abilityImprovements: 0, miscBonus: 0, bonus: 0 },
      ],
      class: { name: 'Fighter' },
      automation: {
        passives: [],
        bonusActions: [],
      },
    });

    const result = getAttacks(allEquipment, [], playerStats);

    // Without campaignName, Nick check is skipped, off-hands stay as Bonus Action
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Acidic Spear');
    expect(result[0].type).toBe('Action');
    expect(result[1].name).toBe('Dagger');
    expect(result[1].type).toBe('Bonus Action');
    expect(result[2].name).toBe('Sickle');
    expect(result[2].type).toBe('Bonus Action');
  });
});

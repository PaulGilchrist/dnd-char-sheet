// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAttackContextSync } from './contextBuilder.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

vi.mock('./common/damageRoll.js', () => ({
  buildBaseAttackContext: vi.fn(),
}));

vi.mock('../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../maps/mapsService.js', () => ({
  loadMapData: vi.fn(),
}));

vi.mock('../rules/combat/rangeValidation.js', () => ({
  computeRangeEffect: vi.fn(),
  computeMeleeProximityEffect: vi.fn(),
  getDistanceFeet: vi.fn(),
  isHostileNPC: vi.fn(),
  getNearestPlacedItem: vi.fn(),
  rangeToFeet: vi.fn(),
}));

vi.mock('../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../rules/combat/coverService.js', () => ({
  computeCover: vi.fn(),
}));

vi.mock('../npcs/npcsService.js', () => ({
  loadNPCs: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../combat/buffs/buffService.js', () => ({
  getInnateSorceryBonus: vi.fn(),
}));

vi.mock('../combat/auras/wolfAuraUtils.js', () => ({
  getWolfAdvantageAgainst: vi.fn(),
}));

vi.mock('../combat/auras/duplicityAuraUtils.js', () => ({
  getDuplicityAdvantageAgainst: vi.fn(),
}));

vi.mock('../combat/auras/lionAuraUtils.js', () => ({
  getLionDisadvantageAgainst: vi.fn(),
}));

vi.mock('../combat/auras/coronaAuraUtils.js', () => ({
  getCoronaSaveDisadvantage: vi.fn(),
}));

vi.mock('./handlers/class-cleric-paladin/avengingAngelHandler.js', () => ({
  isActive: vi.fn(),
  isAuraTarget: vi.fn(),
  handle: vi.fn(),
}));

const { buildBaseAttackContext } = await import('./common/damageRoll.js');
const { getInnateSorceryBonus } = await import('../combat/buffs/buffService.js');
const { getWolfAdvantageAgainst } = await import('../combat/auras/wolfAuraUtils.js');
const { getDuplicityAdvantageAgainst } = await import('../combat/auras/duplicityAuraUtils.js');
const { getLionDisadvantageAgainst } = await import('../combat/auras/lionAuraUtils.js');
const { getCoronaSaveDisadvantage } = await import('../combat/auras/coronaAuraUtils.js');
const { isActive: isAvengingAngelActive, isAuraTarget } = await import('./handlers/class-cleric-paladin/avengingAngelHandler.js');

const mockStats = {
  name: 'Fighter1',
  level: 5,
  proficiency: 2,
  class: {
    class_levels: [{ rage_damage: 2 }],
  },
  abilities: [
    { name: 'Charisma', bonus: 2 },
    { name: 'Strength', bonus: 4 },
    { name: 'Dexterity', bonus: 3 },
  ],
  automation: {
    passives: [],
  },
};

const mockAttack = {
  name: 'Longsword',
  damage: '1d8+4',
  damageType: 'Slashing',
  hitBonus: 7,
  hitBonusFormula: 'To Hit = 4 + 2 + 1',
  weaponType: 'melee',
};

function defaultBaseAttackContext(targetName = 'Orc', target = null) {
  buildBaseAttackContext.mockResolvedValue({
    target: target ?? { name: targetName },
    targetName,
    resistanceNotice: null,
  });
}

describe('contextBuilder-sync: innate sorcery bonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets forcedMode to advantage when spellAdvantage is true', async () => {
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: true, saveDcBonus: 0 });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('does not set advantage when spellAdvantage is false', async () => {
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('adds saveDcBonus to saveDc', async () => {
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 2 });
    const attack = { ...mockAttack, saveDc: 13 };

    const result = await buildAttackContextSync(attack, mockStats, 'camp', 'normal', {});

    expect(result.saveDc).toBe(15);
  });
});

describe('contextBuilder-sync: activeBuffs — stance damage (rage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('includes stance damage in autoDamageFormula when rage buff active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.autoDamageFormula).toBe('1d8+4 plus 2');
  });

  it('accumulates stance damage from multiple rage buffs', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [
        { damageBonusExpression: 'rage_damage' },
        { damageBonusExpression: 'rage_damage' },
      ];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.autoDamageFormula).toBe('1d8+4 plus 4');
  });

  it('uses rage_damage from class_levels when buff expression is rage_damage', async () => {
    const stats = {
      ...mockStats,
      level: 2,
      class: {
        class_levels: [undefined, { rage_damage: 5 }],
      },
    };
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.autoDamageFormula).toBe('1d8+4 plus 5');
  });

  it('defaults to 2 for rage_damage when class_levels entry is undefined', async () => {
    const stats = {
      ...mockStats,
      class: {
        class_levels: [undefined, undefined, undefined],
      },
      level: 4,
    };
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ damageBonusExpression: 'rage_damage' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.autoDamageFormula).toBe('1d8+4 plus 2');
  });

  it('ignores non-rage_damage damageBonusExpression', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ damageBonusExpression: 'some_other_expression' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.autoDamageFormula).toBe('1d8+4');
  });
});

describe('contextBuilder-sync: activeBuffs — reckless attack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets forcedMode to advantage when reckless attack buff is active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });
});

describe('contextBuilder-sync: activeBuffs — Ram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets ramActive true when Ram buff is present', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ optionName: 'Ram' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.ramActive).toBe(true);
  });

  it('sets ramActive false when Ram buff is absent', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.ramActive).toBe(false);
  });
});

describe('contextBuilder-sync: Dodge action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets forcedMode to disadvantage when target has Dodge active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs' && name === 'Orc') return [{ name: 'Dodge', effect: 'dodge', duration: 'until_start_of_next_turn' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('disadvantage');
  });

  it('does not set disadvantage when target does not have Dodge active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs' && name === 'Orc') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('cancels dodge disadvantage with reckless attack advantage', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ effect: 'reckless_attack', target: 'Orc' }];
      if (key === 'activeBuffs' && name === 'Orc') return [{ name: 'Dodge', effect: 'dodge' }];
      if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });
});

describe('contextBuilder-sync: activeBuffs — sacred weapon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('adds Charisma bonus to sacredWeaponBonus and hitBonus for melee attacks', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.sacredWeaponBonus).toBe(2);
    expect(result.hitBonus).toBe(9);
  });

  it('includes sacred weapon text in hitBonusFormula when active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.hitBonusFormula).toBe('To Hit = 4 + 2 + 1 + Sacred Weapon (2)');
  });

  it('does not add sacred weapon bonus for ranged attacks', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
      return undefined;
    });

    const rangedAttack = { ...mockAttack, weaponType: 'ranged', hitBonus: 7, hitBonusFormula: 'To Hit = 5 + 2 + 1' };

    const result = await buildAttackContextSync(rangedAttack, mockStats, 'camp', 'normal', {});

    expect(result.sacredWeaponBonus).toBe(0);
    expect(result.hitBonus).toBe(7);
  });

  it('adds sacred weapon bonus for unarmed attacks', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
      return undefined;
    });

    const unarmedAttack = { ...mockAttack, weaponType: 'unarmed' };

    const result = await buildAttackContextSync(unarmedAttack, mockStats, 'camp', 'normal', {});

    expect(result.sacredWeaponBonus).toBe(2);
  });

  it('caps sacred weapon Charisma bonus at minimum 1', async () => {
    const stats = {
      ...mockStats,
      abilities: [
        { name: 'Charisma', bonus: -1 },
        { name: 'Strength', bonus: 4 },
      ],
    };
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.sacredWeaponBonus).toBe(1);
  });
});

describe('contextBuilder-sync: activeBuffs — vow of enmity and clairvoyant combatant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets advantage when vow of enmity is on target activeBuffs', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'vow_of_enmity' }];
      return undefined;
    });

    const vowResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(vowResult.forcedMode).toBe('advantage');

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'clairvoyant_combatant' }];
      if (key === 'clairvoyantCombatantTarget') return 'Orc';
      return undefined;
    });

    const clairResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(clairResult.forcedMode).toBe('advantage');
  });

  it('does not set advantage when vow_of_enmity is not on target activeBuffs', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'divine_shield' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.forcedMode).toBeUndefined();

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'clairvoyant_combatant' }];
      return undefined;
    });

    const clairResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(clairResult.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: activeBuffs — create_illusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets advantage when create_illusion buff is active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ effect: 'create_illusion' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });
});

describe('contextBuilder-sync: activeBuffs — avenging angel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
  });

  it('sets advantage when avenging angel active and target is in aura', async () => {
    const { isActive: isAvengingAngelActive, isAuraTarget } = await import('./handlers/class-cleric-paladin/avengingAngelHandler.js');
    isAvengingAngelActive.mockReturnValue(true);
    isAuraTarget.mockReturnValue(true);

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('does not set advantage when avenging angel active but target not in aura', async () => {
    isAvengingAngelActive.mockReturnValue(true);
    isAuraTarget.mockReturnValue(false);

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

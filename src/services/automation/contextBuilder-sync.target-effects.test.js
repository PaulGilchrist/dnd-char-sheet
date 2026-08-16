// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAttackContextSync } from './contextBuilder.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

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

vi.mock('./handlers/spells/sanctuaryHandler.js', () => ({
  endSanctuary: vi.fn(),
}));

vi.mock('../automation/handlers/buffs/protectionFromEvilAndGoodHandler.js', () => ({
  isProtectionFromEvilAndGoodActive: vi.fn().mockReturnValue(false),
  isCreatureWarded: vi.fn().mockReturnValue(false),
}));

vi.mock('../combat/automation/automationService.js', () => ({
  collectWeaponMastery: vi.fn().mockReturnValue({ baseMastery: null, extraMasteries: [] }),
}));

vi.mock('../combat/automation/automationExpressions.js', () => ({
  resolveDiceExpression: vi.fn(),
}));

vi.mock('../combat/automation/automationPassives.js', () => ({
  isResilientSphereActive: vi.fn().mockReturnValue(false),
}));

vi.mock('../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn().mockReturnValue(1),
}));

const { buildBaseAttackContext } = await import('./common/damageRoll.js');
const { getInnateSorceryBonus } = await import('../combat/buffs/buffService.js');
const { getWolfAdvantageAgainst } = await import('../combat/auras/wolfAuraUtils.js');
const { getDuplicityAdvantageAgainst } = await import('../combat/auras/duplicityAuraUtils.js');
const { getLionDisadvantageAgainst } = await import('../combat/auras/lionAuraUtils.js');
const { getCoronaSaveDisadvantage } = await import('../combat/auras/coronaAuraUtils.js');

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

function defaultAuraMocks() {
  getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
  getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
  getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
  getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
  getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
}

describe('contextBuilder-sync: distracting strike advantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('sets advantage and consumes effect when distracting strike exists from another source', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'distracting_strike_advantage', target: 'Orc', source: 'Ally' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      [],
      'camp',
    );
  });

  it('does not set advantage or consume when distracting strike is from the attacker', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'distracting_strike_advantage', target: 'Orc', source: 'Fighter1' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.forcedMode).toBeUndefined();
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('does not set advantage or consume when distracting strike targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'distracting_strike_advantage', target: 'Goblin', source: 'Ally' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.forcedMode).toBeUndefined();
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('preserves other effects when consuming distracting strike', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'distracting_strike_advantage', target: 'Orc', source: 'Ally' },
        { effect: 'graze', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      [{ effect: 'graze', target: 'Orc' }],
      'camp',
    );
  });

  it('does nothing when targetEffects is empty array', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });
});

describe('contextBuilder-sync: next_attack_advantage (vex effect)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('sets advantage and consumes effect when vex effect matches attacker and target', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_advantage', target: 'Fighter1', vexTarget: 'Orc', source: 'Thorn' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      [],
      'camp',
    );
  });

  it('does not set advantage or consume when vex effect target does not match attacker', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_advantage', target: 'Other', vexTarget: 'Orc', source: 'Thorn' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.forcedMode).toBeUndefined();
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('does not set advantage or consume when vex vexTarget does not match attack target', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_advantage', target: 'Fighter1', vexTarget: 'Goblin', source: 'Thorn' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.forcedMode).toBeUndefined();
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('preserves other effects when consuming vex effect', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_advantage', target: 'Fighter1', vexTarget: 'Orc', source: 'Thorn' },
        { effect: 'graze', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'campaign',
      'targetEffects',
      [{ effect: 'graze', target: 'Orc' }],
      'camp',
    );
  });
});

describe('contextBuilder-sync: protection effect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('sets forcedMode to disadvantage when protection is on target', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'protection', target: 'Orc', source: 'Paladin' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('disadvantage');
  });

  it('does not set disadvantage when protection targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'protection', target: 'Goblin', source: 'Paladin' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: blur and foresight save disadvantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('does not set forcedMode from blur alone because disadvantage is computed after forcedMode resolution', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'blur', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set forcedMode from foresight alone because disadvantage is computed after forcedMode resolution', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'foresight', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not override forcedMode from other sources when blur is present', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'blur', target: 'Orc' },
        { effect: 'reckless_attack', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });
});

describe('contextBuilder-sync: reckless attack and crusher effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('adds advantage when reckless_attack effect is on target', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'reckless_attack', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('adds advantage when crusher_enhanced_critical effect is on target', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'crusher_enhanced_critical', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('does not set advantage when reckless_attack targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'reckless_attack', target: 'Goblin' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: attacker disadvantage effects (sap + slasher)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('sets forcedMode to disadvantage when sap effect targets attacker', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'disadvantage_next_attack', target: 'Fighter1' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('disadvantage');
  });

  it('sets forcedMode to disadvantage when slasher effect targets attacker', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'slasher_enhanced_critical', target: 'Fighter1' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('disadvantage');
  });

  it('does not set disadvantage when sap effect targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'disadvantage_next_attack', target: 'Other' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set disadvantage when slasher effect targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'slasher_enhanced_critical', target: 'Other' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: next_attack_bonus (Sundering Blow hit bonus)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    defaultAuraMocks();
  });

  it('does not add next_attack_bonus to hitBonus because sunderingBonus is computed after effectiveHitBonus', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_bonus', target: 'Orc', value: 5 },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.hitBonus).toBe(7);
  });

  it('processes next_attack_bonus from multiple effects on target but hitBonus is unchanged', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_bonus', target: 'Orc', value: 5 },
        { effect: 'next_attack_bonus', target: 'Orc', value: 3 },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.hitBonus).toBe(7);
  });

  it('does not add bonus when next_attack_bonus targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_bonus', target: 'Goblin', value: 5 },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.hitBonus).toBe(7);
  });

  it('defaults to 5 when next_attack_bonus value is missing but hitBonus is unchanged', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'next_attack_bonus', target: 'Orc' },
      ];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.hitBonus).toBe(7);
  });
});

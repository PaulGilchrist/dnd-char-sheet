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

const { isActive: isAvengingAngelActive, isAuraTarget } = await import('./handlers/class-cleric-paladin/avengingAngelHandler.js');

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
  isAvengingAngelActive.mockReturnValue(false);
  isAuraTarget.mockReturnValue(false);
}

describe('contextBuilder-sync: stored save advantage (Stunning Strike)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    defaultAuraMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('sets forcedMode to advantage when stored advantage array contains the target and consumes it', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (key === '_advantageOn_Orc') return ['Orc'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Fighter1',
      '_advantageOn_Orc',
      [],
      'camp',
    );
  });

  it('uses the correct _advantageOn key per target name', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (key === '_advantageOn_Goblin') return ['Goblin'];
      return undefined;
    });

    buildBaseAttackContext.mockResolvedValue({
      target: { name: 'Goblin' },
      targetName: 'Goblin',
      resistanceNotice: null,
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Fighter1',
      '_advantageOn_Goblin',
      [],
      'camp',
    );
  });

  it('does not set advantage when stored advantage array does not contain the target', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (key === '_advantageOn_Orc') return ['Goblin'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('does not set advantage when stored advantage is not an array', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (key === '_advantageOn_Orc') return 'Orc';
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set advantage when stored advantage is null', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (key === '_advantageOn_Orc') return null;
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: condition-based advantage on attacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    defaultAuraMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('sets forcedMode to advantage when target is stunned', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['stunned'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is blinded', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['blinded'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is charmed', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['charmed'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is paralyzed', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['paralyzed'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is petrified', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['petrified'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is restrained', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['restrained'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is unconscious', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['unconscious'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is dazed', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['dazed'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets forcedMode to advantage when target is slow', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['slow'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('handles case-insensitive condition matching', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['Stunned', 'BLINDED', 'Charmed'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('does not set advantage when target has no relevant conditions', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['prone'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set advantage when target has no conditions at all', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set advantage when target conditions is not an array', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return 'stunned';
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: grappled + Grappler feat advantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    defaultAuraMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('sets advantage when attacker has Grappler saveModifiers and target is grappled', async () => {
    const grapplerStats = {
      ...mockStats,
      saveModifiers: [
        { target: 'attack_roll', type: 'grappled_advantage' },
      ],
    };

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['grappled'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, grapplerStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets advantage when Grappler modifier uses attack_rolls (plural) target', async () => {
    const grapplerStats = {
      ...mockStats,
      saveModifiers: [
        { target: 'attack_rolls', type: 'grappled_advantage' },
      ],
    };

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['grappled'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, grapplerStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('does not set advantage when attacker lacks Grappler saveModifiers', async () => {
    const noGrapplerStats = {
      ...mockStats,
      saveModifiers: [],
    };

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['grappled'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, noGrapplerStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set advantage when target is not grappled', async () => {
    const grapplerStats = {
      ...mockStats,
      saveModifiers: [
        { target: 'attack_roll', type: 'grappled_advantage' },
      ],
    };

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['prone'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, grapplerStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set advantage when Grappler saveModifiers is missing', async () => {
    const noModifiersStats = {
      ...mockStats,
    };

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['grappled'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, noModifiersStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: attacker disadvantage effects (sap + slasher)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    defaultAuraMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('sets forcedMode to disadvantage when sap effect targets attacker', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ effect: 'disadvantage_next_attack', target: 'Fighter1' }];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('disadvantage');
  });

  it('sets forcedMode to disadvantage when slasher effect targets attacker', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ effect: 'slasher_enhanced_critical', target: 'Fighter1' }];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('disadvantage');
  });

  it('counts both sap and slasher for disadvantage', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [
        { effect: 'disadvantage_next_attack', target: 'Fighter1' },
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
      if (name === 'campaign' && key === 'targetEffects') return [{ effect: 'disadvantage_next_attack', target: 'Other' }];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });

  it('does not set disadvantage when slasher effect targets a different creature', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ effect: 'slasher_enhanced_critical', target: 'Other' }];
      if (key === 'activeBuffs') return [];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBeUndefined();
  });
});

describe('contextBuilder-sync: condition advantage combines with other sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    defaultAuraMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('sets advantage when target is stunned and reckless attack effect is present', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ effect: 'reckless_attack', target: 'Orc' }];
      if (key === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }];
      if (name === 'Orc' && key === 'activeConditions') return ['stunned'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });

  it('sets advantage when multiple condition sources stack', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [];
      if (name === 'Orc' && key === 'activeConditions') return ['stunned', 'blinded', 'restrained'];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.forcedMode).toBe('advantage');
  });
});

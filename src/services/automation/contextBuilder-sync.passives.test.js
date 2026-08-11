// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAttackContextSync } from './contextBuilder.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { collectWeaponMastery } from '../combat/automation/automationService.js';

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

vi.mock('../combat/automation/automationService.js', () => ({
  collectWeaponMastery: vi.fn(),
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

describe('contextBuilder-sync: hunter lore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
  });

  it('includes hunterLoreNotice when passive exists and target has vulnerability data', async () => {
    buildBaseAttackContext.mockResolvedValue({
      target: { vulnerabilities: ['fire'], resistances: [], immunities: [] },
      targetName: 'Orc',
      resistanceNotice: null,
    });
    const stats = {
      ...mockStats,
      automation: { passives: [{ type: 'passive_rule', effect: 'hunter_lore' }] },
    };

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.hunterLoreNotice).toContain('Vulnerabilities');
    expect(result.hunterLoreNotice).toContain('fire');
  });

  it('does not include hunterLoreNotice when target has no IRV data or passive does not exist', async () => {
    buildBaseAttackContext.mockResolvedValue({
      target: { name: 'Orc' },
      targetName: 'Orc',
      resistanceNotice: null,
    });
    const stats = {
      ...mockStats,
      automation: { passives: [{ type: 'passive_rule', effect: 'hunter_lore' }] },
    };

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});
    expect(result.hunterLoreNotice).toBeNull();

    const noPassiveResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(noPassiveResult.hunterLoreNotice).toBeNull();
  });

  it('does not include hunterLoreNotice when target is null', async () => {
    buildBaseAttackContext.mockResolvedValue({
      target: null,
      targetName: null,
      resistanceNotice: null,
    });
    const stats = {
      ...mockStats,
      automation: { passives: [{ type: 'passive_rule', effect: 'hunter_lore' }] },
    };

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.hunterLoreNotice).toBeNull();
  });
});

describe('contextBuilder-sync: critical range', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
  });

  it('includes criticalRange from passives', async () => {
    const stats = {
      ...mockStats,
      automation: {
        passives: [{ type: 'passive_rule', effect: 'critical_range', criticalRange: '19-20' }],
      },
    };

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.criticalRange).toBe('19-20');
  });

  it('returns empty string when no critical range passive or passive lacks value', async () => {
    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.criticalRange).toBe('');

    const stats = {
      ...mockStats,
      automation: { passives: [{ type: 'passive_rule', effect: 'critical_range' }] },
    };

    const noValueResult = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});
    expect(noValueResult.criticalRange).toBe('');
  });

  it('uses last matching critical_range passive when multiple exist', async () => {
    const stats = {
      ...mockStats,
      automation: {
        passives: [
          { type: 'passive_rule', effect: 'critical_range', criticalRange: '19-20' },
          { type: 'passive_rule', effect: 'critical_range', criticalRange: '20' },
        ],
      },
    };

    const result = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});

    expect(result.criticalRange).toBe('20');
  });
});

describe('contextBuilder-sync: glorious defense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
  });

  it('does not include gloriousDefenseBonus in context (handled retroactively by handler)', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'gloriousDefenseActive') return true;
      if (key === 'gloriousDefenseBonus') return 2;
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.gloriousDefenseBonus).toBeUndefined();
  });
});

describe('contextBuilder-sync: defensive duelist and bait and switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
  });

  it('includes AC bonuses when active', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs' && name === 'Fighter1') return [{ effect: 'defensive_duelist' }];
      return undefined;
    });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(result.defensiveDuelistBonus).toBe(2);

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'baitAndSwitchActive') return true;
      if (key === 'baitAndSwitchBonus') return 3;
      return undefined;
    });

    const baitResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(baitResult.baitAndSwitchBonus).toBe(3);
  });
});

describe('contextBuilder-sync: stroke of luck and boon of fate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
    collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
  });

  it('sets available when passive exists and not used', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'strokeOfLuckUsed') return false;
      return undefined;
    });
    const stats = {
      ...mockStats,
      automation: { passives: [{ type: 'stroke_of_luck' }] },
    };

    const strokeResult = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});
    expect(strokeResult.strokeOfLuck).toBe(true);

    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'boonOfFateUsed') return false;
      return undefined;
    });
    const boonStats = {
      ...mockStats,
      automation: { passives: [{ type: 'modify_d20_roll' }] },
    };

    const boonResult = await buildAttackContextSync(mockAttack, boonStats, 'camp', 'normal', {});
    expect(boonResult.boonOfFate).toBe(true);
  });

  it('sets unavailable when passive exists but already used or passive does not exist', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'strokeOfLuckUsed') return true;
      return undefined;
    });
    const stats = {
      ...mockStats,
      automation: { passives: [{ type: 'stroke_of_luck' }] },
    };

    const strokeResult = await buildAttackContextSync(mockAttack, stats, 'camp', 'normal', {});
    expect(strokeResult.strokeOfLuck).toBe(false);

    const boonResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(boonResult.boonOfFate).toBe(false);
  });
});

describe('contextBuilder-sync: graze damage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
  });

  it('includes grazeDamage when weapon has Graze mastery in base or extra', async () => {
    collectWeaponMastery.mockReturnValue({ baseMastery: 'Graze', extraMasteries: [] });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.grazeDamage).toBe(true);
    expect(result.grazeAbilityName).toBe('Strength');
    expect(result.grazeAbilityMod).toBe(4);

    collectWeaponMastery.mockReturnValue({ baseMastery: 'Cleave', extraMasteries: ['Graze'] });

    const extraResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
    expect(extraResult.grazeDamage).toBe(true);
    expect(extraResult.grazeAbilityMod).toBe(4);
  });

  it('uses attack.abilityName when provided, defaults to Strength', async () => {
    collectWeaponMastery.mockReturnValue({ baseMastery: 'Graze', extraMasteries: [] });
    const attack = { ...mockAttack, abilityName: 'Dexterity' };

    const result = await buildAttackContextSync(attack, mockStats, 'camp', 'normal', {});

    expect(result.grazeAbilityName).toBe('Dexterity');
    expect(result.grazeAbilityMod).toBe(3);

    collectWeaponMastery.mockReturnValue({ baseMastery: 'Graze', extraMasteries: [] });
    const noAbilityAttack = { ...mockAttack, abilityName: undefined };

    const defaultResult = await buildAttackContextSync(noAbilityAttack, mockStats, 'camp', 'normal', {});
    expect(defaultResult.grazeAbilityName).toBe('Strength');
  });

  it('excludes grazeDamage when no Graze mastery', async () => {
    collectWeaponMastery.mockReturnValue({ baseMastery: 'Cleave', extraMasteries: [] });

    const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

    expect(result.grazeDamage).toBe(false);
    expect(result.grazeAbilityName).toBeNull();
    expect(result.grazeAbilityMod).toBe(0);
  });
});

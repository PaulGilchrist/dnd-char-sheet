// @improved-by-ai
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

describe('contextBuilder-sync: aura checks — no map (sync path)', () => {
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

  describe('wolf aura', () => {
    it('sets forcedMode to advantage when wolf aura is active', async () => {
      getWolfAdvantageAgainst.mockReturnValue({ advantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('advantage');
    });

    it('does not set forcedMode when wolf aura is inactive', async () => {
      getWolfAdvantageAgainst.mockReturnValue({ advantage: false });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });

    it('returns empty object without crashing when wolf aura returns falsy values', async () => {
      getWolfAdvantageAgainst.mockReturnValue({});

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });
  });

  describe('duplicity aura', () => {
    it('sets forcedMode to advantage when duplicity aura is active', async () => {
      getDuplicityAdvantageAgainst.mockReturnValue({ advantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('advantage');
    });

    it('does not set forcedMode when duplicity aura is inactive', async () => {
      getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });
  });

  describe('lion aura', () => {
    it('sets forcedMode to disadvantage when lion aura is active', async () => {
      getLionDisadvantageAgainst.mockReturnValue({ disadvantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('disadvantage');
    });

    it('does not set forcedMode when lion aura is inactive', async () => {
      getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });
  });

  describe('corona aura', () => {
    it('sets forcedMode to disadvantage when corona save disadvantage is active', async () => {
      getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('disadvantage');
    });

    it('does not set forcedMode when corona save disadvantage is inactive', async () => {
      getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });
  });

  describe('no aura active', () => {
    it('does not set forcedMode when all auras are inactive', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
      expect(result.advantageReason).toBeUndefined();
    });
  });

  describe('aura priority', () => {
    it('prefers wolf advantage over lion disadvantage', async () => {
      getWolfAdvantageAgainst.mockReturnValue({ advantage: true });
      getLionDisadvantageAgainst.mockReturnValue({ disadvantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('advantage');
    });

    it('prefers duplicity advantage over corona disadvantage', async () => {
      getDuplicityAdvantageAgainst.mockReturnValue({ advantage: true });
      getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('advantage');
    });

    it('does not override an already-set forcedMode with aura advantage', async () => {
      getWolfAdvantageAgainst.mockReturnValue({ advantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'death_attack', {});

      expect(result.forcedMode).toBe('death_attack');
    });

    it('does not override an already-set forcedMode with aura disadvantage', async () => {
      getLionDisadvantageAgainst.mockReturnValue({ disadvantage: true });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'disadvantage', {});

      expect(result.forcedMode).toBe('disadvantage');
    });
  });

  describe('protection effect', () => {
    it('sets forcedMode to disadvantage when protection is on target', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'protection', target: 'Orc', source: 'Paladin' }];
        return undefined;
      });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBe('disadvantage');
    });

    it('does not set forcedMode when protection is not on target', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'sanctuary', target: 'Orc', source: 'Cleric' }];
        return undefined;
      });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });

    it('preserves other effects when protection is present', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [
          { effect: 'protection', target: 'Orc', source: 'Paladin' },
          { effect: 'graze', target: 'Orc' },
        ];
        return undefined;
      });

      await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(getRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects');
    });
  });
});

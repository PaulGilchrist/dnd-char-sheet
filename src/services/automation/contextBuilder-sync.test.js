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

describe('contextBuilder-sync: basic context fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultBaseAttackContext();
    getRuntimeValue.mockReturnValue(undefined);
    getInnateSorceryBonus.mockReturnValue({ spellAdvantage: false, saveDcBonus: 0 });
    getWolfAdvantageAgainst.mockReturnValue({ advantage: false });
    getDuplicityAdvantageAgainst.mockReturnValue({ advantage: false });
    getLionDisadvantageAgainst.mockReturnValue({ disadvantage: false });
    getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
  });

  describe('basic context fields', () => {
    it('returns context with target and attacker names', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.targetName).toBe('Orc');
      expect(result.attackerName).toBe('Fighter1');
    });

    it('passes through damage type from attack', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.damageType).toBe('Slashing');
    });

    it('sets isMelee true for melee and unarmed, false for ranged', async () => {
      let result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
      expect(result.isMelee).toBe(true);

      const unarmedAttack = { ...mockAttack, weaponType: 'unarmed' };
      result = await buildAttackContextSync(unarmedAttack, mockStats, 'camp', 'normal', {});
      expect(result.isMelee).toBe(true);

      const rangedAttack = { ...mockAttack, weaponType: 'ranged' };
      result = await buildAttackContextSync(rangedAttack, mockStats, 'camp', 'normal', {});
      expect(result.isMelee).toBe(false);
    });

    it('defaults isWeaponAttack to true, sets false when explicitly false', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
      expect(result.isWeaponAttack).toBe(true);

      const spellAttack = { ...mockAttack, isWeaponAttack: false };
      const spellResult = await buildAttackContextSync(spellAttack, mockStats, 'camp', 'normal', {});
      expect(spellResult.isWeaponAttack).toBe(false);
    });

    it('sets isPsychicBlade true when set on attack, false otherwise', async () => {
      const psychicAttack = { ...mockAttack, isPsychicBlade: true };
      const result = await buildAttackContextSync(psychicAttack, mockStats, 'camp', 'normal', {});
      expect(result.isPsychicBlade).toBe(true);

      const normalResult = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});
      expect(normalResult.isPsychicBlade).toBe(false);
    });

    it('returns playerStats reference in result', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.playerStats).toBe(mockStats);
    });

    it('sets autoDamageName from attack name', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.autoDamageName).toBe('Longsword');
    });

    it('returns hitBonus and hitBonusFormula from attack', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.hitBonus).toBe(7);
      expect(result.hitBonusFormula).toBe('To Hit = 4 + 2 + 1');
    });

    it('returns resistanceNotice from base context', async () => {
      buildBaseAttackContext.mockResolvedValue({
        target: { name: 'Orc' },
        targetName: 'Orc',
        resistanceNotice: 'Orc resists Slashing',
      });

      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.resistanceNotice).toBe('Orc resists Slashing');
    });
  });

  describe('conditionAttackMode passthrough', () => {
    it('passes non-normal conditionAttackMode through as forcedMode', async () => {
      let result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'death_attack', {});
      expect(result.forcedMode).toBe('death_attack');

      result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'some_mode', {});
      expect(result.forcedMode).toBe('some_mode');
    });

    it('does not set forcedMode when conditionAttackMode is normal', async () => {
      const result = await buildAttackContextSync(mockAttack, mockStats, 'camp', 'normal', {});

      expect(result.forcedMode).toBeUndefined();
    });
  });
});

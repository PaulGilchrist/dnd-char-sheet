// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn((auto) => auto.saveDc || 15),
  createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));



vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../common/targetResolver.js', () => ({
  resolveTarget: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

import { handle } from './holdMonsterHandler.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';

const campaignName = 'TestCampaign';
const casterName = 'TestCaster';
const targetName = 'Goblin';

function makePlayerStats(overrides = {}) {
  return {
    name: casterName,
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }, { name: 'CON', bonus: 2 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Hold Monster',
    automation: { type: 'hold_monster', saveType: 'WIS', saveDc: 15, ...automation },
  };
}

const baseCombatContext = {
  creatures: [
    { name: targetName, type: 'monster', currentHp: 5, maxHp: 7 },
    { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
    { name: casterName, gridX: 5, gridY: 10, senses: [] },
  ],
  players: [{ name: casterName, gridX: 5, gridY: 10 }],
  placedItems: [],
};

// ─── handle ───

describe('holdMonsterHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('combat context validation', () => {
    it('returns popup when combat context is missing creatures', async () => {
      getCombatContext.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('target resolution', () => {
    it('returns popup when no target selected', async () => {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No target selected');
    });
  });

  describe('initial cast - failed save', () => {
    function setupFailedSave(existingConditions = [], existingEffects = []) {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      getRuntimeValue.mockImplementation((_entity, keyOrProp, _camp) => {
        if (keyOrProp === '_holdMonster_Goblin') return null;
        if (keyOrProp === 'activeConditions') return existingConditions;
        if (keyOrProp === 'targetEffects') return existingEffects;
        return [];
      });
      createSaveListener.mockReturnValue({
        promptId: 'hold-prompt',
        promise: Promise.resolve({ success: false }),
      });
    }

    it('applies Paralyzed condition on failed save', async () => {
      setupFailedSave();
      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        targetName,
        'activeConditions',
        expect.arrayContaining(['paralyzed']),
        campaignName,
      );
      expect(result.payload.description).toContain('Paralyzed');
    });

    it('appends paralyzed to existing conditions', async () => {
      setupFailedSave(['Frightened']);
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        targetName,
        'activeConditions',
        expect.arrayContaining(['Frightened', 'paralyzed']),
        campaignName,
      );
    });

  describe('initial cast - successful save', () => {
    function setupSuccessfulSave() {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(20);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      createSaveListener.mockReturnValue({
        promptId: 'hold-prompt-success',
        promise: Promise.resolve({ success: true }),
      });
    }

    it('returns popup when target succeeds save', async () => {
      setupSuccessfulSave();

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('succeeded on WIS save');
    });

    it('does not apply any conditions on success', async () => {
      setupSuccessfulSave();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        targetName,
        'activeConditions',
        expect.anything(),
        campaignName,
      );
    });
  });

  describe('target validation', () => {
    it('returns popup when target is not found in combat', async () => {
      const ctx = {
        creatures: [
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: casterName, gridX: 5, gridY: 10, senses: [] },
        ],
        players: [{ name: casterName, gridX: 5, gridY: 10 }],
        placedItems: [],
      };
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: 'NonExistent' } });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('not found in combat');
    });

    it('returns popup when target is immune to Paralyzed', async () => {
      const ctx = {
        ...baseCombatContext,
        creatures: [
          { name: targetName, type: 'monster', currentHp: 5, maxHp: 7, immunities: ['Paralyzed'] },
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: casterName, gridX: 5, gridY: 10, senses: [] },
        ],
      };
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('immune to Paralyzed');
      expect(createSaveListener).not.toHaveBeenCalled();
    });

    it('returns popup when target is Petrified (immune to Paralyzed)', async () => {
      const ctx = {
        ...baseCombatContext,
        creatures: [
          { name: targetName, type: 'monster', currentHp: 0, maxHp: 7 },
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: casterName, gridX: 5, gridY: 10, senses: [] },
        ],
      };
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      getRuntimeValue.mockImplementation((_entity, keyOrProp, _camp) => {
        if (keyOrProp === 'activeConditions') return ['petrified'];
        return [];
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('immune to Paralyzed');
      expect(createSaveListener).not.toHaveBeenCalled();
    });

    it('returns popup when target is invisible and caster cannot see', async () => {
      const ctx = {
        ...baseCombatContext,
        creatures: [
          { name: targetName, type: 'monster', currentHp: 5, maxHp: 7 },
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: casterName, gridX: 5, gridY: 10, senses: [] },
        ],
      };
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      getRuntimeValue.mockImplementation((_entity, keyOrProp, _camp) => {
        if (keyOrProp === 'activeConditions') return ['invisible'];
        return [];
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain("can't see the target");
      expect(createSaveListener).not.toHaveBeenCalled();
    });

    it('allows spell when target is invisible but caster has Truesight', async () => {
      const ctx = {
        ...baseCombatContext,
        creatures: [
          { name: targetName, type: 'monster', currentHp: 5, maxHp: 7 },
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: casterName, gridX: 5, gridY: 10, senses: [{ name: 'Truesight', value: '60 ft.' }] },
        ],
      };
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      getRuntimeValue.mockImplementation((_entity, keyOrProp, _camp) => {
        if (keyOrProp === 'activeConditions') return ['invisible'];
        return [];
      });
      createSaveListener.mockReturnValue({
        promptId: 'hold-truesight',
        promise: Promise.resolve({ success: false }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Paralyzed');
      expect(createSaveListener).toHaveBeenCalled();
    });

    it('allows spell when target is invisible but caster has Blindsight', async () => {
      const ctx = {
        ...baseCombatContext,
        creatures: [
          { name: targetName, type: 'monster', currentHp: 5, maxHp: 7 },
          { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
          { name: casterName, gridX: 5, gridY: 10, senses: [{ name: 'Blindsight', value: '30 ft' }] },
        ],
      };
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      getRuntimeValue.mockImplementation((_entity, keyOrProp, _camp) => {
        if (keyOrProp === 'activeConditions') return ['invisible'];
        return [];
      });
      createSaveListener.mockReturnValue({
        promptId: 'hold-blindsight',
        promise: Promise.resolve({ success: false }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Paralyzed');
      expect(createSaveListener).toHaveBeenCalled();
    });
  });

  describe('concentration tracking', () => {
    function setupFailedSave() {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: targetName } });
      getRuntimeValue.mockImplementation((_entity, keyOrProp, _camp) => {
        if (keyOrProp === 'activeConditions') return [];
        return [];
      });
      createSaveListener.mockReturnValue({
        promptId: 'hold-conc',
        promise: Promise.resolve({ success: false }),
      });
    }

    it('registers concentration on the caster when save fails', async () => {
      setupFailedSave();
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addConcentration).toHaveBeenCalledWith(
        baseCombatContext,
        casterName,
        'Hold Monster',
        expect.any(Number),
      );
    });
  });
});
});

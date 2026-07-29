// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  handle,
  processOttoDanceSuccessSave,
} from './ottosDanceHandler.js';

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../common/targetResolver.js', () => ({
  resolveTarget: vi.fn(),
}));

import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { addEntry } from '../../../ui/logService.js';

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: "Otto's Irresistible Dance",
    automation: { type: 'ottos_dance', saveType: 'WIS', saveDc: 15, ...automation },
  };
}

const baseCombatContext = {
  creatures: [
    { name: 'Goblin', type: 'monster', currentHp: 5, maxHp: 7 },
    { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
    { name: 'TestCaster', gridX: 5, gridY: 10 },
  ],
  players: [{ name: 'TestCaster', gridX: 5, gridY: 10 }],
  placedItems: [],
};

/**
 * Shared beforeEach for all tests: clear all mocked module state.
 */
beforeEach(() => {
  vi.clearAllMocks();
});

describe('ottosDanceHandler.handle', () => {
  describe('combat context validation', () => {
    it('should return popup when no combat context exists', async () => {
      getCombatContext.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('target resolution', () => {
    it('should return popup when no target selected', async () => {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No target selected');
    });

    it('should call resolveTarget with campaignName and casterName', async () => {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      getRuntimeValue.mockReturnValue(null);
      createSaveListener.mockReturnValue({
        promptId: 'otto-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(resolveTarget).toHaveBeenCalledWith(campaignName, 'TestCaster');
    });
  });

  describe('initial cast - successful save', () => {
    function setupSuccessfulSave() {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(20);
      resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      getRuntimeValue.mockImplementation((_caster, key) => {
        if (key === '_ottosDance_Goblin') return null;
        return [];
      });
      createSaveListener.mockReturnValue({
        promptId: 'otto-success-save',
        promise: Promise.resolve({ success: true }),
      });
    }

    it('should return popup describing target dancing when save succeeds', async () => {
      setupSuccessfulSave();

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('dances comically');
    });

    it('should call addEntry with condition applied on successful save', async () => {
      setupSuccessfulSave();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'condition',
          action: 'applied',
          condition: 'Speed 0',
        }),
      );
    });

    it('should add expiration for speed_zero on successful save', async () => {
      setupSuccessfulSave();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addExpiration).toHaveBeenCalledWith(
        'TestCaster',
        'Goblin',
        expect.arrayContaining([{ type: 'speed_zero', condition: 'speed_zero' }]),
        campaignName,
        undefined,
        'TestCaster',
      );
    });

    it('should call addEntry with ability_use on initial cast', async () => {
      setupSuccessfulSave();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'TestCaster',
          abilityName: "Otto's Irresistible Dance",
        }),
      );
    });
  });

  describe('initial cast - failed save', () => {
    function setupFailedSave(existingConditions = [], existingEffects = []) {
      getCombatContext.mockResolvedValue(baseCombatContext);
      buildSaveDc.mockReturnValue(15);
      resolveTarget.mockResolvedValue({ target: { name: 'Goblin' } });
      getRuntimeValue.mockImplementation((_caster, key, _camp) => {
        if (key === '_ottosDance_Goblin') return null;
        if (key === 'activeConditions') return existingConditions;
        if (key === 'targetEffects') return existingEffects;
        return [];
      });
      createSaveListener.mockReturnValue({
        promptId: 'otto-fail',
        promise: Promise.resolve({ success: false }),
      });
    }

    it('should apply charmed and speed_zero conditions on failed save', async () => {
      setupFailedSave();
      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Charmed');
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['charmed', 'speed_zero']),
        campaignName,
      );
    });

    it('should add expiration for charmed and speed_zero conditions', async () => {
      setupFailedSave();
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addExpiration).toHaveBeenCalledWith(
        'TestCaster',
        'Goblin',
        expect.any(Array),
        campaignName,
      );
    });

    it('should call addEntry on failed save', async () => {
      setupFailedSave();
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'condition',
          action: 'applied',
          characterName: 'Goblin',
          condition: 'Charmed, Speed 0',
        }),
      );
    });

    it('should call addEntry with save_result on failed save', async () => {
      setupFailedSave();
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'save_result',
          characterName: 'TestCaster',
          targetName: 'Goblin',
          saveDc: 15,
          saveType: 'WIS',
          success: false,
        }),
      );
    });

    it('should append to existing conditions on failed save', async () => {
      setupFailedSave(['frightened']);
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['frightened', 'charmed', 'speed_zero']),
        campaignName,
      );
    });

    it('should call addEntry with ability_use on initial cast', async () => {
      setupFailedSave();
      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'TestCaster',
          abilityName: "Otto's Irresistible Dance",
        }),
      );
    });
  });
});

describe('ottosDanceHandler.processOttoDanceSuccessSave', () => {
  it('should apply speed_zero condition', async () => {
    getRuntimeValue.mockReturnValue([]);

    const result = await processOttoDanceSuccessSave(
      'TestCaster',
      'Goblin',
      "Otto's Irresistible Dance",
      campaignName,
    );

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Goblin',
      'activeConditions',
      ['speed_zero'],
      campaignName,
    );
    expect(result.payload.description).toContain('dances comically');
  });

  it('should add expiration for speed_zero', async () => {
    getRuntimeValue.mockReturnValue([]);

    await processOttoDanceSuccessSave(
      'TestCaster',
      'Goblin',
      "Otto's Irresistible Dance",
      campaignName,
    );

    expect(addExpiration).toHaveBeenCalledWith(
      'TestCaster',
      'Goblin',
      expect.arrayContaining([{ type: 'speed_zero', condition: 'speed_zero' }]),
      campaignName,
      undefined,
      'TestCaster',
    );
  });

  it('should call addEntry', async () => {
    getRuntimeValue.mockReturnValue([]);

    await processOttoDanceSuccessSave(
      'TestCaster',
      'Goblin',
      "Otto's Irresistible Dance",
      campaignName,
    );

    expect(addEntry).toHaveBeenCalledWith(
      campaignName,
      expect.objectContaining({
        type: 'condition',
        action: 'applied',
        characterName: 'Goblin',
        condition: 'Speed 0',
      }),
    );
  });

  it('should deduplicate speed_zero when already present', async () => {
    getRuntimeValue.mockReturnValue(['speed_zero', 'frightened']);

    await processOttoDanceSuccessSave(
      'TestCaster',
      'Goblin',
      "Otto's Irresistible Dance",
      campaignName,
    );

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Goblin',
      'activeConditions',
      ['frightened', 'speed_zero'],
      campaignName,
    );
  });
});

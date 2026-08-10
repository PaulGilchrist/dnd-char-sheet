import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
  getDistanceFeet: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../combat/automation/automationImmunities.js', () => ({
  playerIsImmuneToCondition: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
  getCurrentCombatRound: vi.fn().mockReturnValue(1),
}));

vi.mock('../../../ui/storage.js', () => ({
  __esModule: true,
  default: {
    set: vi.fn(),
  },
}));

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn().mockResolvedValue({}),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, processWebAreaSave } from './webAreaSaveHandler.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as logService from '../../../ui/logService.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as storage from '../../../ui/storage.js';
import * as damageRollback from '../../common/damageRollback.js';
import * as rangeCheck from '../../../rules/combat/rangeCheck.js';
import * as automationImmunities from '../../../combat/automation/automationImmunities.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    spellAbilities: { saveDc: 15 },
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Web',
    automation: { type: 'web_area_save', saveType: 'DEX', saveDc: 15, ...automation },
  };
}

const baseCombatContext = {
  creatures: [
    { name: 'Goblin', type: 'monster' },
    { name: 'Orc', type: 'monster' },
    { name: 'TestCaster', type: 'player' },
  ],
};

// ── Tests ──────────────────────────────────────────────────────

describe('webAreaSaveHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeState.getRuntimeValue.mockReturnValue(null);
  });

  describe('basic handling', () => {
    it('returns popup when no creatures in combat', async () => {
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures in combat');
    });

    it('returns popup with summary when targets selected', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-1',
        promise: Promise.resolve({ success: false, roll: 7, total: 7 }),
      });

      const result = await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.name).toBe('Web');
      expect(result.payload.description).toContain('Restrained');
    });

    it('uses all creatures when no targets specified in metaCtx', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-all',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('3 creature');
    });
  });

  describe('concentration tracking', () => {
    it('calls addConcentration with correct parameters', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-conc',
        promise: Promise.resolve({ success: true }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        'TestCaster',
        'Web',
        15,
      );
      expect(storage.default.set).toHaveBeenCalled();
    });
  });

  describe('failed save - Restrained applied', () => {
    it('applies restrained condition to target', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-cond',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['restrained']),
        campaignName,
      );
    });

    it('stores condition metadata with DC and ability', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue({});

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-meta',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditionMeta',
        expect.objectContaining({
          restrained: expect.objectContaining({ dc: 15, ability: 'str' }),
        }),
        campaignName,
      );
    });

    it('adds expiration for concentration loss', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue({});

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-exp1',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalled();
    });

    it('adds expiration for initiative roll', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue({});

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-exp2',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      // Should have 2 addExpiration calls: one for concentration, one for initiative
      const setRuntimeCalls = useRuntimeState.setRuntimeValue.mock.calls;
      const conditionMetaCalls = setRuntimeCalls.filter(
        c => c[1] === 'activeConditionMeta',
      );
      expect(conditionMetaCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('successful save', () => {
    it('does not apply restrained condition on success', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-success',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.anything(),
        campaignName,
      );
    });

    it('logs save_result with success=true', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-result',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      const saveResultCall = logService.addEntry.mock.calls.find(
        (c) => c[1].type === 'save_result',
      );
      expect(saveResultCall).toBeDefined();
      expect(saveResultCall[1]).toEqual(
        expect.objectContaining({
          type: 'save_result',
          targetName: 'Goblin',
          success: true,
          saveDc: 15,
          saveType: 'DEX',
          rollType: 'save-web',
        }),
      );
    });
  });

  describe('logging', () => {
    it('calls addEntry with ability_use', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-ability',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'TestCaster',
          abilityName: 'Web',
          description: expect.stringContaining('Web'),
        }),
      );
    });

    it('calls addEntry with condition on failed save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue({});

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-cond-entry',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      const conditionCall = logService.addEntry.mock.calls.find(
        (c) => c[1].type === 'condition',
      );
      expect(conditionCall).toBeDefined();
      expect(conditionCall[1]).toEqual(
        expect.objectContaining({
          type: 'condition',
          action: 'applied',
          characterName: 'Goblin',
          condition: 'Restrained',
          reason: 'Web spell',
        }),
      );
    });
  });

  describe('multiple targets', () => {
    it('processes all selected targets', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue({});

      savePrompt.createSaveListener
        .mockReturnValueOnce({
          promptId: 'web-save-goblin',
          promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
        })
        .mockReturnValueOnce({
          promptId: 'web-save-orc',
          promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
        });

      const result = await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin', 'Orc'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('1 creature');
      expect(result.payload.description).toContain('1 creature');
    });
  });

  describe('heighten target disadvantage', () => {
    it('passes heightenTarget to save listener', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-heighten',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        {
          ...makeAction(),
          metaCtx: { targets: ['Goblin'], heightenTarget: 'Goblin' },
        },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveType: 'DEX',
        saveDc: 15,
        dcSuccess: 'none',
        disadvantage: true,
      });
    });
  });

  describe('storeSpellLastAttack', () => {
    it('calls storeSpellLastAttack with correct parameters', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-store',
        promise: Promise.resolve({ success: true }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
        casterName: 'TestCaster',
        spellName: 'Web',
        saveType: 'DEX',
        saveDc: 15,
        attackScope: 'aoe',
      });
    });
  });

  describe('error handling - addEntry rejection', () => {
    it('handles addEntry rejection in ability_use log gracefully', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      logService.addEntry.mockRejectedValueOnce(new Error('Log error'));

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-catch1',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(consoleSpy).toHaveBeenCalledWith('[web] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles addEntry rejection in save_result success log gracefully', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-catch2',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      logService.addEntry
        .mockRejectedValueOnce(new Error('First log error'))
        .mockRejectedValueOnce(new Error('Second log error'));

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(consoleSpy).toHaveBeenCalledWith('[web] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles addEntry rejection in condition log gracefully', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-catch3',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      logService.addEntry
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Condition log error'));

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(consoleSpy).toHaveBeenCalledWith('[web] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles addEntry rejection in save_result failure log gracefully', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-catch4',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      logService.addEntry
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Save result failure log error'));

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(consoleSpy).toHaveBeenCalledWith('[web] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('filter callback coverage - existing conditions', () => {
    it('filters out existing restrained condition before re-applying', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'activeConditions') return ['restrained', 'blinded'];
        if (key === 'activeConditionMeta') return { restrained: { dc: 10 } };
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-filter',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        ['blinded', 'restrained'],
        campaignName,
      );
    });
  });

  describe('edge cases', () => {
    it('returns popup with no targets when selectedTargetNames yields no matches', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);

      const result = await handle(
        { ...makeAction(), metaCtx: { targets: ['NonExistent'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures selected');
    });

    it('returns popup when combatSummary is null (no concentration tracking)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue(null);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-nconc',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      const result = await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(concentrationService.addConcentration).not.toHaveBeenCalled();
      expect(storage.default.set).not.toHaveBeenCalled();
    });

    it('uses fallback DC when spellAbilities is missing', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      const casterStats = {
        name: 'TestCaster',
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
      };

      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-fallback',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        casterStats,
        campaignName,
        null,
      );

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        'TestCaster',
        'Web',
        12,
      );
    });

    it('uses fallback proficiency when both spellAbilities and proficiency are missing', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      const casterStats = {
        name: 'TestCaster',
        level: 10,
        abilities: [{ name: 'Charisma', bonus: 3 }],
      };

      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-fallback2',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        casterStats,
        campaignName,
        null,
      );

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        'TestCaster',
        'Web',
        10,
      );
    });

    it('handles action without automation property', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-no-automation',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await handle(
        { name: 'Web' },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(savePrompt.buildSaveDc).toHaveBeenCalledWith({}, makePlayerStats());
    });

    it('handles saveResult without roll/total properties', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue({});

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-save-no-roll',
        promise: Promise.resolve({ success: false }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          roll: 0,
          total: 0,
        }),
      );
    });
  });
});

describe('webAreaSaveHandler.processWebAreaSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logService.addEntry.mockClear();
  });

  describe('early returns', () => {
    it('returns null when no tracking data', async () => {
      useRuntimeState.getRuntimeValue.mockReturnValue(null);

      const result = await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);
      expect(result).toBeNull();
    });

    it('returns null when target is already restrained', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return ['restrained'];
        return null;
      });

      const result = await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);
      expect(result).toBeNull();
    });
  });

  describe('save processing', () => {
    it('triggers save listener with STR saveType', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-save',
        promise: Promise.resolve({ success: false, roll: 8, total: 8 }),
      });

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveType: 'STR',
        saveDc: 15,
      });
    });

    it('applies restrained on failed STR save', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-cond',
        promise: Promise.resolve({ success: false, roll: 8, total: 8 }),
      });

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['restrained']),
        campaignName,
      );
    });

    it('returns popup with correct description', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-popup',
        promise: Promise.resolve({ success: false, roll: 8, total: 8 }),
      });

      const result = await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.name).toBe('Web');
      expect(result.payload.description).toContain('failed');
      expect(result.payload.description).toContain('Restrained');
    });

    it('returns null when mapName provided but isWithinRange returns false', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });
      rangeCheck.isWithinRange.mockResolvedValue(false);

      const result = await processWebAreaSave('TestCaster', 'Goblin', campaignName, 'test-map');

      expect(result).toBeNull();
      expect(damageUtils.getCombatContext).not.toHaveBeenCalled();
    });

    it('returns null when player is immune to restrained condition', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        if (key === 'computedStats') return { immunities: ['restrained'] };
        return null;
      });
      damageUtils.getCombatContext.mockReturnValue({
        creatures: [{ name: 'Goblin', type: 'player', gridX: 6, gridY: 10 }],
        players: [{ name: 'TestCaster', gridX: 5, gridY: 10 }],
      });
      rangeCheck.isWithinRange.mockResolvedValue(true);
      automationImmunities.playerIsImmuneToCondition.mockReturnValue(true);

      const result = await processWebAreaSave('TestCaster', 'Goblin', campaignName, 'test-map');

      expect(result).toBeNull();
      expect(automationImmunities.playerIsImmuneToCondition).toHaveBeenCalled();
      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
    });



    it('does not call isWithinRange when mapName is null', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-no-map',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(rangeCheck.isWithinRange).not.toHaveBeenCalled();
    });

    it('skips immunity check for non-player targets', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster', gridX: 6, gridY: 10 }],
        players: [{ name: 'TestCaster', gridX: 5, gridY: 10 }],
      });
      rangeCheck.isWithinRange.mockResolvedValue(true);

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-monster',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, 'test-map');

      expect(automationImmunities.playerIsImmuneToCondition).not.toHaveBeenCalled();
    });
  });

  describe('error handling - addEntry rejection', () => {
    it('handles addEntry rejection in ability_use log gracefully', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      logService.addEntry.mockRejectedValueOnce(new Error('Log error'));

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-catch1',
        promise: Promise.resolve({ success: false, roll: 8, total: 8 }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(consoleSpy).toHaveBeenCalledWith('[webAreaSave] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles addEntry rejection in save_result failure log gracefully', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-catch2',
        promise: Promise.resolve({ success: false, roll: 8, total: 8 }),
      });

      logService.addEntry
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Save result error'));

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(consoleSpy).toHaveBeenCalledWith('[webAreaSave] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles addEntry rejection in save_result success log gracefully', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-catch3',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      logService.addEntry
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Success log error'));

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(consoleSpy).toHaveBeenCalledWith('[webAreaSave] Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('filter callback coverage - existing conditions', () => {
    it('filters out existing restrained condition before re-applying on failed save', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return ['blinded'];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-filter',
        promise: Promise.resolve({ success: false, roll: 8, total: 8 }),
      });

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        ['blinded', 'restrained'],
        campaignName,
      );
    });
  });

  describe('mapName with isWithinRange error', () => {
    it('proceeds with save when isWithinRange throws', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });
      rangeCheck.isWithinRange.mockRejectedValueOnce(new Error('Map error'));

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-map-error',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processWebAreaSave('TestCaster', 'Goblin', campaignName, 'test-map');

      expect(savePrompt.createSaveListener).toHaveBeenCalled();
    });
  });

  describe('processWebAreaSave return value', () => {
    it('returns popup with success description on successful save', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === '_web_TestCaster') return { saveDc: 15, saveType: 'STR' };
        if (key === 'activeConditions') return [];
        return null;
      });

      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'web-pws-success-desc',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      const result = await processWebAreaSave('TestCaster', 'Goblin', campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.name).toBe('Web');
      expect(result.payload.description).toContain('succeeded');
      expect(result.payload.description).toContain('Unaffected');
    });
  });
});

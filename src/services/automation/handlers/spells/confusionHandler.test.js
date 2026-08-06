// @improved-by-ai
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
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => ({
  __esModule: true,
  default: {
    set: vi.fn(() => Promise.resolve()),
  },
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './confusionHandler.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';
const casterName = 'TestCaster';

function makePlayerStats(overrides = {}) {
  return {
    name: casterName,
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 3 }],
    spellAbilities: { saveDc: 13 },
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Confusion',
    automation: {
      type: 'confusion',
      saveType: 'WIS',
      saveDc: 13,
      ...automation,
    },
  };
}

function makeCombatContext(creatures) {
  return {
    creatures,
    players: [],
    placedItems: [],
  };
}

function failSaveListener() {
  return {
    promptId: 'confusion-prompt',
    promise: Promise.resolve({ success: false, roll: 5, total: 7 }),
  };
}

function successSaveListener() {
  return {
    promptId: 'confusion-prompt',
    promise: Promise.resolve({ success: true, roll: 18, total: 20 }),
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('confusionHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no combat context exists', () => {
    it('returns a popup indicating no creatures in combat when context is null', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      getCombatContext.mockResolvedValue(null);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
      expect(result.payload.description).toContain('Confusion has no effect');
    });

    it('returns a popup when combat context has no creatures', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      getCombatContext.mockResolvedValue({ creatures: [] });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
      expect(result.payload.description).toContain('Confusion has no effect');
    });
  });

  describe('concentration registration', () => {
    it('registers concentration when combat summary exists', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());
      getCombatSummary.mockReturnValue({ creatures: [{ name: casterName }] });

      await handle(action, ps, campaignName, null);

      expect(addConcentration).toHaveBeenCalledWith(
        expect.objectContaining({ creatures: [{ name: casterName }] }),
        casterName,
        'Confusion',
        13,
      );
    });

    it('uses spellAbilities.saveDc when available', async () => {
      const ps = makePlayerStats({ spellAbilities: { saveDc: 15 } });
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());
      getCombatSummary.mockReturnValue({ creatures: [{ name: casterName }] });

      await handle(action, ps, campaignName, null);

      expect(addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        casterName,
        'Confusion',
        15,
      );
    });

    it('falls back to 8 + proficiency when spellAbilities.saveDc is missing', async () => {
      const ps = makePlayerStats({ spellAbilities: null });
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());
      getCombatSummary.mockReturnValue({ creatures: [{ name: casterName }] });

      await handle(action, ps, campaignName, null);

      expect(addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        casterName,
        'Confusion',
        8 + 4, // 8 + proficiency
      );
    });

    it('skips concentration when combat summary is null', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());
      getCombatSummary.mockReturnValue(null);

      await handle(action, ps, campaignName, null);

      expect(addConcentration).not.toHaveBeenCalled();
    });

    it('dispatches combat-summary-updated event when concentration is added', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());
      getCombatSummary.mockReturnValue({ creatures: [{ name: casterName }] });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await handle(action, ps, campaignName, null);

      expect(dispatchSpy).toHaveBeenCalledWith(new CustomEvent('combat-summary-updated'));
      dispatchSpy.mockRestore();
    });

    it('stores combatSummary via storage when concentration is added', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());
      const cs = { creatures: [{ name: casterName }] };
      getCombatSummary.mockReturnValue(cs);

      await handle(action, ps, campaignName, null);

      expect(storage.set).toHaveBeenCalledWith('combatSummary', cs, campaignName);
    });
  });

  describe('spell last attack tracking', () => {
    it('stores last attack info with correct parameters', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
        casterName,
        spellName: 'Confusion',
        saveType: 'WIS',
        saveDc: 15,
        attackScope: 'aoe',
      });
    });
  });

  describe('target selection', () => {
    it('uses metaCtx.targets when provided', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
        { name: 'Giant Spider' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      action.metaCtx = { targets: ['Goblin', 'Orc'] };

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(2);
      const targetNames = createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('Orc');
    });

    it('excludes caster when falling back to all creatures', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: casterName },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(2);
      const targetNames = createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('Orc');
      expect(targetNames).not.toContain(casterName);
    });

    it('targets all non-caster creatures when no metaCtx.targets', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
        { name: 'Giant Spider' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(3);
    });

    it('handles empty metaCtx.targets by falling back to all non-caster creatures', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      action.metaCtx = { targets: [] };

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(2);
    });

    it('skips targets not found in combat context', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      action.metaCtx = { targets: ['Goblin', 'NonExistent'] };

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(1);
      expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        targetName: 'Goblin',
      }));
    });

    it('handles all creatures being the caster (no enemies)', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: casterName },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(action, ps, campaignName, null);

      expect(createSaveListener).not.toHaveBeenCalled();
      expect(result.payload.description).toContain('No creatures affected');
    });
  });

  describe('disadvantage from metaCtx', () => {
    it('applies disadvantage when target matches heightenTarget', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      action.metaCtx = { targets: ['Goblin'], heightenTarget: 'Goblin' };

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        targetName: 'Goblin',
        disadvantage: true,
      }));
    });

    it('does not apply disadvantage when target does not match heightenTarget', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }, { name: 'Orc' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);

      createSaveListener.mockImplementation((_campaignName, _params) => {
        return {
          promptId: 'confusion-prompt',
          promise: Promise.resolve({ success: true, roll: 18, total: 20 }),
        };
      });

      action.metaCtx = { targets: ['Goblin', 'Orc'], heightenTarget: 'Goblin' };

      await handle(action, ps, campaignName, null);

      const calls = createSaveListener.mock.calls.map(c => ({
        targetName: c[1].targetName,
        disadvantage: c[1].disadvantage,
      }));
      expect(calls).toContainEqual({ targetName: 'Goblin', disadvantage: true });
      expect(calls).toContainEqual({ targetName: 'Orc', disadvantage: false });
    });
  });

  describe('save prompt creation', () => {
    it('uses WIS save type and computed DC from buildSaveDc', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ saveDc: 15 });
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(15);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(buildSaveDc).toHaveBeenCalledWith(action.automation, ps);
      expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        saveType: 'WIS',
        saveDc: 15,
      }));
    });

    it('passes condition as charmed to createSaveListener', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        condition: 'charmed',
        dcSuccess: 'none',
      }));
    });
  });

  describe('ability_use log entry', () => {
    it('posts an ability_use entry for each target', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(addEntry).toHaveBeenCalledTimes(4);
      const abilityEntries = addEntry.mock.calls.filter(
        call => call[1].type === 'ability_use',
      );
      expect(abilityEntries.length).toBe(2);
    });

    it('includes caster name, ability name, and target in description', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const abilityEntry = addEntry.mock.calls[0][1];
      expect(abilityEntry.type).toBe('ability_use');
      expect(abilityEntry.characterName).toBe(casterName);
      expect(abilityEntry.abilityName).toBe('Confusion');
      expect(abilityEntry.description).toContain('Goblin');
      expect(abilityEntry.description).toContain('WIS save');
      expect(abilityEntry.description).toContain('DC 13');
    });

    it('includes promptId in ability_use entry', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const abilityEntry = addEntry.mock.calls[0][1];
      expect(abilityEntry.promptId).toBe('confusion-prompt');
    });
  });

  describe('on successful save', () => {
    it('posts a save_result entry with success=true', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      const saveResultEntries = addEntry.mock.calls.filter(
        call => call[1].type === 'save_result',
      );
      expect(saveResultEntries.length).toBe(1);
      const entry = saveResultEntries[0][1];
      expect(entry.targetName).toBe('Goblin');
      expect(entry.success).toBe(true);
      expect(entry.saveType).toBe('WIS');
      expect(entry.saveDc).toBe(20);
      expect(entry.rollType).toBe('save-confusion');
    });

    it('posts a save_result entry for each target that saves', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      const saveResultEntries = addEntry.mock.calls.filter(
        call => call[1].type === 'save_result',
      );
      expect(saveResultEntries.length).toBe(2);
    });

    it('posts a save_result via addTargetResult with correct params', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue({
        promptId: 'confusion-prompt',
        promise: Promise.resolve({ success: true, roll: 18, total: 20 }),
      });

      await handle(action, ps, campaignName, null);

      expect(addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveResult: 'success',
        roll: 18,
        total: 20,
        conditions: [],
        appliedDamage: 0,
      });
    });

    it('does not apply any conditions or expirations on save success', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      expect(addExpiration).not.toHaveBeenCalled();
    });

    it('includes save_result type in total entry count', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      expect(addEntry).toHaveBeenCalledTimes(2);
      const abilityEntries = addEntry.mock.calls.filter(call => call[1].type === 'ability_use');
      const saveEntries = addEntry.mock.calls.filter(call => call[1].type === 'save_result');
      expect(abilityEntries.length).toBe(1);
      expect(saveEntries.length).toBe(1);
    });

    it('includes success description in target name', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue(successSaveListener());

      await handle(action, ps, campaignName, null);

      const saveEntry = addEntry.mock.calls.find(c => c[1].type === 'save_result')[1];
      expect(saveEntry.description).toContain('Goblin');
      expect(saveEntry.description).toContain('succeeded on WIS save');
    });
  });

  describe('on failed save', () => {
    it('applies charmed and speed_zero conditions to the target', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin', 'activeConditions', expect.arrayContaining(['charmed', 'speed_zero']), campaignName,
      );
    });

    it('deduplicates charmed and speed_zero if already present', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue(['charmed', 'speed_zero', 'frightened']);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const conditionsArg = setRuntimeValue.mock.calls.find(c => c[1] === 'activeConditions')[2];
      expect(conditionsArg.filter(c => String(c).toLowerCase() === 'charmed').length).toBe(1);
      expect(conditionsArg.filter(c => String(c).toLowerCase() === 'speed_zero').length).toBe(1);
      expect(conditionsArg).toContain('frightened');
    });

    it('preserves other conditions when adding charmed and speed_zero', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue(['frightened', 'blinded']);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const conditionsArg = setRuntimeValue.mock.calls.find(c => c[1] === 'activeConditions')[2];
      expect(conditionsArg).toContain('frightened');
      expect(conditionsArg).toContain('blinded');
      expect(conditionsArg).toContain('charmed');
      expect(conditionsArg).toContain('speed_zero');
    });

    it('removes existing charmed and speed_zero before reapplying', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue(['charmed', 'speed_zero']);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const conditionsArg = setRuntimeValue.mock.calls.find(c => c[1] === 'activeConditions')[2];
      expect(conditionsArg).toEqual(['charmed', 'speed_zero']);
    });

    it('posts a condition log entry with the correct details', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'condition',
        action: 'applied',
        characterName: 'Goblin',
        condition: 'Confused',
        reason: 'Confusion spell',
        note: expect.stringContaining('Can\'t take Bonus Actions or Reactions'),
        timestamp: expect.any(Number),
      }));
    });

    it('registers expirations for charmed, speed_zero, remove_target_effect, and confusion_turn_start', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(addExpiration).toHaveBeenCalledWith(
        casterName, 'Goblin',
        expect.arrayContaining([
          expect.objectContaining({ type: 'charmed', condition: 'charmed' }),
          expect.objectContaining({ type: 'speed_zero', condition: 'speed_zero' }),
          expect.objectContaining({ type: 'remove_target_effect', effectKey: 'confusion' }),
          expect.objectContaining({ type: 'confusion_turn_start', name: 'Confusion' }),
        ]),
        campaignName,
      );
    });

    it('tracks confusion effect in targetEffects with correct properties', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const effectCalls = setRuntimeValue.mock.calls.filter(
        call => call[1] === 'targetEffects',
      );
      expect(effectCalls.length).toBeGreaterThan(0);
      const effects = effectCalls[effectCalls.length - 1][2];
      const confusionEffect = effects.find(e => e.effect === 'confusion');
      expect(confusionEffect).toBeDefined();
      expect(confusionEffect.target).toBe('Goblin');
      expect(confusionEffect.source).toBe(casterName);
      expect(confusionEffect.conditions).toEqual(['charmed', 'speed_zero']);
      expect(confusionEffect.dc).toBe(10);
      expect(confusionEffect.duration).toBe('concentration');
    });

    it('updates existing confusion effect if one already exists for the target', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([
        { target: 'Goblin', effect: 'confusion', source: 'OldCaster', dc: 12 },
      ]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const effectCalls = setRuntimeValue.mock.calls.filter(
        call => call[1] === 'targetEffects',
      );
      const effects = effectCalls[effectCalls.length - 1][2];
      expect(effects.length).toBe(1);
      expect(effects[0].source).toBe(casterName);
      expect(effects[0].dc).toBe(10);
    });

    it('posts save_result via addTargetResult with failure params', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue({
        promptId: 'confusion-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 7 }),
      });

      await handle(action, ps, campaignName, null);

      expect(addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveResult: 'failure',
        roll: 5,
        total: 7,
        conditions: ['charmed', 'speed_zero'],
        appliedDamage: 0,
      });
    });

    it('does not call buildSaveDc with advantage/disadvantage confusion (disadvantage via metaCtx)', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      // buildSaveDc should be called once at the start, not per-target
      expect(buildSaveDc).toHaveBeenCalledTimes(1);
    });
  });

  describe('summary popup', () => {
    it('reports affected creature count when some fail', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Confusion');
      expect(result.payload.description).toContain('Confusion affects 2 creature(s)');
      expect(result.payload.description).toContain('Confused');
      expect(result.payload.description).toContain('creature(s) saved');
    });

    it('reports individual affected creatures in the summary', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Goblin is Confused');
      expect(result.payload.description).toContain('Orc is Confused');
    });

    it('reports saved creature count in the summary', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);

      let callCount = 0;
      createSaveListener.mockImplementation(() => {
        callCount++;
        return {
          promptId: 'confusion-prompt',
          promise: Promise.resolve({ success: callCount === 1 }),
        };
      });
      getRuntimeValue.mockReturnValue([]);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('creature(s) saved');
    });

    it('reports no creatures affected when all save', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(20);
      createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures affected by Confusion');
      expect(result.payload.description).toContain('creature(s) saved');
    });

    it('uses the action name in the popup payload', async () => {
      const ps = makePlayerStats();
      const action = { name: 'My Confusion', automation: { type: 'confusion', saveType: 'WIS', saveDc: 13 } };
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      createSaveListener.mockReturnValue(failSaveListener());
      getRuntimeValue.mockReturnValue([]);

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.name).toBe('My Confusion');
    });

    it('mentions confused behavior in the summary when affected', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('can\'t take Bonus Actions or Reactions');
      expect(result.payload.description).toContain('confused behavior');
    });
  });

  describe('edge cases', () => {
    it('handles missing automation property by defaulting to empty object', async () => {
      const ps = makePlayerStats();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      createSaveListener.mockReturnValue(failSaveListener());
      getRuntimeValue.mockReturnValue([]);

      const result = await handle({ name: 'Confusion' }, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(buildSaveDc).toHaveBeenCalledWith({}, ps);
    });

    it('handles single non-caster target', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(1);
      expect(result.payload.description).toContain('Confusion affects 1 creature(s)');
    });

    it('uses custom playerStats name in ability_use log description', async () => {
      const ps = makePlayerStats({ name: 'WizardX' });
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const abilityEntry = addEntry.mock.calls.find(c => c[1].type === 'ability_use')[1];
      expect(abilityEntry.characterName).toBe('WizardX');
      expect(abilityEntry.description).toContain('WizardX');
    });

    it('handles mixed success/failure across multiple targets', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
        { name: 'Giant Spider' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue([]);

      let callCount = 0;
      createSaveListener.mockImplementation(() => {
        callCount++;
        // First two succeed, third fails
        return {
          promptId: 'confusion-prompt',
          promise: Promise.resolve({ success: callCount <= 2, roll: callCount <= 2 ? 18 : 5, total: callCount <= 2 ? 20 : 7 }),
        };
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Confusion affects 1 creature(s)');
      expect(result.payload.description).toContain('2 creature(s) saved');
    });

    it('handles non-array activeConditions gracefully', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue('not-an-array');
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin', 'activeConditions', expect.arrayContaining(['charmed', 'speed_zero']), campaignName,
      );
    });

    it('handles undefined activeConditions gracefully', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue(undefined);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin', 'activeConditions', expect.arrayContaining(['charmed', 'speed_zero']), campaignName,
      );
    });

    it('handles non-array targetEffects gracefully', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      getRuntimeValue.mockReturnValue('not-an-array');
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      // Should still set targetEffects as an array
      const effectCalls = setRuntimeValue.mock.calls.filter(
        call => call[1] === 'targetEffects',
      );
      expect(effectCalls.length).toBeGreaterThan(0);
    });

    it('uses action.name in ability_use log entry', async () => {
      const ps = makePlayerStats();
      const action = { name: 'Tasha\'s Confusion', automation: { type: 'confusion', saveType: 'WIS', saveDc: 13 } };
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      createSaveListener.mockReturnValue(failSaveListener());

      await handle(action, ps, campaignName, null);

      const abilityEntry = addEntry.mock.calls.find(c => c[1].type === 'ability_use')[1];
      expect(abilityEntry.abilityName).toBe('Tasha\'s Confusion');
    });

    it('handles saveResult with missing roll/total fields', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([{ name: 'Goblin' }]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(10);
      createSaveListener.mockReturnValue({
        promptId: 'confusion-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(action, ps, campaignName, null);

      // Should not throw - uses ?? 0 fallback
      const saveEntries = addEntry.mock.calls.filter(c => c[1].type === 'save_result');
      expect(saveEntries.length).toBe(1);
    });

    it('handles targets passed as string array in metaCtx', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      const ctx = makeCombatContext([
        { name: 'Goblin' },
        { name: 'Orc' },
      ]);
      getCombatContext.mockResolvedValue(ctx);
      buildSaveDc.mockReturnValue(13);
      createSaveListener.mockReturnValue(successSaveListener());

      action.metaCtx = { targets: ['Goblin', 'Orc'] };

      await handle(action, ps, campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(2);
    });
  });
});

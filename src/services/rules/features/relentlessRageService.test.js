import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../combat/conditions/savePromptService.js', () => ({
  sendDeathSavePrompt: vi.fn(),
  clearDeathSavePrompt: vi.fn(),
}));

vi.mock('../../automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(),
}));

vi.mock('../../ui/utils.js', () => ({
  default: { guid: vi.fn(() => 'test-guid-123') },
}));

// ── Imports ────────────────────────────────────────────────────

import { checkRelentlessRage, evaluateHealExpression, getRuntimeUsesKey } from './relentlessRageService.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../ui/logService.js';
import { sendDeathSavePrompt } from '../../combat/conditions/savePromptService.js';
import { createSaveListener } from '../../automation/common/savePrompt.js';

const campaignName = 'test-campaign';

function makeCreature(overrides = {}) {
  return {
    name: 'TestBarbarian',
    type: 'player',
    currentHp: 0,
    ...overrides,
  };
}

function makePlayerComputed(overrides = {}) {
  return {
    name: 'TestBarbarian',
    level: 11,
    allFeatures: [
      {
        name: 'Relentless Rage',
        automation: {
          type: 'reaction_save_heal',
          saveType: 'CON',
          saveDc: 10,
          dcScaling: 5,
          healExpression: '2 * barbarian_level',
        },
      },
    ],
    class: {
      class_levels: [{ name: 'Barbarian', level: 11 }],
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('relentlessRageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSaveListener.mockReturnValue({ promptId: 'prompt-123' });
  });

  // ── checkRelentlessRage ─────────────────────────────────────

  describe('checkRelentlessRage', () => {
    it('returns intercepted: false when allFeatures is missing', () => {
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed({ allFeatures: null }), campaignName);
      expect(result.intercepted).toBe(false);
    });

    it('returns intercepted: false when allFeatures is not an array', () => {
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed({ allFeatures: 'invalid' }), campaignName);
      expect(result.intercepted).toBe(false);
    });

    it('returns intercepted: false when Relentless Rage feature is not found', () => {
      const computed = makePlayerComputed({ allFeatures: [] });
      const result = checkRelentlessRage(makeCreature(), computed, campaignName);
      expect(result.intercepted).toBe(false);
    });

    it('returns intercepted: false when rage is zero', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 0;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);
      expect(result.intercepted).toBe(false);
    });

    it('returns intercepted: false when rage is null', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return null;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);
      expect(result.intercepted).toBe(false);
    });

    it('returns intercepted: true when uses are exhausted (unlimited uses per rest)', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 1;
        return null;
      });
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);
      expect(result.intercepted).toBe(true);
    });

    it('returns intercepted: true with awaitingSave when all conditions met', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);
      expect(result.intercepted).toBe(true);
      expect(result.awaitingSave).toBe(true);
    });

    it('creates save listener with correct parameters including scaling DC', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'TestBarbarian',
        saveType: 'CON',
        saveDc: 10,
      });
    });

    it('increments DC by 5 when already used once', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 1;
        return null;
      });
      checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);
      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'TestBarbarian',
        saveType: 'CON',
        saveDc: 15,
      });
    });

    it('logs trigger entry with source field', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);

      expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'ability_use',
        characterName: 'TestBarbarian',
        abilityName: 'Relentless Rage',
        source: 'Relentless Rage',
      }));
    });

    it('uses default saveDc of 10 when automation has no saveDc', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const computed = makePlayerComputed({
        allFeatures: [
          {
            name: 'Relentless Rage',
            automation: {
              type: 'reaction_save_heal',
              saveType: 'CON',
              dcScaling: 0,
              healExpression: '2 * barbarian_level',
            },
          },
        ],
      });
      checkRelentlessRage(makeCreature(), computed, campaignName);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'TestBarbarian',
        saveType: 'CON',
        saveDc: 10,
      });
    });

    it('uses default dcScaling of 0 when automation has no dcScaling', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const computed = makePlayerComputed({
        allFeatures: [
          {
            name: 'Relentless Rage',
            automation: {
              type: 'reaction_save_heal',
              saveType: 'CON',
              saveDc: 12,
              healExpression: '2 * barbarian_level',
            },
          },
        ],
      });
      checkRelentlessRage(makeCreature(), computed, campaignName);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'TestBarbarian',
        saveType: 'CON',
        saveDc: 12,
      });
    });

    it('uses custom saveType from automation', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const computed = makePlayerComputed({
        allFeatures: [
          {
            name: 'Relentless Rage',
            automation: {
              type: 'reaction_save_heal',
              saveType: 'WIS',
              saveDc: 10,
              dcScaling: 0,
              healExpression: '2 * barbarian_level',
            },
          },
        ],
      });
      checkRelentlessRage(makeCreature(), computed, campaignName);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'TestBarbarian',
        saveType: 'WIS',
        saveDc: 10,
      });
    });

    it('uses default saveType when automation saveType is null', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      const computed = makePlayerComputed({
        allFeatures: [
          {
            name: 'Relentless Rage',
            automation: {
              type: 'reaction_save_heal',
              saveType: null,
              saveDc: 10,
              dcScaling: 0,
              healExpression: '2 * barbarian_level',
            },
          },
        ],
      });
      checkRelentlessRage(makeCreature(), computed, campaignName);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'TestBarbarian',
        saveType: 'CON',
        saveDc: 10,
      });
    });

    it('handles null uses value from getRuntimeValue', () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return null;
        return null;
      });
      const result = checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);
      expect(result.intercepted).toBe(true);
      expect(result.awaitingSave).toBe(true);
    });
  });

  // ── Save result handling ────────────────────────────────────

  describe('save result handling', () => {
    function setupAndTriggerSuccess() {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'hitPoints') return 50;
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: true, roll: 15, saveBonus: 8, total: 23 },
      }));
    }

    it('sets HP to heal amount on success', async () => {
      setupAndTriggerSuccess();

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'currentHitPoints',
          22,
          campaignName,
        );
      });
    });

    it('clears death saves on success', async () => {
      setupAndTriggerSuccess();

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathSaves',
          [false, false, false],
          campaignName,
        );
      });
    });

    it('filters unconscious from activeConditions on success', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'activeConditions') return ['unconscious', 'blinded'];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: true, roll: 15, saveBonus: 8, total: 23 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'activeConditions',
          ['blinded'],
          campaignName,
        );
      });
    });

    it('logs success with save details and hpGained', async () => {
      setupAndTriggerSuccess();

      await vi.waitFor(() => {
        const calls = logService.addEntry.mock.calls.filter(
          (call) => call[1]?.type === 'ability_use' && call[1]?.saveSuccess === true,
        );
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][1].saveRoll).toBe(15);
        expect(calls[0][1].saveBonus).toBe(8);
        expect(calls[0][1].saveTotal).toBe(23);
        expect(calls[0][1].saveDc).toBe(10);
        expect(calls[0][1].hpGained).toBe(22);
        expect(calls[0][1].source).toBe('Relentless Rage');
      });
    });

    it('increments uses after save', async () => {
      setupAndTriggerSuccess();

      await vi.waitFor(() => {
        const calls = runtimeState.setRuntimeValue.mock.calls;
        const usesCall = calls.find((call) => call[1] === 'relentlessrageUses');
        expect(usesCall).toEqual(['TestBarbarian', 'relentlessrageUses', 1, campaignName]);
      });
    });

    it('sends death save prompt on failure when HP is 0', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return 0;
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalledWith(campaignName, {
          promptId: 'test-guid-123',
          targetName: 'TestBarbarian',
        });
      });
    });

    it('logs failure with save details', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return 0;
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        const calls = logService.addEntry.mock.calls.filter(
          (call) => call[1]?.type === 'ability_use' && call[1]?.saveSuccess === false,
        );
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][1].saveRoll).toBe(5);
        expect(calls[0][1].source).toBe('Relentless Rage');
      });
    });
  });

  // ── evaluateHealExpression ──────────────────────────────────

  describe('evaluateHealExpression', () => {
    it('returns numeric expression directly', () => {
      expect(evaluateHealExpression(10, makePlayerComputed())).toBe(10);
    });

    it('evaluates "2 * barbarian_level"', () => {
      const computed = makePlayerComputed({ level: 11 });
      expect(evaluateHealExpression('2 * barbarian_level', computed)).toBe(22);
    });

    it('evaluates "2 * level"', () => {
      const computed = makePlayerComputed({ level: 9 });
      expect(evaluateHealExpression('2 * level', computed)).toBe(18);
    });

    it('falls back to level for unrecognizable expressions', () => {
      const computed = makePlayerComputed({ level: 7 });
      expect(evaluateHealExpression('1d8+CON', computed)).toBe(7);
    });

    it('returns 1 when no expression and no level', () => {
      expect(evaluateHealExpression(null, {})).toBe(1);
    });
  });

  // ── getRuntimeUsesKey ───────────────────────────────────────

  describe('getRuntimeUsesKey', () => {
    it('lowercases and removes spaces from feature name', () => {
      expect(getRuntimeUsesKey('Relentless Rage')).toBe('relentlessrageUses');
    });

    it('handles single word feature names', () => {
      expect(getRuntimeUsesKey('Frenzy')).toBe('frenzyUses');
    });
  });

  // ── evaluateHealExpression - additional branches ─────────────

  describe('evaluateHealExpression - additional branches', () => {
    it('evaluates "3 * barbarian_level" with class_levels', () => {
      const computed = { ...makePlayerComputed(), level: 20 };
      expect(evaluateHealExpression('3 * barbarian_level', computed)).toBe(33);
    });

    it('evaluates "2 * level" expression', () => {
      const computed = { ...makePlayerComputed(), level: 5 };
      expect(evaluateHealExpression('2 * level', computed)).toBe(10);
    });

    it('falls back to 1 when expression is unrecognizable and no level', () => {
      expect(evaluateHealExpression('1d8+CON', {})).toBe(1);
    });

    it('falls back to playerComputed.level when barbarian_level expression but no Barbarian class', () => {
      const computed = { level: 8, allFeatures: [], class: { class_levels: [{ name: 'Fighter', level: 8 }] } };
      expect(evaluateHealExpression('2 * barbarian_level', computed)).toBe(16);
    });

    it('falls back to playerComputed.level when barbarian_level expression and no class_levels', () => {
      const computed = { level: 5, allFeatures: [], class: {} };
      expect(evaluateHealExpression('2 * barbarian_level', computed)).toBe(10);
    });

    it('returns 0 for unknown field in numeric expression (value defaults to 0)', () => {
      const computed = { level: 7, allFeatures: [] };
      expect(evaluateHealExpression('2 * charisma', computed)).toBe(0);
    });

    it('uses level fallback of 1 when level is 0', () => {
      const computed = { level: 0, allFeatures: [] };
      expect(evaluateHealExpression('2 * level', computed)).toBe(2);
    });
  });

  // ── Death save handling after failed save ─────────────────────

  describe('death save handling after failed save', () => {
    function setupAndTriggerFailure() {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));
    }

    it('sends death save prompt when save fails and HP <= 0', async () => {
      setupAndTriggerFailure();

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalledWith(campaignName, {
          promptId: 'test-guid-123',
          targetName: 'TestBarbarian',
        });
      });
    });

    it('does not send death save prompt when save fails but HP > 0', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return 10;
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).not.toHaveBeenCalled();
      });
    });

    it('handles death save nat20 result (clears all saves and sets HP to 1)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, isNat20: true, success: true, roll: 20 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'currentHitPoints',
          1,
          campaignName,
        );
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathSaves',
          [false, false, false],
          campaignName,
        );
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathFailures',
          [false, false, false],
          campaignName,
        );
      });
    });

    it('handles death save success result', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, success: true, roll: 15, saveBonus: 5, total: 20 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathSaves',
          [true, false, false],
          campaignName,
        );
      });
    });

    it('handles death save failure result with single fail', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, success: false, roll: 3, saveBonus: 2, total: 5 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathFailures',
          [true, false, false],
          campaignName,
        );
      });
    });

    it('handles death save failure with nat1 (double fail)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, isNat1: true, success: false, roll: 1, saveBonus: 0, total: 1 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathFailures',
          [true, true, false],
          campaignName,
        );
      });
    });

    it('logs death save entry with correct fields', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, success: false, roll: 3, isNat1: false, isNat20: false },
      }));

      await vi.waitFor(() => {
        const deathSaveCalls = logService.addEntry.mock.calls.filter(
          (call) => call[1]?.type === 'death_save',
        );
        expect(deathSaveCalls.length).toBeGreaterThan(0);
        expect(deathSaveCalls[0][1].characterName).toBe('TestBarbarian');
        expect(deathSaveCalls[0][1].roll).toBe(3);
        expect(deathSaveCalls[0][1].isNatural1).toBe(false);
      });
    });

    it('ignores death save result with wrong promptId', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: 'wrong-prompt-id', success: true, roll: 20 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
          'TestBarbarian',
          'deathSaves',
          expect.any(Array),
          campaignName,
        );
      });
    });

    it('handles death save with all saves already filled (nat20 clears them)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [true, true, true];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, isNat20: true, success: true, roll: 20 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathSaves',
          [false, false, false],
          campaignName,
        );
      });
    });

    it('handles death save failure when all failure slots filled (no-op)', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [false, false, false];
        if (key === 'deathFailures') return [true, true, true];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, success: false, roll: 3, isNat1: false },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathFailures',
          [true, true, true],
          campaignName,
        );
      });
    });

    it('ignores save-result event with wrong promptId', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        return null;
      });
      checkRelentlessRage(makeCreature(), makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'wrong-prompt-id', success: true, roll: 15, saveBonus: 8, total: 23 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
          'TestBarbarian',
          'currentHitPoints',
          expect.any(Number),
          campaignName,
        );
      });
    });

    it('uses existing deathSaves array from runtime when truthy', async () => {
      runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1;
        if (key === 'relentlessrageUses') return 0;
        if (key === 'currentHitPoints') return -1;
        if (key === 'deathSaves') return [true, false, false];
        if (key === 'deathFailures') return [false, false, false];
        return null;
      });
      const creature = makeCreature();
      checkRelentlessRage(creature, makePlayerComputed(), campaignName);

      window.dispatchEvent(new CustomEvent('save-result', {
        detail: { promptId: 'prompt-123', success: false, roll: 5, saveBonus: 8, total: 13 },
      }));

      await vi.waitFor(() => {
        expect(sendDeathSavePrompt).toHaveBeenCalled();
      });

      const deathPromptId = sendDeathSavePrompt.mock.calls[0][1].promptId;
      window.dispatchEvent(new CustomEvent('death-save-result', {
        detail: { promptId: deathPromptId, success: true, roll: 15 },
      }));

      await vi.waitFor(() => {
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
          'TestBarbarian',
          'deathSaves',
          [true, true, false],
          campaignName,
        );
      });
    });
  });
});

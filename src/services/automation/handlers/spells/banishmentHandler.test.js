import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(() => Promise.resolve()),
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

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
  getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  rollSaveForCreature: vi.fn(),
}));

vi.mock('../../../combat/conditions/savePromptService.js', () => ({
  sendSaveResult: vi.fn(),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 10),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

import { handle } from './banishmentHandler.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext, getTargetFromAttacker } from '../../../rules/combat/damageUtils.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { rollSaveForCreature } from '../../../rules/combat/applyDamage.js';
import { addTargetResult } from '../../common/damageRollback.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    ...overrides,
  };
}

function setupBaseMocks(saveResult = { success: true }, isNpc = false) {
  const targetName = 'Goblin';
  getCombatContext.mockResolvedValue({
    creatures: [
      { name: targetName, type: isNpc ? 'npc' : 'player', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
    ],
  });
  buildSaveDc.mockReturnValue(15);
  createSaveListener.mockReturnValue({
    promptId: 'test-prompt-id',
    promise: Promise.resolve(saveResult),
  });
}

describe('banishmentHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('target resolution', () => {
    it('returns popup when action has no targets and no targetName', async () => {
      buildSaveDc.mockReturnValue(15);
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
          { name: 'Goblin', type: 'npc' },
        ],
      });
      getTargetFromAttacker.mockReturnValue(null);

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No target selected');
    });

    it('returns popup when combat context has no creatures', async () => {
      getCombatContext.mockResolvedValue({ creatures: [] });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('single-target', () => {
    it('handles save success', async () => {
      setupBaseMocks({ success: true, roll: 12, total: 14, bonus: 2 });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
        targetName: 'Goblin',
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('1 creature(s) saved: Goblin');
      expect(addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'save_result',
          rollType: 'save-banishment',
          targetName: 'Goblin',
          success: true,
        }),
      );
    });

    it('handles save failure and applies banishment', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      // NPC auto-roll returns a failure
      rollSaveForCreature.mockReturnValue({ success: false, roll: 5, total: 7, bonus: 2, rawRolls: [5] });

      setupBaseMocks({ success: false, roll: 5, total: 7, bonus: 2 });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
        targetName: 'Goblin',
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('1 creature(s) banished: Goblin');

      // Verify incapacitated condition was applied
      expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining(['incapacitated']), campaignName);

      // Verify banishment targetEffect was added
      expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.any(Array), campaignName);

      // Verify expiration registered with condition, remove_target_effect, and break_concentration
      expect(addExpiration).toHaveBeenCalledWith(
        'TestCaster',
        'Goblin',
        expect.arrayContaining([
          expect.objectContaining({ type: 'condition', condition: 'incapacitated' }),
          expect.objectContaining({ type: 'remove_target_effect', effectKey: 'banishment' }),
          expect.objectContaining({ type: 'break_concentration' }),
        ]),
        campaignName,
      );

      // Verify save_result logged with save-banishment rollType
      const saveResultCalls = vi.mocked(addEntry).mock.calls.filter(
        call => call[1]?.rollType === 'save-banishment',
      );
      expect(saveResultCalls.length).toBeGreaterThan(0);
    });
  });

  describe('multi-target', () => {
    it('handles multi-target with metaCtx.banishmentTargets', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        if (key === 'Orc') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
          { name: 'Orc', type: 'npc', saveBonuses: { CHA: 1 }, currentHp: 25, maxHp: 40 },
        ],
      });

      buildSaveDc.mockReturnValue(15);

      rollSaveForCreature
        .mockReturnValueOnce({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] })
        .mockReturnValueOnce({ success: true, roll: 15, total: 16, bonus: 1, rawRolls: [15] });

      let callCount = 0;
      createSaveListener.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { promptId: 'prompt-1', promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }) };
        }
        return { promptId: 'prompt-2', promise: Promise.resolve({ success: true, roll: 15, total: 16, bonus: 1 }) };
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
        metaCtx: { banishmentTargets: ['Goblin', 'Orc'] },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('1 creature(s) banished: Goblin');
      expect(result.payload.description).toContain('1 creature(s) saved: Orc');

      // Verify NPC auto-roll was triggered for both targets
      expect(rollSaveForCreature).toHaveBeenCalledTimes(2);
      expect(rollSaveForCreature).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Goblin' }),
        'CHA',
        15,
        false,
        false,
      );
      expect(rollSaveForCreature).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Orc' }),
        'CHA',
        15,
        false,
        false,
      );

      // Verify two save prompts were created
      expect(createSaveListener).toHaveBeenCalledTimes(2);

      // Verify two addEntry ability_use calls
      const abilityUseCalls = vi.mocked(addEntry).mock.calls.filter(
        call => call[1]?.type === 'ability_use',
      );
      expect(abilityUseCalls.length).toBe(2);
    });

    it('handles all targets failing save', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        if (key === 'Orc') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
          { name: 'Orc', type: 'npc', saveBonuses: { CHA: 1 }, currentHp: 25, maxHp: 40 },
        ],
      });

      buildSaveDc.mockReturnValue(15);

      rollSaveForCreature
        .mockReturnValueOnce({ success: false, roll: 2, total: 4, bonus: 2, rawRolls: [2] })
        .mockReturnValueOnce({ success: false, roll: 2, total: 4, bonus: 2, rawRolls: [2] });

      let callCount = 0;
      createSaveListener.mockImplementation(() => {
        callCount++;
        return { promptId: `prompt-${callCount}`, promise: Promise.resolve({ success: false, roll: 2, total: 4, bonus: 2 }) };
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
        metaCtx: { banishmentTargets: ['Goblin', 'Orc'] },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('2 creature(s) banished');
      expect(addExpiration).toHaveBeenCalledTimes(2);
      expect(addExpiration).toHaveBeenNthCalledWith(
        1,
        'TestCaster',
        'Goblin',
        expect.arrayContaining([
          expect.objectContaining({ type: 'condition', condition: 'incapacitated' }),
          expect.objectContaining({ type: 'remove_target_effect', effectKey: 'banishment' }),
          expect.objectContaining({ type: 'break_concentration' }),
        ]),
        campaignName,
      );
      expect(addExpiration).toHaveBeenNthCalledWith(
        2,
        'TestCaster',
        'Orc',
        expect.arrayContaining([
          expect.objectContaining({ type: 'condition', condition: 'incapacitated' }),
          expect.objectContaining({ type: 'remove_target_effect', effectKey: 'banishment' }),
          expect.objectContaining({ type: 'break_concentration' }),
        ]),
        campaignName,
      );
    });
  });

  describe('handle edge cases', () => {
    it('uses provided targetName from automation instead of resolveTarget', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('1 creature(s) banished');
      expect(getTargetFromAttacker).not.toHaveBeenCalled();
    });

    it('handles player target (not NPC) - no auto-roll', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'WizardGirl') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'WizardGirl', type: 'player', saveBonuses: { CHA: 5 }, currentHp: 20, maxHp: 40 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 8, total: 13, bonus: 5 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
        targetName: 'WizardGirl',
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('1 creature(s) banished');
      expect(rollSaveForCreature).not.toHaveBeenCalled();
    });

    it('handles when combatSummary is falsy (no concentration added)', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValueOnce({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      }).mockResolvedValueOnce(null);

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(addConcentration).not.toHaveBeenCalled();
    });

    it('handles when storedConditions is falsy', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return null;
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin', 'activeConditions', ['incapacitated'], campaignName,
      );
    });

    it('handles when activeConditionMeta is falsy', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return null;
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Goblin', 'activeConditionMeta', expect.objectContaining({ incapacitated: expect.any(Object) }), campaignName,
      );
    });

    it('handles when targetCreature is null (creature not in combat)', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestCaster', type: 'player' },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('1 creature(s) banished');
    });

    it('handles permanent banishment for fey type', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'FeyCreature') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'FeyCreature', type: 'fey', saveBonuses: { CHA: 1 }, currentHp: 10, maxHp: 20 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 2, total: 3, bonus: 1, rawRolls: [2] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 2, total: 3, bonus: 1 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'FeyCreature' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      const targetEffectsCall = vi.mocked(setRuntimeValue).mock.calls.find(
        call => call[1] === 'targetEffects',
      );
      expect(targetEffectsCall).toBeDefined();
      const effects = targetEffectsCall[2];
      const banishmentEffect = effects.find(e => e.effect === 'banishment');
      expect(banishmentEffect.permanent).toBe(true);
    });

    it('handles permanent banishment for aberration type', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Aberration') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Aberration', type: 'aberration', saveBonuses: { CHA: 3 }, currentHp: 25, maxHp: 50 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 1, total: 4, bonus: 3, rawRolls: [1] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 1, total: 4, bonus: 3 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Aberration' },
      };

      await handle(action, makePlayerStats(), campaignName, null);

      const targetEffectsCall = vi.mocked(setRuntimeValue).mock.calls.find(
        call => call[1] === 'targetEffects',
      );
      const banishmentEffect = targetEffectsCall[2].find(e => e.effect === 'banishment');
      expect(banishmentEffect.permanent).toBe(true);
    });

    it('handles when targetEffects is falsy', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return null;
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      const targetEffectsCall = vi.mocked(setRuntimeValue).mock.calls.find(
        call => call[1] === 'targetEffects',
      );
      expect(targetEffectsCall[2]).toHaveLength(1);
    });

    it('handles when saveResult has null roll/total', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: null, total: null, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('1 creature(s) banished');
      const addTargetResultCalls = vi.mocked(addTargetResult).mock.calls;
      expect(addTargetResultCalls.length).toBeGreaterThan(0);
    });

    it('returns popup with no banished when all targets save', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: true, roll: 18, total: 20, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15, targetName: 'Goblin' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures banished');
      expect(result.payload.description).toContain('1 creature(s) saved');
    });

    it('uses targetName from action (not automation) when automation.targetName is missing', async () => {
      getRuntimeValue.mockImplementation((key, subKey) => {
        if (key === 'campaign' && subKey === 'targetEffects') return [];
        if (key === 'Goblin') {
          if (subKey === 'activeConditions') return [];
          if (subKey === 'activeConditionMeta') return {};
        }
        return undefined;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { CHA: 2 }, currentHp: 15, maxHp: 30 },
        ],
      });

      buildSaveDc.mockReturnValue(15);
      rollSaveForCreature.mockReturnValue({ success: false, roll: 3, total: 5, bonus: 2, rawRolls: [3] });

      createSaveListener.mockReturnValue({
        promptId: 'prompt-1',
        promise: Promise.resolve({ success: false, roll: 3, total: 5, bonus: 2 }),
      });

      const action = {
        name: 'Banishment',
        automation: { type: 'banishment', saveType: 'CHA', saveDc: 15 },
        targetName: 'Goblin',
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('1 creature(s) banished');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(),
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
    set: vi.fn(),
  },
}));

const { default: storage } = await import('../../../ui/storage.js');

vi.mock('../../../combat/automation/automationService.js', () => ({
  playerIsImmuneToCondition: vi.fn(),
}));

vi.mock('../../../npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(),
}));

import { handle, applyCalmEmotionsImmunity, applyCalmEmotionsCharmed } from './calmEmotionsHandler.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { playerIsImmuneToCondition } from '../../../combat/automation/automationService.js';
import { getMonsterData } from '../../../npcs/monsterUtils.js';

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    level: 10,
    proficiency: 4,
    ...overrides,
  };
}

function makeAction(automation = {}, metaCtx = {}) {
  return {
    name: 'Calm Emotions',
    automation: {
      type: 'calm_emotions',
      ...automation,
    },
    metaCtx,
  };
}

const singleTargetCombat = {
  creatures: [{ name: 'EnemyGoblin' }],
};

const multiTargetCombat = {
  creatures: [
    { name: 'EnemyGoblin' },
    { name: 'EnemyOrc' },
  ],
};

describe('calmEmotionsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildSaveDc.mockReturnValue(13);
    getCombatSummary.mockReturnValue(null);
    getRuntimeValue.mockReturnValue(undefined);
  });

  // ── handle ────────────────────────────────────────────────────

  describe('handle - combat context validation', () => {
    it('should return popup when no creatures in combat', async () => {
      getCombatContext.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Calm Emotions');
      expect(result.payload.description).toContain('No creatures in combat');
    });

    it('should return popup when creatures array is empty', async () => {
      getCombatContext.mockResolvedValue({ creatures: [] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('handle - concentration registration', () => {
    it('should register concentration when combat summary is available', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'prompt',
        promise: Promise.resolve({ success: true }),
      });

      const mockCombatSummary = { creatures: [{ name: 'TestWizard' }] };
      getCombatSummary.mockReturnValue(mockCombatSummary);

      const statsWithSaveDc = makePlayerStats({ spellAbilities: { saveDc: 15 } });
      await handle(makeAction(), statsWithSaveDc, campaignName, null);

      expect(addConcentration).toHaveBeenCalledWith(
        mockCombatSummary,
        'TestWizard',
        'Calm Emotions',
        15,
      );
    });

    it('should compute spell DC from 8 + proficiency when spellAbilities.saveDc is missing', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'prompt',
        promise: Promise.resolve({ success: true }),
      });

      const mockCombatSummary = { creatures: [{ name: 'TestWizard' }] };
      getCombatSummary.mockReturnValue(mockCombatSummary);

      const statsNoSaveDc = makePlayerStats({
        spellAbilities: { modifier: 3 },
        proficiency: 4,
      });
      await handle(makeAction(), statsNoSaveDc, campaignName, null);

      // Handler uses: 8 + (playerStats.proficiency || 2) = 8 + 4 = 12
      expect(addConcentration).toHaveBeenCalledWith(
        mockCombatSummary,
        'TestWizard',
        'Calm Emotions',
        12,
      );
    });

    it('should not register concentration when combat summary is null', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'prompt',
        promise: Promise.resolve({ success: true }),
      });
      getCombatSummary.mockReturnValue(null);

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addConcentration).not.toHaveBeenCalled();
    });
  });

  describe('handle - storeSpellLastAttack', () => {
    it('should store spell last attack with correct parameters', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
        casterName: 'TestWizard',
        spellName: 'Calm Emotions',
        saveType: 'CHA',
        saveDc: 13,
        attackScope: 'aoe',
      });
    });
  });

  describe('handle - save prompt creation', () => {
    it('should call createSaveListener with CHA save config', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'EnemyGoblin',
        saveType: 'CHA',
        saveDc: 13,
        dcSuccess: 'none',
        disadvantage: false,
      });
    });

    it('should skip the caster from targets', async () => {
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestWizard' },
          { name: 'EnemyGoblin' },
        ],
      });
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(1);
      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'EnemyGoblin',
        saveType: 'CHA',
        saveDc: 13,
        dcSuccess: 'none',
        disadvantage: false,
      });
    });

    it('should apply disadvantage when metamagicHeighten matches target', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(
        makeAction({}, { metamagicHeighten: 'EnemyGoblin' }),
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'EnemyGoblin',
        saveType: 'CHA',
        saveDc: 13,
        dcSuccess: 'none',
        disadvantage: true,
      });
    });
  });

  describe('handle - save success', () => {
    it('should log ability_use and save_result for successful save', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestWizard',
        abilityName: 'Calm Emotions',
        description: expect.stringContaining('casts Calm Emotions'),
        promptId: 'goblin-prompt',
      });
      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'save_result',
        characterName: 'TestWizard',
        rollType: 'save-calm-emotions',
        targetName: 'EnemyGoblin',
        saveDc: 13,
        saveType: 'CHA',
        success: true,
        description: expect.stringContaining('succeeded on CHA save'),
      });
    });

    it('should call addTargetResult with success data', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({
          success: true,
          roll: 12,
          total: 15,
        }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'EnemyGoblin',
        saveResult: 'success',
        roll: 12,
        total: 15,
        conditions: [],
        appliedDamage: 0,
      });
    });

    it('should include saved count in popup description', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: true }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('1 creature(s) saved');
      expect(result.payload.description).toContain('No creatures affected');
    });

    it('should use default roll/total when not provided', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: true }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'EnemyGoblin',
        saveResult: 'success',
        roll: 0,
        total: 0,
        conditions: [],
        appliedDamage: 0,
      });
    });
  });

  describe('handle - save failure', () => {
    it('should apply immunity effects on failed save', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      getRuntimeValue.mockReturnValue([]);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: false }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: 'EnemyGoblin',
            effect: 'calm_emotions',
            mode: 'immunity',
            dc: 13,
          }),
        ]),
        campaignName,
      );
    });

    it('should log ability_use and save_result for failed save', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: false }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestWizard',
        abilityName: 'Calm Emotions',
        description: expect.stringContaining('casts Calm Emotions'),
        promptId: 'goblin-prompt',
      });
      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'save_result',
        characterName: 'TestWizard',
        rollType: 'save-calm-emotions',
        targetName: 'EnemyGoblin',
        saveDc: 13,
        saveType: 'CHA',
        success: false,
        description: expect.stringContaining('failed CHA save'),
      });
    });

    it('should call addTargetResult with failure data', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({
          success: false,
          roll: 3,
          total: 6,
        }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'EnemyGoblin',
        saveResult: 'failure',
        roll: 3,
        total: 6,
        conditions: [],
        appliedDamage: 0,
      });
    });

    it('should include affected count in popup description', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: false }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('1 creature(s)');
      expect(result.payload.description).toContain('immune to Charmed');
      expect(result.payload.description).toContain('0 creature(s) saved');
    });
  });

  describe('handle - multiple targets', () => {
    it('should process all creatures excluding caster', async () => {
      getCombatContext.mockResolvedValue(multiTargetCombat);

      let callCount = 0;
      createSaveListener.mockImplementation(() => {
        callCount++;
        return {
          promptId: `prompt-${callCount}`,
          promise: Promise.resolve({ success: callCount === 1 }),
        };
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(createSaveListener).toHaveBeenCalledTimes(2);
      expect(result.type).toBe('popup');
    });

    it('should report mixed save results correctly', async () => {
      getCombatContext.mockResolvedValue(multiTargetCombat);

      let callCount = 0;
      createSaveListener.mockImplementation(() => {
        callCount++;
        return {
          promptId: `prompt-${callCount}`,
          promise: Promise.resolve({ success: callCount === 1 }),
        };
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('1 creature(s)');
      expect(result.payload.description).toContain('1 creature(s) saved');
    });

    it('should report all targets affected when all fail', async () => {
      getCombatContext.mockResolvedValue(multiTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'multi-prompt',
        promise: Promise.resolve({ success: false }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('2 creature(s)');
      expect(result.payload.description).toContain('immune to Charmed');
    });

    it('should report all targets saving', async () => {
      getCombatContext.mockResolvedValue(multiTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'multi-prompt',
        promise: Promise.resolve({ success: true }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('2 creature(s) saved');
      expect(result.payload.description).toContain('No creatures affected');
    });

    it('should report no creatures affected when all saved', async () => {
      getCombatContext.mockResolvedValue(multiTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'multi-prompt',
        promise: Promise.resolve({ success: true }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('No creatures affected');
    });
  });

  describe('handle - popup payload structure', () => {
    it('should return popup type with automation_info payload', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: false }),
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Calm Emotions');
    });

    it('should use action.name in the popup', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'goblin-prompt',
        promise: Promise.resolve({ success: false }),
      });

      const customAction = {
        name: 'Custom Calm Emotions',
        automation: { type: 'calm_emotions' },
        metaCtx: {},
      };
      const result = await handle(customAction, makePlayerStats(), campaignName, null);

      expect(result.payload.name).toBe('Custom Calm Emotions');
    });
  });

  describe('handle - storage and event dispatch', () => {
    it('should call storage.set and dispatch event when concentration is registered', async () => {
      getCombatContext.mockResolvedValue(singleTargetCombat);
      createSaveListener.mockReturnValue({
        promptId: 'prompt',
        promise: Promise.resolve({ success: true }),
      });

      const mockCombatSummary = { creatures: [{ name: 'TestWizard' }] };
      getCombatSummary.mockReturnValue(mockCombatSummary);

      const stats = makePlayerStats({ spellAbilities: { saveDc: 15 } });
      await handle(makeAction(), stats, campaignName, null);

      expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, campaignName);
    });
  });

  // ── applyCalmEmotionsImmunity ──────────────────────────────────

  describe('applyCalmEmotionsImmunity', () => {
    it('should remove charmed and frightened from activeConditions', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed', 'frightened', 'poisoned'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'EnemyGoblin',
        'activeConditions',
        ['poisoned'],
        campaignName,
      );
    });

    it('should handle case-insensitive condition removal', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['CHARMED', 'Frightened'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'EnemyGoblin',
        'activeConditions',
        [],
        campaignName,
      );
    });

    it('should not modify activeConditions if charmed/frightened are absent', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['poisoned', 'blinded'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      // setRuntimeValue should not be called for conditions since nothing changed
      const conditionCalls = setRuntimeValue.mock.calls.filter(
        call => call[1] === 'activeConditions',
      );
      expect(conditionCalls).toHaveLength(0);
    });

    it('should add activeBuff with calm_emotions effect', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'EnemyGoblin',
        'activeBuffs',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Calm Emotions',
            effect: 'calm_emotions',
            conditionImmunity: ['Charmed', 'Frightened'],
            sourceCharacter: 'TestWizard',
            duration: 'concentration',
          }),
        ]),
        campaignName,
      );
    });

    it('should preserve existing buffs when adding calm_emotions buff', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed'];
        if (key === 'activeBuffs') return [{ name: 'Blessing', effect: 'blessing' }];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'EnemyGoblin',
        'activeBuffs',
        expect.arrayContaining([
          expect.objectContaining({ name: 'Blessing' }),
          expect.objectContaining({ name: 'Calm Emotions' }),
        ]),
        campaignName,
      );
    });

    it('should track calm_emotions in targetEffects', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: 'EnemyGoblin',
            effect: 'calm_emotions',
            mode: 'immunity',
            source: 'TestWizard',
            suppressedConditions: ['charmed'],
            dc: 13,
            duration: 'concentration',
          }),
        ]),
        campaignName,
      );
    });

    it('should update existing calm_emotions targetEffect entry', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [
          {
            target: 'EnemyGoblin',
            effect: 'calm_emotions',
            mode: 'charmed',
            source: 'OldCaster',
          },
        ];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 15,
      });

      const targetEffectsCall = setRuntimeValue.mock.calls.find(
        call => call[1] === 'targetEffects',
      );
      const effects = targetEffectsCall[2];
      const calmEffect = effects.find(
        te => te.target === 'EnemyGoblin' && te.effect === 'calm_emotions',
      );
      expect(calmEffect.mode).toBe('immunity');
      expect(calmEffect.source).toBe('TestWizard');
      expect(calmEffect.dc).toBe(15);
    });

    it('should log with suppressed conditions when any are suppressed', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed', 'frightened'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'condition',
        action: 'applied',
        characterName: 'EnemyGoblin',
        condition: 'Calm Emotions (Suppressed: charmed, frightened)',
        reason: 'Calm Emotions spell',
        note: expect.stringContaining('suppressed'),
        timestamp: expect.any(Number),
      });
    });

    it('should log without suppressed conditions when none are suppressed', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['poisoned'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'condition',
        action: 'applied',
        characterName: 'EnemyGoblin',
        condition: 'Calm Emotions (Immune to Charmed/Frightened)',
        reason: 'Calm Emotions spell',
        note: expect.stringContaining('immune to Charmed and Frightened'),
        timestamp: expect.any(Number),
      });
    });

    it('should handle non-array activeConditions gracefully', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return 'charmed';
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return [];
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      // Non-array activeConditions becomes [], filtered === conditions, so no setRuntimeValue for conditions
      const conditionCalls = setRuntimeValue.mock.calls.filter(
        call => call[1] === 'activeConditions',
      );
      expect(conditionCalls).toHaveLength(0);
    });

    it('should handle null targetEffects gracefully', async () => {
      getRuntimeValue.mockImplementation((entity, key) => {
        if (key === 'activeConditions') return ['charmed'];
        if (key === 'activeBuffs') return [];
        if (key === 'targetEffects') return null;
        return undefined;
      });

      await applyCalmEmotionsImmunity({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.any(Array),
        campaignName,
      );
    });
  });

  // ── applyCalmEmotionsCharmed ───────────────────────────────────

  describe('applyCalmEmotionsCharmed', () => {
    it('should apply charmed condition when target is not immune', async () => {
      getRuntimeValue.mockReturnValueOnce([]);
      getMonsterData.mockRejectedValue(new Error('Not found'));

      const result = await applyCalmEmotionsCharmed({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'npc', name: 'EnemyGoblin' },
        characters: [],
      });

      expect(result).toEqual({ immune: false });
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'EnemyGoblin',
        'activeConditions',
        ['charmed'],
        campaignName,
      );
    });

    it('should deduplicate charmed when target already has it', async () => {
      getRuntimeValue.mockReturnValueOnce(['charmed', 'poisoned']);
      getMonsterData.mockRejectedValue(new Error('Not found'));

      const result = await applyCalmEmotionsCharmed({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'npc', name: 'EnemyGoblin' },
        characters: [],
      });

      expect(result).toEqual({ immune: false });
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'EnemyGoblin',
        'activeConditions',
        ['poisoned', 'charmed'],
        campaignName,
      );
    });

    it('should track calm_emotions in targetEffects with charmed mode', async () => {
      getRuntimeValue.mockReturnValueOnce([]);
      getRuntimeValue.mockReturnValueOnce([]);
      getMonsterData.mockRejectedValue(new Error('Not found'));

      await applyCalmEmotionsCharmed({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'npc', name: 'EnemyGoblin' },
        characters: [],
      });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: 'EnemyGoblin',
            effect: 'calm_emotions',
            mode: 'charmed',
            source: 'TestWizard',
            conditions: ['charmed'],
            dc: 13,
            duration: 'concentration',
          }),
        ]),
        campaignName,
      );
    });

    it('should update existing calm_emotions targetEffect entry', async () => {
      getRuntimeValue.mockReturnValueOnce([]);
      getRuntimeValue.mockReturnValueOnce([
        {
          target: 'EnemyGoblin',
          effect: 'calm_emotions',
          mode: 'immunity',
          source: 'OldCaster',
        },
      ]);
      getMonsterData.mockRejectedValue(new Error('Not found'));

      await applyCalmEmotionsCharmed({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 15,
        creature: { type: 'npc', name: 'EnemyGoblin' },
        characters: [],
      });

      const targetEffectsCall = setRuntimeValue.mock.calls.find(
        call => call[1] === 'targetEffects',
      );
      const effects = targetEffectsCall[2];
      const calmEffect = effects.find(
        te => te.target === 'EnemyGoblin' && te.effect === 'calm_emotions',
      );
      expect(calmEffect.mode).toBe('charmed');
      expect(calmEffect.source).toBe('TestWizard');
      expect(calmEffect.dc).toBe(15);
    });

    it('should log charmed application', async () => {
      getRuntimeValue.mockReturnValueOnce([]);
      getMonsterData.mockRejectedValue(new Error('Not found'));

      await applyCalmEmotionsCharmed({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'npc', name: 'EnemyGoblin' },
        characters: [],
      });

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'condition',
        action: 'applied',
        characterName: 'EnemyGoblin',
        condition: 'Charmed',
        reason: 'Calm Emotions spell',
        note: expect.stringContaining('Charmed by Calm Emotions'),
        timestamp: expect.any(Number),
      });
    });

    it('should return { immune: true } when player is immune to charmed', async () => {
      playerIsImmuneToCondition.mockReturnValue(true);

      const result = await applyCalmEmotionsCharmed({
        targetName: 'Hero',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'player', name: 'Hero' },
        characters: [
          {
            name: 'Hero',
            computed_stats: { condition_immunities: ['charmed'] },
          },
        ],
      });

      expect(result).toEqual({ immune: true });
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Hero',
        'activeConditions',
        expect.anything(),
      );
    });

    it('should return { immune: true } when NPC has charmed immunity in condition_immunities', async () => {
      getMonsterData.mockResolvedValue({ condition_immunities: ['Charmed'] });

      const result = await applyCalmEmotionsCharmed({
        targetName: 'Iron Golem',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'monster', name: 'Iron Golem' },
        characters: [],
      });

      expect(result).toEqual({ immune: true });
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Iron Golem',
        'activeConditions',
        expect.anything(),
      );
    });

    it('should handle case-insensitive condition immunity check', async () => {
      getMonsterData.mockResolvedValue({ condition_immunities: ['CHARMED'] });

      const result = await applyCalmEmotionsCharmed({
        targetName: 'Iron Golem',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'monster', name: 'Iron Golem' },
        characters: [],
      });

      expect(result).toEqual({ immune: true });
    });

    it('should log immunity for player targets', async () => {
      playerIsImmuneToCondition.mockReturnValue(true);

      await applyCalmEmotionsCharmed({
        targetName: 'Hero',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'player', name: 'Hero' },
        characters: [
          {
            name: 'Hero',
            computed_stats: { condition_immunities: ['charmed'] },
          },
        ],
      });

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestWizard',
        abilityName: 'Calm Emotions',
        description: expect.stringContaining('immune to being Charmed'),
        timestamp: expect.any(Number),
      });
    });

    it('should log immunity for NPC targets', async () => {
      getMonsterData.mockResolvedValue({ condition_immunities: ['Charmed'] });

      await applyCalmEmotionsCharmed({
        targetName: 'Iron Golem',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'monster', name: 'Iron Golem' },
        characters: [],
      });

      expect(addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestWizard',
        abilityName: 'Calm Emotions',
        description: expect.stringContaining('immune to being Charmed'),
        timestamp: expect.any(Number),
      });
    });

    it('should proceed with save when creature is null (player without creature obj)', async () => {
      getRuntimeValue.mockReturnValueOnce([]);
      getMonsterData.mockRejectedValue(new Error('Not found'));

      const result = await applyCalmEmotionsCharmed({
        targetName: 'EnemyGoblin',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: null,
        characters: [],
      });

      expect(result).toEqual({ immune: false });
    });

    it('should use computed_stats when available for player immunity check', async () => {
      playerIsImmuneToCondition.mockReturnValue(true);

      const result = await applyCalmEmotionsCharmed({
        targetName: 'Hero',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'player', name: 'Hero' },
        characters: [
          {
            name: 'Hero',
            computed_stats: { condition_immunities: ['Charmed'] },
          },
        ],
      });

      expect(result).toEqual({ immune: true });
    });

    it('should fall back to top-level character data when computed_stats is missing', async () => {
      playerIsImmuneToCondition.mockReturnValue(true);

      const result = await applyCalmEmotionsCharmed({
        targetName: 'Hero',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'player', name: 'Hero' },
        characters: [
          {
            name: 'Hero',
            condition_immunities: ['charmed'],
          },
        ],
      });

      expect(result).toEqual({ immune: true });
    });

    it('should catch getMonsterData error and proceed with save', async () => {
      getRuntimeValue.mockReturnValueOnce([]);
      getMonsterData.mockRejectedValue(new Error('Database error'));

      const result = await applyCalmEmotionsCharmed({
        targetName: 'MysteriousCreature',
        casterName: 'TestWizard',
        campaignName,
        dc: 13,
        creature: { type: 'npc', name: 'MysteriousCreature' },
        characters: [],
      });

      expect(result).toEqual({ immune: false });
    });
  });
});

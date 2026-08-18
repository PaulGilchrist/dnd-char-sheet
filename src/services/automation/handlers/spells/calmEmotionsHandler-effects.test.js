// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  playerIsImmuneToCondition: vi.fn(),
}));

vi.mock('../../../npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(),
}));

import { applyCalmEmotionsImmunity, applyCalmEmotionsCharmed } from './calmEmotionsHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { playerIsImmuneToCondition } from '../../../combat/automation/automationService.js';
import { getMonsterData } from '../../../npcs/monsterUtils.js';

const campaignName = 'TestCampaign';

describe('calmEmotionsHandler - applyCalmEmotionsImmunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

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

describe('calmEmotionsHandler - applyCalmEmotionsCharmed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

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

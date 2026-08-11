import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './faerieFireHandler.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as combatData from '../../../encounters/combatData.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';
import * as damageRollback from '../../common/damageRollback.js';
import storage from '../../../ui/storage.js';

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

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => ({
  default: { get: vi.fn(), set: vi.fn(), getProperty: vi.fn(), setProperty: vi.fn() },
}));

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    level: 5,
    proficiency: 3,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Faerie Fire',
    automation: { type: 'faerie_fire', saveType: 'DEX', saveDc: 15, ...automation },
  };
}

const baseCombatContext = {
  creatures: [
    { name: 'Goblin', type: 'monster' },
    { name: 'Orc', type: 'monster' },
    { name: 'TestCaster', gridX: 5, gridY: 10 },
  ],
  players: [{ name: 'TestCaster', gridX: 5, gridY: 10 }],
  placedItems: [],
};

function mockGetRuntimeValue(dispatch) {
  runtimeState.getRuntimeValue.mockImplementation((playerName, key, _cName) => dispatch(playerName, key, _cName));
}

function makeSaveListener(promiseResult, promptId) {
  return { promptId: promptId || 'faerie-prompt', promise: Promise.resolve(promiseResult) };
}

function setupFailedSaveMock() {
  damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
  savePrompt.buildSaveDc.mockReturnValue(15);
  mockGetRuntimeValue((playerName, key) => {
    if (key === 'targetEffects') return [];
    if (key === 'activeBuffs') return [];
    if (key === 'activeConditions') return [];
    return null;
  });
  savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));
}

function setupSuccessfulSaveMock() {
  damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
  savePrompt.buildSaveDc.mockReturnValue(20);
  savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));
}

describe('faerieFireHandler.handle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('combat context validation', () => {
    it('should return popup when no combat context exists', async () => {
      damageUtils.getCombatContext.mockResolvedValue(null);
      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);
      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
    });

    it('should return popup when combat context has no creatures', async () => {
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);
      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures in combat');
      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
    });

    it('should return popup when combat context has no creatures property', async () => {
      damageUtils.getCombatContext.mockResolvedValue({});
      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);
      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('target processing', () => {
    it('should skip the caster itself from targets', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(2);
    });

    it('should return early when all creatures are the caster', async () => {
      const onlyPlayerCombat = {
        creatures: [{ name: 'TestCaster', gridX: 5, gridY: 10 }],
        players: [{ name: 'TestCaster', gridX: 5, gridY: 10 }],
        placedItems: [],
      };
      damageUtils.getCombatContext.mockResolvedValue(onlyPlayerCombat);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
      expect(result.payload.description).toContain('No creatures selected');
    });

    it('should report all targets saving successfully', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(20);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('2 creature(s) saved');
    });

    it('should report both affected and saved creatures in summary', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(14);
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [];
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return [];
        return null;
      });

      let callCount = 0;
      savePrompt.createSaveListener.mockImplementation(() => {
        callCount++;
        return makeSaveListener({ success: callCount > 1 });
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Faerie Fire affects 1 creature(s)');
      expect(result.payload.description).toContain('1 creature(s) saved');
    });

    it('should skip creatures with DEX immunity', async () => {
      const combatWithImmune = {
        ...baseCombatContext,
        creatures: [
          { name: 'Goblin', type: 'monster' },
          { name: 'IronGolem', type: 'monster', weaknessesAndResistivities: { immunities: ['DEX'] } },
          { name: 'TestCaster', gridX: 5, gridY: 10 },
        ],
      };
      damageUtils.getCombatContext.mockResolvedValue(combatWithImmune);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(result.payload.description).toContain('1 creature(s) immune');
    });

    it('should skip creatures with lowercase dex immunity', async () => {
      const combatWithImmune = {
        ...baseCombatContext,
        creatures: [
          { name: 'Goblin', type: 'monster' },
          { name: 'IronGolem', type: 'monster', weaknessesAndResistivities: { immunities: ['dex'] } },
          { name: 'TestCaster', gridX: 5, gridY: 10 },
        ],
      };
      damageUtils.getCombatContext.mockResolvedValue(combatWithImmune);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(result.payload.description).toContain('1 creature(s) immune');
    });

    it('should skip creatures with Dexterity immunity variant', async () => {
      const combatWithImmune = {
        ...baseCombatContext,
        creatures: [
          { name: 'Goblin', type: 'monster' },
          { name: 'IronGolem', type: 'monster', weaknessesAndResistivities: { immunities: ['Dexterity'] } },
          { name: 'TestCaster', gridX: 5, gridY: 10 },
        ],
      };
      damageUtils.getCombatContext.mockResolvedValue(combatWithImmune);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(result.payload.description).toContain('1 creature(s) immune');
    });

    it('should filter targets when metaCtx.targets is provided', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [];
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return [];
        return null;
      });

      const action = { ...makeAction(), metaCtx: { targets: ['Goblin'] } };
      await handle(action, makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({ targetName: 'Goblin' }),
      );
    });

    it('should return early when selected targets are empty after filtering', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(14);

      const action = { ...makeAction(), metaCtx: { targets: [] } };
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
      expect(result.payload.description).toContain('No creatures selected');
    });

    it('should exclude caster from selected targets', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      const action = { ...makeAction(), metaCtx: { targets: ['TestCaster', 'Goblin'] } };
      await handle(action, makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({ targetName: 'Goblin' }),
      );
    });

    it('should apply disadvantage when metaCtx.heightenTarget matches', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(14);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [];
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return [];
        return null;
      });

      const action = { ...makeAction(), metaCtx: { heightenTarget: 'Goblin' } };
      await handle(action, makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({ targetName: 'Goblin', disadvantage: true }),
      );
      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({ targetName: 'Orc', disadvantage: false }),
      );
    });
  });

  describe('spell attack tracking', () => {
    it('should call storeSpellLastAttack with correct params', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
        casterName: 'TestCaster',
        spellName: 'Faerie Fire',
        saveType: 'DEX',
        saveDc: 15,
        attackScope: 'aoe',
      });
    });
  });

  describe('failed save handling', () => {
    it('should register faerie_fire targetEffect on failed save', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: 'Goblin',
            effect: 'faerie_fire',
            source: 'TestCaster',
            duration: 'concentration',
          }),
        ]),
        campaignName,
      );
    });

    it('should add activeBuffs entry with invisible immunity on failed save', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeBuffs',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Faerie Fire',
            effect: 'faerie_fire',
            duration: 'Concentration, up to 1 minute',
            source: 'TestCaster',
            conditionImmunity: ['invisible'],
          }),
        ]),
        campaignName,
      );
    });

    it('should register remove_faerie_fire expiration on failed save', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        'TestCaster',
        'Goblin',
        [{ type: 'remove_faerie_fire' }],
        campaignName,
      );
    });

    it('should remove invisible condition when present', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [];
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return ['invisible'];
        return null;
      });
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        [],
        campaignName,
      );
    });

    it('should not touch activeConditions when invisible is absent', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.any(Array),
        campaignName,
      );
    });

    it('should log the applied condition entry', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const appliedEntry = addEntry.mock.calls.find(([, entry]) => entry.type === 'condition' && entry.action === 'applied');
      expect(appliedEntry).toBeTruthy();
      expect(appliedEntry[1].condition).toBe('Faerie Fire');
      expect(appliedEntry[1].note).toContain('immune to the Invisible condition');
      expect(appliedEntry[1].note).toContain('Advantage');
    });

    it('should include immunity and advantage notes in summary', async () => {
      setupFailedSaveMock();

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('immune to the Invisible condition');
      expect(result.payload.description).toContain('Advantage');
    });

    it('should update existing faerie_fire effect when re-casting on same target', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      const existingEffect = {
        target: 'Goblin',
        effect: 'faerie_fire',
        source: 'OldCaster',
        duration: 'concentration',
      };
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [existingEffect];
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return [];
        return null;
      });
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      const oldCasterStats = makePlayerStats({ name: 'OldCaster' });
      await handle(makeAction(), oldCasterStats, campaignName, null);

      // Should have called setRuntimeValue for targetEffects with the replaced effect
      const targetEffectsCall = runtimeState.setRuntimeValue.mock.calls.find(
        call => call[0] === 'campaign' && call[1] === 'targetEffects'
      );
      expect(targetEffectsCall).toBeDefined();
      expect(targetEffectsCall[2]).toEqual([
        expect.objectContaining({
          target: 'Goblin',
          effect: 'faerie_fire',
          source: 'OldCaster',
          duration: 'concentration',
        }),
      ]);
    });

    it('should not duplicate faerie_fire in activeBuffs when already present', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      const existingBuff = {
        name: 'Faerie Fire',
        effect: 'faerie_fire',
        duration: 'Concentration, up to 1 minute',
        source: 'OldCaster',
        conditionImmunity: ['invisible'],
      };
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [];
        if (key === 'activeBuffs') return [existingBuff];
        if (key === 'activeConditions') return [];
        return null;
      });
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      const oldCasterStats = makePlayerStats({ name: 'OldCaster' });
      await handle(makeAction(), oldCasterStats, campaignName, null);

      const buffsCall = runtimeState.setRuntimeValue.mock.calls.find(
        call => call[0] === 'Goblin' && call[1] === 'activeBuffs'
      );
      expect(buffsCall).toBeDefined();
      // Should have filtered out the old buff and added a new one, so only 1 buff remains
      expect(buffsCall[2]).toHaveLength(1);
    });

    it('should call addTargetResult with failure details', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveResult: 'failure',
        roll: 0,
        total: 0,
        conditions: ['faerie_fire'],
        appliedDamage: 0,
      });
    });

    it('should log condition applied entry for failed save', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const conditionEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'condition' && entry.action === 'applied'
      );
      expect(conditionEntry).toBeDefined();
      expect(conditionEntry[1].characterName).toBe('Goblin');
      expect(conditionEntry[1].condition).toBe('Faerie Fire');
      expect(conditionEntry[1].note).toContain('outlined by Faerie Fire');
    });

    it('should log save_result entry for failed save', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const saveResultEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'save_result' && entry.success === false
      );
      expect(saveResultEntry).toBeDefined();
      expect(saveResultEntry[1].targetName).toBe('Goblin');
      expect(saveResultEntry[1].saveType).toBe('DEX');
      expect(saveResultEntry[1].saveDc).toBe(15);
      expect(saveResultEntry[1].rollType).toBe('save-faerie-fire');
    });

    it('should log ability_use entry when casting', async () => {
      setupFailedSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const abilityEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'ability_use' && entry.abilityName === 'Faerie Fire' && entry.promptId
      );
      expect(abilityEntry).toBeDefined();
      expect(abilityEntry[1].characterName).toBe('TestCaster');
      expect(abilityEntry[1].description).toContain('must make a DEX save');
    });

    it('should log ability_use entry for immune creature', async () => {
      const combatWithImmune = {
        ...baseCombatContext,
        creatures: [
          { name: 'IronGolem', type: 'monster', weaknessesAndResistivities: { immunities: ['DEX'] } },
          { name: 'TestCaster', gridX: 5, gridY: 10 },
        ],
      };
      damageUtils.getCombatContext.mockResolvedValue(combatWithImmune);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const immuneEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'ability_use' && entry.description?.includes('immune')
      );
      expect(immuneEntry).toBeDefined();
      expect(immuneEntry[1].description).toContain('IronGolem');
      expect(immuneEntry[1].description).toContain('DEX immunity');
    });

    it('should use action.name in ability_use log entries', async () => {
      setupFailedSaveMock();
      vi.clearAllMocks();
      mockGetRuntimeValue((playerName, key) => {
        if (key === 'targetEffects') return [];
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return [];
        return null;
      });

      const customAction = { name: 'My Faerie Fire', automation: { type: 'faerie_fire', saveType: 'DEX', saveDc: 15 } };
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: false }));

      await handle(customAction, makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const abilityEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'ability_use' && entry.abilityName === 'My Faerie Fire'
      );
      expect(abilityEntry).toBeDefined();
    });
  });

  describe('successful save handling', () => {
    it('should not apply targetEffect or activeBuff when save succeeds', async () => {
      setupSuccessfulSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.any(Array),
      );
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        expect.any(String),
        'activeBuffs',
        expect.any(Array),
      );
    });

    it('should call addTargetResult with success details', async () => {
      setupSuccessfulSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveResult: 'success',
        roll: 0,
        total: 0,
        conditions: [],
        appliedDamage: 0,
      });
    });

    it('should log save_result entry for successful save', async () => {
      setupSuccessfulSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const saveResultEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'save_result' && entry.success === true
      );
      expect(saveResultEntry).toBeDefined();
      expect(saveResultEntry[1].targetName).toBe('Goblin');
      expect(saveResultEntry[1].saveType).toBe('DEX');
      expect(saveResultEntry[1].saveDc).toBe(20);
      expect(saveResultEntry[1].rollType).toBe('save-faerie-fire');
    });

    it('should not apply faerie_fire conditions on success', async () => {
      setupSuccessfulSaveMock();

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const { addEntry } = await import('../../../ui/logService.js');
      const faerieConditionEntry = addEntry.mock.calls.find(
        ([, entry]) => entry.type === 'condition' && entry.action === 'applied' && entry.condition === 'Faerie Fire'
      );
      expect(faerieConditionEntry).toBeUndefined();
    });
  });

  describe('concentration', () => {
    it('should register concentration when combat summary is available', async () => {
      const summary = { creatures: [{ name: 'TestCaster' }, { name: 'Goblin' }] };
      combatData.getCombatSummary.mockReturnValue(summary);
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      const playerStats = makePlayerStats({ spellAbilities: { saveDc: 16 } });
      await handle(makeAction(), playerStats, campaignName, null);

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        summary,
        'TestCaster',
        'Faerie Fire',
        16,
      );
      expect(storage.set).toHaveBeenCalledWith('combatSummary', summary, campaignName);
    });

    it('should compute concentration DC from spellAbilities.saveDc when available', async () => {
      const summary = { creatures: [{ name: 'TestCaster' }, { name: 'Goblin' }] };
      combatData.getCombatSummary.mockReturnValue(summary);
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      const playerStats = makePlayerStats({ spellAbilities: { saveDc: 18 } });
      await handle(makeAction(), playerStats, campaignName, null);

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        summary,
        'TestCaster',
        'Faerie Fire',
        18,
      );
    });

    it('should not register concentration when combat summary is null', async () => {
      combatData.getCombatSummary.mockReturnValue(null);
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(concentrationService.addConcentration).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('should dispatch window event for combat-summary-updated', async () => {
      const summary = { creatures: [{ name: 'TestCaster' }, { name: 'Goblin' }] };
      combatData.getCombatSummary.mockReturnValue(summary);
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(makeSaveListener({ success: true }));

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'combat-summary-updated' }));
      addEventListenerSpy.mockRestore();
      dispatchEventSpy.mockRestore();
    });
  });
});

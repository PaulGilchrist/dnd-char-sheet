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
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../combat/automation/automationImmunities.js', () => ({
  playerIsImmuneToCondition: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
  breakConcentration: vi.fn(),
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

vi.mock('../../common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn().mockResolvedValue({}),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, processSleetStormAreaSave } from './sleetStormHandler.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as logService from '../../../ui/logService.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as rangeCheck from '../../../rules/combat/rangeCheck.js';
import * as automationImmunities from '../../../combat/automation/automationImmunities.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as storage from '../../../ui/storage.js';
import * as damageRollback from '../../common/damageRollback.js';

// ── Constants & Helpers ────────────────────────────────────────

const campaignName = 'TestCampaign';
const mapName = 'test-map';
const casterName = 'TestWizard';

function makePlayerStats(overrides = {}) {
  return {
    name: casterName,
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 3 }],
    spellAbilities: { saveDc: 15 },
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Sleet Storm',
    automation: {
      type: 'sleet_storm',
      saveType: 'DEX',
      saveDc: 15,
      ...automation,
    },
  };
}

const baseCombatContext = {
  creatures: [
    { name: 'Goblin', type: 'monster', currentHp: 5, maxHp: 7 },
    { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 22 },
    { name: casterName, type: 'player', gridX: 5, gridY: 10 },
  ],
  players: [{ name: casterName, gridX: 5, gridY: 10 }],
  placedItems: [],
};

function failSaveListener() {
  return {
    promptId: 'sleet-prompt',
    promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
  };
}

function successSaveListener() {
  return {
    promptId: 'sleet-prompt',
    promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
  };
}

// ── Tests: handle ──────────────────────────────────────────────

describe('sleetStormHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeState.getRuntimeValue.mockReturnValue(null);
  });

  describe('early returns', () => {
    it('returns popup when no combat context', async () => {
      damageUtils.getCombatContext.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
      expect(result.payload.description).toContain('Sleet Storm has no effect');
    });

    it('returns popup when combat context has no creatures', async () => {
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('target selection', () => {
    it('uses all creatures when no targets specified in metaCtx', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      // Uses all creatures from combat context (including caster)
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(3);
      const targetNames = savePrompt.createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('Orc');
      expect(targetNames).toContain(casterName);
    });

    it('uses only selected targets from metaCtx', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({ targetName: 'Goblin' }),
      );
    });

    it('returns popup when selected targets are empty', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);

      const result = await handle(
        { ...makeAction(), metaCtx: { targets: [] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures selected');
    });
  });

  describe('save prompt creation', () => {
    it('uses DEX save type and computed DC', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(savePrompt.buildSaveDc).toHaveBeenCalledWith(makeAction().automation, expect.any(Object));
      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveType: 'DEX',
          saveDc: 15,
          dcSuccess: 'none',
        }),
      );
    });

    it('applies disadvantage when target is heightenTarget', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'], heightenTarget: 'Goblin' } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          disadvantage: true,
        }),
      );
    });

    it('does not apply disadvantage when target is not heightenTarget', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'], heightenTarget: 'Orc' } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          disadvantage: false,
        }),
      );
    });
  });

  describe('prone immunity', () => {
    it('skips save for targets with Prone immunity', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'monster', weaknessesAndResistivities: { immunities: ['Prone'] } },
          { name: 'Orc', type: 'monster' },
          { name: casterName, type: 'player', gridX: 5, gridY: 10 },
        ],
      });
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      // Orc and caster get save prompts; Goblin is skipped
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(2);
      const targetNames = savePrompt.createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Orc');
      expect(targetNames).toContain(casterName);
      expect(targetNames).not.toContain('Goblin');
    });

    it('logs immunity entry for prone-immune target', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'monster', weaknessesAndResistivities: { immunities: ['prone'] } },
          { name: casterName, type: 'player', gridX: 5, gridY: 10 },
        ],
      });
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          description: expect.stringContaining('immune to Sleet Storm'),
        }),
      );
    });

    it('handles case-insensitive prone immunity check', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'monster', weaknessesAndResistivities: { immunities: ['PRONE'] } },
          { name: 'Orc', type: 'monster' },
          { name: casterName, type: 'player', gridX: 5, gridY: 10 },
        ],
      });
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      // Goblin skipped; Orc and caster get saves
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(2);
      const targetNames = savePrompt.createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).not.toContain('Goblin');
    });
  });

  describe('on successful save', () => {
    it('does not apply prone condition', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.anything(),
        campaignName,
      );
    });

    it('posts save_result entry with success=true', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
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
          rollType: 'save-sleet-storm',
        }),
      );
    });

    it('calls addTargetResult with success', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveResult: 'success',
          roll: 14,
          total: 14,
          conditions: [],
          appliedDamage: 0,
        }),
      );
    });
  });

  describe('on failed save', () => {
    it('applies prone condition to the target', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['prone']),
        campaignName,
      );
    });

    it('deduplicates prone if already present', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue(['prone', 'blinded']);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const conditionsArg = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === 'activeConditions',
      )[2];
      expect(conditionsArg.filter(c => String(c).toLowerCase() === 'prone').length).toBe(1);
    });

    it('stores condition metadata with DC and source', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'activeConditionMeta') return {};
        return null;
      });
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditionMeta',
        expect.objectContaining({
          prone: expect.objectContaining({
            dc: 15,
            ability: 'dex',
            source: 'sleet_storm',
          }),
        }),
        campaignName,
      );
    });

    it('calls addTargetResult with failure and prone condition', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveResult: 'failure',
          conditions: ['prone'],
        }),
      );
    });

    it('calls addExpiration to remove prone on concentration break', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        casterName,
        'Goblin',
        expect.arrayContaining([expect.objectContaining({ type: 'condition', condition: 'prone' })]),
        campaignName,
      );
    });

    it('calls breakConcentration for the target', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(concentrationService.breakConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        'Goblin',
      );
    });

    it('posts concentration_lost log entry when brokenSpell is returned', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      concentrationService.breakConcentration.mockReturnValue('Fireball');

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const concLostCall = logService.addEntry.mock.calls.find(
        (c) => c[1].type === 'concentration_lost',
      );
      expect(concLostCall).toBeDefined();
      expect(concLostCall[1]).toEqual(
        expect.objectContaining({
          type: 'concentration_lost',
          characterName: 'Goblin',
          spellName: 'Fireball',
          reason: 'Sleet Storm spell',
        }),
      );
    });

    it('posts condition log entry for prone application', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
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
          condition: 'Prone',
          reason: 'Sleet Storm spell',
        }),
      );
    });

    it('tracks concentration loss for this creature', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const concKey = '_sleetStorm_concentration_TestWizard';
      const concCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === concKey,
      );
      expect(concCall).toBeDefined();
      expect(concCall[2]).toContain('Goblin');
    });

    it('stores sleet_storm effect in targetEffects', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const effectsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === 'targetEffects',
      );
      expect(effectsCall).toBeDefined();
      const effects = effectsCall[2];
      const sleetEffect = effects.find(e => e.effect === 'sleet_storm');
      expect(sleetEffect).toBeDefined();
      expect(sleetEffect.target).toBe('Goblin');
      expect(sleetEffect.source).toBe(casterName);
      expect(sleetEffect.conditions).toContain('prone');
      expect(sleetEffect.duration).toBe('concentration');
      expect(sleetEffect.lostConcentration).toBe(true);
    });

    it('updates existing sleet_storm effect entry', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'targetEffects') {
          return [
            { target: 'Goblin', effect: 'sleet_storm', source: 'OldCaster', conditions: ['prone'] },
          ];
        }
        return null;
      });
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const effectsCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === 'targetEffects',
      );
      const effects = effectsCall[2];
      const sleetEffect = effects.find(e => e.target === 'Goblin' && e.effect === 'sleet_storm');
      expect(sleetEffect.source).toBe(casterName);
    });
  });

  describe('tracking data storage', () => {
    it('stores sleet storm tracking data with all fields', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      const trackingCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1]?.startsWith('_sleetStorm_'),
      );
      expect(trackingCall).toBeDefined();
      expect(trackingCall[0]).toBe(casterName);
      expect(trackingCall[1]).toBe('_sleetStorm_TestWizard');
      expect(trackingCall[3]).toBe(campaignName);

      const data = trackingCall[2];
      expect(data).toEqual(
        expect.objectContaining({
          caster: casterName,
          mapName,
          campaignName,
          saveDc: 15,
          saveType: 'DEX',
          radius: 20,
          duration: expect.any(String),
        }),
      );
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('number');
    });

    it('uses duration from automation', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), automation: { duration: '5_rounds' } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const trackingCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1]?.startsWith('_sleetStorm_'),
      );
      expect(trackingCall[2].duration).toBe('5_rounds');
    });

    it('handles caster name with spaces in tracking key', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const stats = makePlayerStats({ name: 'Test Wizard' });
      await handle(makeAction(), stats, campaignName, mapName);

      const trackingCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1]?.startsWith('_sleetStorm_'),
      );
      expect(trackingCall[1]).toBe('_sleetStorm_Test_Wizard');
    });
  });

  describe('duration parsing and expiration', () => {
    it('sets expiration for 1_minute duration (10 rounds)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), automation: { duration: '1_minute' } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        casterName,
        casterName,
        expect.arrayContaining([expect.objectContaining({ type: 'remove_sleet_storm_area' })]),
        campaignName,
        10,
      );
    });

    it('sets expiration for round-based duration', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), automation: { duration: '3_rounds' } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        casterName,
        casterName,
        expect.any(Array),
        campaignName,
        3,
      );
    });

    it('does not set expiration for unrecognized duration', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), automation: { duration: 'unknown' } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(expirations.addExpiration).not.toHaveBeenCalled();
    });

    it('does not set expiration when duration is undefined', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), automation: { duration: undefined } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(expirations.addExpiration).not.toHaveBeenCalled();
    });
  });

  describe('concentration registration', () => {
    it('calls addConcentration with correct parameters', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        casterName,
        'Sleet Storm',
        15,
      );
      expect(storage.default.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), campaignName);
    });

    it('falls back to proficiency-based DC when spellAbilities.saveDc is missing', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const stats = makePlayerStats({ spellAbilities: undefined, proficiency: 4 });
      await handle(makeAction(), stats, campaignName, mapName);

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        expect.any(Object),
        casterName,
        'Sleet Storm',
        8 + 4, // formula: 8 + proficiency
      );
    });
  });

  describe('storeSpellLastAttack', () => {
    it('calls storeSpellLastAttack with correct parameters', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
        casterName,
        spellName: 'Sleet Storm',
        saveType: 'DEX',
        saveDc: 15,
        attackScope: 'aoe',
      });
    });
  });

  describe('log entries', () => {
    it('posts ability_use entry for each target', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      // 3 targets = 3 ability_use entries
      const abilityEntries = logService.addEntry.mock.calls.filter(
        (c) => c[1].type === 'ability_use',
      );
      expect(abilityEntries.length).toBe(3);
      expect(abilityEntries[0][1]).toEqual(
        expect.objectContaining({
          type: 'ability_use',
          characterName: casterName,
          abilityName: 'Sleet Storm',
          description: expect.stringContaining('Sleet Storm'),
        }),
      );
    });

    it('includes promptId in ability_use entry', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-test-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      const abilityEntry = logService.addEntry.mock.calls.find(
        (c) => c[1].type === 'ability_use',
      );
      expect(abilityEntry[1].promptId).toBe('sleet-test-prompt');
    });
  });

  describe('summary popup', () => {
    it('reports affected creature count when some fail', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(result.payload.description).toContain('Sleet Storm affects 3 creature(s)');
    });

    it('reports saved creature count in the summary', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);

      let callCount = 0;
      savePrompt.createSaveListener.mockImplementation(() => {
        callCount++;
        return {
          promptId: 'sleet-prompt',
          promise: Promise.resolve({ success: callCount === 1 }),
        };
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(result.payload.description).toContain('creature(s) saved');
    });

    it('reports no creatures affected when all save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, mapName);

      expect(result.payload.description).toContain('No creatures affected by Sleet Storm');
    });

    it('uses the action name in the popup payload', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(
        { name: 'Custom Sleet Storm', automation: makeAction().automation },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(result.payload.name).toBe('Custom Sleet Storm');
    });
  });

  describe('multiple targets mixed results', () => {
    it('processes all targets with mixed save results', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      combatData.getCombatSummary.mockReturnValue({});
      storage.default.set.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      savePrompt.createSaveListener
        .mockReturnValueOnce(failSaveListener())
        .mockReturnValueOnce(successSaveListener());

      const result = await handle(
        { ...makeAction(), metaCtx: { targets: ['Goblin', 'Orc'] } },
        makePlayerStats(),
        campaignName,
        mapName,
      );

      expect(result.payload.description).toContain('1 creature');
      expect(result.payload.description).toContain('creature(s) saved');
    });
  });
});

// ── Tests: processSleetStormAreaSave ───────────────────────────

describe('sleetStormHandler.processSleetStormAreaSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('early returns', () => {
    it('returns null when no tracking data', async () => {
      useRuntimeState.getRuntimeValue.mockReturnValue(null);

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result).toBeNull();
    });

    it('returns null when tracking has no saveDc', async () => {
      useRuntimeState.getRuntimeValue.mockReturnValue({ caster: casterName });

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result).toBeNull();
    });

    it('returns null when target is already prone (case-insensitive)', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        if (key === 'activeConditions') return ['prone'];
        return null;
      });
      rangeCheck.isWithinRange.mockResolvedValue(true);

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result).toBeNull();
    });

    it('returns null when target is already Prone (mixed case)', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        if (key === 'activeConditions') return ['PrOnE'];
        return null;
      });

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result).toBeNull();
    });

    it('returns null when player is immune to prone condition', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        if (key === 'activeConditions') return [];
        if (key === 'computedStats') return { immunities: ['prone'] };
        return null;
      });
      // getCombatContext is called WITHOUT await in the immunity check,
      // so we must return a synchronous value (not a Promise)
      damageUtils.getCombatContext.mockReturnValue({
        creatures: [{ name: 'Goblin', type: 'player' }],
      });
      automationImmunities.playerIsImmuneToCondition.mockReturnValue(true);
      rangeCheck.isWithinRange.mockResolvedValue(true);

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result).toBeNull();
      expect(automationImmunities.playerIsImmuneToCondition).toHaveBeenCalled();
      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();

      // non-player target — skips immunity check
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        if (key === 'activeConditions') return [];
        return null;
      });
      damageUtils.getCombatContext.mockReturnValue({
        creatures: [{ name: 'Goblin', type: 'monster' }],
      });
      automationImmunities.playerIsImmuneToCondition.mockClear();
      rangeCheck.isWithinRange.mockResolvedValue(true);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-monster',
        promise: Promise.resolve({ success: true }),
      });

      const result2 = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);
      expect(result2.type).toBe('popup');
      expect(automationImmunities.playerIsImmuneToCondition).not.toHaveBeenCalled();
    });

    it('proceeds with save when isWithinRange throws', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        if (key === 'activeConditions') return [];
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster' }],
      });
      rangeCheck.isWithinRange.mockRejectedValue(new Error('map not found'));
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-fallback',
        promise: Promise.resolve({ success: true }),
      });

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(savePrompt.createSaveListener).toHaveBeenCalled();
    });

    it('returns null when mapName is null (skips range check)', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        if (key === 'activeConditions') return [];
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster' }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-nonull',
        promise: Promise.resolve({ success: true }),
      });

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, null);

      expect(result.type).toBe('popup');
      expect(rangeCheck.isWithinRange).not.toHaveBeenCalled();
    });

    it('returns null when target is outside range', async () => {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX', radius: 20 };
        }
        if (key === 'activeConditions') return [];
        return null;
      });
      rangeCheck.isWithinRange.mockResolvedValue(false);

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result).toBeNull();
    });
  });

  describe('save processing', () => {
    function setupBaseSave() {
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return {
            caster: casterName,
            saveDc: 15,
            saveType: 'DEX',
            radius: 20,
          };
        }
        if (key === 'activeConditions') return [];
        return null;
      });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'monster' }],
      });
      rangeCheck.isWithinRange.mockResolvedValue(true);
    }

    it('triggers save listener with correct parameters', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-params',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveType: 'DEX',
        saveDc: 15,
      });
    });

    it('posts ability_use log entry when triggering save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-ability',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: casterName,
          abilityName: 'Sleet Storm',
          description: expect.stringContaining('Sleet Storm area'),
        }),
      );
    });

    it('returns popup with correct description on failed save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-fail-desc',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Sleet Storm');
      expect(result.payload.description).toContain('failed');
      expect(result.payload.description).toContain('DEX');
      expect(result.payload.description).toContain('DC 15');
      expect(result.payload.description).toContain('Becomes Prone');
    });

    it('returns popup with correct description on successful save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-success-desc',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      const result = await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(result.payload.description).toContain('succeeded');
      expect(result.payload.description).toContain('Unaffected');
    });

    it('applies prone condition on failed save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-apply',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['prone']),
        campaignName,
      );
    });

    it('does not apply prone condition on successful save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-no-apply',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.anything(),
        campaignName,
      );
    });

    it('deduplicates prone before adding on failed save', async () => {
      useRuntimeState.getRuntimeValue.mockReset();
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key.startsWith('_sleetStorm_')) {
          return { saveDc: 15, saveType: 'DEX' };
        }
        // Target already has prone, so the early return check would trigger
        // We need to NOT have prone for the code to reach the dedup logic
        if (key === 'activeConditions') return ['blinded', 'restrained'];
        return null;
      });
      damageUtils.getCombatContext.mockReturnValue({
        creatures: [{ name: 'Goblin', type: 'monster' }],
      });
      rangeCheck.isWithinRange.mockResolvedValue(true);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-dedup',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      // Should have existing conditions plus prone, with no duplicate prone
      const conditionCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        (c) => c[1] === 'activeConditions',
      );
      expect(conditionCalls.length).toBeGreaterThan(0);
      const conditionsArg = conditionCalls[0][2];
      expect(conditionsArg).toContain('prone');
      expect(conditionsArg).toContain('blinded');
      expect(conditionsArg).toContain('restrained');
      expect(conditionsArg.filter(c => String(c).toLowerCase() === 'prone').length).toBe(1);
    });

    it('calls addTargetResult on failed save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-add-fail',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveResult: 'failure',
          conditions: ['prone'],
        }),
      );
    });

    it('calls addTargetResult on successful save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-add-success',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveResult: 'success',
          conditions: [],
        }),
      );
    });

    it('tracks concentration loss on failed save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-conc-fail',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      const concKey = '_sleetStorm_concentration_TestWizard';
      const concCall = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === concKey,
      );
      expect(concCall).toBeDefined();
      expect(concCall[2]).toContain('Goblin');
    });

    it('does not track concentration loss on successful save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-conc-success',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      const concKey = '_sleetStorm_concentration_TestWizard';
      const concCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        (c) => c[1] === concKey,
      );
      expect(concCalls.length).toBe(0);
    });

    it('posts save_result log entry on failed save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-sr-fail',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      const saveResultCall = logService.addEntry.mock.calls.find(
        (c) => c[1].type === 'save_result',
      );
      expect(saveResultCall).toBeDefined();
      expect(saveResultCall[1]).toEqual(
        expect.objectContaining({
          type: 'save_result',
          targetName: 'Goblin',
          success: false,
          saveDc: 15,
          saveType: 'DEX',
          rollType: 'save-sleet-storm',
        }),
      );
    });

    it('posts save_result log entry on successful save', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-sr-success',
        promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

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
        }),
      );
    });

    it('includes promptId in ability_use entry', async () => {
      setupBaseSave();
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'sleet-area-prompt-id',
        promise: Promise.resolve({ success: false }),
      });

      await processSleetStormAreaSave(casterName, 'Goblin', campaignName, mapName);

      const abilityEntry = logService.addEntry.mock.calls.find(
        (c) => c[1].type === 'ability_use',
      );
      expect(abilityEntry[1].promptId).toBe('sleet-area-prompt-id');
    });
  });
});

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

vi.mock('../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(() => Promise.resolve()),
  computeDamageAfterSave: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle, isPrismaticSprayBlocked } from './prismaticSprayHandler.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as logService from '../../../ui/logService.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as damageRollback from '../../common/damageRollback.js';
import * as diceRoller from '../../../dice/diceRoller.js';
import * as applyDamage from '../../../rules/combat/applyDamage.js';

// ── Constants & Helpers ────────────────────────────────────────

const campaignName = 'TestCampaign';
const casterName = 'TestWizard';

function makePlayerStats(overrides = {}) {
  return {
    name: casterName,
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Prismatic Spray',
    automation: {
      type: 'prismatic_spray',
      saveType: 'DEX',
      saveDc: 15,
      damage: '10d6',
      ...automation,
    },
  };
}

const baseCombatContext = {
  creatures: [
    { name: 'Goblin', type: 'monster', weaknessesAndResistivities: { immunities: [] } },
    { name: 'Orc', type: 'monster', weaknessesAndResistivities: { immunities: [] } },
    { name: 'Dragon', type: 'monster', weaknessesAndResistivities: { immunities: ['fire'] } },
    { name: casterName, gridX: 5, gridY: 10 },
  ],
  players: [{ name: casterName, gridX: 5, gridY: 10 }],
  placedItems: [],
};

function failSaveListener() {
  return {
    promptId: 'prismatic-prompt',
    promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
  };
}

function successSaveListener() {
  return {
    promptId: 'prismatic-prompt',
    promise: Promise.resolve({ success: true, roll: 14, total: 14 }),
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('prismaticSprayHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeState.getRuntimeValue.mockReturnValue(null);
  });

  describe('combat context validation', () => {
    it('returns popup when no combat context exists', async () => {
      damageUtils.getCombatContext.mockResolvedValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
      expect(result.payload.description).toContain('Prismatic Spray has no effect');
    });

    it('returns popup when combat context has no creatures', async () => {
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures in combat');
    });

    it('returns popup when combat context creatures is undefined', async () => {
      damageUtils.getCombatContext.mockResolvedValue({});

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures in combat');
    });
  });

  describe('target selection', () => {
    it('excludes the caster from targets', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      // Control random to ensure Dragon is not skipped (roll 7 = Violet, not a damage ray)
      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet) for all targets
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      // Only 3 non-caster creatures
      const targetNames = savePrompt.createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('Orc');
      expect(targetNames).toContain('Dragon');
      expect(targetNames).not.toContain(casterName);
    });

    it('uses selected targets from metaCtx when provided', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(
        { ...makeAction(), metaCtx: { selectedTargets: ['Goblin', 'Orc'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      const targetNames = savePrompt.createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('Orc');
      expect(targetNames).not.toContain('Dragon');
    });

    it('returns popup when selected targets are empty', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);

      const result = await handle(
        { ...makeAction(), metaCtx: { selectedTargets: [] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      // Empty selectedTargets falls through to combat context targets (non-caster creatures)
      expect(result.payload.description).toContain('creature(s)');
    });

    it('returns popup when no non-caster creatures exist', async () => {
      const onlyPlayerContext = {
        creatures: [{ name: casterName, gridX: 5, gridY: 10 }],
        players: [{ name: casterName, gridX: 5, gridY: 10 }],
        placedItems: [],
      };
      damageUtils.getCombatContext.mockResolvedValue(onlyPlayerContext);
      savePrompt.buildSaveDc.mockReturnValue(15);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures selected');
      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
    });
  });

  describe('storeSpellLastAttack', () => {
    it('calls storeSpellLastAttack with correct parameters', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
        casterName,
        spellName: 'Prismatic Spray',
        saveType: 'DEX',
        saveDc: 15,
        attackScope: 'aoe',
      });
    });
  });

  describe('ray rolling', () => {
    it('calls createSaveListener for each target with a single ray roll (1-7)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0.3; // firstRoll = 3 for all targets (Yellow)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      // 3 targets, each gets 1 save listener call for a single ray
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(3);
    });

    it('handles the 8 roll which triggers two rays for a target', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      // Force firstRoll === 8 for first target by mocking Math.random
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        callCount++;
        if (callCount === 1) return 7 / 8; // firstRoll = 8 (first target)
        if (callCount === 2) return 4 / 7; // secondRoll = 5 (Blue ray)
        return 0.3; // firstRoll = 3 for other targets
      };

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      // First target gets 2 save listeners (two rays), others get 1 each = 4 total
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(4);
    });
  });

  describe('damage ray handling (rays 1-5)', () => {
    it('creates DEX save listener for fire ray (Red)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      // Force Red ray (roll 1)
      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveType: 'DEX',
          saveDc: 15,
          dcSuccess: 'half',
          damageFormula: '10d6',
          damageType: 'fire',
        }),
      );
    });

    it('creates DEX save listener for acid ray (Orange)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 1 / 8; // firstRoll = 2
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          damageType: 'acid',
          dcSuccess: 'half',
        }),
      );
    });

    it('creates DEX save listener for lightning ray (Yellow)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 2 / 8; // firstRoll = 3
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          damageType: 'lightning',
          dcSuccess: 'half',
        }),
      );
    });

    it('creates DEX save listener for poison ray (Green)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 3 / 8; // firstRoll = 4
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          damageType: 'poison',
          dcSuccess: 'half',
        }),
      );
    });

    it('creates DEX save listener for cold ray (Blue)', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 4 / 8; // firstRoll = 5
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          damageType: 'cold',
          dcSuccess: 'half',
        }),
      );
    });
  });

  describe('indigo ray handling (ray 6)', () => {
    it('creates DEX save listener with dcSuccess none for indigo ray', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          saveType: 'DEX',
          saveDc: 15,
          dcSuccess: 'none',
        }),
      );
    });

    it('applies Restrained condition on failed save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['restrained']),
        campaignName,
      );
    });

    it('deduplicates Restrained if already present', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue(['restrained', 'blinded']);
      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const conditionsArg = useRuntimeState.setRuntimeValue.mock.calls.find(
        c => c[1] === 'activeConditions' && c[0] === 'Goblin',
      )[2];
      expect(conditionsArg.filter(c => String(c).toLowerCase() === 'restrained').length).toBe(1);
    });

    it('stores condition metadata with DC and ability con', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'activeConditionMeta') return {};
        return null;
      });
      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditionMeta',
        expect.objectContaining({
          restrained: expect.objectContaining({
            dc: 15,
            ability: 'con',
          }),
        }),
        campaignName,
      );
    });

    it('registers prismatic_spray_indigo targetEffect', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        callCount++;
        if (callCount === 1) return 5 / 8; // firstRoll = 6 (Indigo) for Goblin
        return 0.3; // firstRoll = 3 for other targets
      };
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const effectCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        c => c[1] === 'targetEffects',
      );
      expect(effectCalls.length).toBeGreaterThan(0);
      const effects = effectCalls[effectCalls.length - 1][2];
      const indigoEffect = effects.find(e => e.effect === 'prismatic_spray_indigo');
      expect(indigoEffect).toBeDefined();
      expect(indigoEffect.target).toBe('Goblin');
      expect(indigoEffect.source).toBe(casterName);
      expect(indigoEffect.dc).toBe(15);
    });

    it('updates existing prismatic_spray_indigo effect entry', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      // Set up getRuntimeValue to return existing effects for targetEffects key
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce([
          { target: 'Goblin', effect: 'prismatic_spray_indigo', source: 'OldCaster', dc: 12 },
        ])
        .mockReturnValue(null);
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        callCount++;
        if (callCount === 1) return 5 / 8; // firstRoll = 6 (Indigo) for Goblin
        return 0.3; // firstRoll = 3 for other targets
      };
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const effectCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        c => c[1] === 'targetEffects',
      );
      const effects = effectCalls[effectCalls.length - 1][2];
      const indigoEffect = effects.find(e => e.target === 'Goblin' && e.effect === 'prismatic_spray_indigo');
      expect(indigoEffect.source).toBe(casterName);
      expect(indigoEffect.dc).toBe(15);
    });

    it('sets up recurring save tracking with successes/failures counters', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const trackingCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        c => c[1]?.startsWith('_prismaticSprayIndigo_'),
      );
      expect(trackingCalls.length).toBeGreaterThan(0);
      const trackingData = trackingCalls[trackingCalls.length - 1][2];
      expect(trackingData.successes).toBe(0);
      expect(trackingData.failures).toBe(0);
      expect(trackingData.dc).toBe(15);
      expect(trackingData.casterName).toBe(casterName);
    });

    it('adds expirations for condition and targetEffect removal', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        casterName,
        'Goblin',
        expect.arrayContaining([
          expect.objectContaining({ type: 'condition', condition: 'restrained' }),
          expect.objectContaining({
            type: 'remove_target_effect',
            effectKey: 'prismatic_spray_indigo',
            target: 'Goblin',
            source: casterName,
          }),
        ]),
        campaignName,
      );
    });

    it('posts condition log entry for Restrained', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'condition',
          action: 'applied',
          characterName: 'Goblin',
          condition: 'Restrained',
          reason: 'Prismatic Spray (Indigo ray)',
        }),
      );
    });
  });

  describe('violet ray handling (ray 7)', () => {
    it('creates DEX save listener with dcSuccess none for violet ray', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          saveType: 'DEX',
          saveDc: 15,
          dcSuccess: 'none',
        }),
      );
    });

    it('applies Blinded condition on failed save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.arrayContaining(['blinded']),
        campaignName,
      );
    });

    it('deduplicates Blinded if already present', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue(['blinded', 'restrained']);
      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const conditionsArg = useRuntimeState.setRuntimeValue.mock.calls.find(
        c => c[1] === 'activeConditions' && c[0] === 'Goblin',
      )[2];
      expect(conditionsArg.filter(c => String(c).toLowerCase() === 'blinded').length).toBe(1);
    });

    it('registers prismatic_spray_violet targetEffect', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        callCount++;
        if (callCount === 1) return 6 / 8; // firstRoll = 7 (Violet) for Goblin
        return 0.3; // firstRoll = 3 for other targets
      };
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const effectCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        c => c[1] === 'targetEffects',
      );
      const effects = effectCalls[effectCalls.length - 1][2];
      const violetEffect = effects.find(e => e.effect === 'prismatic_spray_violet');
      expect(violetEffect).toBeDefined();
      expect(violetEffect.target).toBe('Goblin');
      expect(violetEffect.source).toBe(casterName);
    });

    it('sets up violet tracking with blindedAt timestamp', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const trackingCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
        c => c[1]?.startsWith('_prismaticSprayViolet_'),
      );
      expect(trackingCalls.length).toBeGreaterThan(0);
      const trackingData = trackingCalls[trackingCalls.length - 1][2];
      expect(trackingData.casterName).toBe(casterName);
      expect(trackingData.dc).toBe(15);
      expect(trackingData.blindedAt).toBeDefined();
      expect(typeof trackingData.blindedAt).toBe('number');
    });

    it('adds expirations for condition and targetEffect removal', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        casterName,
        'Goblin',
        expect.arrayContaining([
          expect.objectContaining({ type: 'condition', condition: 'blinded' }),
          expect.objectContaining({
            type: 'remove_target_effect',
            effectKey: 'prismatic_spray_violet',
            target: 'Goblin',
            source: casterName,
          }),
        ]),
        campaignName,
      );
    });

    it('posts condition log entry for Blinded', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'condition',
          action: 'applied',
          characterName: 'Goblin',
          condition: 'Blinded',
          reason: 'Prismatic Spray (Violet ray)',
        }),
      );
    });
  });

  describe('immunity handling for damage rays', () => {
    it('skips save for targets immune to the damage type', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);

      // Force Red ray (fire) which Dragon is immune to
      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      // Dragon should be skipped, only Goblin and Orc get save listeners
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(2);
      const targetNames = savePrompt.createSaveListener.mock.calls.map(c => c[1].targetName);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('Orc');
      expect(targetNames).not.toContain('Dragon');
    });

    it('includes immunity message in results summary', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      expect(result.payload.description).toContain('immune');
      expect(result.payload.description).toContain('Fire immunity');
    });

    it('handles case-insensitive immunity check', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'monster', weaknessesAndResistivities: { immunities: ['FIRE'] } },
          { name: casterName, gridX: 5, gridY: 10 },
        ],
      });
      savePrompt.buildSaveDc.mockReturnValue(15);

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      // Goblin should be skipped
      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
    });

    it('counts immune targets in summary', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      expect(result.payload.description).toContain('1 ray(s) immune');
    });
  });

  describe('disadvantage handling', () => {
    it('applies disadvantage when target is heightenTarget', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(
        { ...makeAction(), metaCtx: { selectedTargets: ['Goblin'], heightenTarget: 'Goblin' } },
        makePlayerStats(),
        campaignName,
        null,
      );
      Math.random = originalRandom;

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
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(
        { ...makeAction(), metaCtx: { selectedTargets: ['Goblin'], heightenTarget: 'Orc' } },
        makePlayerStats(),
        campaignName,
        null,
      );
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          disadvantage: false,
        }),
      );
    });
  });

  describe('on successful save', () => {
    it('posts save_result entry with success=true', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const saveResultCall = logService.addEntry.mock.calls.find(
        c => c[1].type === 'save_result',
      );
      expect(saveResultCall).toBeDefined();
      expect(saveResultCall[1]).toEqual(
        expect.objectContaining({
          type: 'save_result',
          targetName: 'Goblin',
          success: true,
          saveDc: 15,
          saveType: 'DEX',
          rollType: 'save-prismatic-spray',
        }),
      );
    });

    it('calls addTargetResult with success', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

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

    it('applies half damage for damage rays on successful save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(15); // half of 30
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(applyDamage.applyDamageToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Goblin',
        15,
        ['fire'],
        campaignName,
        expect.any(Array),
        false,
        casterName,
      );
    });

    it('does not apply half damage when rollExpression returns null', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue(null);
      applyDamage.computeDamageAfterSave.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
    });

    it('does not apply damage when half damage is 0', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 1 });
      applyDamage.computeDamageAfterSave.mockReturnValue(0); // floor(1/2) = 0
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
    });

    it('does not apply conditions on successful save for damage rays', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
        'Goblin',
        'activeConditions',
        expect.anything(),
        campaignName,
      );
    });
  });

  describe('on failed save for damage rays', () => {
    it('posts save_result entry with success=false', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const saveResultCall = logService.addEntry.mock.calls.find(
        c => c[1].type === 'save_result',
      );
      expect(saveResultCall).toBeDefined();
      expect(saveResultCall[1]).toEqual(
        expect.objectContaining({
          type: 'save_result',
          targetName: 'Goblin',
          success: false,
          saveDc: 15,
          saveType: 'DEX',
          rollType: 'save-prismatic-spray',
        }),
      );
    });

    it('applies full damage for damage rays on failed save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(applyDamage.applyDamageToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Goblin',
        30,
        ['fire'],
        campaignName,
        expect.any(Array),
        false,
        casterName,
      );
    });

    it('does not apply damage when full damage is 0', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 0 });
      applyDamage.computeDamageAfterSave.mockReturnValue(0);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
    });

    it('calls addTargetResult with failure', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(damageRollback.addTargetResult).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          targetName: 'Goblin',
          saveResult: 'failure',
          roll: 5,
          total: 5,
        }),
      );
    });
  });

  describe('ability_use log entries', () => {
    it('posts ability_use entry for each target on each ray', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0.3; // firstRoll = 3 (Yellow/lightning) for all targets - damage rays
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const abilityEntries = logService.addEntry.mock.calls.filter(
        c => c[1].type === 'ability_use',
      );
      expect(abilityEntries.length).toBe(3);
      abilityEntries.forEach(entry => {
        expect(entry[1]).toEqual(
          expect.objectContaining({
            type: 'ability_use',
            characterName: casterName,
            abilityName: 'Prismatic Spray',
          }),
        );
      });
    });

    it('includes promptId in ability_use entry', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'prismatic-test-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 5 }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      const abilityEntry = logService.addEntry.mock.calls.find(
        c => c[1].type === 'ability_use',
      );
      expect(abilityEntry[1].promptId).toBe('prismatic-test-prompt');
    });

    it('includes roll description in log for damage rays', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const abilityEntry = logService.addEntry.mock.calls.find(
        c => c[1].type === 'ability_use',
      );
      expect(abilityEntry[1].description).toContain('Red ray');
      expect(abilityEntry[1].description).toContain('rolled 1');
    });

    it('includes roll description in log for indigo ray', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 5 / 8; // firstRoll = 6 (Indigo)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const abilityEntry = logService.addEntry.mock.calls.find(
        c => c[1].type === 'ability_use',
      );
      expect(abilityEntry[1].description).toContain('Indigo ray');
      expect(abilityEntry[1].description).toContain('rolled 6');
    });

    it('includes roll description in log for violet ray', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 6 / 8; // firstRoll = 7 (Violet)
      await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      const abilityEntry = logService.addEntry.mock.calls.find(
        c => c[1].type === 'ability_use',
      );
      expect(abilityEntry[1].description).toContain('Violet ray');
      expect(abilityEntry[1].description).toContain('rolled 7');
    });
  });

  describe('summary popup', () => {
    it('reports affected creature count when some fail', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Prismatic Spray affects 3 creature(s)');
    });

    it('reports saved creature count in the summary', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(15);

      let callCount = 0;
      savePrompt.createSaveListener.mockImplementation(() => {
        callCount++;
        return {
          promptId: 'prismatic-prompt',
          promise: Promise.resolve({ success: callCount === 1 }),
        };
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('creature(s) saved');
    });

    it('reports no creatures affected when all save', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('No creatures affected by Prismatic Spray');
    });

    it('uses the action name in the popup payload', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(15);
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(
        { name: 'Custom Prismatic Spray', automation: makeAction().automation },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.name).toBe('Custom Prismatic Spray');
    });

    it('includes immune count in summary when applicable', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      savePrompt.createSaveListener.mockReturnValue(successSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      expect(result.payload.description).toContain('1 ray(s) immune');
    });

    it('includes individual ray results in summary', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red)
      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(result.payload.description).toContain('Red ray');
    });
  });

  describe('mixed results across targets', () => {
    it('processes all targets with mixed save results', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      savePrompt.createSaveListener
        .mockReturnValueOnce(failSaveListener())
        .mockReturnValueOnce(successSaveListener())
        .mockReturnValueOnce(failSaveListener());

      const result = await handle(
        { ...makeAction(), metaCtx: { selectedTargets: ['Goblin', 'Orc', 'Dragon'] } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.description).toContain('creature(s)');
      expect(result.payload.description).toContain('creature(s) saved');
    });

    it('handles mixed immunity and non-immunity with save results', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      // Force Red ray (fire) which Dragon is immune to
      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)

      savePrompt.createSaveListener
        .mockReturnValueOnce(failSaveListener())
        .mockReturnValueOnce(failSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      Math.random = originalRandom;

      expect(result.payload.description).toContain('1 ray(s) immune');
      expect(result.payload.description).toContain('creature(s)');
      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('handles single non-caster target', async () => {
      const singleTargetContext = {
        creatures: [
          { name: 'Goblin', type: 'monster', weaknessesAndResistivities: { immunities: [] } },
          { name: casterName, gridX: 5, gridY: 10 },
        ],
        players: [{ name: casterName, gridX: 5, gridY: 10 }],
        placedItems: [],
      };
      damageUtils.getCombatContext.mockResolvedValue(singleTargetContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(savePrompt.createSaveListener).toHaveBeenCalledTimes(1);
      expect(result.payload.description).toContain('Prismatic Spray affects 1 creature(s)');
    });

    it('handles empty automation object', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const result = await handle(
        { name: 'Prismatic Spray', automation: {} },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(damageRollback.storeSpellLastAttack).toHaveBeenCalled();
    });

    it('handles playerStats with no proficiency', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const ps = makePlayerStats({ proficiency: 0, abilities: [] });
      const result = await handle(makeAction(), ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(savePrompt.buildSaveDc).toHaveBeenCalledWith(makeAction().automation, ps);
    });

    it('uses custom damage formula from automation', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 40 });
      applyDamage.computeDamageAfterSave.mockReturnValue(40);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      await handle(
        { ...makeAction(), automation: { damage: '12d6' } },
        makePlayerStats(),
        campaignName,
        null,
      );
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          damageFormula: '12d6',
        }),
      );
    });

    it('falls back to 10d6 when damage is not in automation', async () => {
      damageUtils.getCombatContext.mockResolvedValue(baseCombatContext);
      savePrompt.buildSaveDc.mockReturnValue(15);
      diceRoller.rollExpression.mockReturnValue({ total: 30 });
      applyDamage.computeDamageAfterSave.mockReturnValue(30);
      savePrompt.createSaveListener.mockReturnValue(failSaveListener());

      const originalRandom = Math.random;
      Math.random = () => 0; // firstRoll = 1 (Red/Fire)
      const action = { name: 'Prismatic Spray', automation: { type: 'prismatic_spray', saveType: 'DEX', saveDc: 15 } };
      await handle(action, makePlayerStats(), campaignName, null);
      Math.random = originalRandom;

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          damageFormula: '10d6',
        }),
      );
    });
  });
});

// ── Tests: isPrismaticSprayBlocked ─────────────────────────────

describe('prismaticSprayHandler.isPrismaticSprayBlocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when neither has effects', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(false);
  });

  it('returns true when only attacker has an effect', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'prismatic_spray_indigo', source: 'TestWizard' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(true);
  });

  it('returns true when only target has an effect', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Orc', effect: 'prismatic_spray_violet', source: 'TestWizard' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(true);
  });

  it('returns false when both have effects from the same caster', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'prismatic_spray_indigo', source: 'TestWizard' },
      { target: 'Orc', effect: 'prismatic_spray_violet', source: 'TestWizard' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(false);
  });

  it('returns true when both have effects from different casters', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'prismatic_spray_indigo', source: 'CasterA' },
      { target: 'Orc', effect: 'prismatic_spray_violet', source: 'CasterB' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(true);
  });

  it('only considers prismatic_spray_indigo and prismatic_spray_violet effects', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'fear_end_on_los', source: 'TestWizard' },
      { target: 'Orc', effect: 'hypno_charm', source: 'TestWizard' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(false);
  });

  it('handles missing attackerName or targetName', async () => {
    expect(isPrismaticSprayBlocked(null, 'Orc', campaignName)).toBe(false);
    expect(isPrismaticSprayBlocked('Goblin', null, campaignName)).toBe(false);
    expect(isPrismaticSprayBlocked('', 'Orc', campaignName)).toBe(false);
    expect(isPrismaticSprayBlocked('Goblin', '', campaignName)).toBe(false);
  });

  it('handles empty targetEffects array', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(false);
  });

  it('handles null targetEffects', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(null);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    expect(result).toBe(false);
  });

  it('checks both attacker and target for effects', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'prismatic_spray_indigo', source: 'TestWizard' },
      { target: 'Goblin', effect: 'prismatic_spray_violet', source: 'OtherWizard' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    // Goblin has effects, Orc doesn't -> blocked
    expect(result).toBe(true);
  });

  it('checks shared caster when both have multiple effects', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue([
      { target: 'Goblin', effect: 'prismatic_spray_indigo', source: 'CasterA' },
      { target: 'Goblin', effect: 'prismatic_spray_violet', source: 'CasterB' },
      { target: 'Orc', effect: 'prismatic_spray_indigo', source: 'CasterB' },
    ]);

    const result = isPrismaticSprayBlocked('Goblin', 'Orc', campaignName);

    // Both have effects from CasterB -> not blocked
    expect(result).toBe(false);
  });
});

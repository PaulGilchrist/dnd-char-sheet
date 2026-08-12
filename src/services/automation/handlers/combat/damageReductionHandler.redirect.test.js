import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(),
  resolveDiceExpression: vi.fn((expr) => expr),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../common/damageRollback.js', () => ({
  findLastAttack: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../common/savePrompt.js', () => ({
  createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
  computeDamageAfterSave: vi.fn((damage, _success) => damage),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './damageReductionHandler.js';
import * as automationService from '../../../combat/automation/automationService.js';
import * as logService from '../../../ui/logService.js';
import * as damageRollback from '../../common/damageRollback.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as applyHealing from '../../../rules/combat/applyHealing.js';
import * as diceRoller from '../../../dice/diceRoller.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as applyDamage from '../../../rules/combat/applyDamage.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';

function makeMonkPlayerStats(overrides = {}) {
  return {
    name: 'MonkHero',
    level: 5,
    proficiency: 3,
    abilities: [{ name: 'Dexterity', bonus: 2 }],
    class: {
      class_levels: [
        { class: 'Monk', name: 'Monk', level: 5 },
        { class: 'Rogue', name: 'Rogue', level: 1 },
      ],
    },
    inventory: { equipped: ['Shield'] },
    equipment: [{ name: 'Shield', armor_category: 'Shield' }],
    computedStats: { currentHp: 30, maxHp: 50 },
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Deflect Attacks',
    automation: {
      type: 'damage_reduction',
      ...automation,
    },
  };
}

function setupBaseMocks() {
  automationService.evaluateAutoExpression.mockReturnValue(20);
  diceRoller.rollExpression.mockReturnValue({ total: 20, rolls: [20] });
  logService.addEntry.mockResolvedValue({});
  damageRollback.findLastAttack.mockResolvedValue({
    attackEvent: { targetName: 'MonkHero' },
    targetName: 'MonkHero',
    totalDamage: 10,
    damageTypes: ['Slashing'],
  });
  damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
  applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 10 });
  runtimeState.getRuntimeValue.mockReturnValue(3);
}

// ── Tests ──────────────────────────────────────────────────────

describe('damageReductionHandler - redirect flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupBaseMocks();
  });

  describe('redirect when damage reduced to 0', () => {
    it('returns modal when damage is fully reduced and redirect is defined', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6 + DEX modifier',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('deflectRedirect');
      expect(result.payload.title).toContain('Redirect Force');
      expect(result.payload.confirmLabel).toBe('Redirect Force');
    });

    it('uses default redirect damage expression when none specified', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.featureDescription).toContain('2 × 4-sided die');
    });

    it('uses custom saveDc when provided', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        saveDc: 17,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.featureDescription).toContain('DC 17');
    });

    it('includes creature targets in modal payload', async () => {
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 },
          { name: 'MonkHero', type: 'player', currentHp: 30, maxHp: 50 },
        ],
      });
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.targets).toHaveLength(2);
      expect(result.payload.targets[0].name).toBe('Goblin');
    });
  });

  describe('redirect - insufficient focus points', () => {
    it('returns popup when player lacks required focus points', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(0);
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 2, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('You need 2 focus points');
      expect(result.payload.description).toContain('You only have 0');
    });
  });

  describe('redirect - no creatures available', () => {
    it('returns popup when combat context has no creatures', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures available to redirect force to');
    });

    it('returns popup when combat context is null', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue(null);
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No creatures available to redirect force to');
    });
  });

  describe('redirect - onTargetSelected callback', () => {
    it('calls executeRedirect when target is selected', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6 + DEX modifier',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      // Trigger the onTargetSelected callback
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.applyDamageToTarget).toHaveBeenCalled();
      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          abilityName: 'Deflect Attacks',
        }),
      );
    });

    it('handles save failure - applies full damage', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: false }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6 + DEX modifier',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.computeDamageAfterSave).toHaveBeenCalledWith(
        expect.anything(),
        false,
        null,
      );
    });

    it('handles save success - applies reduced damage', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(5);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6 + DEX modifier',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.computeDamageAfterSave).toHaveBeenCalledWith(
        expect.anything(),
        true,
        null,
      );
    });

    it('does not apply damage when damageOnSave is 0', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(0);

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6 + DEX modifier',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
    });

    it('handles null targetName gracefully', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected(null);

      expect(savePrompt.createSaveListener).not.toHaveBeenCalled();
      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
    });
  });

  describe('redirect - onSkip callback', () => {
    it('logs when player skips redirect', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onSkip();

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          description: expect.stringContaining('chose not to redirect force'),
        }),
      );
    });
  });

  describe('redirect - resource cost deduction', () => {
    it('deducts focus points from runtime state', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(3);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'MonkHero',
        'focus_points',
        2,
        campaignName,
      );
    });
  });

  describe('redirect - damage calculation', () => {
    it('uses evaluated numeric result for redirect damage', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      automationService.evaluateAutoExpression
        .mockReturnValueOnce(20)
        .mockReturnValue(12);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(12);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '12',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.applyDamageToTarget).toHaveBeenCalledWith(
        expect.anything(),
        'Goblin',
        12,
        ['Force'],
        campaignName,
        expect.anything(),
        false,
        'MonkHero',
      );
    });

    it('uses dice roll result for redirect damage', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      automationService.evaluateAutoExpression
        .mockReturnValueOnce(20)
        .mockReturnValue('2d6');
      diceRoller.rollExpression.mockReturnValue({ total: 8, rolls: [3, 5] });
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(8);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.applyDamageToTarget).toHaveBeenCalledWith(
        expect.anything(),
        'Goblin',
        8,
        ['Force'],
        campaignName,
        expect.anything(),
        false,
        'MonkHero',
      );
    });

    it('handles failed dice roll with zero damage', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      automationService.evaluateAutoExpression
        .mockReturnValueOnce(20)
        .mockReturnValue('2d6');
      diceRoller.rollExpression.mockReturnValue(null);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectDamage: '2d6',
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(applyDamage.applyDamageToTarget).not.toHaveBeenCalled();
    });
  });

  describe('redirect - save listener setup', () => {
    it('creates save listener with correct parameters', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(savePrompt.createSaveListener).toHaveBeenCalledWith(campaignName, {
        targetName: 'Goblin',
        saveType: 'DEX',
        saveDc: expect.any(Number),
        actionName: 'Deflect Attacks',
      });
    });
  });

  describe('redirect - log entry format', () => {
    it('logs ability_use with save result details', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: false }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'MonkHero',
          abilityName: 'Deflect Attacks',
          targetName: 'Goblin',
          description: expect.stringContaining('redirected force to Goblin'),
        }),
      );
    });
  });

  describe('redirect - log entry error handling', () => {
    it('does not throw when log entry rejects during redirect', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      const testError = new Error('log save failed');
      logService.addEntry.mockRejectedValue(testError);

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onTargetSelected('Goblin');

      expect(result.type).toBe('modal');
    });
  });

  describe('redirect - onSkip error handling', () => {
    it('does not throw when onSkip log entry rejects', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      const testError = new Error('log save failed');
      logService.addEntry.mockRejectedValue(testError);

      const ps = makeMonkPlayerStats();
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);
      await result.payload.onSkip();

      expect(result.type).toBe('modal');
    });
  });

  describe('redirect - getMonkLevel edge cases', () => {
    it('handles playerStats with no class_levels', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(1);
      damageUtils.getCombatContext.mockResolvedValue({
        creatures: [{ name: 'Goblin', type: 'enemy', currentHp: 7, maxHp: 7 }],
      });
      savePrompt.createSaveListener.mockReturnValue({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: true }),
      });
      applyDamage.computeDamageAfterSave.mockReturnValue(10);
      applyDamage.applyDamageToTarget.mockResolvedValue({});

      const ps = makeMonkPlayerStats({ class: {} });
      const action = makeAction({
        reductionExpression: '2d10',
        redirect: true,
        redirectCost: { amount: 1, resource: 'focus_points' },
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('modal');
      await result.payload.onTargetSelected('Goblin');
      expect(applyDamage.applyDamageToTarget).toHaveBeenCalled();
    });
  });
});

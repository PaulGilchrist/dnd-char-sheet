// @cleaned-by-ai
// @improved-by-ai
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

// ── Imports ────────────────────────────────────────────────────

import { handle } from './damageReductionHandler.js';
import * as automationService from '../../../combat/automation/automationService.js';
import * as logService from '../../../ui/logService.js';
import * as damageRollback from '../../common/damageRollback.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as applyHealing from '../../../rules/combat/applyHealing.js';
import * as diceRoller from '../../../dice/diceRoller.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestHero',
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Defensive Reaction',
    automation: {
      type: 'damage_reduction',
      ...automation,
    },
  };
}

function setupMocks() {
  automationService.evaluateAutoExpression.mockReturnValue(5);
  diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
  logService.addEntry.mockResolvedValue({});
  damageRollback.findLastAttack.mockResolvedValue({
    attackEvent: { targetName: 'TestHero' },
    targetName: 'TestHero',
    totalDamage: 10,
    damageTypes: ['Slashing'],
  });
  damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
  applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 5 });
}

// ── Tests ──────────────────────────────────────────────────────

describe('damageReductionHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupMocks();
  });

  // ── Shield requirement ──────────────────────────────────────

  describe('requiresShield', () => {
    it('returns popup with shield message when player has no shield', async () => {
      const ps = makePlayerStats({ inventory: { equipped: [] } });
      const action = makeAction({ requiresShield: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('holding a Shield');
      expect(result.payload.automation).toBe(action.automation);
      expect(result.payload.automationType).toBe('damage_reduction');
    });

    it('proceeds when player has a shield equipped', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { targetName: 'TestHero' },
        targetName: 'TestHero',
        totalDamage: 10,
        damageTypes: ['Slashing'],
      });
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      const action = makeAction({ requiresShield: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Reduce damage by');
    });

    it('proceeds when player has a magic shield equipped', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { targetName: 'TestHero' },
        targetName: 'TestHero',
        totalDamage: 10,
        damageTypes: ['Slashing'],
      });
      const ps = makePlayerStats({
        inventory: { equipped: ['+2 Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      const action = makeAction({ requiresShield: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Reduce damage by');
    });

    it('does not proceed when player only has a weapon (no shield)', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Longsword'] },
        equipment: [{ name: 'Longsword', equipment_category: 'Weapon' }],
      });
      const action = makeAction({ requiresShield: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('holding a Shield');
    });
  });

  // ── Shield or weapon requirement ────────────────────────────

  describe('requiresShieldOrWeapon', () => {
    it('returns popup when player has no shield or weapon', async () => {
      const ps = makePlayerStats({ inventory: { equipped: ['Leather Armor'] } });
      const action = makeAction({ requiresShieldOrWeapon: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('holding a Shield or a Simple or Martial weapon');
    });

    it('proceeds when player has a weapon equipped', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { targetName: 'TestHero' },
        targetName: 'TestHero',
        totalDamage: 10,
        damageTypes: ['Slashing'],
      });
      const ps = makePlayerStats({
        inventory: { equipped: ['Longsword'] },
        equipment: [{ name: 'Longsword', equipment_category: 'Weapon' }],
      });
      const action = makeAction({ requiresShieldOrWeapon: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Reduce damage by');
    });

    it('proceeds when player has a shield equipped', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { targetName: 'TestHero' },
        targetName: 'TestHero',
        totalDamage: 10,
        damageTypes: ['Slashing'],
      });
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      const action = makeAction({ requiresShieldOrWeapon: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Reduce damage by');
    });

    it('proceeds when player has a magic weapon equipped', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { targetName: 'TestHero' },
        targetName: 'TestHero',
        totalDamage: 10,
        damageTypes: ['Slashing'],
      });
      const ps = makePlayerStats({
        inventory: { equipped: ['+1 Longsword'] },
        equipment: [{ name: 'Longsword', equipment_category: 'Weapon' }],
      });
      const action = makeAction({ requiresShieldOrWeapon: true, reductionExpression: '2d6' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('Reduce damage by');
    });
  });

  // ── requiresShield checked before requiresShieldOrWeapon ────

  describe('requirement priority', () => {
    it('requiresShield blocks even when requiresShieldOrWeapon would pass', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Longsword'] },
        equipment: [{ name: 'Longsword', equipment_category: 'Weapon' }],
      });
      const action = makeAction({
        requiresShield: true,
        requiresShieldOrWeapon: true,
        reductionExpression: '2d6',
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('holding a Shield');
      expect(result.payload.description).not.toContain('Shield or a Simple or Martial weapon');
    });
  });

  // ── zero_on_success effect (Intervene Shield) ─────────────────────

  describe('zero_on_success effect (Intervene Shield)', () => {
    it('returns popup when player has no shield equipped', async () => {
      const ps = makePlayerStats({ inventory: { equipped: [] }, equipment: [] });
      const action = makeAction({
        effect: 'zero_on_success',
      });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('holding a Shield');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('returns popup when there is no lastAttack', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({ attackEvent: null });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No recent attack or saving throw found');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('returns popup when lastAttack is not a save', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { rollType: 'attack', targetName: 'TestHero' },
      });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('not a saving throw');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('returns popup when player was not the target of the save', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'Ally',
          saveType: 'DEX',
          saveResult: 'success',
          rawDamage: 10,
        },
      });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('not the target');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('returns popup when save was not DEX', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'CON',
          saveResult: 'success',
          rawDamage: 10,
        },
      });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('not a Dexterity save');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('returns popup when save did not succeed', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'DEX',
          saveResult: 'failure',
          rawDamage: 10,
        },
      });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('did not succeed');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('returns popup when no damage was dealt', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'DEX',
          saveResult: 'success',
          rawDamage: 0,
        },
      });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No damage was dealt');
      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('heals for half rawDamage when all conditions are met', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
        computedStats: { currentHp: 20, maxHp: 50 },
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'DEX',
          saveResult: 'success',
          rawDamage: 20,
          attackerName: 'Goblin',
        },
      });
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 10 });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('heal for 10 HP');
      expect(applyHealing.applyHealingToTarget).toHaveBeenCalledWith(
        expect.anything(),
        'TestHero',
        10,
        campaignName,
      );
      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'TestHero',
          abilityName: 'Defensive Reaction',
        }),
      );
      expect(logService.addEntry).toHaveBeenCalledWith(
        campaignName,
        expect.objectContaining({
          type: 'hp_change',
          targetName: 'TestHero',
          delta: 10,
          isHealing: true,
          abilityName: 'Defensive Reaction',
        }),
      );
    });

    it('uses primaryDamage as fallback when rawDamage is 0', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
        computedStats: { currentHp: 20, maxHp: 50 },
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'DEX',
          saveResult: 'success',
          rawDamage: 0,
          primaryDamage: 16,
          attackerName: 'Orc',
        },
      });
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 8 });
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('heal for 8 HP');
      expect(applyHealing.applyHealingToTarget).toHaveBeenCalledWith(
        expect.anything(),
        'TestHero',
        8,
        campaignName,
      );
    });

    it('does not heal when combat context is null', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'DEX',
          saveResult: 'success',
          rawDamage: 10,
          attackerName: 'Goblin',
        },
      });
      damageUtils.getCombatContext.mockResolvedValue(null);
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('heal for 0 HP');
      expect(applyHealing.applyHealingToTarget).not.toHaveBeenCalled();
    });

    it('does not throw when addEntry rejects (fire-and-forget logging)', async () => {
      const ps = makePlayerStats({
        inventory: { equipped: ['Shield'] },
        equipment: [{ name: 'Shield', armor_category: 'Shield' }],
      });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: {
          rollType: 'save',
          targetName: 'TestHero',
          saveType: 'DEX',
          saveResult: 'success',
          rawDamage: 10,
          attackerName: 'Goblin',
        },
      });
      damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
      const testError = new Error('log save failed');
      logService.addEntry.mockRejectedValue(testError);
      const action = makeAction({ effect: 'zero_on_success' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
    });
  });

  // ── Normal damage reduction ─────────────────────────────────

  describe('normal damage reduction', () => {
    it('evaluates reduction expression and returns popup with result', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(7);
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 7 });
      const ps = makePlayerStats();
      const action = makeAction({ reductionExpression: '2d6+1' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('2d6+1 = 7');
      expect(result.payload.automation).toBe(action.automation);
      expect(result.payload.automationType).toBe('damage_reduction');
    });

    it('includes roll details in popup', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(7);
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 7 });
      const ps = makePlayerStats();
      const action = makeAction({ reductionExpression: '2d6+1' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('2d6+1 = 7');
    });

    it('includes trigger text when auto.trigger is set', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(3);
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 3 });
      const ps = makePlayerStats();
      const action = makeAction({ reductionExpression: '1d4', trigger: 'When hit by an attack' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).toContain('Trigger: When hit by an attack');
    });

    it('omits trigger text when auto.trigger is not set', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(4);
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 4 });
      const ps = makePlayerStats();
      const action = makeAction({ reductionExpression: '1d4' });

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.description).not.toContain('Trigger:');
    });

    it('falls back to zero when evaluateAutoExpression returns non-number and rollExpression fails', async () => {
      const nonNumericValues = [null, undefined, ''];
      for (const nonNumericValue of nonNumericValues) {
        vi.resetAllMocks();
        setupMocks();
        automationService.evaluateAutoExpression.mockReturnValue(nonNumericValue);
        diceRoller.rollExpression.mockReturnValue(null);
        applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 0 });
        const ps = makePlayerStats();
        const action = makeAction({ reductionExpression: '2d6+1' });

        const result = await handle(action, ps, campaignName, null);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Deflect roll:</b> 0');
      }
    });

    it('adds log entry with ability_use type', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 5 });
      const ps = makePlayerStats();
      const action = makeAction({ reductionExpression: '2d4' });

      await handle(action, ps, campaignName, null);

      expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'TestHero',
        abilityName: 'Defensive Reaction',
        description: 'TestHero used Defensive Reaction to reduce damage by 2d4 = 5 (healed for 5 HP).',
      });
    });

    it('uses correct character and ability names in log entry', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(2);
      diceRoller.rollExpression.mockReturnValue({ total: 2, rolls: [2], modifier: 0 });
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 2 });
      damageRollback.findLastAttack.mockResolvedValue({
        attackEvent: { targetName: 'ElvenRogue' },
        targetName: 'ElvenRogue',
        totalDamage: 10,
        damageTypes: ['Slashing'],
      });
      const ps = makePlayerStats({ name: 'ElvenRogue' });
      const action = {
        name: 'Armor of Agathys',
        automation: { type: 'damage_reduction', reductionExpression: '1d4' },
      };

      await handle(action, ps, campaignName, null);

      expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'ability_use',
        characterName: 'ElvenRogue',
        abilityName: 'Armor of Agathys',
        description: 'ElvenRogue used Armor of Agathys to reduce damage by 1d4 = 2 (healed for 2 HP).',
      });
    });

    it('does not throw when addEntry rejects (fire-and-forget logging)', async () => {
      automationService.evaluateAutoExpression.mockReturnValue(5);
      applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 5 });
      const ps = makePlayerStats();
      const action = makeAction({ reductionExpression: '2d6' });
      const testError = new Error('log save failed');
      logService.addEntry.mockImplementation(() => Promise.reject(testError));

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
    });
  });
});

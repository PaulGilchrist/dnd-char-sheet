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
import * as damageRollback from '../../common/damageRollback.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';

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

// ── Tests ──────────────────────────────────────────────────────

describe('damageReductionHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
});

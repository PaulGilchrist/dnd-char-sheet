// CLA-315: Slow Fall — falling trigger gate + _Slow_Fall_usedRound reaction latch.
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
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as applyHealing from '../../../rules/combat/applyHealing.js';
import { addEntry } from '../../../ui/logService.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';
const LATCH_KEY = '_Slow_Fall_usedRound';

function makePlayerStats() {
  return { name: 'TestHero' };
}

function makeSlowFallAction() {
  return {
    name: 'Slow Fall',
    automation: {
      type: 'damage_reduction',
      reductionExpression: '5 * monk level',
      trigger: 'falling',
      reaction: true,
      casting_time: '1 reaction',
    },
  };
}

function makeFallingLastAttack() {
  return {
    attackEvent: { weaponType: 'melee', timestamp: 1000, trigger: 'falling' },
    targetName: 'TestHero',
    attackerName: 'Pit 1',
    totalDamage: 7,
    primaryDamage: 7,
    secondaryDamage: 0,
    damageTypes: ['bludgeoning'],
    trigger: 'falling',
  };
}

function makeMaceLastAttack() {
  return {
    attackEvent: { weaponType: 'melee', timestamp: 2000 },
    targetName: 'TestHero',
    attackerName: 'Thug 1',
    totalDamage: 7,
    primaryDamage: 7,
    secondaryDamage: 0,
    damageTypes: ['bludgeoning'],
  };
}

function armHappyPath(currentRound = 2) {
  automationService.evaluateAutoExpression.mockReturnValue(85);
  damageUtils.getCombatContext.mockResolvedValue({ round: currentRound, creatures: [] });
  applyHealing.applyHealingToTarget.mockResolvedValue({ actualHeal: 7 });
  runtimeState.getRuntimeValue.mockReturnValue(undefined);
}

// ── Tests ──────────────────────────────────────────────────────

describe('damageReductionHandler — CLA-315 Slow Fall', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
    addEntry.mockResolvedValue(undefined);
  });

  describe('falling trigger gate', () => {
    it('refuses a non-falling bludgeoning weapon attack with a "not falling" popup', async () => {
      armHappyPath();
      damageRollback.findLastAttack.mockResolvedValue(makeMaceLastAttack());

      const result = await handle(makeSlowFallAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.payload ?? result.payload).toBeDefined();
      expect(result.payload.description).toContain('You are not falling');
      expect(result.payload.description).not.toContain('Reduce damage by');
      expect(applyHealing.applyHealingToTarget).not.toHaveBeenCalled();
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
      expect(automationService.evaluateAutoExpression).not.toHaveBeenCalled();
    });

    it('logs the refusal to the campaign log without an ability_use application', async () => {
      armHappyPath();
      damageRollback.findLastAttack.mockResolvedValue(makeMaceLastAttack());

      await handle(makeSlowFallAction(), makePlayerStats(), campaignName, null);

      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'automation',
        characterName: 'TestHero',
        automationType: 'slow_fall_refused',
        name: 'Slow Fall',
      }));
      const loggedTypes = addEntry.mock.calls.map(c => c[1].type);
      expect(loggedTypes).not.toContain('ability_use');
      expect(loggedTypes).not.toContain('hp_change');
    });

    it('passes a synthesized falling lastAttack and applies the reduction', async () => {
      armHappyPath();
      damageRollback.findLastAttack.mockResolvedValue(makeFallingLastAttack());

      const result = await handle(makeSlowFallAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Reduce damage by');
      expect(applyHealing.applyHealingToTarget).toHaveBeenCalledWith(expect.any(Object), 'TestHero', 7, campaignName);
      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'ability_use',
        characterName: 'TestHero',
        abilityName: 'Slow Fall',
      }));
    });
  });

  describe('reaction round latch', () => {
    it('stamps _Slow_Fall_usedRound with the current round on a successful use', async () => {
      armHappyPath(2);
      damageRollback.findLastAttack.mockResolvedValue(makeFallingLastAttack());

      await handle(makeSlowFallAction(), makePlayerStats(), campaignName, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('TestHero', LATCH_KEY, 2, campaignName);
    });

    it('refuses a second use in the same round and does not heal', async () => {
      armHappyPath(2);
      damageRollback.findLastAttack.mockResolvedValue(makeFallingLastAttack());
      runtimeState.getRuntimeValue.mockImplementation((name, key) => (key === LATCH_KEY ? 2 : undefined));

      const result = await handle(makeSlowFallAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('already used Slow Fall this round');
      expect(applyHealing.applyHealingToTarget).not.toHaveBeenCalled();
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
      const loggedTypes = addEntry.mock.calls.map(c => c[1].type);
      expect(loggedTypes).not.toContain('ability_use');
      expect(loggedTypes).not.toContain('hp_change');
    });

    it('re-arms on a later round', async () => {
      armHappyPath(3);
      damageRollback.findLastAttack.mockResolvedValue(makeFallingLastAttack());
      runtimeState.getRuntimeValue.mockImplementation((name, key) => (key === LATCH_KEY ? 2 : undefined));

      const result = await handle(makeSlowFallAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Reduce damage by');
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('TestHero', LATCH_KEY, 3, campaignName);
    });
  });

  describe('existing trigger branches unregressed', () => {
    it('bludgeoning_piercing_slashing_damage still matches bludgeoning attacks', async () => {
      armHappyPath();
      damageRollback.findLastAttack.mockResolvedValue(makeMaceLastAttack());
      const action = {
        name: 'Deflect Attacks',
        automation: { type: 'damage_reduction', reductionExpression: '1d10 + DEX modifier + monk level', trigger: 'bludgeoning_piercing_slashing_damage' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Reduce damage by');
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith('TestHero', LATCH_KEY, expect.anything(), campaignName);
    });

    it('any_damage still matches when damage was dealt', async () => {
      armHappyPath();
      damageRollback.findLastAttack.mockResolvedValue({ ...makeMaceLastAttack(), damageTypes: ['Fire'] });
      const action = {
        name: 'Deflect Energy',
        automation: { type: 'damage_reduction', reductionExpression: '1d10 + DEX modifier + monk level', trigger: 'any_damage' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('Reduce damage by');
    });

    it('ranged_weapon_attack_hit still refuses melee attacks with the generic mismatch popup', async () => {
      armHappyPath();
      damageRollback.findLastAttack.mockResolvedValue(makeMaceLastAttack());
      const action = {
        name: 'Deflect Missiles',
        automation: { type: 'damage_reduction', reductionExpression: '1d10 + DEX modifier + monk level', trigger: 'ranged_weapon_attack_hit' },
      };

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.description).toContain('does not match the trigger condition');
      expect(result.payload.description).not.toContain('You are not falling');
    });
  });
});

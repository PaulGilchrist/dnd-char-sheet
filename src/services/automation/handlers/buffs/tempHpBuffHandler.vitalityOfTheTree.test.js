// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(),
}));

import { handle, confirmVitalityOfTheTree } from './tempHpBuffHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as automationService from '../../../combat/automation/automationService.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import { campaignName, makePlayerStats, makeAction } from './tempHpBuffTestHelpers.js';

function resetMocks() {
  useRuntimeState.getRuntimeValue.mockClear().mockReset();
  useRuntimeState.setRuntimeValue.mockClear().mockReset().mockResolvedValue(undefined);
  automationService.evaluateAutoExpression.mockClear().mockReset();
  logService.addEntry.mockClear().mockReset().mockResolvedValue({});
  damageUtils.getCombatContext.mockClear().mockReset();
  combatData.getCurrentCombatRound.mockClear().mockReset();
}

// ────────────────────────────────────────────────────────────────
// Route detection — handle delegates to Vitality of the Tree path
// ────────────────────────────────────────────────────────────────

describe('route detection', () => {
  it('delegates to Vitality handler when ongoingHealingExpression and healingStartOfTurn are set', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    automationService.evaluateAutoExpression.mockReturnValue(3);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
      healingRange: '10 ft',
    });
    const ps = makePlayerStats();

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('modal');
    expect(result.modalName).toBe('vitalityOfTheTreeTarget');
  });

  it('does NOT delegate when only ongoingHealingExpression is set without healingStartOfTurn', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: false,
    });
    const ps = makePlayerStats();

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('No temp HP expression defined');
  });

  it('does NOT delegate when only healingStartOfTurn is set without ongoingHealingExpression', async () => {
    const action = makeAction({
      ongoingHealingExpression: '',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats();

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('No temp HP expression defined');
  });
});

// ────────────────────────────────────────────────────────────────
// handleVitalityOfTheTree — same round as rage (no creatures)
// ────────────────────────────────────────────────────────────────

describe('same round as rage', () => {
  beforeEach(() => {
    resetMocks();
    automationService.evaluateAutoExpression.mockReturnValue(3);
  });

  it('returns popup when current round equals rage activation round', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(3);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('same round');
    expect(result.payload.description).toContain('Rage activated');
  });

  it('returns popup when rage round is in the future relative to current round', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    // Rage activated round 5, current round 3 → negative elapsed
    useRuntimeState.getRuntimeValue.mockReturnValue(5);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('same round');
  });
});

// ────────────────────────────────────────────────────────────────
// handleVitalityOfTheTree — modal payload
// ────────────────────────────────────────────────────────────────

describe('modal payload', () => {
  beforeEach(() => resetMocks());

  it('returns modal with creature targets from combat context', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
      healingRange: '10 ft',
    });
    const ps = makePlayerStats({ name: 'Barbarian1', level: 5 });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    automationService.evaluateAutoExpression.mockReturnValue(3);
    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Barbarian1' },
        { name: 'Ally1' },
        { name: 'Enemy1' },
      ],
    });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('modal');
    expect(result.modalName).toBe('vitalityOfTheTreeTarget');
    expect(result.payload.action).toBe(action);
    expect(result.payload.playerStats).toBe(ps);
    expect(result.payload.campaignName).toBe(campaignName);
    expect(result.payload.creatureTargets).toEqual([
      { name: 'Barbarian1' },
      { name: 'Ally1' },
      { name: 'Enemy1' },
    ]);
    expect(result.payload.tempHp).toBe(3);
    expect(result.payload.maxTargets).toBe(2);
  });

  it('returns empty creatureTargets when combat context has no creatures key', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    automationService.evaluateAutoExpression.mockReturnValue(3);
    damageUtils.getCombatContext.mockResolvedValue({});

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('modal');
    expect(result.payload.creatureTargets).toEqual([]);
  });

  it('returns empty creatureTargets when combat context is null', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    automationService.evaluateAutoExpression.mockReturnValue(3);
    damageUtils.getCombatContext.mockResolvedValue(null);

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('modal');
    expect(result.payload.creatureTargets).toEqual([]);
  });

  it('calculates maxTargets as roundsElapsed between current and rage round', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    // Rage activated round 1, current round 5 → 4 rounds elapsed → 4 targets
    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(5);
    automationService.evaluateAutoExpression.mockReturnValue(5);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('modal');
    expect(result.payload.maxTargets).toBe(4);
  });

  it('caps maxTargets at minimum of 1 when roundsElapsed is 0 or negative', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    // Rage activated round 3, current round 3 → 0 rounds elapsed
    useRuntimeState.getRuntimeValue.mockReturnValue(3);
    combatData.getCurrentCombatRound.mockReturnValue(3);
    automationService.evaluateAutoExpression.mockReturnValue(2);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('same round');
  });

  it('calculates temp HP from ongoingHealingExpression', async () => {
    const action = makeAction({
      ongoingHealingExpression: '2d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue(7);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.payload.tempHp).toBe(7);
  });

  it('returns popup when temp HP calculation yields a non-positive value', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'invalid_expr',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue(-1);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Could not calculate temp HP');
  });

  it('returns popup when temp HP calculation yields zero', async () => {
    const action = makeAction({
      ongoingHealingExpression: '0',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue(0);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Could not calculate temp HP');
  });

  it('includes the expression in the error message when calculation fails', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'bad_expression',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue(null);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.payload.description).toContain('bad_expression');
  });

  it('returns modal when evaluation yields a parseable dice string like 1d6', async () => {
    const action = makeAction({
      ongoingHealingExpression: '1d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue('1d6');
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    // rollDiceExpression parses '1d6' and rolls, returning 1-6
    expect(result.type).toBe('modal');
    expect(typeof result.payload.tempHp).toBe('number');
    expect(result.payload.tempHp).toBeGreaterThanOrEqual(1);
    expect(result.payload.tempHp).toBeLessThanOrEqual(6);
  });

  it('returns popup when evaluation yields an unparseable string', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'not_a_dice',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue('not_a_dice');
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Could not calculate temp HP');
  });

  it('includes action name and automationType in error popup', async () => {
    const action = makeAction({
      ongoingHealingExpression: 'bad',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    useRuntimeState.getRuntimeValue.mockReturnValue(1);
    combatData.getCurrentCombatRound.mockReturnValue(2);
    automationService.evaluateAutoExpression.mockReturnValue(-1);
    damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });

    const result = await handle(action, ps, campaignName);

    expect(result.payload.name).toBe('Second Wind');
    expect(result.payload.automationType).toBe('temp_hp_buff');
  });
});

// ────────────────────────────────────────────────────────────────
// confirmVitalityOfTheTree
// ────────────────────────────────────────────────────────────────

describe('confirmVitalityOfTheTree', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('applies temp HP to selected targets using max of existing', async () => {
    useRuntimeState.getRuntimeValue
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(5);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1', 'Ally2'],
      8,
      3,
    );

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('Ally1, Ally2');
    expect(result.payload.description).toContain('8 temporary hit points');

    const tempCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempCalls.length).toBe(2);
    expect(tempCalls[0][2]).toBe(8);
    expect(tempCalls[1][2]).toBe(8);
  });

  it('logs to campaign log with correct metadata', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1'],
      8,
      3,
    );

    expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
      type: 'ability_use',
      characterName: 'Barbarian1',
      abilityName: 'Second Wind',
      description: expect.stringContaining('Ally1'),
      timestamp: expect.any(Number),
    });
  });

  it('clamps targets to maxTargets', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1', 'Ally2', 'Ally3', 'Ally4'],
      8,
      2,
    );

    const tempCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempCalls.length).toBe(2);
    expect(tempCalls[0][0]).toBe('Ally1');
    expect(tempCalls[1][0]).toBe('Ally2');
  });

  it('handles empty selected targets array', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      [],
      8,
      3,
    );

    expect(result.payload.description).toContain('no targets selected');
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
  });

  it('handles null selected targets', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      null,
      8,
      3,
    );

    expect(result.payload.description).toContain('no targets selected');
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
  });

  it('handles undefined selected targets', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      undefined,
      8,
      3,
    );

    expect(result.payload.description).toContain('no targets selected');
  });

  it('includes target list in description for single target', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1'],
      5,
      3,
    );

    expect(result.payload.description).toContain('Ally1');
    expect(result.payload.description).toContain('5 temporary hit points');
  });

  it('includes target list in description for multiple targets', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1', 'Ally2'],
      5,
      3,
    );

    expect(result.payload.description).toContain('Ally1, Ally2');
    expect(result.payload.description).toContain('5 temporary hit points');
  });

  it('returns popup with automation_info type and correct metadata', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    const result = await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1'],
      8,
      3,
    );

    expect(result.payload.type).toBe('automation_info');
    expect(result.payload.name).toBe('Second Wind');
    expect(result.payload.automationType).toBe('temp_hp_buff');
  });

  it('only applies to first N targets when more are selected than maxTargets allows', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['First', 'Second', 'Third'],
      10,
      1,
    );

    const tempCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempCalls.length).toBe(1);
    expect(tempCalls[0][0]).toBe('First');
  });

  it('uses max of existing temp HP when existing is higher than granted amount', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValueOnce(15);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1'],
      8,
      3,
    );

    const tempCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempCalls[0][2]).toBe(15);
  });

  it('uses the new amount when it exceeds existing temp HP', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValueOnce(3);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['Ally1'],
      10,
      3,
    );

    const tempCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempCalls[0][2]).toBe(10);
  });

  it('defaults maxTargets to 999 when maxTargets param is falsy', async () => {
    useRuntimeState.getRuntimeValue.mockReturnValue(0);

    const action = makeAction({
      ongoingHealingExpression: 'rage_damage_d6',
      healingStartOfTurn: true,
    });
    const ps = makePlayerStats({ name: 'Barbarian1' });

    await confirmVitalityOfTheTree(
      action, ps, campaignName,
      ['A', 'B', 'C', 'D', 'E'],
      8,
      0,
    );

    const tempCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempCalls.length).toBe(5);
  });
});

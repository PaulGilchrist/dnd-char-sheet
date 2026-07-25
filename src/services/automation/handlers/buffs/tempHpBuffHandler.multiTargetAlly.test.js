// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../maps/mapsService.js', () => ({
  loadMapData: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
  getDistanceFeet: vi.fn(),
  rangeToFeet: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

import { handle, confirmBolsteringPerformance } from './tempHpBuffHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as automationService from '../../../combat/automation/automationService.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import { campaignName, makePlayerStats, resetMocks } from './tempHpBuffTestHelpers.js';

// ────────────────────────────────────────────────────────────────
// handleMultiTargetAllyTempHp — returns modal with creature targets
// ────────────────────────────────────────────────────────────────

describe('handleMultiTargetAllyTempHp', () => {
  beforeEach(() => resetMocks());

  it('returns a modal with temp HP amount and combat creature targets', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: {
        type: 'temp_hp_buff',
        tempHpExpression: 'level + 3',
        range: '30 ft',
        targets: 6,
        includesSelf: true,
        multiTargetAlly: true,
      },
    };
    const ps = makePlayerStats({ level: 5, name: 'Leader' });
    automationService.evaluateAutoExpression.mockReturnValue(8);

    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [
        { name: 'Leader' },
        { name: 'Ally1' },
        { name: 'Ally2' },
      ],
    });

    const result = await handle(action, ps, campaignName, 'test-map');

    expect(result.type).toBe('modal');
    expect(result.modalName).toBe('bolsteringPerformanceTarget');
    expect(result.payload.tempHp).toBe(8);
    expect(result.payload.maxTargets).toBe(6);
    expect(result.payload.creatureTargets).toEqual([
      { name: 'Leader' },
      { name: 'Ally1' },
      { name: 'Ally2' },
    ]);
    expect(result.payload.action).toBe(action);
    expect(result.payload.playerStats).toBe(ps);
    expect(result.payload.campaignName).toBe(campaignName);
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
  });

  it('uses ASI choice from featAbilityChoices when available (2024 format)', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: {
        type: 'temp_hp_buff',
        tempHpExpression: 'level + Math.max(CHA modifier, WIS modifier)',
        range: '30 ft',
        targets: 6,
        includesSelf: true,
        multiTargetAlly: true,
      },
    };
    const ps = makePlayerStats({
      level: 10,
      name: 'Leader',
      featAbilityChoices: {
        'Inspiring Leader-0': { assignment: 'Wisdom' },
      },
      abilities: [
        { name: 'Charisma', score: 14, bonus: 2 },
        { name: 'Wisdom', score: 16, bonus: 3 },
      ],
    });

    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Leader' }],
    });

    const result = await handle(action, ps, campaignName, 'test-map');

    expect(result.type).toBe('modal');
    expect(result.payload.tempHp).toBe(13);
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
  });

  it('uses ASI choice from featAbilityChoices (legacy string format)', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: {
        type: 'temp_hp_buff',
        tempHpExpression: 'level + Math.max(CHA modifier, WIS modifier)',
        range: '30 ft',
        targets: 6,
        includesSelf: true,
        multiTargetAlly: true,
      },
    };
    const ps = makePlayerStats({
      level: 10,
      name: 'Leader',
      featAbilityChoices: {
        '0': 'Charisma',
      },
      abilities: [
        { name: 'Charisma', score: 18, bonus: 4 },
        { name: 'Wisdom', score: 12, bonus: 1 },
      ],
    });

    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Leader' }],
    });

    const result = await handle(action, ps, campaignName, 'test-map');

    expect(result.type).toBe('modal');
    expect(result.payload.tempHp).toBe(14);
  });

  it('falls back to Math.max(CHA, WIS) when no ASI choice found', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: {
        type: 'temp_hp_buff',
        tempHpExpression: 'level + Math.max(CHA modifier, WIS modifier)',
        range: '30 ft',
        targets: 6,
        includesSelf: true,
        multiTargetAlly: true,
      },
    };
    const ps = makePlayerStats({
      level: 10,
      name: 'Leader',
      abilities: [
        { name: 'Charisma', score: 18, bonus: 4 },
        { name: 'Wisdom', score: 16, bonus: 3 },
      ],
    });

    automationService.evaluateAutoExpression.mockReturnValue(14);

    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Leader' }],
    });

    const result = await handle(action, ps, campaignName, 'test-map');

    expect(result.type).toBe('modal');
    expect(result.payload.tempHp).toBe(14);
  });

  it('uses fallback Math.max(CHA, WIS) when expression evaluation fails', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: {
        type: 'temp_hp_buff',
        tempHpExpression: 'invalid_expr',
        range: '30 ft',
        targets: 6,
        includesSelf: true,
        multiTargetAlly: true,
      },
    };
    const ps = makePlayerStats({
      level: 10,
      name: 'Leader',
      abilities: [
        { name: 'Charisma', score: 18, bonus: 4 },
        { name: 'Wisdom', score: 14, bonus: 2 },
      ],
    });

    automationService.evaluateAutoExpression.mockReturnValue('invalid_expr');

    damageUtils.getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Leader' }],
    });

    const result = await handle(action, ps, campaignName, 'test-map');

    expect(result.type).toBe('modal');
    expect(result.payload.tempHp).toBe(14);
  });

  it('returns empty creatureTargets when combat context is null', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: {
        type: 'temp_hp_buff',
        tempHpExpression: 'level + 3',
        range: '30 ft',
        targets: 6,
        includesSelf: true,
        multiTargetAlly: true,
      },
    };
    const ps = makePlayerStats({ level: 5, name: 'Leader' });
    automationService.evaluateAutoExpression.mockReturnValue(8);

    damageUtils.getCombatContext.mockResolvedValue(null);

    const result = await handle(action, ps, campaignName, 'test-map');

    expect(result.type).toBe('modal');
    expect(result.payload.creatureTargets).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────
// confirmBolsteringPerformance
// ────────────────────────────────────────────────────────────────

describe('confirmBolsteringPerformance', () => {
  beforeEach(() => resetMocks());

  it('applies temp HP to selected targets using Math.max', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: { type: 'temp_hp_buff', targets: 6 },
    };
    const ps = makePlayerStats({ name: 'Leader' });

    useRuntimeState.getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'tempHp') return 0;
      return 0;
    });

    const result = await confirmBolsteringPerformance(action, ps, campaignName, ['Ally1', 'Ally2'], 10);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('10 temporary hit points');
    expect(result.payload.description).toContain('2 creatures');
    expect(result.payload.description).toContain('Ally1, Ally2');

    const tempHpCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempHpCalls.length).toBe(2);
    expect(tempHpCalls[0][2]).toBe(10);
    expect(tempHpCalls[1][2]).toBe(10);
  });

  it('preserves higher existing temp HP using Math.max', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: { type: 'temp_hp_buff', targets: 6 },
    };
    const ps = makePlayerStats({ name: 'Leader' });

    useRuntimeState.getRuntimeValue.mockImplementation((_name, key) => {
      if (key === 'tempHp' && _name === 'Ally1') return 20;
      return 0;
    });

    await confirmBolsteringPerformance(action, ps, campaignName, ['Ally1', 'Ally2'], 10);

    const tempHpCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    const ally1Call = tempHpCalls.find((c) => c[0] === 'Ally1');
    expect(ally1Call[2]).toBe(20);

    const ally2Call = tempHpCalls.find((c) => c[0] === 'Ally2');
    expect(ally2Call[2]).toBe(10);
  });

  it('respects max targets from automation config', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: { type: 'temp_hp_buff', targets: 2 },
    };
    const ps = makePlayerStats({ name: 'Leader' });

    await confirmBolsteringPerformance(action, ps, campaignName, ['A', 'B', 'C', 'D'], 10);

    const tempHpCalls = useRuntimeState.setRuntimeValue.mock.calls.filter(
      (c) => c[1] === 'tempHp',
    );
    expect(tempHpCalls.length).toBe(2);
  });

  it('logs to campaign log', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: { type: 'temp_hp_buff', targets: 6 },
    };
    const ps = makePlayerStats({ name: 'Leader' });

    await confirmBolsteringPerformance(action, ps, campaignName, ['Ally1'], 10);

    const { addEntry } = await import('../../../ui/logService.js');
    expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
      type: 'ability_use',
      characterName: 'Leader',
      abilityName: 'Inspiring Leader',
      description: expect.stringContaining('10 temporary hit points'),
    }));
  });

  it('handles empty selected targets', async () => {
    const action = {
      name: 'Inspiring Leader',
      automation: { type: 'temp_hp_buff', targets: 6 },
    };
    const ps = makePlayerStats({ name: 'Leader' });

    const result = await confirmBolsteringPerformance(action, ps, campaignName, [], 10);

    expect(result.type).toBe('popup');
    expect(result.payload.description).toContain('no targets selected');
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
  });
});

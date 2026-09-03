// CLA-279: rollBaseDamage must never re-append the Radiant Soul adder when execution
// (computeRadiantSoul) already stamped " + N [Radiant Soul]" into the damage formula.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn((formula) => {
    if (!formula || formula === '0') return null;
    const baseFormula = formula.replace(/\s*\[.*?\]\s*/g, '').trim();
    if (!baseFormula) return null;
    const match = baseFormula.match(/^(\d+)d(\d+)((?:[+-]\d+)+)?$/i);
    if (match) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const modifier = match[3] ? match[3].match(/[+-]\d+/g).reduce((s, m) => s + parseInt(m, 10), 0) : 0;
      const rolls = Array(count).fill(Math.floor(sides / 2) + 1);
      const total = rolls.reduce((s, r) => s + r, 0) + modifier;
      return { total, rolls, modifier };
    }
    return { total: 6, rolls: [6], modifier: 0 };
  }),
  rollExpressionDoubled: vi.fn((_formula) => ({ total: 12, rolls: [6], modifier: 0 })),
  rollExpressionMaximized: vi.fn((_formula) => ({ total: 12, rolls: [6], modifier: 0, maximized: true })),
}));

vi.mock('../../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(() => 1),
}));

const runtimeRef = { flagValue: null };
vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_name, key) => (key === '_radiantSoul_HexWarlock_oncePerTurn' ? runtimeRef.flagValue : null)),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../automation/common/choiceStorage.js', () => ({
  getChosenRuntimeValue: vi.fn(() => undefined),
}));

vi.mock('../../combat/automation/automationService.js', () => ({
  hasTwoWeaponFighting: vi.fn(() => false),
}));

const { buildRollBaseDamageStep } = await import('./attackRollDamageCalc.js');
const runtime = await import('../../../hooks/runtime/useRuntimeState.js');

function makeHolderStats(damageType = 'Fire') {
  return {
    name: 'HexWarlock',
    abilities: [{ name: 'Charisma', bonus: 3 }],
    automation: {
      passives: [{ type: 'radiant_soul', hasAutomation: true, damageTypes: ['Radiant', 'Fire'] }],
      actions: [],
    },
    damageType,
  };
}

describe('rollBaseDamage — CLA-279 Radiant Soul single-source adder', () => {
  let step;

  beforeEach(() => {
    vi.clearAllMocks();
    runtimeRef.flagValue = null;
    step = buildRollBaseDamageStep();
  });

  it('does NOT re-append the adder when formula already carries [Radiant Soul] (execution-owned)', async () => {
    const ctx = {
      attack: { damage: '1d10 + 3 [Radiant Soul]', damageType: 'Fire' },
      playerStats: makeHolderStats(),
      campaignName: 'test-campaign',
      isCrit: false,
    };
    const result = await step.handler(ctx);
    expect(result.data.formula).toBe('1d10 + 3 [Radiant Soul] [fire]');
    expect(result.data.formula.match(/\[Radiant Soul\]/g)).toHaveLength(1);
    // consumption flag still written
    expect(runtime.setRuntimeValue).toHaveBeenCalledWith('HexWarlock', '_radiantSoul_HexWarlock_oncePerTurn', true, 'test-campaign');
  });

  it('appends the adder exactly once to an unmarked eligible formula', async () => {
    const ctx = {
      attack: { damage: '1d10', damageType: 'Fire' },
      playerStats: makeHolderStats(),
      campaignName: 'test-campaign',
      isCrit: false,
    };
    const result = await step.handler(ctx);
    expect(result.data.formula).toBe('1d10 [fire] + 3 [Radiant Soul]');
    expect(result.data.formula.match(/\[Radiant Soul\]/g)).toHaveLength(1);
  });

  it('does not append when once-per-turn flag is armed', async () => {
    runtimeRef.flagValue = true;
    const ctx = {
      attack: { damage: '8d6', damageType: 'Radiant' },
      playerStats: makeHolderStats(),
      campaignName: 'test-campaign',
      isCrit: false,
    };
    const result = await step.handler(ctx);
    expect(result.data.formula).toBe('8d6 [radiant]');
  });

  it('does not append for non-eligible damage type (Ray of Frost cold)', async () => {
    const ctx = {
      attack: { damage: '3d8', damageType: 'Cold' },
      playerStats: makeHolderStats('Cold'),
      campaignName: 'test-campaign',
      isCrit: false,
    };
    const result = await step.handler(ctx);
    expect(result.data.formula).toBe('3d8 [cold]');
  });

  it('does not append for non-holder (no radiant_soul passive)', async () => {
    const ctx = {
      attack: { damage: '1d10', damageType: 'Fire' },
      playerStats: {
        name: 'DraconicSorcerer',
        abilities: [{ name: 'Charisma', bonus: 3 }],
        automation: { passives: [], actions: [] },
      },
      campaignName: 'test-campaign',
      isCrit: false,
    };
    const result = await step.handler(ctx);
    expect(result.data.formula).toBe('1d10 [fire]');
    expect(runtime.setRuntimeValue).not.toHaveBeenCalled();
  });
});

// CLA-279: spellContext must never re-append the Radiant Soul adder when execution
// (computeRadiantSoul) already stamped " + N [Radiant Soul]" into ctx.attack.damage.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDirectSpellDamageSteps } from './directSpellDamageSteps.js';

vi.mock('../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn((formula) => (formula && formula !== '0' ? { total: 6, rolls: [6], modifier: 0 } : null)),
  rollExpressionDoubled: vi.fn((_formula) => ({ total: 12, rolls: [6], modifier: 0 })),
  rollExpressionMaximized: vi.fn((_formula) => ({ total: 12, rolls: [6], modifier: 0, maximized: true })),
}));

vi.mock('../../rules/spells/postCastRiderService.js', () => ({
  getEmpoweredEvocationFeatures: vi.fn(() => []),
  getEmpoweredEvocationIntModifier: vi.fn(() => 0),
}));

vi.mock('../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../../services/automation/common/choiceStorage.js', () => ({
  getChosenRuntimeValue: vi.fn(() => undefined),
}));

const runtimeRef = { flagValue: null };
vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_name, key) => (key === '_radiantSoul_HexWarlock_oncePerTurn' ? runtimeRef.flagValue : null)),
  setRuntimeValue: vi.fn(),
}));

vi.mock('./features/index.js', () => ({
  featureModules: [],
}));

function makeHolderStats() {
  return {
    name: 'HexWarlock',
    abilities: [{ name: 'Charisma', bonus: 3 }],
    automation: {
      passives: [{ type: 'radiant_soul', hasAutomation: true, damageTypes: ['Radiant', 'Fire'] }],
      actions: [],
    },
  };
}

function makeCtx(overrides = {}) {
  return {
    attack: {},
    playerStats: makeHolderStats(),
    proceedWithDamage: vi.fn(),
    campaignName: 'test-campaign',
    ...overrides,
  };
}

describe('spellContext — CLA-279 Radiant Soul single-source adder', () => {
  let steps;

  beforeEach(() => {
    vi.clearAllMocks();
    runtimeRef.flagValue = null;
    steps = buildDirectSpellDamageSteps();
  });

  it('does NOT re-append when attack.damage already carries [Radiant Soul]', async () => {
    const ctx = makeCtx({ attack: { damage: '8d6 + 3 [Radiant Soul]', damageType: 'Radiant' } });
    const result = await steps[1].handler(ctx);
    expect(result.data.formula).toBe('8d6 + 3 [Radiant Soul]');
    expect(result.data.formula.match(/\[Radiant Soul\]/g)).toHaveLength(1);
  });

  it('appends exactly once to an unmarked eligible formula', async () => {
    const ctx = makeCtx({ attack: { damage: '8d6', damageType: 'Radiant' } });
    const result = await steps[1].handler(ctx);
    expect(result.data.formula).toBe('8d6 + 3 [Radiant Soul]');
  });

  it('does not append when once-per-turn flag is armed', async () => {
    runtimeRef.flagValue = true;
    const ctx = makeCtx({ attack: { damage: '8d6', damageType: 'Radiant' } });
    const result = await steps[1].handler(ctx);
    expect(result.data.formula).toBe('8d6');
  });

  it('does not append for non-eligible damage type (cold)', async () => {
    const ctx = makeCtx({ attack: { damage: '3d8', damageType: 'Cold' } });
    const result = await steps[1].handler(ctx);
    expect(result.data.formula).toBe('3d8');
  });

  it('spellRollDamage still writes the once-per-turn consumption flag', async () => {
    const runtime = await import('../../../hooks/runtime/useRuntimeState.js');
    const ctx = makeCtx({
      attack: { damage: '1d10 + 3 [Radiant Soul]', damageType: 'Fire' },
      formula: '1d10 + 3 [Radiant Soul]',
      isCrit: false,
    });
    await steps[2].handler(ctx);
    expect(runtime.setRuntimeValue).toHaveBeenCalledWith('HexWarlock', '_radiantSoul_HexWarlock_oncePerTurn', true, 'test-campaign');
  });
});

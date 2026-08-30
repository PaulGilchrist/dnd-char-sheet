// @improved-by-ai
// Regression tests for CLA-188: Cunning Strike rider pause + once-per-turn tracking.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve({ round: 1, creatures: [] })),
  getTargetFromAttacker: vi.fn(() => ({ name: 'Animated Rug of Smothering 1' })),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  setRuntimeObject: vi.fn(),
}));

vi.mock('../../automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  getAttackRiderOptions: vi.fn(() => Promise.resolve([])),
  getAttackRiderOptionsByContext: vi.fn(() => Promise.resolve([])),
  executeAttackRiderManeuver: vi.fn(),
}));

vi.mock('../../combat/prompts/bardicInspirationPromptUtils.js', () => ({
  sendBardicInspirationOffensePrompt: vi.fn(),
}));

vi.mock('../../combat/auras/bardicInspirationState.js', () => ({
  hasBardicInspirationOffense: vi.fn(() => false),
  getBardicInspirationDieSize: vi.fn(() => null),
}));

vi.mock('../../automation/common/resourceCheck.js', () => ({
  spendResource: vi.fn(),
}));

vi.mock('../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../ui/utils.js', () => ({
  default: { guid: () => 'test-guid-123' },
}));

import { buildCunningStrikeStep } from './attackRollRiders.js';
import { getCurrentCombatRound } from '../../../encounters/combatData.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const csPassive = { name: 'Devious Strikes', type: 'attack_rider' };

function makeCtx(overrides = {}) {
  return {
    hit: true,
    attack: { name: 'Shortsword', damage: '1d6+2', damageType: 'Piercing' },
    playerStats: {
      name: 'AasimarTest',
      level: 14,
      automation: { actions: [], passives: [csPassive] },
    },
    campaignName: 'test-campaign',
    mapName: null,
    buildCtxSync: vi.fn(() => Promise.resolve({ sneakAttackDice: 7 })),
    setAttackRiderModal: vi.fn(),
    ...overrides,
  };
}

function runtimeValues(values = {}) {
  getRuntimeValue.mockImplementation((key, prop) => values[prop] ?? null);
}

describe('buildCunningStrikeStep (CLA-188)', () => {
  let step;

  beforeEach(() => {
    vi.clearAllMocks();
    step = buildCunningStrikeStep();
    getCurrentCombatRound.mockReturnValue(1);
    runtimeValues({ lastAttack: { hit: true } });
  });

  it('does not run when the attack missed', async () => {
    const ctx = makeCtx({ hit: false });
    expect(step.condition(ctx)).toBe(false);
  });

  it('pauses with a cunningStrike modal on a hit with sneak dice available', async () => {
    const ctx = makeCtx();
    const result = await step.handler(ctx);
    expect(result.modal).toBeDefined();
    expect(result.modal.type).toBe('cunningStrike');
    expect(result.modal.props.targetName).toBe('Animated Rug of Smothering 1');
    expect(result.data).toEqual({ _cunningStrike: true, sneakDice: 7 });
    expect(ctx.setAttackRiderModal).toHaveBeenCalled();
    expect(getCurrentCombatRound).toHaveBeenCalledWith('test-campaign');
  });

  it('suppresses the modal when _CunningStrike_usedRound is object-form for the same round', async () => {
    runtimeValues({
      lastAttack: { hit: true },
      _CunningStrike_usedRound: { round: 1, activeCreature: 'AasimarTest' },
    });
    const ctx = makeCtx();
    const result = await step.handler(ctx);
    expect(result.modal).toBeUndefined();
    expect(result.data).toEqual({ sneakDice: 7 });
  });

  it('suppresses the modal when _CunningStrike_usedRound is legacy number-form for the same round', async () => {
    runtimeValues({ lastAttack: { hit: true }, _CunningStrike_usedRound: 1 });
    const ctx = makeCtx();
    const result = await step.handler(ctx);
    expect(result.modal).toBeUndefined();
  });

  it('suppresses the modal when skipped for the current round (object-form)', async () => {
    runtimeValues({
      lastAttack: { hit: true },
      _cunningStrikeSkippedRound: { round: 1, activeCreature: 'AasimarTest' },
    });
    const ctx = makeCtx();
    const result = await step.handler(ctx);
    expect(result.modal).toBeUndefined();
  });

  it('re-offers the modal when the feature was used in an earlier round', async () => {
    runtimeValues({
      lastAttack: { hit: true },
      _CunningStrike_usedRound: { round: 1, activeCreature: 'AasimarTest' },
    });
    getCurrentCombatRound.mockReturnValue(2);
    const ctx = makeCtx();
    const result = await step.handler(ctx);
    expect(result.modal?.type).toBe('cunningStrike');
  });

  it('does not prompt without a cunning strike passive', async () => {
    const ctx = makeCtx({
      playerStats: { name: 'AasimarTest', level: 14, automation: { actions: [], passives: [] } },
    });
    const result = await step.handler(ctx);
    expect(result.modal).toBeUndefined();
  });

  it('does not prompt when sneak dice are unavailable', async () => {
    const ctx = makeCtx({ buildCtxSync: vi.fn(() => Promise.resolve({ sneakAttackDice: 0 })) });
    const result = await step.handler(ctx);
    expect(result.modal).toBeUndefined();
  });
});

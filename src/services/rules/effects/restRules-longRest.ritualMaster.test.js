import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyLongRest } from './restRules.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => undefined),
  setRuntimeBatch: vi.fn(),
  setRuntimeValue: vi.fn(),
  getAllStoreKeys: vi.fn(() => []),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 10),
}));

vi.mock('./expirations.js', () => ({
  clearAllExpirationEffects: vi.fn(),
}));

vi.mock('../../combat/conditions/exhaustionRules.js', () => ({
  getLevelAfterLongRest: vi.fn((level) => Math.max(0, level - 1)),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
  setCombatSummaryCache: vi.fn(),
}));

import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

function makePlayerStats(overrides = {}) {
  return {
    name: 'HexWarlock',
    level: 14,
    proficiency: 5,
    abilities: [{ name: 'Charisma', bonus: 4 }],
    automation: {
      actions: [], bonusActions: [], reactions: [], specialActions: [], passives: [],
      ritualSpells: [{ type: 'passive_rule', effect: 'ritual_spells', name: 'Ritual Spells', chosenSpells: true, quickRitual: true }],
    },
    feats: ['Ritual Master'],
    ...overrides,
  };
}

describe('FT-068 long rest resets Quick Ritual counter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-arms _Ritual_Master_quickRitualUsed for a Ritual Master holder', async () => {
    await applyLongRest(makePlayerStats(), 'test-campaign');

    expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', '_Ritual_Master_quickRitualUsed', null, 'test-campaign', true);
  });

  it('does not reset the counter for a non-holder', async () => {
    const stats = makePlayerStats({
      automation: { actions: [], bonusActions: [], reactions: [], specialActions: [], passives: [], ritualSpells: [] },
      feats: ['Poisoner'],
    });

    await applyLongRest(stats, 'test-campaign');

    const quickCalls = setRuntimeValue.mock.calls.filter(c => c[1] === '_Ritual_Master_quickRitualUsed');
    expect(quickCalls).toHaveLength(0);
  });
});

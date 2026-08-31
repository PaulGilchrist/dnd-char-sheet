// CLA-195 regression: handleReroll must consume Indomitable uses
// (indomitableUses), enforce the per-long-rest max, and log each use.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handleReroll } from './CharSheet.handlers';
import { addEntry } from '../../services/ui/logService.js';

import {
  createMockStore,
  createMockPlayerStats,
} from './CharSheet.test-utils';

// ---------------------------------------------------------------------------
// Mocks — services
// ---------------------------------------------------------------------------

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  loadCombatSummary: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn().mockReturnValue({ damageApplied: true }),
}));

vi.mock('../../services/rules/spells/empoweredSpellService.js', () => ({
  executeEmpoweredReroll: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  getManeuversForRules: vi.fn().mockResolvedValue([]),
  getSuperiorityDice: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/ui/storage.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getProperty: vi.fn().mockResolvedValue(null),
    setProperty: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((key, prop, _camp) => mockStore.get(`${key}:${prop}`) ?? null),
  setRuntimeValue: vi.fn((_key, _prop, _val, _camp) => mockStore.set(`${_key}:${_prop}`, _val)),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockStore = createMockStore();
const campaignName = 'test-campaign';

const createFighter = (level) => createMockPlayerStats({
  name: 'EvasiveFighter',
  level,
  class: { name: 'Fighter' },
});

// ---------------------------------------------------------------------------
// Tests — handleReroll (Indomitable)
// ---------------------------------------------------------------------------

describe('handleReroll — Indomitable use consumption (CLA-195)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('increments indomitableUses and logs an ability_use entry', () => {
    const stats = createFighter(18);
    const conditionEffects = { autoRerollCondition: '', autoRerollBonus: 18 };

    handleReroll(stats, campaignName, conditionEffects, { roll: 14, total: 37 });

    expect(mockStore.get('EvasiveFighter:indomitableUses')).toBe(1);
    expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
      type: 'ability_use',
      characterName: 'EvasiveFighter',
      abilityName: 'Indomitable',
    }));
    expect(addEntry.mock.calls[0][1].description).toContain('Indomitable');
    expect(addEntry.mock.calls[0][1].description).toContain('+18');
  });

  it('increments repeatedly up to the lv18 max of 3 uses', () => {
    const stats = createFighter(18);
    const conditionEffects = { autoRerollCondition: '', autoRerollBonus: 18 };

    handleReroll(stats, campaignName, conditionEffects);
    handleReroll(stats, campaignName, conditionEffects);
    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('EvasiveFighter:indomitableUses')).toBe(3);
  });

  it('does not increment beyond the per-long-rest max and writes no log', () => {
    const stats = createFighter(18);
    const conditionEffects = { autoRerollCondition: '', autoRerollBonus: 18 };
    mockStore.set('EvasiveFighter:indomitableUses', 3);

    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('EvasiveFighter:indomitableUses')).toBe(3);
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('enforces max 1 use at fighter lv9-12', () => {
    const stats = createFighter(9);
    const conditionEffects = { autoRerollCondition: '', autoRerollBonus: 9 };

    handleReroll(stats, campaignName, conditionEffects);
    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('EvasiveFighter:indomitableUses')).toBe(1);
  });

  it('enforces max 2 uses at fighter lv13-16', () => {
    const stats = createFighter(13);
    const conditionEffects = { autoRerollCondition: '', autoRerollBonus: 13 };

    handleReroll(stats, campaignName, conditionEffects);
    handleReroll(stats, campaignName, conditionEffects);
    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('EvasiveFighter:indomitableUses')).toBe(2);
  });

  it('logs Fanatical Focus and Disciplined Survivor rerolls by feature name', () => {
    const stats = createFighter(18);
    mockStore.set('EvasiveFighter:focusPoints', 2);

    handleReroll(stats, campaignName, { autoRerollCondition: 'raging' });
    expect(addEntry.mock.calls[0][1].abilityName).toBe('Fanatical Focus');

    handleReroll(stats, campaignName, { autoRerollCondition: 'disciplined_survivor' });
    expect(addEntry.mock.calls[1][1].abilityName).toBe('Disciplined Survivor');
    expect(mockStore.get('EvasiveFighter:focusPoints')).toBe(1);
    expect(mockStore.get('EvasiveFighter:indomitableUses') ?? null).toBe(null);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as combatData from './combatData.js';
import * as realCombatData from '../services/encounters/combatData.js';

const EXPORTED_NAMES = [
  'getCombatContext',
  'setCombatSummaryCache',
  'loadCombatSummary',
  'getCombatSummary',
  'loadActiveCreatureName',
  'getActiveCreatureName',
  'loadCurrentCombatRound',
  'getCurrentCombatRound',
];

function stubFetchCombatSummary(payload) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ combatSummary: payload }),
    })
  );
}

describe('combatData shim (src/encounters/combatData.js)', () => {
  beforeEach(() => {
    combatData.setCombatSummaryCache(null, 'test-campaign');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    combatData.setCombatSummaryCache(null, 'test-campaign');
  });

  it('re-exports every binding from the real module', () => {
    for (const name of EXPORTED_NAMES) {
      expect(combatData[name]).toBeTypeOf('function');
      expect(combatData[name]).toBe(realCombatData[name]);
    }
  });

  it('setCombatSummaryCache/getCombatSummary round-trip through the shim', () => {
    const summary = { round: 2, creatures: [{ name: 'Orc' }], activeCreatureName: 'Orc' };
    combatData.setCombatSummaryCache(summary, 'test-campaign');
    expect(combatData.getCombatSummary('test-campaign')).toBe(summary);
    combatData.setCombatSummaryCache(null, 'test-campaign');
    expect(combatData.getCombatSummary('test-campaign')).toBeNull();
  });

  it('getActiveCreatureName and getCurrentCombatRound read from the shared cache', () => {
    combatData.setCombatSummaryCache({ round: 7, activeCreatureName: 'Goblin' }, 'test-campaign');
    expect(combatData.getActiveCreatureName('test-campaign')).toBe('Goblin');
    expect(combatData.getCurrentCombatRound('test-campaign')).toBe(7);
  });

  it('loadCombatSummary fetches through the API and seeds the shared cache', async () => {
    stubFetchCombatSummary({ round: 5, creatures: [{ name: 'Orc' }], activeCreatureName: 'Orc' });
    const result = await combatData.loadCombatSummary('test-campaign');
    expect(result).toEqual({ round: 5, creatures: [{ name: 'Orc' }], activeCreatureName: 'Orc' });
    expect(combatData.getCombatSummary('test-campaign')).toEqual(result);
  });

  it('loadActiveCreatureName and loadCurrentCombatRound delegate to the real module', async () => {
    stubFetchCombatSummary({ round: 3, activeCreatureName: 'Orc' });
    expect(await combatData.loadActiveCreatureName('test-campaign')).toBe('Orc');
    expect(await combatData.loadCurrentCombatRound('test-campaign')).toBe(3);
  });
});

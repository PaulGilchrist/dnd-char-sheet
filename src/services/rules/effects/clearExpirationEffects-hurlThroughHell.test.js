// Regression tests for CLA-175: Hurl Through Hell incapacitated duration and
// return-to-space resolution via the expiration queue.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
  getAllStoreKeys: vi.fn(() => []),
}));

vi.mock('../../ui/utils.js', () => ({
  default: {
    getName: vi.fn((val) => String(val)),
  },
}));

vi.mock('../../ui/storage.js', () => ({
  default: {
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(() => 1),
  getActiveCreatureName: vi.fn(() => 'HexWarlock'),
  getCombatSummary: vi.fn(),
  loadCombatSummary: vi.fn(),
}));

vi.mock('../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

import { clearExpirationEffects } from './clearExpirationEffects.js';
import { processExpirationList } from './expirationQueue.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';

const CAMPAIGN = 'test-campaign';
const CASTER = 'HexWarlock';
const TARGET = 'Ogre 1';

const hurlEffect = [{ type: 'hurl_through_hell_return', target: TARGET, source: 'Hurl Through Hell' }];
const hurlTe = {
  target: TARGET,
  source: 'Hurl Through Hell',
  effect: 'incapacitated',
  condition: 'incapacitated',
  duration: 'until_end_of_next_turn',
  teleport: true,
  returnToSpace: true,
};

function setCallsForKey(key) {
  return setRuntimeValue.mock.calls.filter(c => c[1] === key);
}

describe('hurl_through_hell_return expiration (CLA-175)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [hurlTe];
      if (name === TARGET && key === 'activeConditions') return ['incapacitated', 'prone'];
      return null;
    });
    setRuntimeValue.mockImplementation(() => Promise.resolve());
    addEntry.mockImplementation(() => Promise.resolve());
  });

  it('removes the incapacitated condition from the target', () => {
    clearExpirationEffects(hurlEffect, TARGET, CASTER, CAMPAIGN);

    const condCalls = setCallsForKey('activeConditions');
    expect(condCalls.length).toBeGreaterThan(0);
    expect(condCalls[0][0]).toBe(TARGET);
    expect(condCalls[0][2]).toEqual(['prone']);
    expect(condCalls[0][2]).not.toContain('incapacitated');
  });

  it('removes the matching hurl targetEffects entry but keeps unrelated ones', () => {
    const unrelated = { target: 'Goblin', source: 'Faerie Fire', effect: 'faerie_fire' };
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [hurlTe, unrelated];
      if (name === TARGET && key === 'activeConditions') return ['incapacitated'];
      return null;
    });

    clearExpirationEffects(hurlEffect, TARGET, CASTER, CAMPAIGN);

    const teCalls = setCallsForKey('targetEffects');
    expect(teCalls).toHaveLength(1);
    expect(teCalls[0][0]).toBe('campaign');
    expect(teCalls[0][2]).toEqual([unrelated]);
  });

  it('does not rewrite campaign targetEffects when no entry matches', () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [];
      if (name === TARGET && key === 'activeConditions') return ['incapacitated'];
      return null;
    });

    clearExpirationEffects(hurlEffect, TARGET, CASTER, CAMPAIGN);

    expect(setCallsForKey('targetEffects')).toHaveLength(0);
  });

  it('logs that the target returns to the space it previously occupied', async () => {
    clearExpirationEffects(hurlEffect, TARGET, CASTER, CAMPAIGN);

    expect(addEntry).toHaveBeenCalledWith(CAMPAIGN, expect.objectContaining({
      type: 'condition',
      action: 'ended',
      characterName: TARGET,
      source: 'Hurl Through Hell',
      description: expect.stringContaining('returns to the space it previously occupied'),
    }));
  });

  it('expires at the start of round appliedRound+2, not before (until end of caster next turn)', () => {
    const list = [{ target: TARGET, effects: hurlEffect, appliedRound: 1, expiryRounds: 2, expireOnCreatureName: null }];

    const atRound2 = processExpirationList(list, 2, CASTER, CAMPAIGN, CASTER);
    expect(atRound2.changed).toBe(false);
    expect(atRound2.expiredCount).toBe(0);

    const atRound3 = processExpirationList(list, 3, CASTER, CAMPAIGN, CASTER);
    expect(atRound3.changed).toBe(true);
    expect(atRound3.expiredCount).toBe(1);
    expect(atRound3.processed).toHaveLength(0);

    const condCalls = setCallsForKey('activeConditions');
    expect(condCalls[0][2]).toEqual(['prone']);
  });
});

// CLA-231 regression: Mystic Arcanum free-cast bookkeeping must be keyed by the
// cast spell's own level (mysticArcanumLevel{L}) — a lv7 arcanum cast drains
// mysticArcanumLevel7, never the lv6 counter, and a second cast is denied.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Static mocks
// ---------------------------------------------------------------------------

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => {
  const setRuntimeValue = vi.fn();
  const getRuntimeValue = vi.fn(() => undefined);
  const clearRuntimeState = vi.fn();
  return { setRuntimeValue, getRuntimeValue, clearRuntimeState };
});

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../../services/combat/concentration/concentrationService.js', () => ({
  breakConcentration: vi.fn(),
  addConcentration: vi.fn(),
  cleanupConcentrationEffects: vi.fn(),
}));

vi.mock('../../../services/ui/storage.js', () => ({
  default: { set: vi.fn() },
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(),
}));

vi.mock('./metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { isFreeCastAuthorized, incrementFreeCastResource, prepareSpellCast } from './spellPreparationService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

// ---------------------------------------------------------------------------
// Fixtures — lv14 warlock with lv6 (Eyebite) + lv7 (Etherealness) arcanums
// ---------------------------------------------------------------------------

function makeWarlockStats() {
  return {
    name: 'HexWarlock',
    class: { name: 'Warlock', arcanums: ['Eyebite', 'Etherealness'] },
    abilities: [{ name: 'Charisma', bonus: 3 }],
    proficiency: 5,
    spellAbilities: {
      spellCastingAbility: 'CHA',
      toHit: 8,
      saveDc: 13,
      modifier: 3,
      spell_slots_level_5: 1,
    },
    automation: { actions: [], bonusActions: [], specialActions: [], passives: [] },
    hitPoints: 70,
  };
}

function makeSpell(name, level) {
  return { name, level, casting_time: '1 action', school: 'Necromancy' };
}

// Runtime counters: both arcanum levels armed at 1/1.
function armBothCounters() {
  getRuntimeValue.mockImplementation((_key1, key2) => {
    if (key2 === 'mysticArcanumLevel6' || key2 === 'mysticArcanumLevel7') return 1;
    return undefined;
  });
}

describe('CLA-231 — Mystic Arcanum per-level counter bookkeeping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  describe('isFreeCastAuthorized', () => {
    it('authorizes an arcanum while its own-level counter is armed', async () => {
      armBothCounters();
      expect(await isFreeCastAuthorized('HexWarlock', 'Eyebite', 6, makeWarlockStats(), 'test-campaign')).toBe(true);
      expect(await isFreeCastAuthorized('HexWarlock', 'Etherealness', 7, makeWarlockStats(), 'test-campaign')).toBe(true);
    });

    it('denies a second lv7 cast when only the lv7 counter is exhausted (lv6 untouched)', async () => {
      getRuntimeValue.mockImplementation((_key1, key2) => {
        if (key2 === 'mysticArcanumLevel6') return 1;
        if (key2 === 'mysticArcanumLevel7') return 0;
        return undefined;
      });
      // Pre-fix this returned true by draining the lv6 counter first.
      expect(await isFreeCastAuthorized('HexWarlock', 'Etherealness', 7, makeWarlockStats(), 'test-campaign')).toBe(false);
      expect(await isFreeCastAuthorized('HexWarlock', 'Eyebite', 6, makeWarlockStats(), 'test-campaign')).toBe(true);
    });
  });

  describe('prepareSpellCast consumption', () => {
    it('a lv7 cast consumes mysticArcanumLevel7 and leaves mysticArcanumLevel6 intact', async () => {
      armBothCounters();
      const stats = makeWarlockStats();
      const result = await prepareSpellCast(makeSpell('Etherealness', 7), {}, {
        playerName: 'HexWarlock',
        playerStats: stats,
        campaignName: 'test-campaign',
        freeCastAuthorized: true,
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', 'mysticArcanumLevel7', 0, 'test-campaign');
      // Pre-fix the [6,7,8,9] loop drained the lv6 counter first — no lv6 write ever.
      expect(setRuntimeValue.mock.calls.some(c => c[1] === 'mysticArcanumLevel6')).toBe(false);
      expect(setRuntimeValue.mock.calls.some(c => c[1] === 'spell_slots_level_5')).toBe(false);
    });

    it('a lv6 cast consumes mysticArcanumLevel6 only', async () => {
      armBothCounters();
      const stats = makeWarlockStats();
      const result = await prepareSpellCast(makeSpell('Eyebite', 6), {}, {
        playerName: 'HexWarlock',
        playerStats: stats,
        campaignName: 'test-campaign',
        freeCastAuthorized: true,
      });

      expect(result.freeCastUsed).toBe(true);
      expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', 'mysticArcanumLevel6', 0, 'test-campaign');
      expect(setRuntimeValue.mock.calls.some(c => c[1] === 'mysticArcanumLevel7')).toBe(false);
    });
  });

  describe('incrementFreeCastResource', () => {
    it('restores the counter for the spell level being rolled back only', () => {
      // Pre-fix the loop hit lv6 first (0 < 1) and restored the wrong counter.
      getRuntimeValue.mockImplementation((_key1, key2) => {
        if (key2 === 'mysticArcanumLevel6') return 0;
        if (key2 === 'mysticArcanumLevel7') return 0;
        return undefined;
      });

      incrementFreeCastResource('HexWarlock', 'Etherealness', 7, makeWarlockStats(), 'test-campaign');

      expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', 'mysticArcanumLevel7', 1, 'test-campaign');
      expect(setRuntimeValue.mock.calls.some(c => c[1] === 'mysticArcanumLevel6')).toBe(false);
    });
  });
});

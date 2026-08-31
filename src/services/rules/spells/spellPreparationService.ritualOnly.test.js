// CLA-234 regression: Nature Speaker / Animal Speaker ritual-only casts.
// isFreeCastAuthorized authorizes _ritualOnly spells regardless of available spell
// slots (feature text has NO once-per-day limit → unlimited, slotless). prepareSpellCast
// must NOT consume a spell slot for them, must mark freeCastUsed, and must log an
// ability_use entry recording the ritual cast.
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
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('./metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { isFreeCastAuthorized, prepareSpellCast } from './spellPreparationService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';

// ---------------------------------------------------------------------------
// Fixtures — lv13 Wild Heart Barbarian; lv5 slots EMPTY (ritual must still work)
// ---------------------------------------------------------------------------

function makeWildHeartStats({ lv5Slots = 0 } = {}) {
  return {
    name: 'DraconicDragon',
    level: 13,
    proficiency: 5,
    class: { name: 'Barbarian', spell_casting_ability: 'Intelligence' },
    abilities: [
      { name: 'Intelligence', bonus: -1 },
      { name: 'Wisdom', bonus: 3 },
    ],
    spellAbilities: {
      spellCastingAbility: 'Intelligence',
      toHit: 4,
      saveDc: 12,
      modifier: -1,
      spell_slots_level_1: lv5Slots,
      spell_slots_level_5: lv5Slots,
      spells: [
        { name: 'Commune with Nature', level: 5, casting_time: 'Ritual', _ritualOnly: true, _ritualFeature: 'Nature Speaker', spellCastingAbility: 'Wisdom' },
        { name: 'Beast Sense', level: 2, casting_time: 'Ritual', _ritualOnly: true, _ritualFeature: 'Animal Speaker', spellCastingAbility: 'Wisdom' },
        { name: 'Animal Friendship', level: 1, casting_time: '1 action' },
      ],
    },
    automation: { actions: [], bonusActions: [], specialActions: [], passives: [] },
  };
}

describe('spellPreparationService — Nature Speaker ritual-only free cast (CLA-234)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  describe('isFreeCastAuthorized', () => {
    it('authorizes Commune with Nature with ZERO spell slots available', () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      expect(isFreeCastAuthorized('DraconicDragon', 'Commune with Nature', 5, stats, 'test-campaign')).toBe(true);
    });

    it('authorizes unlimited casts (no once-per-day counter to exhaust)', () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      expect(isFreeCastAuthorized('DraconicDragon', 'Commune with Nature', 5, stats, 'test-campaign')).toBe(true);
      expect(isFreeCastAuthorized('DraconicDragon', 'Commune with Nature', 5, stats, 'test-campaign')).toBe(true);
    });

    it('authorizes the Animal Speaker ritual spells', () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      expect(isFreeCastAuthorized('DraconicDragon', 'Beast Sense', 2, stats, 'test-campaign')).toBe(true);
      expect(isFreeCastAuthorized('DraconicDragon', 'Speak with Animals', 1, stats, 'test-campaign')).toBe(false);
    });

    it('does NOT authorize a non-ritual spell of the same caster', () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      expect(isFreeCastAuthorized('DraconicDragon', 'Animal Friendship', 1, stats, 'test-campaign')).toBe(false);
    });

    it('does not throw when spellAbilities is missing', () => {
      const stats = { name: 'Someone', automation: {} };
      expect(() => isFreeCastAuthorized('Someone', 'Commune with Nature', 5, stats, 'test-campaign')).not.toThrow();
      expect(isFreeCastAuthorized('Someone', 'Commune with Nature', 5, stats, 'test-campaign')).toBe(false);
    });
  });

  describe('prepareSpellCast', () => {
    it('consumes NO spell slot and marks freeCastUsed for the ritual cast', async () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      const spell = { name: 'Commune with Nature', level: 5, casting_time: 'Ritual', _ritualOnly: true, _ritualFeature: 'Nature Speaker', spellCastingAbility: 'Wisdom' };

      const result = await prepareSpellCast(spell, {}, {
        playerName: 'DraconicDragon',
        playerStats: stats,
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: true,
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      // No slot decrement at any level.
      const slotWrites = setRuntimeValue.mock.calls.filter(c => String(c[1]).startsWith('spell_slots_level_'));
      expect(slotWrites).toHaveLength(0);
    });

    it('consumes NO slot even when slots ARE available (ritual never spends a slot)', async () => {
      const stats = makeWildHeartStats({ lv5Slots: 1 });
      getRuntimeValue.mockImplementation((_name, key) => (key === 'spell_slots_level_5' ? 1 : undefined));
      const spell = { name: 'Commune with Nature', level: 5, casting_time: 'Ritual', _ritualOnly: true, _ritualFeature: 'Nature Speaker', spellCastingAbility: 'Wisdom' };

      const result = await prepareSpellCast(spell, {}, {
        playerName: 'DraconicDragon',
        playerStats: stats,
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: true,
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      const slotWrites = setRuntimeValue.mock.calls.filter(c => String(c[1]).startsWith('spell_slots_level_'));
      expect(slotWrites).toHaveLength(0);
    });

    it('logs an ability_use ritual cast entry naming Nature Speaker', async () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      const spell = { name: 'Commune with Nature', level: 5, casting_time: 'Ritual', _ritualOnly: true, _ritualFeature: 'Nature Speaker', spellCastingAbility: 'Wisdom' };

      await prepareSpellCast(spell, {}, {
        playerName: 'DraconicDragon',
        playerStats: stats,
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: true,
      });

      const ritualLog = addEntry.mock.calls.map(c => c[1]).find(e => e.type === 'ability_use' && e.abilityName === 'Nature Speaker');
      expect(ritualLog).toBeTruthy();
      expect(ritualLog.spellName).toBe('Commune with Nature');
      expect(ritualLog.note).toContain('as a Ritual');
      expect(ritualLog.note).toContain('no spell slot consumed');
    });

    it('does not log a ritual entry for ordinary free casts without _ritualOnly', async () => {
      const stats = makeWildHeartStats({ lv5Slots: 0 });
      getRuntimeValue.mockImplementation((_name, key) => (key === 'naturalRecoveryFreeCast' ? ['Healing Word'] : undefined));
      const spell = { name: 'Healing Word', level: 1, casting_time: '1 bonus action' };

      await prepareSpellCast(spell, {}, {
        playerName: 'DraconicDragon',
        playerStats: stats,
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: true,
      });

      const ritualLog = addEntry.mock.calls.map(c => c[1]).find(e => e.type === 'ability_use' && e.abilityName === 'Nature Speaker');
      expect(ritualLog).toBeUndefined();
    });
  });
});

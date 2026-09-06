// CLA-323 regression: Spell Mastery (Wizard, 2024) — the chosen lv1/lv2 spells are cast
// at their lowest level without expending a spell slot, UNLIMITED (no _used stamp, no
// counter — unlike Signature Spells). To cast either spell at a higher level you must
// expend a spell slot of the CAST level. Free-cast authorization is gated on the EFFECTIVE
// level (upcastLevel ?? spell.level), mirroring the CLA-312 caller pattern.
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  addEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

import { prepareSpellCast, isFreeCastAuthorized } from './spellPreparationService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

function makeSpell(overrides = {}) {
  return {
    name: 'Thunderwave',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    components: ['V', 'S'],
    damage: { damage_type: 'Thunder', damage_at_slot_level: { 1: '2d8', 2: '3d8', 3: '4d8' } },
    ...overrides,
  };
}

function makeWizardStats() {
  return {
    name: 'DivinationWizard',
    level: 20,
    class: { name: 'Wizard' },
    abilities: [{ name: 'Intelligence', bonus: 5 }],
    proficiency: 6,
    spellAbilities: {
      spellCastingAbility: 'Intelligence',
      saveDc: 17,
      modifier: 5,
      spell_slots_level_1: 4,
      spell_slots_level_2: 3,
      spell_slots_level_3: 3,
    },
    automation: { actions: [], bonusActions: [], specialActions: [], passives: [] },
    hitPoints: 100,
  };
}

function runtimeMastery(store = {}) {
  getRuntimeValue.mockImplementation((_name, key) => {
    if (key === 'SpellMastery_level1') return 'Thunderwave';
    if (key === 'SpellMastery_level2') return 'Shatter';
    if (key in store) return store[key];
    return undefined;
  });
}

describe('CLA-323 — Spell Mastery upcast payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  describe('isFreeCastAuthorized — effective level gate', () => {
    it('authorizes the lv1 mastery spell at its base level', () => {
      runtimeMastery();
      expect(isFreeCastAuthorized('DivinationWizard', 'Thunderwave', 1, makeWizardStats(), 'test-campaign')).toBe(true);
    });

    it('does NOT authorize the lv1 mastery spell upcast to lv2', () => {
      runtimeMastery();
      expect(isFreeCastAuthorized('DivinationWizard', 'Thunderwave', 2, makeWizardStats(), 'test-campaign')).toBe(false);
    });

    it('authorizes the lv2 mastery spell at its base level', () => {
      runtimeMastery();
      expect(isFreeCastAuthorized('DivinationWizard', 'Shatter', 2, makeWizardStats(), 'test-campaign')).toBe(true);
    });

    it('does NOT authorize the lv2 mastery spell upcast to lv3', () => {
      runtimeMastery();
      expect(isFreeCastAuthorized('DivinationWizard', 'Shatter', 3, makeWizardStats(), 'test-campaign')).toBe(false);
    });
  });

  describe('prepareSpellCast — base casts are free and UNLIMITED (no stamp)', () => {
    it('lv1 base cast spends no slot and stamps nothing', async () => {
      runtimeMastery({ spell_slots_level_1: 4 });

      const result = await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Thunderwave', 1, makeWizardStats(), 'test-campaign'),
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('second lv1 base cast remains free — mastery is at-will, not once-per-rest', async () => {
      runtimeMastery({ spell_slots_level_1: 4 });

      const free = () => isFreeCastAuthorized('DivinationWizard', 'Thunderwave', 1, makeWizardStats(), 'test-campaign');
      await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: free(),
      });
      vi.clearAllMocks();
      runtimeMastery({ spell_slots_level_1: 4 });

      const result = await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: free(),
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('lv2 base cast of the lv2 mastery spell spends no slot', async () => {
      runtimeMastery({ spell_slots_level_2: 3 });

      const result = await prepareSpellCast(makeSpell({ name: 'Shatter', level: 2, damage: { damage_type: 'Thunder', damage_at_slot_level: { 2: '3d8', 3: '4d8' } } }), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Shatter', 2, makeWizardStats(), 'test-campaign'),
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('prepareSpellCast — upcast casts pay the slot at the CAST level', () => {
    it('lv1 mastery spell upcast to lv2 expends spell_slots_level_2 only', async () => {
      runtimeMastery({ spell_slots_level_1: 4, spell_slots_level_2: 3 });

      const result = await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: true,
        upcastLevel: 2,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Thunderwave', 2, makeWizardStats(), 'test-campaign'),
      });

      expect(result.freeCastUsed).toBe(false);
      expect(result.slotConsumed).toBe(true);
      expect(setRuntimeValue).toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_2', 2, 'test-campaign');
      expect(setRuntimeValue).not.toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_1', 3, 'test-campaign');
      expect(result.modifiedSpell.level).toBe(2);
      expect(result.modifiedSpell.baseLevel).toBe(1);
    });

    it('lv2 mastery spell upcast to lv3 expends spell_slots_level_3 only', async () => {
      runtimeMastery({ spell_slots_level_2: 2, spell_slots_level_3: 3 });

      const result = await prepareSpellCast(makeSpell({ name: 'Shatter', level: 2, damage: { damage_type: 'Thunder', damage_at_slot_level: { 2: '3d8', 3: '4d8' } } }), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: true,
        upcastLevel: 3,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Shatter', 3, makeWizardStats(), 'test-campaign'),
      });

      expect(result.freeCastUsed).toBe(false);
      expect(result.slotConsumed).toBe(true);
      expect(setRuntimeValue).toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_3', 2, 'test-campaign');
      expect(setRuntimeValue).not.toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_2', 1, 'test-campaign');
      expect(result.modifiedSpell.level).toBe(3);
      expect(result.modifiedSpell.baseLevel).toBe(2);
    });
  });
});

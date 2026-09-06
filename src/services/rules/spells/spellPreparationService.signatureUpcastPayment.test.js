// CLA-312 regression: Signature Spells (Wizard lv20, 2024) — a higher-level cast of a
// signature spell must expend a spell slot of the CAST level and must NOT burn the
// per-spell free-cast key. Free-cast authorization is gated on the EFFECTIVE level
// (upcastLevel ?? spell.level), mirroring the caller pattern in useSpellMetamagicGates.
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
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    components: ['V', 'S'],
    damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6', 4: '9d6' } },
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
      spell_slots_level_3: 3,
      spell_slots_level_4: 3,
    },
    automation: { actions: [], bonusActions: [], specialActions: [], passives: [] },
    hitPoints: 100,
  };
}

function runtimeWithSignature(store = {}) {
  getRuntimeValue.mockImplementation((_name, key) => {
    if (key === 'SignatureSpells_selection') return ['Fireball', 'Slow'];
    if (key in store) return store[key];
    return undefined;
  });
}

describe('CLA-312 — Signature Spells upcast payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  describe('isFreeCastAuthorized — effective level gate', () => {
    it('authorizes the base lv3 cast when the free cast is fresh', () => {
      runtimeWithSignature({ SignatureSpells_Fireball_used: null });
      expect(isFreeCastAuthorized('DivinationWizard', 'Fireball', 3, makeWizardStats(), 'test-campaign')).toBe(true);
    });

    it('does NOT authorize the same spell at an upcast level', () => {
      runtimeWithSignature({ SignatureSpells_Fireball_used: null });
      expect(isFreeCastAuthorized('DivinationWizard', 'Fireball', 4, makeWizardStats(), 'test-campaign')).toBe(false);
    });
  });

  describe('prepareSpellCast — lv4 cast pays the lv4 slot, free-cast key untouched', () => {
    it('expends spell_slots_level_4 and does not stamp SignatureSpells_Fireball_used', async () => {
      runtimeWithSignature({ SignatureSpells_Fireball_used: null, spell_slots_level_4: 3 });

      const result = await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: true,
        upcastLevel: 4,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Fireball', 4, makeWizardStats(), 'test-campaign'),
      });

      expect(result.slotConsumed).toBe(true);
      expect(result.freeCastUsed).toBe(false);
      expect(setRuntimeValue).toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_4', 2, 'test-campaign');
      expect(setRuntimeValue).not.toHaveBeenCalledWith('DivinationWizard', 'SignatureSpells_Fireball_used', true, 'test-campaign');
      expect(result.modifiedSpell.level).toBe(4);
      expect(result.modifiedSpell.baseLevel).toBe(3);
    });

    it('lv3 base cast remains free: no slot spent, free-cast key stamped', async () => {
      runtimeWithSignature({ SignatureSpells_Fireball_used: null, spell_slots_level_3: 3 });

      const result = await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Fireball', 3, makeWizardStats(), 'test-campaign'),
      });

      expect(result.freeCastUsed).toBe(true);
      expect(result.slotConsumed).toBe(false);
      expect(setRuntimeValue).toHaveBeenCalledWith('DivinationWizard', 'SignatureSpells_Fireball_used', true, 'test-campaign');
      expect(setRuntimeValue).not.toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_3', 2, 'test-campaign');
    });

    it('second lv3 free cast after the key is used pays a lv3 slot', async () => {
      runtimeWithSignature({ SignatureSpells_Fireball_used: true, spell_slots_level_3: 3 });

      const result = await prepareSpellCast(makeSpell(), {}, {
        playerName: 'DivinationWizard',
        playerStats: makeWizardStats(),
        campaignName: 'test-campaign',
        isUpcast: false,
        freeCastAuthorized: isFreeCastAuthorized('DivinationWizard', 'Fireball', 3, makeWizardStats(), 'test-campaign'),
      });

      expect(result.freeCastUsed).toBe(false);
      expect(result.slotConsumed).toBe(true);
      expect(setRuntimeValue).toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_3', 2, 'test-campaign');
    });
  });

  describe('CLA-323 shape — Spell Mastery shares the effective-level gate', () => {
    it('does NOT authorize a lv1 mastery spell upcast to lv2, and pays the lv2 slot', async () => {
      const stats = makeWizardStats();
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'SpellMastery_level1') return 'Identify';
        if (key === 'spell_slots_level_2') return 2;
        return undefined;
      });

      expect(isFreeCastAuthorized('DivinationWizard', 'Identify', 2, stats, 'test-campaign')).toBe(false);

      const result = await prepareSpellCast(makeSpell({ name: 'Identify', level: 1, damage: { damage_at_slot_level: { 1: '1d6', 2: '2d6' } } }), {}, {
        playerName: 'DivinationWizard',
        playerStats: stats,
        campaignName: 'test-campaign',
        isUpcast: true,
        upcastLevel: 2,
        freeCastAuthorized: false,
      });

      expect(result.slotConsumed).toBe(true);
      expect(result.freeCastUsed).toBe(false);
      expect(setRuntimeValue).toHaveBeenCalledWith('DivinationWizard', 'spell_slots_level_2', 1, 'test-campaign');
    });
  });
});

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

import { prepareSpellCast } from './spellPreparationService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';

function holderStats(overrides = {}) {
  return {
    name: 'HexWarlock',
    class: { name: 'Warlock' },
    abilities: [{ name: 'Charisma', bonus: 4 }],
    proficiency: 5,
    spellAbilities: {
      spellCastingAbility: 'Charisma',
      saveDc: 17,
      spell_slots_level_1: 0,
      spell_slots_level_5: 2,
    },
    automation: {
      actions: [], bonusActions: [], specialActions: [], passives: [],
      ritualSpells: [{
        type: 'passive_rule',
        effect: 'ritual_spells',
        name: 'Ritual Spells',
        chosenSpells: true,
        quickRitual: true,
        spellCastingAbility: 'Charisma',
      }],
    },
    ...overrides,
  };
}

function ritualSpell(overrides = {}) {
  return {
    name: 'Identify',
    level: 1,
    ritual: true,
    _ritualMasterRitual: true,
    casting_time: '1 action',
    range: 'Touch',
    ...overrides,
  };
}

describe('FT-068 Quick Ritual — prepareSpellCast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('quick-ritual cast consumes the once-per-long-rest counter, logs, and expends no spell slot', async () => {
    const stats = holderStats();
    const result = await prepareSpellCast(
      ritualSpell({ quickRitual: true }),
      {},
      { playerName: 'HexWarlock', playerStats: stats, campaignName: 'test-campaign', isUpcast: false, freeCastAuthorized: false }
    );

    expect(result.freeCastUsed).toBe(true);
    expect(result.slotConsumed).toBe(false);
    expect(result.metaCtx.quickRitualUsed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', '_Ritual_Master_quickRitualUsed', expect.any(Number), 'test-campaign');
    const slotCalls = setRuntimeValue.mock.calls.filter(c => String(c[1]).startsWith('spell_slots_level_'));
    expect(slotCalls).toHaveLength(0);
    const logCall = addEntry.mock.calls.map(c => c[1]).find(e => e.type === 'ability_use' && e.abilityName === 'Ritual Master (Quick Ritual)');
    expect(logCall).toBeDefined();
    expect(logCall.note).toContain('Identify');
    expect(logCall.note).toContain('no spell slot consumed');
  });

  it('refuses the slot-free cast once the counter is spent — normal slot payment applies instead', async () => {
    const stats = holderStats({
      spellAbilities: { spellCastingAbility: 'Charisma', saveDc: 17, spell_slots_level_1: 2 },
    });
    getRuntimeValue.mockImplementation((_name, key) => {
      if (key === '_Ritual_Master_quickRitualUsed') return 1234567890;
      return undefined;
    });

    const result = await prepareSpellCast(
      ritualSpell({ quickRitual: true }),
      {},
      { playerName: 'HexWarlock', playerStats: stats, campaignName: 'test-campaign', isUpcast: false, freeCastAuthorized: false }
    );

    expect(result.freeCastUsed).toBe(false);
    expect(result.slotConsumed).toBe(true);
    const quickCalls = setRuntimeValue.mock.calls.filter(c => c[1] === '_Ritual_Master_quickRitualUsed');
    expect(quickCalls).toHaveLength(0);
    expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', 'spell_slots_level_1', 1, 'test-campaign');
  });

  it('a normal (non-quick) cast expends a warlock slot and leaves the Quick Ritual counter untouched', async () => {
    const stats = holderStats();
    const result = await prepareSpellCast(
      ritualSpell({ quickRitual: false }),
      {},
      { playerName: 'HexWarlock', playerStats: stats, campaignName: 'test-campaign', isUpcast: false, freeCastAuthorized: false }
    );

    expect(result.slotConsumed).toBe(true);
    expect(result.freeCastUsed).toBe(false);
    expect(setRuntimeValue).toHaveBeenCalledWith('HexWarlock', 'spell_slots_level_5', 1, 'test-campaign');
    const quickCalls = setRuntimeValue.mock.calls.filter(c => c[1] === '_Ritual_Master_quickRitualUsed');
    expect(quickCalls).toHaveLength(0);
  });

  it('non-holders requesting quick ritual pay the spell slot normally', async () => {
    const stats = holderStats({
      automation: { actions: [], bonusActions: [], specialActions: [], passives: [], ritualSpells: [] },
      spellAbilities: { spellCastingAbility: 'Charisma', saveDc: 17, spell_slots_level_1: 1 },
    });

    const result = await prepareSpellCast(
      ritualSpell({ quickRitual: true }),
      {},
      { playerName: 'EvasiveFighter', playerStats: stats, campaignName: 'test-campaign', isUpcast: false, freeCastAuthorized: false }
    );

    expect(result.slotConsumed).toBe(true);
    expect(result.freeCastUsed).toBe(false);
    expect(setRuntimeValue).toHaveBeenCalledWith('EvasiveFighter', 'spell_slots_level_1', 0, 'test-campaign');
  });
});

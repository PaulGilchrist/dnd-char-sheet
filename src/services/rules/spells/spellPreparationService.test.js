// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Static mocks — the service heavily depends on runtime state, combat data,
// concentration, storage, and logging.  We mock at the module boundary.
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
// Test-data factories
// ---------------------------------------------------------------------------

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    components: ['V', 'S'],
    damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6' } },
    ...overrides,
  };
}

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    class: { name: 'Wizard' },
    abilities: [{ name: 'Intelligence', bonus: 5 }],
    proficiency: 4,
    spellAbilities: {
      spellCastingAbility: 'Intelligence',
      toHit: 9,
      saveDc: 17,
      modifier: 5,
    },
    automation: { actions: [], bonusActions: [], specialActions: [], passives: [] },
    hitPoints: 100,
    ...overrides,
  };
}

function makeWarlockStats(overrides = {}) {
  return makePlayerStats({
    name: 'TestWarlock',
    class: { name: 'Warlock', arcanums: [] },
    spellAbilities: {
      spellCastingAbility: 'Charisma',
      toHit: 9,
      saveDc: 15,
      modifier: 4,
      spell_slots_level_1: 2,
      spell_slots_level_2: 2,
      spell_slots_level_3: 2,
    },
    ...overrides,
  });
}

function makeMetaCtx(overrides = {}) {
  return { slotLevel: 3, ...overrides };
}

function makeCombatSummary(overrides = {}) {
  return {
    creatures: [{ name: 'TestWizard', concentration: null }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
  prepareSpellCast,
  isFreeCastAuthorized,
  incrementFreeCastResource,
} from './spellPreparationService.js';

import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { breakConcentration, addConcentration, cleanupConcentrationEffects } from '../../../services/combat/concentration/concentrationService.js';
import * as storageService from '../../../services/ui/storage.js';
import * as metamagicRules from './metamagicRules.js';

// ---------------------------------------------------------------------------
// prepareSpellCast — cantrips
// ---------------------------------------------------------------------------

describe('prepareSpellCast — cantrips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('returns early for cantrips without consuming any resources', async () => {
    const spell = makeSpell({ name: 'Fire Bolt', level: 0 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(false);
    expect(result.freeCastUsed).toBe(false);
    expect(result.modifiedSpell.baseLevel).toBe(0);
    expect(result.modifiedSpell.level).toBe(0);
    expect(setRuntimeValue).not.toHaveBeenCalled();
    expect(breakConcentration).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — concentration management
// ---------------------------------------------------------------------------

describe('prepareSpellCast — concentration management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('breaks old concentration and sets new when spell has concentration flag', async () => {
    const oldCs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Concentration', dc: 10 } }],
    });
    getCombatSummary.mockReturnValue(oldCs);

    const spell = makeSpell({ name: 'Fireball', level: 3, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).toHaveBeenCalledWith(oldCs, 'TestWizard');
    expect(storageService.default.set).toHaveBeenCalledWith('combatSummary', oldCs, 'camp');
    expect(result.metaCtx.oldConcentrationSpell).toBe('Concentration');
    expect(result.metaCtx.shouldSetConcentration).toBe(true);
    expect(addConcentration).toHaveBeenCalledWith(oldCs, 'TestWizard', 'Fireball', 10, null);
    expect(cleanupConcentrationEffects).toHaveBeenCalledWith('TestWizard', 'Concentration', 'camp');
  });

  it('sets concentration when caster has no existing concentration', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: null }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Fireball', level: 3, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).not.toHaveBeenCalled();
    expect(result.metaCtx.oldConcentrationSpell).toBeNull();
    expect(result.metaCtx.shouldSetConcentration).toBe(true);
    expect(addConcentration).toHaveBeenCalledWith(cs, 'TestWizard', 'Fireball', 10, null);
  });

  it('does not set concentration when spell does not require it', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: null }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(result.metaCtx.shouldSetConcentration).toBe(false);
    expect(addConcentration).not.toHaveBeenCalled();
  });

  it('does not break concentration for Summon Aberration', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Concentration', dc: 10 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Summon Aberration', level: 4, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).not.toHaveBeenCalled();
    expect(result.metaCtx.shouldSetConcentration).toBe(false);
  });

  it('handles Hunter\'s Mark concentration with targetName from creature', async () => {
    const cs = makeCombatSummary({
      creatures: [
        { name: 'TestWizard', concentration: null, targetName: 'Goblin1' },
      ],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: "Hunter's Mark", level: 1, concentration: true });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(addConcentration).toHaveBeenCalledWith(cs, 'TestWizard', "Hunter's Mark", 10, 'Goblin1');
  });

  it('handles Hex concentration with targetName from creature', async () => {
    const cs = makeCombatSummary({
      creatures: [
        { name: 'TestWizard', concentration: null, targetName: 'Goblin1' },
      ],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Hex', level: 1, concentration: true });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(addConcentration).toHaveBeenCalledWith(cs, 'TestWizard', 'Hex', 10, 'Goblin1');
  });

  it('handles Eyebite concentration recast', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Eyebite', dc: 12 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Eyebite', level: 8, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).not.toHaveBeenCalled();
    expect(result.metaCtx.shouldSetConcentration).toBe(false);
    expect(result.metaCtx.oldConcentrationSpell).toBeNull();
  });

  it('does not break concentration for War God\'s Blessing spells', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_War_Gods_Blessing_active') return true;
      return undefined;
    });

    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Concentration', dc: 10 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Shield of Faith', level: 1, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).not.toHaveBeenCalled();
    expect(result.metaCtx.shouldSetConcentration).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — Hunter's Mark / Hex buff tracking
// ---------------------------------------------------------------------------

describe('prepareSpellCast — Hunter\'s Mark / Hex buff tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('adds Hunter\'s Mark buff when concentration is set', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: null }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: "Hunter's Mark", level: 1, concentration: true });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestWizard',
      'activeBuffs',
      expect.arrayContaining([
        expect.objectContaining({ name: "Hunter's Mark", effect: 'hunters_mark_concentration', duration: 'concentration' }),
      ]),
      'camp',
    );
  });

  it('adds Hex buff when concentration is set', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: null }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Hex', level: 1, concentration: true });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestWizard',
      'activeBuffs',
      expect.arrayContaining([
        expect.objectContaining({ name: 'Hex', effect: 'hex_concentration', duration: 'concentration' }),
      ]),
      'camp',
    );
  });

  it('adds Eyebite buff when concentration is set', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: null }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Eyebite', level: 8, concentration: true });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestWizard',
      'activeBuffs',
      expect.arrayContaining([
        expect.objectContaining({ name: 'Eyebite', effect: 'eyebite_concentration', duration: 'concentration' }),
      ]),
      'camp',
    );
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — resource consumption (normal slots)
// ---------------------------------------------------------------------------

describe('prepareSpellCast — resource consumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('consumes a spell slot when available', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_3') return 3;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'spell_slots_level_3', 2, 'camp');
    expect(result.freeCastUsed).toBe(false);
  });

  it('does not consume a slot when none are available', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_3') return 0;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(false);
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('falls back to max slots when current is null', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_3') return null;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const playerStats = makePlayerStats({
      spellAbilities: { spell_slots_level_3: 4 },
    });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'spell_slots_level_3', 3, 'camp');
  });

  it('consumes an upcast slot at the upcast level', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_5') return 2;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
      isUpcast: true,
      upcastLevel: 5,
    });

    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'spell_slots_level_5', 1, 'camp');
    expect(result.modifiedSpell.level).toBe(5);
    expect(result.modifiedSpell.baseLevel).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — Warlock slot substitution
// ---------------------------------------------------------------------------

describe('prepareSpellCast — Warlock slot substitution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('uses a higher-level warlock slot when the matching level has none', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_2') return 0;
      if (key2 === 'spell_slots_level_3') return 1;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 2 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWarlock',
      playerStats: makeWarlockStats(),
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('TestWarlock', 'spell_slots_level_3', 0, 'camp');
  });

  it('does not use warlock slot substitution when matching level has slots', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_2') return 1;
      if (key2 === 'spell_slots_level_3') return 1;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 2 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWarlock',
      playerStats: makeWarlockStats(),
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('TestWarlock', 'spell_slots_level_2', 0, 'camp');
    expect(setRuntimeValue).not.toHaveBeenCalledWith('TestWarlock', 'spell_slots_level_3', 0, 'camp');
  });

  it('does not substitute when all warlock slots are exhausted', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_1' || key2 === 'spell_slots_level_2' || key2 === 'spell_slots_level_3') return 0;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 2 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWarlock',
      playerStats: makeWarlockStats(),
      campaignName: 'camp',
    });

    expect(result.slotConsumed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — free cast
// ---------------------------------------------------------------------------

describe('prepareSpellCast — free cast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('uses a free cast without consuming a slot', async () => {
    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
      freeCastAuthorized: true,
    });

    expect(result.freeCastUsed).toBe(true);
    expect(result.slotConsumed).toBe(false);
    expect(result.metaCtx.freeCastUsed).toBe(true);
  });

  it('does not consume a slot when free cast is authorized', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_3') return 3;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
      freeCastAuthorized: true,
    });

    expect(result.slotConsumed).toBe(false);
    expect(result.freeCastUsed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — psionic sorcery payment
// ---------------------------------------------------------------------------

describe('prepareSpellCast — psionic sorcery payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('spends sorcery points for psionic spells when payment enabled', async () => {
    vi.mocked(metamagicRules.isPsionicSpell).mockReturnValue(true);
    vi.mocked(metamagicRules.hasPsionicSorcery).mockReturnValue(true);
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'sorceryPoints') return 5;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestSorcerer',
      playerStats: makePlayerStats({ class: { name: 'Sorcerer' } }),
      campaignName: 'camp',
      usePsionicPayment: true,
    });

    expect(result.metaCtx.psionicSorcery).toBe('sorceryPoints');
    expect(result.metaCtx.psionicCost).toBe(3);
    expect(result.metaCtx._psionicUsed).toBe(true);
    expect(setRuntimeValue).toHaveBeenCalledWith('TestSorcerer', 'sorceryPoints', 2, 'camp');
    expect(metamagicRules.isPsionicSpell).toHaveBeenCalled();
  });

  it('does not spend SP when insufficient sorcery points', async () => {
    vi.mocked(metamagicRules.isPsionicSpell).mockReturnValue(true);
    vi.mocked(metamagicRules.hasPsionicSorcery).mockReturnValue(true);
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'sorceryPoints') return 2;
      if (key2 === 'spell_slots_level_3') return 3;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestSorcerer',
      playerStats: makePlayerStats({ class: { name: 'Sorcerer' } }),
      campaignName: 'camp',
      usePsionicPayment: true,
    });

    expect(result.metaCtx.psionicSorcery).toBeUndefined();
    expect(result.metaCtx._psionicUsed).toBeUndefined();
    // Falls through to normal slot consumption
    expect(setRuntimeValue).toHaveBeenCalledWith('TestSorcerer', 'spell_slots_level_3', 2, 'camp');
  });

  it('does not spend SP when free cast is authorized', async () => {
    vi.mocked(metamagicRules.isPsionicSpell).mockReturnValue(true);
    vi.mocked(metamagicRules.hasPsionicSorcery).mockReturnValue(true);
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'sorceryPoints') return 5;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestSorcerer',
      playerStats: makePlayerStats({ class: { name: 'Sorcerer' } }),
      campaignName: 'camp',
      usePsionicPayment: true,
      freeCastAuthorized: true,
    });

    expect(result.metaCtx.psionicSorcery).toBeUndefined();
    expect(result.metaCtx._psionicUsed).toBeUndefined();
  });

  it('does not spend SP for non-psionic spells', async () => {
    vi.mocked(metamagicRules.isPsionicSpell).mockReturnValue(false);
    vi.mocked(metamagicRules.hasPsionicSorcery).mockReturnValue(true);

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestSorcerer',
      playerStats: makePlayerStats({ class: { name: 'Sorcerer' } }),
      campaignName: 'camp',
      usePsionicPayment: true,
    });

    expect(result.metaCtx.psionicSorcery).toBeUndefined();
    expect(result.metaCtx._psionicUsed).toBeUndefined();
  });

  it('logs psionic sorcery entry', async () => {
    vi.mocked(metamagicRules.isPsionicSpell).mockReturnValue(true);
    vi.mocked(metamagicRules.hasPsionicSorcery).mockReturnValue(true);
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'sorceryPoints') return 10;
      return undefined;
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestSorcerer',
      playerStats: makePlayerStats({ class: { name: 'Sorcerer' } }),
      campaignName: 'camp',
      usePsionicPayment: true,
    });

    expect(setRuntimeValue).toHaveBeenCalledWith('TestSorcerer', 'sorceryPoints', 7, 'camp');
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — modified spell construction
// ---------------------------------------------------------------------------

describe('prepareSpellCast — modified spell construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('sets _psychicSpellsOverride for Warlock with Psychic Spells when using psychic damage', async () => {
    const spell = makeSpell({
      name: 'Eldritch Blast',
      level: 1,
      damage: { damage_type: 'Force' },
    });
    const playerStats = makePlayerStats({
      class: { name: 'Warlock' },
      automation: { passives: [{ type: 'psychic_spells' }] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'spell_slots_level_1') return 2;
      return undefined;
    });

    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWarlock',
      playerStats,
      campaignName: 'camp',
      usePsychicDamage: true,
    });

    expect(result.modifiedSpell._psychicSpellsOverride).toBe(true);
  });

  it('changes Dispel Magic to bonus action with Spell Breaker', async () => {
    const spell = makeSpell({
      name: 'Dispel Magic',
      level: 3,
      casting_time: '1 action',
    });
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'spell_breaker' }] },
    });

    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
    });

    expect(result.modifiedSpell.casting_time).toBe('1 bonus action');
  });

  it('does not change casting time when Spell Breaker but not Dispel Magic', async () => {
    const spell = makeSpell({
      name: 'Fireball',
      level: 3,
      casting_time: '1 action',
    });
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'spell_breaker' }] },
    });

    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
    });

    expect(result.modifiedSpell.casting_time).toBe('1 action');
  });

  it('does not set psychic override for non-Warlock', async () => {
    const spell = makeSpell({
      name: 'Fireball',
      level: 3,
      damage: { damage_type: 'Fire' },
    });
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'psychic_spells' }] },
    });

    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
      usePsychicDamage: true,
    });

    expect(result.modifiedSpell._psychicSpellsOverride).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — Phantasmal Creatures
// ---------------------------------------------------------------------------

describe('prepareSpellCast — Phantasmal Creatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('marks Summon Beast/Summon Fey with phantasmal properties when free cast', async () => {
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'phantasmal_creatures' }] },
    });

    const spell = makeSpell({ name: 'Summon Beast', level: 2 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
      freeCastAuthorized: true,
    });

    expect(result.modifiedSpell.school).toBe('Illusion');
    expect(result.modifiedSpell._phantasmalCreatures).toBe(true);
  });

  it('adds summoned creature to runtime list', async () => {
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'phantasmal_creatures' }] },
    });

    const spell = makeSpell({ name: 'Summon Beast', level: 2 });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
      freeCastAuthorized: true,
    });

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestWizard',
      '_phantasmalCreatures_list',
      expect.arrayContaining(['Bestial Spirit']),
      'camp',
    );
  });

  it('adds Fey Spirit for Summon Fey', async () => {
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'phantasmal_creatures' }] },
    });

    const spell = makeSpell({ name: 'Summon Fey', level: 2 });
    await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
      freeCastAuthorized: true,
    });

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestWizard',
      '_phantasmalCreatures_list',
      expect.arrayContaining(['Fey Spirit']),
      'camp',
    );
  });

  it('does not mark non-summon spells', async () => {
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'phantasmal_creatures' }] },
    });

    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats,
      campaignName: 'camp',
      freeCastAuthorized: true,
    });

    expect(result.modifiedSpell._phantasmalCreatures).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — upcast spell level tracking
// ---------------------------------------------------------------------------

describe('prepareSpellCast — upcast spell level tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    getCombatSummary.mockReturnValue(null);
  });

  it('creates modified spell with baseLevel and level when upcast', async () => {
    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
      isUpcast: true,
      upcastLevel: 5,
    });

    expect(result.modifiedSpell.level).toBe(5);
    expect(result.modifiedSpell.baseLevel).toBe(3);
  });

  it('keeps original level when not upcast', async () => {
    const spell = makeSpell({ name: 'Fireball', level: 3 });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(result.modifiedSpell.level).toBe(3);
    expect(result.modifiedSpell.baseLevel).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// prepareSpellCast — Eyebite/Spiritual Weapon/Shapechange concentration recast
// ---------------------------------------------------------------------------

describe('prepareSpellCast — concentration recast spells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('allows Spiritual Weapon recast when already concentrating on it', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Spiritual Weapon', dc: 10 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Spiritual Weapon', level: 2, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).not.toHaveBeenCalled();
    expect(result.metaCtx.shouldSetConcentration).toBe(false);
  });

  it('allows Shapechange recast when already concentrating on it', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Shapechange', dc: 15 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const spell = makeSpell({ name: 'Shapechange', level: 9, concentration: true });
    const result = await prepareSpellCast(spell, makeMetaCtx(), {
      playerName: 'TestWizard',
      playerStats: makePlayerStats(),
      campaignName: 'camp',
    });

    expect(breakConcentration).not.toHaveBeenCalled();
    expect(result.metaCtx.shouldSetConcentration).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Natural Recovery
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Natural Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true when spell is in naturalRecoveryFreeCast list', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'naturalRecoveryFreeCast') return ['Fireball'];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false when spell is not in naturalRecoveryFreeCast list', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'naturalRecoveryFreeCast') return ['Fireball'];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Lightning Bolt', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Spell Mastery
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Spell Mastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for level 1 spell matching SpellMastery_level1', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'SpellMastery_level1') return 'Magic Missile';
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Magic Missile', 1, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns true for level 2 spell matching SpellMastery_level2', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'SpellMastery_level2') return 'Shield';
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Shield', 2, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false when spell matches but level does not', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'SpellMastery_level1') return 'Magic Missile';
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Magic Missile', 2, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Signature Spells
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Signature Spells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for level 3 spell in SignatureSpells when not used', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'SignatureSpells_selection') return ['Teleportation Circle'];
      if (key2 === 'SignatureSpells_Teleportation_Circle_used') return false;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Teleportation Circle', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for used Signature Spell', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'SignatureSpells_selection') return ['Teleportation Circle'];
      if (key2 === 'SignatureSpells_Teleportation_Circle_used') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Teleportation Circle', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Divination Savant
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Divination Savant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for spell in Divination Savant selection when not used', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Divination_Savant_selection') return ['Warding Bond'];
      if (key2 === '_Divination_Savant_Warding_Bond_used') return false;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Warding Bond', 2, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for used Divination Savant spell', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Divination_Savant_selection') return ['Warding Bond'];
      if (key2 === '_Divination_Savant_Warding_Bond_used') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Warding Bond', 2, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Mystic Arcanum
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Mystic Arcanum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true when arcanum spell has available resource count', async () => {
    const playerStats = makePlayerStats({
      class: { arcanums: ['Teleport'] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'mysticArcanumLevel6') return 1;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Teleport', 6, playerStats, 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false when arcanum spell has zero resource count', async () => {
    const playerStats = makePlayerStats({
      class: { arcanums: ['Teleport'] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'mysticArcanumLevel6' || key2 === 'mysticArcanumLevel7' || key2 === 'mysticArcanumLevel8' || key2 === 'mysticArcanumLevel9') return 0;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Teleport', 6, playerStats, 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Phantasmal Creatures
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Phantasmal Creatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for Summon Beast/Summon Fey with available count', async () => {
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'phantasmal_creatures' }] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Phantasmal_Creatures_freeCastCount') return 1;
      return undefined;
    });

    const authorized1 = await isFreeCastAuthorized('TestWizard', 'Summon Beast', 2, playerStats, 'camp');
    expect(authorized1).toBe(true);

    const authorized2 = await isFreeCastAuthorized('TestWizard', 'Summon Fey', 2, playerStats, 'camp');
    expect(authorized2).toBe(true);
  });

  it('returns false for non-summon spells with phantasmal creatures', async () => {
    const playerStats = makePlayerStats({
      automation: { passives: [{ type: 'phantasmal_creatures' }] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Phantasmal_Creatures_freeCastCount') return 1;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, playerStats, 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Eyebite/Spiritual Weapon/Shapechange concentration recast
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — concentration recast spells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for Eyebite when already concentrating on Eyebite', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Eyebite', dc: 12 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const authorized = await isFreeCastAuthorized('TestWizard', 'Eyebite', 8, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns true for Spiritual Weapon when already concentrating on it', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Spiritual Weapon', dc: 10 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const authorized = await isFreeCastAuthorized('TestWizard', 'Spiritual Weapon', 2, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns true for Shapechange when already concentrating on it', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Shapechange', dc: 15 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const authorized = await isFreeCastAuthorized('TestWizard', 'Shapechange', 9, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for Eyebite when not concentrating on it', async () => {
    const cs = makeCombatSummary({
      creatures: [{ name: 'TestWizard', concentration: { spell: 'Fireball', dc: 10 } }],
    });
    getCombatSummary.mockReturnValue(cs);

    const authorized = await isFreeCastAuthorized('TestWizard', 'Eyebite', 8, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });

  it('returns false when combat summary is null', async () => {
    getCombatSummary.mockReturnValue(null);

    const authorized = await isFreeCastAuthorized('TestWizard', 'Eyebite', 8, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Aura of Vitality
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Aura of Vitality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true when aura_of_vitality targetEffect is active on player', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'targetEffects') return [{ effect: 'aura_of_vitality', target: 'TestWizard' }];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Aura of Vitality', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false when aura_of_vitality targetEffect is not active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'targetEffects') return [];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Aura of Vitality', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });

  it('returns false for non-Aura of Vitality spells even with aura effect', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'targetEffects') return [{ effect: 'aura_of_vitality', target: 'TestWizard' }];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Mantle of Majesty
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Mantle of Majesty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for Command when Mantle of Majesty buff is active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'activeBuffs') return [{ name: 'Mantle of Majesty' }];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Command', 1, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for Command when Mantle of Majesty is not active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'activeBuffs') return [];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Command', 1, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Bewitching Magic
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — Bewitching Magic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for Misty Step when Bewitching Magic free cast is active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Bewitching_Magic_freeCast') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Misty Step', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for Misty Step when Bewitching Magic free cast is not active', async () => {
    getRuntimeValue.mockReturnValue(undefined);

    const authorized = await isFreeCastAuthorized('TestWizard', 'Misty Step', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });

  it('returns false for non-Misty Step spells with Bewitching Magic active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Bewitching_Magic_freeCast') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — War God's Blessing
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — War God\'s Blessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for Shield of Faith when War God\'s Blessing is active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_War_Gods_Blessing_active') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Shield of Faith', 1, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns true for Spiritual Weapon when War God\'s Blessing is active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_War_Gods_Blessing_active') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Spiritual Weapon', 2, makePlayerStats(), 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for non-WGB spells when WGB is active', async () => {
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_War_Gods_Blessing_active') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, makePlayerStats(), 'camp');
    expect(authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFreeCastAuthorized — Free spell actions (generic)
// ---------------------------------------------------------------------------

describe('isFreeCastAuthorized — free spell actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('returns true for free_spell action with available uses', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'Fireball',
          uses: 1,
          recharge: true,
        }],
      },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Test_Feature_freeCastCount') return 1;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, playerStats, 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for free_spell action with zero uses', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'Fireball',
          uses: 1,
          recharge: true,
        }],
      },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Test_Feature_freeCastCount') return 0;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, playerStats, 'camp');
    expect(authorized).toBe(false);
  });

  it('handles perSpellTracking actions', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'Fireball',
          perSpellTracking: true,
        }],
      },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Test_Feature_Fireball_freeCast') return true;
      if (key2 === '_Test_Feature_Fireball_used') return false;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, playerStats, 'camp');
    expect(authorized).toBe(true);
  });

  it('returns false for perSpellTracking when already used', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'Fireball',
          perSpellTracking: true,
        }],
      },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Test_Feature_Fireball_freeCast') return true;
      if (key2 === '_Test_Feature_Fireball_used') return true;
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, playerStats, 'camp');
    expect(authorized).toBe(false);
  });

  it('handles shared freeCast array storage', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'Fireball',
        }],
      },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Test_Feature_freeCast') return ['Fireball', 'Lightning Bolt'];
      return undefined;
    });

    const authorized = await isFreeCastAuthorized('TestWizard', 'Fireball', 3, playerStats, 'camp');
    expect(authorized).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// incrementFreeCastResource — Mystic Arcanum
// ---------------------------------------------------------------------------

describe('incrementFreeCastResource — Mystic Arcanum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('increments arcanum resource when count is below max', async () => {
    const playerStats = makePlayerStats({
      class: { arcanums: ['Teleport'] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'mysticArcanumLevel6') return 0;
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Teleport', 6, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'mysticArcanumLevel6', 1, 'camp');
  });

  it('does not increment when arcanum resource is already at max', async () => {
    const playerStats = makePlayerStats({
      class: { arcanums: ['Teleport'] },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'mysticArcanumLevel6') return 1;
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Teleport', 6, playerStats, 'camp');

    expect(setRuntimeValue).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// incrementFreeCastResource — Free spell actions
// ---------------------------------------------------------------------------

describe('incrementFreeCastResource — free spell actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('increments free cast count for actions with uses_expression and usesMax', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'level 3',
          uses_expression: true,
          usesMax: 2,
        }],
      },
    });
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Test_Feature_freeCastCount') return 1;
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'SomeSpell', 3, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', '_Test_Feature_freeCastCount', 2, 'camp');
  });

  it('resets perSpellTracking used flag', async () => {
    const playerStats = makePlayerStats({
      automation: {
        actions: [{
          type: 'free_spell',
          name: 'Test Feature',
          spell: 'Fireball',
          perSpellTracking: true,
        }],
      },
    });

    incrementFreeCastResource('TestWizard', 'Fireball', 3, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', '_Test_Feature_Fireball_used', false, 'camp');
  });
});

// ---------------------------------------------------------------------------
// incrementFreeCastResource — Natural Recovery / Bewitching / Signature
// ---------------------------------------------------------------------------

describe('incrementFreeCastResource — Natural Recovery / Bewitching / Signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('handles Natural Recovery free cast reset', async () => {
    const playerStats = makePlayerStats();
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'naturalRecoveryFreeCast') return ['Fireball'];
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Fireball', 3, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'naturalRecoveryFreeCast', null, 'camp');
    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'naturalRecoveryFreeCastUsed', false, 'camp');
  });

  it('handles Bewitching Magic free cast reset', async () => {
    const playerStats = makePlayerStats();
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Bewitching_Magic_freeCast') return true;
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Misty Step', 3, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', '_Bewitching_Magic_freeCast', null, 'camp');
  });

  it('handles Signature Spells used flag reset', async () => {
    const playerStats = makePlayerStats();
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === 'SignatureSpells_selection') return ['Teleportation Circle'];
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Teleportation Circle', 3, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SignatureSpells_Teleportation_Circle_used', false, 'camp');
  });

  it('handles Divination Savant used flag reset', async () => {
    const playerStats = makePlayerStats();
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Divination_Savant_selection') return ['Warding Bond'];
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Warding Bond', 2, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', '_Divination_Savant_Warding_Bond_used', false, 'camp');
  });
});

// ---------------------------------------------------------------------------
// incrementFreeCastResource — Favored Enemy
// ---------------------------------------------------------------------------

describe('incrementFreeCastResource — Favored Enemy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  it('increments favored enemy uses', async () => {
    const playerStats = makePlayerStats();
    getRuntimeValue.mockImplementation((_key1, key2) => {
      if (key2 === '_Favored_Enemy_freeCastCount') return 2;
      return undefined;
    });

    incrementFreeCastResource('TestWizard', 'Fireball', 3, playerStats, 'camp');

    expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'favoredEnemyUses', 3, 'camp');
  });
});

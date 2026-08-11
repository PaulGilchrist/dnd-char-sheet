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

import { prepareSpellCast } from './spellPreparationService.js';

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

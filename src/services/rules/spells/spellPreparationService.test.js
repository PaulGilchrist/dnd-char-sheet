// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
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
  addEntry: vi.fn(),
}));

vi.mock('./metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

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

import { prepareSpellCast } from './spellPreparationService.js';

import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { breakConcentration, addConcentration, cleanupConcentrationEffects } from '../../../services/combat/concentration/concentrationService.js';
import * as storageService from '../../../services/ui/storage.js';

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

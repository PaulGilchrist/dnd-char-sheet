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
import { breakConcentration } from '../../../services/combat/concentration/concentrationService.js';

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

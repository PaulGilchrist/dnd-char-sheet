import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSpellAbilities } from './spellCalc2024.js';

vi.mock('../../character/classRules2024.js', () => ({
  default: {
    getHighestMajorLevel: vi.fn(() => undefined),
  },
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_key, _prop) => null),
}));

function makePlayerStats(overrides = {}) {
  return {
    name: 'HexWarlock',
    level: 14,
    proficiency: 5,
    class: {
      name: 'Warlock',
      class_levels: [{
        level: 14,
        spellcasting: {
          cantrips_known: 8,
          spell_slots_level_1: 0, spell_slots_level_2: 0, spell_slots_level_3: 0,
          spell_slots_level_4: 0, spell_slots_level_5: 2, spell_slots_level_6: 0,
          spell_slots_level_7: 0, spell_slots_level_8: 0, spell_slots_level_9: 0,
          spell_type: 'known',
        },
      }],
      spell_casting_ability: 'Charisma',
      ...overrides.class,
    },
    abilities: [
      { name: 'Charisma', baseScore: 16, featIncrease: 1, miscIncrease: 0, backgroundIncrease: 0, bonus: 4 },
    ],
    spells: [],
    automation: {},
    ...overrides,
  };
}

function makeSpell(name, level = 0, extra = {}) {
  return { name, level, damage: {}, casting_time: '1 action', range: 'Self', ...extra };
}

function ritualMasterPassive(extra = {}) {
  return {
    type: 'passive_rule',
    effect: 'ritual_spells',
    name: 'Ritual Spells',
    casting_time: 'passive',
    chosenSpells: true,
    quickRitual: true,
    spellCastingAbility: 'Charisma',
    hasAutomation: true,
    ...extra,
  };
}

function allRitualSpells() {
  return [
    makeSpell('Eldritch Blast', 0, { ritual: false }),
    makeSpell('Alarm', 1, { ritual: true }),
    makeSpell('Comprehend Languages', 1, { ritual: true }),
    makeSpell('Detect Magic', 1, { ritual: true }),
    makeSpell('Identify', 1, { ritual: true }),
    makeSpell('Purify Food and Drink', 1, { ritual: true }),
    makeSpell('Unseen Servant', 1, { ritual: true }),
  ];
}

describe('FT-068 spellCalc2024 Ritual Master injection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('injects ONLY the chosen ritual spells as always prepared, stamped _ritualMasterRitual with the feat ASI ability', () => {
    const stats = makePlayerStats({
      spells: ['Eldritch Blast'],
      ritualMasterSpells: ['Alarm', 'Identify'],
      automation: { ritualSpells: [ritualMasterPassive()] },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);

    const alarm = result.spells.find(s => s.name === 'Alarm');
    const identify = result.spells.find(s => s.name === 'Identify');
    expect(alarm).toBeDefined();
    expect(identify).toBeDefined();
    expect(alarm.prepared).toBe('Always');
    expect(identify.prepared).toBe('Always');
    expect(alarm._ritualMasterRitual).toBe(true);
    expect(identify._ritualMasterRitual).toBe(true);
    expect(alarm.spellCastingAbility).toBe('Charisma');
  });

  it('never injects the full ritual list for the chosen-spells feature (pitfall 24)', () => {
    const stats = makePlayerStats({
      spells: ['Eldritch Blast'],
      ritualMasterSpells: ['Alarm'],
      automation: { ritualSpells: [ritualMasterPassive()] },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);
    const names = result.spells.map(s => s.name);

    expect(names).toContain('Alarm');
    expect(names).not.toContain('Comprehend Languages');
    expect(names).not.toContain('Detect Magic');
    expect(names).not.toContain('Identify');
    expect(names).not.toContain('Purify Food and Drink');
    expect(names).not.toContain('Unseen Servant');
  });

  it('stamps chosen spells that already exist in the known spells list without duplicating them', () => {
    const stats = makePlayerStats({
      spells: ['Eldritch Blast', 'Alarm'],
      ritualMasterSpells: ['Alarm'],
      automation: { ritualSpells: [ritualMasterPassive()] },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);
    const alarms = result.spells.filter(s => s.name === 'Alarm');

    expect(alarms).toHaveLength(1);
    expect(alarms[0]._ritualMasterRitual).toBe(true);
    expect(alarms[0].spellCastingAbility).toBe('Charisma');
  });

  it('logs a console error when the feat ASI ability is unresolved and leaves class ability intact', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stats = makePlayerStats({
      spells: [],
      ritualMasterSpells: ['Alarm'],
      automation: { ritualSpells: [ritualMasterPassive({ spellCastingAbility: '' })] },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);
    const alarm = result.spells.find(s => s.name === 'Alarm');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Ritual Master is missing a spellcasting ability'));
    expect(alarm.spellCastingAbility).toBeUndefined();
    expect(result.spellCastingAbility).toBe('Charisma');
    errorSpy.mockRestore();
  });

  it('logs a console error when no ritual spells have been chosen', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stats = makePlayerStats({
      spells: [],
      automation: { ritualSpells: [ritualMasterPassive()] },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('no chosen ritual spells'));
    expect(result.spells.map(s => s.name)).toEqual([]);
    errorSpy.mockRestore();
  });

  it('leaves non-holders (no ritual_spells automation) completely unaffected', () => {
    const stats = makePlayerStats({ spells: ['Eldritch Blast'], automation: {} });

    const result = getSpellAbilities(allRitualSpells(), stats);

    expect(result.spells).toHaveLength(1);
    expect(result.spells[0].name).toBe('Eldritch Blast');
    expect(result.spells[0]._ritualMasterRitual).toBeUndefined();
  });

  it('still injects the full ritual list for non-chosen ritual_spells features (Ritual Caster)', () => {
    const stats = makePlayerStats({
      spells: ['Eldritch Blast'],
      automation: {
        ritualSpells: [{ type: 'passive_rule', effect: 'ritual_spells', name: 'Ritual Caster', casting_time: 'passive', hasAutomation: true }],
      },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);
    const names = result.spells.map(s => s.name);

    expect(names).toContain('Alarm');
    expect(names).toContain('Identify');
    expect(names).toContain('Unseen Servant');
  });

  it('keeps chosen lv1 ritual rows alive even when the warlock slot table has no lv1 slots', () => {
    const stats = makePlayerStats({
      spells: [],
      ritualMasterSpells: ['Alarm'],
      automation: { ritualSpells: [ritualMasterPassive()] },
    });

    const result = getSpellAbilities(allRitualSpells(), stats);

    expect(result.spell_slots_level_1 || 0).toBe(0);
    const alarm = result.spells.find(s => s.name === 'Alarm');
    expect(alarm).toBeDefined();
    expect(alarm._ritualMasterRitual).toBe(true);
  });
});

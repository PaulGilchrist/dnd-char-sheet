// CLA-231 regression: Mystic Arcanum spells (class.arcanums) are slotless free
// casts and must survive the "no spell slots at this level" filter in
// spellCalc2024.getSpellAbilities. Warlock Pact Magic slots cap at lv5, so
// before the fix every lv6+ arcanum was silently dropped from the sheet.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSpellAbilities } from './spellCalc2024.js';

// ── Module-level mocks for all ESM dependencies ──
vi.mock('../../character/classRules2024.js', () => ({
  default: {
    getHighestMajorLevel: vi.fn(() => undefined),
  },
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_key, _prop) => null),
}));

// ── Helpers ──

function makeWarlockPlayerStats(overrides = {}) {
  const classLevels = [];
  for (let lv = 1; lv <= 13; lv++) {
    classLevels.push({ level: lv, spellcasting: { cantrips_known: 2, spell_slots_level_1: 1, spell_type: 'known' } });
  }
  // lv14 Pact Magic: one lv5 slot, slots capped at lv5
  classLevels.push({
    level: 14,
    spellcasting: {
      cantrips_known: 2,
      spell_slots_level_1: 0,
      spell_slots_level_2: 0,
      spell_slots_level_3: 0,
      spell_slots_level_4: 0,
      spell_slots_level_5: 1,
      spell_type: 'known',
    },
  });
  return {
    name: 'HexWarlock',
    level: 14,
    proficiency: 5,
    class: {
      name: 'Warlock',
      class_levels: classLevels,
      spell_casting_ability: 'Charisma',
      arcanums: ['Eyebite', 'Etherealness'],
      ...overrides.class,
    },
    abilities: [
      { name: 'Charisma', baseScore: 16, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0, bonus: 3 },
    ],
    spells: ['Eldritch Blast', 'Hex', 'Seeming'],
    automation: {},
    ...overrides,
  };
}

const spells2024 = [
  { name: 'Eldritch Blast', level: 0, casting_time: '1 action' },
  { name: 'Hex', level: 1, casting_time: '1 bonus action' },
  { name: 'Seeming', level: 5, casting_time: '1 action' },
  { name: 'Eyebite', level: 6, casting_time: '1 action' },
  { name: 'Etherealness', level: 7, casting_time: '1 action' },
  { name: 'Circle of Death', level: 6, casting_time: '1 action' },
];

describe('spellCalc2024 — Mystic Arcanum slot-level filter exemption (CLA-231)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('keeps arcanum spells in spellAbilities.spells on a lv5-capped warlock slot table', () => {
    const stats = makeWarlockPlayerStats();
    const result = getSpellAbilities(spells2024, stats);

    const eyebrowite = result.spells.find(s => s.name === 'Eyebite');
    const etherealness = result.spells.find(s => s.name === 'Etherealness');

    expect(eyebrowite).toBeDefined();
    expect(eyebrowite.level).toBe(6);
    expect(eyebrowite.prepared).toBe('Always');
    expect(etherealness).toBeDefined();
    expect(etherealness.level).toBe(7);
    expect(etherealness.prepared).toBe('Always');
  });

  it('sorts arcanum rows after the slot-level spells', () => {
    const stats = makeWarlockPlayerStats();
    const result = getSpellAbilities(spells2024, stats);

    const levels = result.spells.map(s => s.level);
    const sorted = [...levels].sort((a, b) => a - b);
    expect(levels).toEqual(sorted);
    expect(levels[levels.length - 1]).toBe(7);
  });

  it('still filters lv6+ spells that are NOT selected arcanums', () => {
    const stats = makeWarlockPlayerStats({ spells: ['Eldritch Blast', 'Hex', 'Seeming', 'Circle of Death'] });
    const result = getSpellAbilities(spells2024, stats);

    expect(result.spells.find(s => s.name === 'Circle of Death')).toBeUndefined();
    // arcanum exemption is name-scoped, not level-wide
    expect(result.spells.find(s => s.name === 'Eyebite')).toBeDefined();
  });

  it('does not exempt arcanum names once removed from class.arcanums', () => {
    const stats = makeWarlockPlayerStats({ class: { arcanums: [] } });
    const result = getSpellAbilities(spells2024, stats);

    expect(result.spells.find(s => s.name === 'Eyebite')).toBeUndefined();
    expect(result.spells.find(s => s.name === 'Etherealness')).toBeUndefined();
  });
});

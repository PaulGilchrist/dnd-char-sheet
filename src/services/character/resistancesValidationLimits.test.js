import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dataLoader from '../ui/dataLoader.js';

vi.mock('../ui/dataLoader.js', () => ({
  loadWildMagicSurgeTable: vi.fn(async () => []),
  fetchClassData: vi.fn(),
  fetchRaceData: vi.fn(),
}));

import { getResistanceLimits } from './resistancesValidation.js';

// ── Factories ────────────────────────────────────────────────────────────────

const emptyRaceData = () => ({ name: 'Human', traits: [] });
const emptyClassData = () => ({ class_levels: [] });

const baseArgs = (overrides = {}) => ({
  rules: '5e',
  race: { name: 'Human' },
  class: { name: 'Wizard' },
  level: 1,
  ...overrides,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert that `result.resistances` contains exactly the given types.
 * Also asserts that `result.immunities` is empty (race-only test).
 */
function expectResistances(result, expected) {
  expect(result.resistances.sort()).toEqual(expected.sort());
  expect(result.immunities).toEqual([]);
}

/**
 * Assert that `result.immunities` contains exactly the given types.
 * Also asserts that `result.resistances` is empty (class-only test).
 */
function expectImmunities(result, expected) {
  expect(result.resistances).toEqual([]);
  expect(result.immunities.sort()).toEqual(expected.sort());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resistancesValidation getResistanceLimits - race resistances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── extract5eRaceResistances ─────────────────────────────────────────────

  describe('extract5eRaceResistances (via getResistanceLimits)', () => {
    it('extracts fire resistance from Tiefling Hellish Resistance', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Tiefling',
        traits: [
          {
            name: 'Hellish Resistance',
            description: ['You have resistance to fire damage.'],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(baseArgs({ rules: '5e', race: { name: 'Tiefling' } }));

      expectResistances(result, ['Fire']);
    });

    it('extracts poison resistance from Dwarf Dwarven Resilience', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Dwarf',
        traits: [
          {
            name: 'Dwarven Resilience',
            description: ['You have resistance against poison damage.'],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(baseArgs({ rules: '5e', race: { name: 'Dwarf' } }));

      expectResistances(result, ['Poison']);
    });

    it('extracts poison resistance from Stout Halfling Scout Resilience', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Halfling',
        subraces: [
          {
            name: 'Stout Halfling',
            racial_traits: [
              {
                name: 'Scout Resilience',
                description: ['You have resistance against poison damage.'],
              },
            ],
          },
        ],
        traits: [],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({
          rules: '5e',
          race: { name: 'Halfling', subrace: { name: 'Stout Halfling' } },
        }),
      );

      expectResistances(result, ['Poison']);
    });

    it('returns empty resistances when race has no traits', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(baseArgs());

      expectResistances(result, []);
    });

    it('returns empty resistances when raceData is null', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(baseArgs());

      expectResistances(result, []);
    });

    it('returns empty resistances when raceData has no traits property', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({ name: 'MysteryRace' });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(baseArgs());

      expectResistances(result, []);
    });

    it('returns empty resistances for Dragonborn "Damage Resistance" trait alone', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Dragonborn',
        traits: [
          {
            name: 'Damage Resistance',
            description: ['You have resistance to one damage type.'],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ rules: '5e', race: { name: 'Dragonborn' } }),
      );

      expectResistances(result, []);
    });

    it('extracts Fire resistance from Dragonborn subrace description (5e)', async () => {
      vi.mocked(dataLoader.fetchRaceData)
        .mockResolvedValueOnce({
          name: 'Dragonborn',
          traits: [
            {
              name: 'Damage Resistance',
              description: ['You have resistance to one damage type.'],
            },
          ],
        })
        .mockResolvedValueOnce({
          name: 'Dragonborn',
          traits: [
            {
              name: 'Damage Resistance',
              description: ['You have resistance to one damage type.'],
            },
          ],
          subraces: [
            { name: 'Gold Dragon', description: 'You have resistance to fire damage.' },
          ],
        });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({
          rules: '5e',
          race: { name: 'Dragonborn', subrace: { name: 'Gold Dragon' } },
        }),
      );

      expectResistances(result, ['Fire']);
    });

    it('handles non-array trait description (string fallback)', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Tiefling',
        traits: [
          {
            name: 'Hellish Resistance',
            description: 'You have resistance to fire damage.',
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(baseArgs({ race: { name: 'Tiefling' } }));

      expectResistances(result, ['Fire']);
    });

    it('handles undefined subrace gracefully', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ race: { name: 'Human', subrace: undefined } }),
      );

      expectResistances(result, []);
    });
  });

  // ── extract2024RaceResistances ───────────────────────────────────────────

  describe('extract2024RaceResistances (via getResistanceLimits)', () => {
    it('extracts Necrotic and Radiant from Aasimar Celestial Resistance', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Aasimar',
        traits: [
          {
            name: 'Celestial Resistance',
            description: 'Resistance to Necrotic and Radiant damage.',
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ rules: '2024', race: { name: 'Aasimar' } }),
      );

      expectResistances(result, ['Necrotic', 'Radiant']);
    });

    it('extracts Poison from 2024 Dwarf Dwarven Resilience', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Dwarf',
        traits: [
          {
            name: 'Dwarven Resilience',
            description: 'Resistance to Poison damage.',
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ rules: '2024', race: { name: 'Dwarf' } }),
      );

      expectResistances(result, ['Poison']);
    });

    it('extracts Acid from 2024 Dragonborn subrace traits array', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Dragonborn',
        traits: [
          {
            name: 'Damage Resistance',
            description: 'You have resistance to one damage type.',
          },
        ],
        subraces: [
          {
            name: 'Draconborn of Tiamat',
            traits: [{ description: 'Resistance to Acid damage.' }],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({
          rules: '2024',
          race: { name: 'Dragonborn', subrace: { name: 'Draconborn of Tiamat' } },
        }),
      );

      expectResistances(result, ['Acid']);
    });

    it('extracts Poison from 2024 Tiefling subrace traits', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Tiefling',
        traits: [
          {
            name: 'Fiendish Legacy',
            description: 'Your infernal heritage grants you a legacy.',
          },
        ],
        subraces: [
          {
            name: 'Abyssal Tiefling',
            traits: [{ description: 'Resistance to Poison damage.' }],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({
          rules: '2024',
          race: { name: 'Tiefling', subrace: { name: 'Abyssal Tiefling' } },
        }),
      );

      expectResistances(result, ['Poison']);
    });

    it('extracts Fire from 2024 Dragonborn subrace description', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Dragonborn',
        traits: [
          {
            name: 'Damage Resistance',
            description: 'Resistance to one damage type.',
          },
        ],
        subraces: [
          { name: 'Gold Dragonborn', description: 'Resistance to Fire damage.' },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({
          rules: '2024',
          race: { name: 'Dragonborn', subrace: { name: 'Gold Dragonborn' } },
        }),
      );

      expectResistances(result, ['Fire']);
    });

    it('extracts Cold from 2024 subrace with nested traits array', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'CustomRace',
        traits: [],
        subraces: [
          {
            name: 'Frost Subrace',
            traits: [{ description: 'You have Resistance to Cold damage.' }],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({
          rules: '2024',
          race: { name: 'CustomRace', subrace: { name: 'Frost Subrace' } },
        }),
      );

      expectResistances(result, ['Cold']);
    });

    it('returns empty resistances when raceData has no traits (2024)', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({ name: 'CustomRace' });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ rules: '2024', race: { name: 'CustomRace' } }),
      );

      expectResistances(result, []);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe('getResistanceLimits edge cases', () => {
    it('handles empty race name', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ race: { name: '' } }),
      );

      expectResistances(result, []);
    });

    it('handles missing subrace field', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Tiefling',
        traits: [
          {
            name: 'Hellish Resistance',
            description: ['You have resistance to fire damage.'],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ race: { name: 'Tiefling' } }),
      );

      expectResistances(result, ['Fire']);
    });

    it('handles 2024 rules without race', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ rules: '2024', race: { name: '' } }),
      );

      expectResistances(result, []);
      expect(result.details).toContain('2024');
    });

    it('handles missing class name', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(null);

      const result = await getResistanceLimits(
        baseArgs({ class: { name: '' } }),
      );

      expectImmunities(result, []);
    });

    it('includes race and class names in details message', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ race: { name: 'Human' }, class: { name: 'Wizard' } }),
      );

      expect(result.details).toContain('5e');
      expect(result.details).toContain('Human');
      expect(result.details).toContain('Wizard');
    });

    it('handles string subrace (not nested object)', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        name: 'Dwarf',
        traits: [
          {
            name: 'Dwarven Resilience',
            description: ['You have resistance against poison damage.'],
          },
        ],
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceLimits(
        baseArgs({ race: { name: 'Dwarf', subrace: 'Hill Dwarf' } }),
      );

      expectResistances(result, ['Poison']);
    });

    it('defaults to level 1 when level is missing', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 1,
            features: [
              {
                name: 'Immunity',
                description: 'You gain Immunity to Fire damage.',
              },
            ],
          },
          {
            level: 5,
            features: [
              {
                name: 'Advanced Immunity',
                description: 'You gain Immunity to Cold damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ class: { name: 'Fighter' } }),
      );

      expectImmunities(result, ['Fire']);
      expect(result.immunities).not.toContain('Cold');
    });

    it('returns details string with correct ruleset label', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result5e = await getResistanceLimits(baseArgs({ rules: '5e' }));
      const result2024 = await getResistanceLimits(baseArgs({ rules: '2024' }));

      expect(result5e.details).toContain('5e');
      expect(result2024.details).toContain('2024');
    });
  });
});

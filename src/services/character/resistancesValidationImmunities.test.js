// @improved-by-ai
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

const baseArgs = (overrides = {}) => ({
  rules: '5e',
  race: { name: 'Human' },
  class: { name: 'Wizard' },
  level: 1,
  ...overrides,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert that `result.resistances` is empty and `result.immunities` contains
 * exactly the given types (ignoring order).
 */
function expectImmunitiesOnly(result, expected) {
  expect(result.resistances).toEqual([]);
  expect(result.immunities.sort()).toEqual(expected.sort());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resistancesValidation getResistanceLimits - class immunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractClassImmunities (via getResistanceLimits)', () => {
    it('extracts Fire immunity from class features at or below level', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          { level: 1, features: [] },
          {
            level: 10,
            features: [
              {
                name: 'Damage Immunity',
                description: 'You gain Immunity to Fire damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 10, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, ['Fire']);
    });

    it('excludes immunities from levels above character level', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          { level: 1, features: [] },
          {
            level: 10,
            features: [
              {
                name: 'Damage Immunity',
                description: 'You gain Immunity to Fire damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 5, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, []);
    });

    it('filters out non-damage immunity types (e.g. Charmed)', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 6,
            features: [
              {
                name: 'Mystic Immunity',
                description: 'You gain Immunity to Charmed and Immunity to Fire.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 6, race: { name: 'Human' }, class: { name: 'Mystic' } }),
      );

      expectImmunitiesOnly(result, ['Fire']);
    });

    it('extracts Psychic immunity (valid damage type)', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 10,
            features: [
              {
                name: 'Damage Immunity',
                description: 'You gain Immunity to Psychic damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 10, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, ['Psychic']);
    });

    it('returns empty immunities when classData is null', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(null);

      const result = await getResistanceLimits(
        baseArgs({ race: { name: 'Human' }, class: { name: 'Nonexistent' } }),
      );

      expectImmunitiesOnly(result, []);
    });

    it('returns empty immunities when classData has no class_levels', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({ name: 'WeirdClass' });

      const result = await getResistanceLimits(
        baseArgs({ race: { name: 'Human' }, class: { name: 'WeirdClass' } }),
      );

      expectImmunitiesOnly(result, []);
    });

    it('extracts immunities from 5e subclass features at or below level', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [{ level: 1, features: [] }],
        subclasses: [
          {
            name: 'Test Subclass',
            class_levels: [
              { level: 1, features: [] },
              {
                level: 7,
                features: [
                  {
                    name: 'Subclass Feature',
                    description: 'You gain Immunity to Lightning damage.',
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 7, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, ['Lightning']);
    });

    it('excludes 5e subclass immunities above character level', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [{ level: 1, features: [] }],
        subclasses: [
          {
            name: 'Test Subclass',
            class_levels: [
              { level: 1, features: [] },
              {
                level: 14,
                features: [
                  {
                    name: 'Late Feature',
                    description: 'You gain Immunity to Fire damage.',
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 7, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, []);
    });

    it('extracts immunities from 2024 subclass majors at or below level', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [{ level: 1, features: [] }],
        majors: [
          {
            name: 'Path of the Test',
            features: [
              {
                level: 3,
                name: 'Test Feature',
                description: 'You gain Immunity to Fire damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ rules: '2024', level: 3, race: { name: 'Human' }, class: { name: 'Barbarian' } }),
      );

      expectImmunitiesOnly(result, ['Fire']);
    });

    it('excludes 2024 major immunities above character level', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [{ level: 1, features: [] }],
        majors: [
          {
            name: 'High Level Path',
            features: [
              {
                level: 10,
                name: 'Late Feature',
                description: 'You gain Immunity to Fire damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({
          rules: '2024',
          level: 5,
          race: { name: 'Human' },
          class: { name: 'Barbarian' },
        }),
      );

      expectImmunitiesOnly(result, []);
    });

    it('ignores condition immunities like "Immunity to Charmed" in Mindless Rage', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 6,
            features: [
              {
                name: 'Mindless Rage',
                description: 'You gain Immunity to Charmed and Frightened.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 6, race: { name: 'Human' }, class: { name: 'Barbarian' } }),
      );

      // Charmed and Frightened are conditions, not damage types
      expectImmunitiesOnly(result, []);
    });

    it('extracts multiple immunities from a single feature description', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 1,
            features: [
              {
                name: 'Multi Immunity',
                description: 'You gain Immunity to Fire damage and Immunity to Cold damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 1, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, ['Fire', 'Cold']);
    });

    it('extracts immunity from feature with array description', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 1,
            features: [
              {
                name: 'Damage Immunity',
                description: ['You gain', 'Immunity to', 'Radiant damage.'],
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 1, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, ['Radiant']);
    });

    it('rejects invalid damage types from immunity descriptions', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 1,
            features: [
              {
                name: 'Fake Immunity',
                description: 'You gain Immunity to Magic and Sneaky.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 1, race: { name: 'Human' }, class: { name: 'Fighter' } }),
      );

      expectImmunitiesOnly(result, []);
    });

    it('handles class with empty features array', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          { level: 1, features: [] },
        ],
      });

      const result = await getResistanceLimits(
        baseArgs({ level: 1, race: { name: 'Human' }, class: { name: 'Wizard' } }),
      );

      expectImmunitiesOnly(result, []);
    });
  });
});

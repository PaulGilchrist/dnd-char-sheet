import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dataLoader from '../ui/dataLoader.js';

vi.mock('../ui/dataLoader.js', () => ({
  loadWildMagicSurgeTable: vi.fn(async () => []),
  fetchClassData: vi.fn(),
  fetchRaceData: vi.fn(),
}));

import { getResistanceInfo } from './resistancesValidation.js';

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resistancesValidation getResistanceInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getResistanceInfo', () => {
    it('identifies resistance source from race', async () => {
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

      const result = await getResistanceInfo('Fire', 'resistance', baseArgs({ race: { name: 'Tiefling' } }));

      expect(result.isGranted).toBe(true);
      expect(result.isPreSelected).toBe(true);
      expect(result.source).toContain('Race');
    });

    it('returns isGranted false and Unknown source when resistance not granted', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceInfo('Fire', 'resistance', baseArgs());

      expect(result.isGranted).toBe(false);
      expect(result.isPreSelected).toBe(false);
      expect(result.source).toBe('Unknown');
    });

    it('identifies immunity source from class', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        class_levels: [
          {
            level: 1,
            features: [
              {
                name: 'Immunity',
                description: 'You gain Immunity to Psychic damage.',
              },
            ],
          },
        ],
      });

      const result = await getResistanceInfo(
        'Psychic',
        'immunity',
        baseArgs({ class: { name: 'Fighter' }, level: 1 }),
      );

      expect(result.isGranted).toBe(true);
      expect(result.isPreSelected).toBe(true);
      expect(result.source).toContain('Class');
    });

    it('handles 2024 ruleset correctly', async () => {
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

      const result = await getResistanceInfo(
        'Necrotic',
        'resistance',
        baseArgs({ rules: '2024', race: { name: 'Aasimar' } }),
      );

      expect(result.isGranted).toBe(true);
      expect(result.isPreSelected).toBe(true);
      expect(result.source).toContain('Race');
    });

    it('returns isGranted false for immunity when class has none', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(emptyRaceData());
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(emptyClassData());

      const result = await getResistanceInfo('Fire', 'immunity', baseArgs());

      expect(result.isGranted).toBe(false);
      expect(result.isPreSelected).toBe(false);
    });
  });
});

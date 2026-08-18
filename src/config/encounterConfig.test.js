// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { ENCOUNTER_CONFIG } from './encounterConfig.js';

const EXPECTED_KEYS = [
  'xpThresholds',
  'defaultDifficulty',
  'difficultyMultipliers',
  'crRange',
  'budgetTolerance',
  'deadlyMultiplier',
  'difficultyRatios',
  'defaultSuggestionCount',
  'suggestionOvergenerate',
];

describe('encounterConfig', () => {
  it('exports exactly the expected configuration keys and no extras', () => {
    const keys = Object.keys(ENCOUNTER_CONFIG);
    expect(keys).toHaveLength(9);
    expect(new Set(keys)).toEqual(new Set(EXPECTED_KEYS));
  });

  describe('xpThresholds', () => {
    it('is a 21×4 array (levels 0–20, easy/medium/hard/deadly)', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds).toHaveLength(21);
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        expect(level).toHaveLength(4);
      }
    });

    it('contains only non-negative integers', () => {
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        for (const val of level) {
          expect(Number.isInteger(val) && val >= 0).toBe(true);
        }
      }
    });

    it('increases across difficulties within every level', () => {
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        for (let i = 1; i < level.length; i++) {
          expect(level[i]).toBeGreaterThan(level[i - 1]);
        }
      }
    });

    it('increases across levels within every difficulty tier', () => {
      for (let d = 0; d < 4; d++) {
        for (let l = 1; l < ENCOUNTER_CONFIG.xpThresholds.length; l++) {
          expect(ENCOUNTER_CONFIG.xpThresholds[l][d]).toBeGreaterThan(
            ENCOUNTER_CONFIG.xpThresholds[l - 1][d],
          );
        }
      }
    });

    it('matches config-defined thresholds at level 0', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[0]).toEqual([15, 25, 40, 50]);
    });

    it('matches official D&D 5e thresholds at level 1', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[1]).toEqual([25, 50, 75, 100]);
    });

    it('matches official D&D 5e thresholds at level 20', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[20]).toEqual([2800, 5700, 8500, 12700]);
    });
  });

  describe('defaultDifficulty', () => {
    it('is 1 (Medium)', () => {
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBe(1);
    });
  });

  describe('difficultyMultipliers', () => {
    it('has exactly 6 entries mapping ratioMax to multiplier', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers).toHaveLength(6);
    });

    it('has strictly increasing ratioMax boundaries', () => {
      const ratios = ENCOUNTER_CONFIG.difficultyMultipliers.map((m) => m.ratioMax);
      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeGreaterThan(ratios[i - 1]);
      }
    });

    it('has strictly increasing multipliers', () => {
      const mults = ENCOUNTER_CONFIG.difficultyMultipliers.map((m) => m.multiplier);
      for (let i = 1; i < mults.length; i++) {
        expect(mults[i]).toBeGreaterThan(mults[i - 1]);
      }
    });

    it('uses the correct ratioMax/multiplier pairs', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers).toEqual([
        { ratioMax: 0.5, multiplier: 1 },
        { ratioMax: 1, multiplier: 1.5 },
        { ratioMax: 2, multiplier: 2 },
        { ratioMax: 3, multiplier: 2.5 },
        { ratioMax: 4, multiplier: 3 },
        { ratioMax: Infinity, multiplier: 4 },
      ]);
    });
  });

  describe('crRange', () => {
    it('uses 0.125 minMultiplier and 0.25 minGap', () => {
      expect(ENCOUNTER_CONFIG.crRange).toEqual({
        minMultiplier: 0.125,
        minGap: 0.25,
      });
    });
  });

  describe('budgetTolerance', () => {
    it('is 1.1 (10% over budget allowed)', () => {
      expect(ENCOUNTER_CONFIG.budgetTolerance).toBe(1.1);
    });
  });

  describe('deadlyMultiplier', () => {
    it('is 1.5 (caps at 1.5× deadly threshold)', () => {
      expect(ENCOUNTER_CONFIG.deadlyMultiplier).toBe(1.5);
    });
  });

  describe('difficultyRatios', () => {
    it('has easyMax=0.5, mediumMax=1, hardMax=1.5 in strictly increasing order', () => {
      const { easyMax, mediumMax, hardMax } = ENCOUNTER_CONFIG.difficultyRatios;
      expect(easyMax).toBe(0.5);
      expect(mediumMax).toBe(1);
      expect(hardMax).toBe(1.5);
      expect(easyMax).toBeLessThan(mediumMax);
      expect(mediumMax).toBeLessThan(hardMax);
    });
  });

  describe('suggestion settings', () => {
    it('defaultSuggestionCount is 3', () => {
      expect(ENCOUNTER_CONFIG.defaultSuggestionCount).toBe(3);
    });

    it('suggestionOvergenerate is 2', () => {
      expect(ENCOUNTER_CONFIG.suggestionOvergenerate).toBe(2);
    });
  });
});

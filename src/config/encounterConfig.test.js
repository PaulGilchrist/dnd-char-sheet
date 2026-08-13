// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { ENCOUNTER_CONFIG } from './encounterConfig.js';

describe('encounterConfig', () => {
  describe('ENCOUNTER_CONFIG structure', () => {
    it('should export ENCOUNTER_CONFIG as an object', () => {
      expect(ENCOUNTER_CONFIG).toBeDefined();
      expect(typeof ENCOUNTER_CONFIG).toBe('object');
    });
  });

  describe('xpThresholds', () => {
    it('should be a 2D array with 21 levels and 4 difficulties per level', () => {
      expect(Array.isArray(ENCOUNTER_CONFIG.xpThresholds)).toBeTruthy();
      expect(ENCOUNTER_CONFIG.xpThresholds.length).toBe(21);
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        expect(level.length).toBe(4);
      }
    });

    it('should have non-negative integers for all thresholds', () => {
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        for (const val of level) {
          expect(Number.isInteger(val)).toBeTruthy();
          expect(val).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should have increasing thresholds across difficulties within each level', () => {
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        for (let i = 1; i < level.length; i++) {
          expect(level[i]).toBeGreaterThan(level[i - 1]);
        }
      }
    });

    it('should have increasing thresholds across levels within each difficulty', () => {
      for (let diff = 0; diff < 4; diff++) {
        for (let level = 1; level < ENCOUNTER_CONFIG.xpThresholds.length; level++) {
          expect(ENCOUNTER_CONFIG.xpThresholds[level][diff]).toBeGreaterThan(
            ENCOUNTER_CONFIG.xpThresholds[level - 1][diff],
          );
        }
      }
    });

    it('should match known D&D 5e values for level 1 [Easy, Medium, Hard, Deadly]', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[0]).toEqual([15, 25, 40, 50]);
    });

    it('should match known D&D 5e values for level 21 [Easy, Medium, Hard, Deadly]', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[20]).toEqual([2800, 5700, 8500, 12700]);
    });
  });

  describe('defaultDifficulty', () => {
    it('should default to Medium (1)', () => {
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBe(1);
    });
  });

  describe('difficultyMultipliers', () => {
    it('should have exactly 6 entries with increasing ratioMax and multiplier values', () => {
      expect(Array.isArray(ENCOUNTER_CONFIG.difficultyMultipliers)).toBeTruthy();
      expect(ENCOUNTER_CONFIG.difficultyMultipliers.length).toBe(6);

      const ratioMaxes = ENCOUNTER_CONFIG.difficultyMultipliers.map((e) => e.ratioMax);
      const multipliers = ENCOUNTER_CONFIG.difficultyMultipliers.map((e) => e.multiplier);

      for (let i = 1; i < ratioMaxes.length; i++) {
        expect(ratioMaxes[i]).toBeGreaterThan(ratioMaxes[i - 1]);
      }
      for (let i = 1; i < multipliers.length; i++) {
        expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1]);
      }
    });

    it('should have correct entries for all 6 multiplier tiers', () => {
      const expected = [
        { ratioMax: 0.5, multiplier: 1 },
        { ratioMax: 1, multiplier: 1.5 },
        { ratioMax: 2, multiplier: 2 },
        { ratioMax: 3, multiplier: 2.5 },
        { ratioMax: 4, multiplier: 3 },
        { ratioMax: Infinity, multiplier: 4 },
      ];
      expect(ENCOUNTER_CONFIG.difficultyMultipliers).toEqual(expected);
    });
  });

  describe('crRange', () => {
    it('should have minMultiplier of 0.125 and minGap of 0.25', () => {
      expect(ENCOUNTER_CONFIG.crRange.minMultiplier).toBe(0.125);
      expect(ENCOUNTER_CONFIG.crRange.minGap).toBe(0.25);
    });
  });

  describe('budgetTolerance', () => {
    it('should be 1.1', () => {
      expect(ENCOUNTER_CONFIG.budgetTolerance).toBe(1.1);
    });
  });

  describe('deadlyMultiplier', () => {
    it('should be 1.5', () => {
      expect(ENCOUNTER_CONFIG.deadlyMultiplier).toBe(1.5);
    });
  });

  describe('difficultyRatios', () => {
    it('should have strictly increasing ratio boundaries', () => {
      const { easyMax, mediumMax, hardMax } = ENCOUNTER_CONFIG.difficultyRatios;
      expect(easyMax).toBe(0.5);
      expect(mediumMax).toBe(1);
      expect(hardMax).toBe(1.5);
      expect(easyMax).toBeLessThan(mediumMax);
      expect(mediumMax).toBeLessThan(hardMax);
    });
  });

  describe('suggestion settings', () => {
    it('should have defaultSuggestionCount of 3 and suggestionOvergenerate of 2', () => {
      expect(ENCOUNTER_CONFIG.defaultSuggestionCount).toBe(3);
      expect(ENCOUNTER_CONFIG.suggestionOvergenerate).toBe(2);
      expect(Number.isInteger(ENCOUNTER_CONFIG.defaultSuggestionCount)).toBeTruthy();
      expect(Number.isInteger(ENCOUNTER_CONFIG.suggestionOvergenerate)).toBeTruthy();
    });
  });
});

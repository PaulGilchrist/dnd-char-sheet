import { describe, it, expect } from 'vitest';
import { ENCOUNTER_CONFIG } from './encounterConfig.js';

describe('encounterConfig', () => {
  describe('ENCOUNTER_CONFIG structure', () => {
    it('should export ENCOUNTER_CONFIG as an object', () => {
      expect(ENCOUNTER_CONFIG).toBeDefined();
      expect(typeof ENCOUNTER_CONFIG).toBe('object');
    });

    it('should have exactly the expected top-level keys', () => {
      const expectedKeys = [
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
      expect(Object.keys(ENCOUNTER_CONFIG)).toEqual(expectedKeys);
    });
  });

  describe('xpThresholds', () => {
    it('should be a 2D array with 21 levels', () => {
      expect(Array.isArray(ENCOUNTER_CONFIG.xpThresholds)).toBe(true);
      expect(ENCOUNTER_CONFIG.xpThresholds.length).toBe(21);
    });

    it('should have exactly 4 difficulty entries per level', () => {
      for (let i = 0; i < ENCOUNTER_CONFIG.xpThresholds.length; i++) {
        expect(ENCOUNTER_CONFIG.xpThresholds[i].length).toBe(4);
      }
    });

    it('should have non-negative integers for all thresholds', () => {
      for (let level = 0; level < ENCOUNTER_CONFIG.xpThresholds.length; level++) {
        for (let diff = 0; diff < 4; diff++) {
          const val = ENCOUNTER_CONFIG.xpThresholds[level][diff];
          expect(Number.isInteger(val)).toBe(true);
          expect(val).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should have increasing thresholds across difficulties within a level', () => {
      for (let level = 0; level < ENCOUNTER_CONFIG.xpThresholds.length; level++) {
        const thresholds = ENCOUNTER_CONFIG.xpThresholds[level];
        for (let diff = 1; diff < thresholds.length; diff++) {
          expect(thresholds[diff]).toBeGreaterThan(thresholds[diff - 1]);
        }
      }
    });

    it('should have increasing thresholds across levels within a difficulty', () => {
      for (let diff = 0; diff < 4; diff++) {
        for (let level = 1; level < ENCOUNTER_CONFIG.xpThresholds.length; level++) {
          expect(ENCOUNTER_CONFIG.xpThresholds[level][diff]).toBeGreaterThan(
            ENCOUNTER_CONFIG.xpThresholds[level - 1][diff],
          );
        }
      }
    });

    it('should have known values for level 1 [Easy, Medium, Hard, Deadly]', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[0]).toEqual([15, 25, 40, 50]);
    });

    it('should have known values for level 21 [Easy, Medium, Hard, Deadly]', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[20]).toEqual([2800, 5700, 8500, 12700]);
    });
  });

  describe('defaultDifficulty', () => {
    it('should be a number', () => {
      expect(typeof ENCOUNTER_CONFIG.defaultDifficulty).toBe('number');
    });

    it('should be a valid difficulty index (0-3)', () => {
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBeGreaterThanOrEqual(0);
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBeLessThanOrEqual(3);
    });

    it('should default to Medium (1)', () => {
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBe(1);
    });
  });

  describe('difficultyMultipliers', () => {
    it('should be an array of objects with ratioMax and multiplier', () => {
      expect(Array.isArray(ENCOUNTER_CONFIG.difficultyMultipliers)).toBe(true);
      for (const entry of ENCOUNTER_CONFIG.difficultyMultipliers) {
        expect(entry).toHaveProperty('ratioMax');
        expect(entry).toHaveProperty('multiplier');
        expect(typeof entry.ratioMax).toBe('number');
        expect(typeof entry.multiplier).toBe('number');
      }
    });

    it('should have 6 entries', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers.length).toBe(6);
    });

    it('should have increasing ratioMax values', () => {
      const ratioMaxes = ENCOUNTER_CONFIG.difficultyMultipliers.map((e) => e.ratioMax);
      for (let i = 1; i < ratioMaxes.length; i++) {
        expect(ratioMaxes[i]).toBeGreaterThan(ratioMaxes[i - 1]);
      }
    });

    it('should have increasing multipliers', () => {
      const multipliers = ENCOUNTER_CONFIG.difficultyMultipliers.map((e) => e.multiplier);
      for (let i = 1; i < multipliers.length; i++) {
        expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1]);
      }
    });

    it('should have ratioMax 0.5 with multiplier 1', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[0]).toEqual({
        ratioMax: 0.5,
        multiplier: 1,
      });
    });

    it('should have ratioMax Infinity with multiplier 4', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[5].ratioMax).toBe(Infinity);
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[5].multiplier).toBe(4);
    });

    it('should have ratioMax 1 with multiplier 1.5', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[1]).toEqual({
        ratioMax: 1,
        multiplier: 1.5,
      });
    });

    it('should have ratioMax 2 with multiplier 2', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[2]).toEqual({
        ratioMax: 2,
        multiplier: 2,
      });
    });

    it('should have ratioMax 3 with multiplier 2.5', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[3]).toEqual({
        ratioMax: 3,
        multiplier: 2.5,
      });
    });

    it('should have ratioMax 4 with multiplier 3', () => {
      expect(ENCOUNTER_CONFIG.difficultyMultipliers[4]).toEqual({
        ratioMax: 4,
        multiplier: 3,
      });
    });
  });

  describe('crRange', () => {
    it('should be an object with minMultiplier and minGap', () => {
      expect(ENCOUNTER_CONFIG.crRange).toBeDefined();
      expect(typeof ENCOUNTER_CONFIG.crRange).toBe('object');
      expect(ENCOUNTER_CONFIG.crRange).toHaveProperty('minMultiplier');
      expect(ENCOUNTER_CONFIG.crRange).toHaveProperty('minGap');
    });

    it('should have minMultiplier of 0.125', () => {
      expect(ENCOUNTER_CONFIG.crRange.minMultiplier).toBe(0.125);
    });

    it('should have minGap of 0.25', () => {
      expect(ENCOUNTER_CONFIG.crRange.minGap).toBe(0.25);
    });

    it('should have positive numeric values', () => {
      expect(ENCOUNTER_CONFIG.crRange.minMultiplier).toBeGreaterThan(0);
      expect(ENCOUNTER_CONFIG.crRange.minGap).toBeGreaterThan(0);
    });
  });

  describe('budgetTolerance', () => {
    it('should be a number', () => {
      expect(typeof ENCOUNTER_CONFIG.budgetTolerance).toBe('number');
    });

    it('should be 1.1', () => {
      expect(ENCOUNTER_CONFIG.budgetTolerance).toBe(1.1);
    });

    it('should be >= 1', () => {
      expect(ENCOUNTER_CONFIG.budgetTolerance).toBeGreaterThanOrEqual(1);
    });
  });

  describe('deadlyMultiplier', () => {
    it('should be a number', () => {
      expect(typeof ENCOUNTER_CONFIG.deadlyMultiplier).toBe('number');
    });

    it('should be 1.5', () => {
      expect(ENCOUNTER_CONFIG.deadlyMultiplier).toBe(1.5);
    });

    it('should be > 1', () => {
      expect(ENCOUNTER_CONFIG.deadlyMultiplier).toBeGreaterThan(1);
    });
  });

  describe('difficultyRatios', () => {
    it('should be an object with easyMax, mediumMax, and hardMax', () => {
      expect(ENCOUNTER_CONFIG.difficultyRatios).toBeDefined();
      expect(typeof ENCOUNTER_CONFIG.difficultyRatios).toBe('object');
      expect(ENCOUNTER_CONFIG.difficultyRatios).toHaveProperty('easyMax');
      expect(ENCOUNTER_CONFIG.difficultyRatios).toHaveProperty('mediumMax');
      expect(ENCOUNTER_CONFIG.difficultyRatios).toHaveProperty('hardMax');
    });

    it('should have easyMax of 0.5', () => {
      expect(ENCOUNTER_CONFIG.difficultyRatios.easyMax).toBe(0.5);
    });

    it('should have mediumMax of 1', () => {
      expect(ENCOUNTER_CONFIG.difficultyRatios.mediumMax).toBe(1);
    });

    it('should have hardMax of 1.5', () => {
      expect(ENCOUNTER_CONFIG.difficultyRatios.hardMax).toBe(1.5);
    });

    it('should have strictly increasing ratio boundaries', () => {
      const { easyMax, mediumMax, hardMax } = ENCOUNTER_CONFIG.difficultyRatios;
      expect(easyMax).toBeLessThan(mediumMax);
      expect(mediumMax).toBeLessThan(hardMax);
    });

    it('should have positive numeric values', () => {
      expect(ENCOUNTER_CONFIG.difficultyRatios.easyMax).toBeGreaterThan(0);
      expect(ENCOUNTER_CONFIG.difficultyRatios.mediumMax).toBeGreaterThan(0);
      expect(ENCOUNTER_CONFIG.difficultyRatios.hardMax).toBeGreaterThan(0);
    });
  });

  describe('suggestion settings', () => {
    it('should have defaultSuggestionCount as a positive integer', () => {
      expect(typeof ENCOUNTER_CONFIG.defaultSuggestionCount).toBe('number');
      expect(Number.isInteger(ENCOUNTER_CONFIG.defaultSuggestionCount)).toBe(true);
      expect(ENCOUNTER_CONFIG.defaultSuggestionCount).toBeGreaterThan(0);
    });

    it('should have defaultSuggestionCount of 3', () => {
      expect(ENCOUNTER_CONFIG.defaultSuggestionCount).toBe(3);
    });

    it('should have suggestionOvergenerate as a positive integer', () => {
      expect(typeof ENCOUNTER_CONFIG.suggestionOvergenerate).toBe('number');
      expect(Number.isInteger(ENCOUNTER_CONFIG.suggestionOvergenerate)).toBe(true);
      expect(ENCOUNTER_CONFIG.suggestionOvergenerate).toBeGreaterThan(0);
    });

    it('should have suggestionOvergenerate of 2', () => {
      expect(ENCOUNTER_CONFIG.suggestionOvergenerate).toBe(2);
    });
  });
});

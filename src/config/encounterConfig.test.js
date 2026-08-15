// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { ENCOUNTER_CONFIG } from './encounterConfig.js';

describe('encounterConfig', () => {
  describe('ENCOUNTER_CONFIG structure', () => {
    it('should export an object with every expected configuration key', () => {
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
      for (const key of expectedKeys) {
        expect(ENCOUNTER_CONFIG).toHaveProperty(key);
      }
    });
  });

  describe('xpThresholds', () => {
    it('should be a 2D array with 21 rows (levels 0-20) and 4 difficulty columns per row', () => {
      expect(Array.isArray(ENCOUNTER_CONFIG.xpThresholds)).toBe(true);
      expect(ENCOUNTER_CONFIG.xpThresholds).toHaveLength(21);
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        expect(level).toHaveLength(4);
      }
    });

    it('should contain only non-negative integers', () => {
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        for (const val of level) {
          expect(Number.isInteger(val)).toBe(true);
          expect(val).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should increase across difficulties within each level', () => {
      for (const level of ENCOUNTER_CONFIG.xpThresholds) {
        for (let i = 1; i < level.length; i++) {
          expect(level[i]).toBeGreaterThan(level[i - 1]);
        }
      }
    });

    it('should increase across levels within each difficulty', () => {
      for (let diff = 0; diff < 4; diff++) {
        for (let level = 1; level < ENCOUNTER_CONFIG.xpThresholds.length; level++) {
          expect(ENCOUNTER_CONFIG.xpThresholds[level][diff]).toBeGreaterThan(
            ENCOUNTER_CONFIG.xpThresholds[level - 1][diff],
          );
        }
      }
    });

    it('should match the official D&D 5e thresholds for level 1', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[1]).toEqual([25, 50, 75, 100]);
    });

    it('should match the official D&D 5e thresholds for level 20', () => {
      expect(ENCOUNTER_CONFIG.xpThresholds[20]).toEqual([2800, 5700, 8500, 12700]);
    });
  });

  describe('defaultDifficulty', () => {
    it('should default to Medium (1)', () => {
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBe(1);
    });

    it('should be a valid difficulty index inside the xpThresholds columns', () => {
      expect(Number.isInteger(ENCOUNTER_CONFIG.defaultDifficulty)).toBe(true);
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBeGreaterThanOrEqual(0);
      expect(ENCOUNTER_CONFIG.defaultDifficulty).toBeLessThan(4);
    });
  });

  describe('difficultyMultipliers', () => {
    it('should define the full 6-tier ratio table from few monsters to swarm', () => {
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
    it('should default to a minimum CR of 1/8 the average level with a 0.25 floor', () => {
      expect(ENCOUNTER_CONFIG.crRange.minMultiplier).toBe(0.125);
      expect(ENCOUNTER_CONFIG.crRange.minGap).toBe(0.25);
    });

    it('should use positive values so the CR window always stays valid', () => {
      expect(ENCOUNTER_CONFIG.crRange.minMultiplier).toBeGreaterThan(0);
      expect(ENCOUNTER_CONFIG.crRange.minGap).toBeGreaterThan(0);
    });
  });

  describe('budgetTolerance', () => {
    it('should allow up to 10% over the XP budget', () => {
      expect(ENCOUNTER_CONFIG.budgetTolerance).toBe(1.1);
    });

    it('should be greater than 1 so trims only happen above the target budget', () => {
      expect(ENCOUNTER_CONFIG.budgetTolerance).toBeGreaterThan(1);
    });
  });

  describe('deadlyMultiplier', () => {
    it('should cap suggestions at 1.5x the deadly threshold', () => {
      expect(ENCOUNTER_CONFIG.deadlyMultiplier).toBe(1.5);
    });

    it('should be greater than 1 so over-deadly headroom exists', () => {
      expect(ENCOUNTER_CONFIG.deadlyMultiplier).toBeGreaterThan(1);
    });
  });

  describe('difficultyRatios', () => {
    it('should use strictly increasing boundary ratios from Easy to Deadly', () => {
      const { easyMax, mediumMax, hardMax } = ENCOUNTER_CONFIG.difficultyRatios;
      expect(easyMax).toBe(0.5);
      expect(mediumMax).toBe(1);
      expect(hardMax).toBe(1.5);
      expect(easyMax).toBeLessThan(mediumMax);
      expect(mediumMax).toBeLessThan(hardMax);
    });
  });

  describe('suggestion settings', () => {
    it('should default to 3 suggestions with an overgenerate factor of 2', () => {
      expect(ENCOUNTER_CONFIG.defaultSuggestionCount).toBe(3);
      expect(ENCOUNTER_CONFIG.suggestionOvergenerate).toBe(2);
    });

    it('should use positive integers so suggestion generation can produce results', () => {
      for (const value of [ENCOUNTER_CONFIG.defaultSuggestionCount, ENCOUNTER_CONFIG.suggestionOvergenerate]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

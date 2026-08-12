// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { findFeat } from '../../services/shared/featFinder.js';
import {
  computeAllFeatBuffs,
} from './featBuffService.js';

vi.mock('../../services/shared/featFinder.js', () => ({
  findFeat: vi.fn(),
}));

vi.mock('../../services/shared/buffApplier.js', () => ({
  applyAbilityScoreIncreases: vi.fn(),
  mergeDeduplicated: vi.fn(),
  resetMiscBonuses: vi.fn(),
}));

describe('computeAllFeatBuffs — edge cases and error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('edge cases and error handling', () => {
    it('should throw when formData is null', () => {
      expect(() => computeAllFeatBuffs(null, [])).toThrow();
    });

    it('should return empty result when formData has no rules field', () => {
      const result = computeAllFeatBuffs({}, []);

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should return empty result when feats array is empty', () => {
      const result = computeAllFeatBuffs({ rules: '5e', feats: [] }, []);

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should return empty result when allFeats is null', () => {
      findFeat.mockReturnValue(null);

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Tough'] },
        null
      );

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should return empty result when findFeat returns null for all selected feats', () => {
      findFeat.mockReturnValue(null);

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Nonexistent1', 'Nonexistent2'] },
        [{ name: 'SomeFeat' }]
      );

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });
  });

  describe('aggregation across multiple feats', () => {
    it('should aggregate buffs from multiple 5e feats', () => {
      findFeat
        .mockReturnValueOnce({
          name: 'Tough',
          benefits: ['Increase your Strength score by 2'],
        })
        .mockReturnValueOnce({
          name: 'Alert',
          benefits: ['You gain proficiency with shields'],
        });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Tough', 'Alert'] },
        [{ name: 'Tough' }, { name: 'Alert' }]
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, featName: 'Tough', featDescription: undefined, max_value: 20 },
      ]);
      expect(result.proficiencies).toEqual([
        { name: 'Shields', type: 'proficiency' },
      ]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should aggregate multiple 2024 feat buffs', () => {
      findFeat
        .mockReturnValueOnce({
          name: 'ASI Feat',
          benefits: [
            {
              type: 'ability_score_increase',
              description: '+1 STR',
            },
          ],
          ability_score_increase: { scores: ['Strength'], amount: 1 },
        })
        .mockReturnValueOnce({
          name: 'Prof Feat',
          benefits: [
            {
              type: 'proficiency',
              name: 'Custom Feat',
              description:
                'You gain training with heavy armor and shields',
            },
          ],
        });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['ASI Feat', 'Prof Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'Strength',
          amount: 1,
          isChoice: false,
          description: '+1 STR',
          featName: 'ASI Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
        { name: 'Shields', type: 'proficiency' },
      ]);
    });
  });
});

// @improved-by-ai
import { describe, it, expect, vi, afterEach } from 'vitest';

import { findFeat } from '../shared/featFinder.js';
import {
  mergeDeduplicated,
} from '../shared/buffApplier.js';

import { applyFeatBuffsToFormData } from './featBuffService.js';

vi.mock('../shared/featFinder.js', () => ({
  findFeat: vi.fn(),
}));

vi.mock('../shared/buffApplier.js', () => ({
  mergeDeduplicated: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('applyFeatBuffsToFormData', () => {
  const makeFormData = (overrides = {}) => ({
    rules: '5e',
    feats: ['Tough'],
    abilities: [
      { name: 'Strength', featIncrease: 0 },
      { name: 'Dexterity', featIncrease: 0 },
      { name: 'Constitution', featIncrease: 0 },
    ],
    ...overrides,
  });

  describe('side effects on formData', () => {
    it('applies non-choice ability score increases to matching abilities in formData', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength score by 2'],
      });

      applyFeatBuffsToFormData(formData, []);

      expect(formData.abilities[0].featIncrease).toBe(2);
      expect(formData.abilities[1].featIncrease).toBe(0);
      expect(formData.abilities[2].featIncrease).toBe(0);
    });

    it('accumulates ability score increases when multiple feats affect the same ability', () => {
      const formData = makeFormData({
        feats: ['Feat1', 'Feat2'],
      });

      findFeat
        .mockReturnValueOnce({
          benefits: ['Increase your Strength score by 2'],
        })
        .mockReturnValueOnce({
          benefits: ['Increase your Strength score by 1'],
        });

      applyFeatBuffsToFormData(formData, []);

      expect(formData.abilities[0].featIncrease).toBe(3);
    });

    it('matches ability names case-insensitively', () => {
      const formData = makeFormData({
        abilities: [{ name: 'strength', featIncrease: 0 }],
      });

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength score by 2'],
      });

      applyFeatBuffsToFormData(formData, []);

      expect(formData.abilities[0].featIncrease).toBe(2);
    });

    it('merges resistances from feat parsing into formData via mergeDeduplicated', () => {
      const formData = makeFormData({ resistances: ['cold'] });

      findFeat.mockReturnValue({
        benefits: ['You have resistance to fire'],
      });

      applyFeatBuffsToFormData(formData, []);

      expect(mergeDeduplicated).toHaveBeenCalledWith(
        formData,
        'resistances',
        ['fire']
      );
    });

    it('does not crash when formData has no abilities array', () => {
      const formData = {
        rules: '5e',
        feats: ['Tough'],
      };

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength score by 2'],
      });

      expect(() => applyFeatBuffsToFormData(formData, [])).not.toThrow();
    });
  });

  describe('return value structure', () => {
    it('returns abilityScoreIncreases parsed from 5e benefit text', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength score by 2'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, max_value: 20 },
      ]);
    });

    it('returns proficiencies parsed from 5e benefit text', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['You gain proficiency with heavy armor'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
      ]);
    });

    it('returns resistances parsed from 5e benefit text', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['You have resistance to fire'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.resistances).toEqual(['fire']);
    });

    it('returns features with type "speed" for speed benefit text', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Your speed increases by 10 feet'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('speed');
    });

    it('returns features with type "passive" for unrecognized benefit text', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['You can cast detect magic at will'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('passive');
    });

    it('returns all four buff categories when a feat produces mixed benefits', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: [
          'Increase your Strength score by 2',
          'You gain proficiency with heavy armor',
          'You have resistance to fire',
          'Your speed increases by 10 feet',
        ],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toHaveLength(1);
      expect(result.proficiencies).toHaveLength(1);
      expect(result.resistances).toHaveLength(1);
      expect(result.features).toHaveLength(1);
    });

    it('returns empty arrays for all categories when no feats are selected', () => {
      const formData = makeFormData({ feats: [] });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });
  });

  describe('ability score increase parsing', () => {
    it('marks isChoice true when benefit text contains "or" (dual ability selection)', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength or Dexterity score by 2'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toHaveLength(2);
      expect(result.abilityScoreIncreases[0].name).toBe('Strength');
      expect(result.abilityScoreIncreases[0].isChoice).toBe(true);
      expect(result.abilityScoreIncreases[1].name).toBe('Dexterity');
      expect(result.abilityScoreIncreases[1].isChoice).toBe(true);
    });

    it('marks isChoice true and name "any" for choose-one ability score benefits', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Choose one ability score. Increase the chosen ability score by 1'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toHaveLength(1);
      expect(result.abilityScoreIncreases[0].name).toBe('any');
      expect(result.abilityScoreIncreases[0].isChoice).toBe(true);
      expect(result.abilityScoreIncreases[0].description).toBe(
        'Choose one ability score. Increase the chosen ability score by 1'
      );
    });

    it('sets isChoice false for single-ability increases without "or"', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Increase your Constitution score by 1'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases[0].isChoice).toBe(false);
    });

    it('sets max_value to 30 when benefit text mentions "maximum of 30"', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength score by 2, to a maximum of 30.'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases[0].max_value).toBe(30);
    });
  });

  describe('features parsing', () => {
    it('creates speed feature with parsed numeric value', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Your speed increases by 15 feet'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('speed');
      expect(result.features[0].value).toBe(15);
    });

    it('creates initiative feature with parsed numeric value', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['You gain a +2 bonus to initiative'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('initiative');
      expect(result.features[0].value).toBe(2);
    });

    it('creates hp_per_level feature when benefit mentions "additional" hit points', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['your hit point maximum increases by an additional 4 hit points'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('hp_per_level');
      expect(result.features[0].value).toBe(4);
    });

    it('creates hp_flat feature for flat hit point increases', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Your hit point maximum increases by 10'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('hp_flat');
      expect(result.features[0].value).toBe(10);
    });

    it('creates language feature with parsed numeric value', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['You learn 2 languages of your choice'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('language');
      expect(result.features[0].value).toBe(2);
    });
  });

  describe('ruleset handling', () => {
    it('defaults to "5e" ruleset when not specified', () => {
      const formData = {
        feats: ['Tough'],
        abilities: [{ name: 'Strength', featIncrease: 0 }],
      };

      findFeat.mockReturnValue({
        benefits: ['Increase your Strength score by 2'],
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, max_value: 20 },
      ]);
    });

    it('uses "2024" ruleset when specified', () => {
      const formData = makeFormData({ rules: '2024' });

      findFeat.mockReturnValue({
        benefits: [
          { type: 'ability_score_increase', description: '+1 STR' },
        ],
        ability_score_increase: { scores: ['Strength'], amount: 1 },
      });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 1, isChoice: false, description: '+1 STR', max_value: 20 },
      ]);
    });
  });

  describe('edge cases', () => {
    it('aggregates buffs from multiple feats', () => {
      findFeat
        .mockReturnValueOnce({
          benefits: ['Increase your Strength score by 2'],
        })
        .mockReturnValueOnce({
          benefits: ['Increase your Dexterity score by 1'],
        });

      const formData = makeFormData({ feats: ['Tough', 'Alert'] });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toHaveLength(2);
      expect(result.abilityScoreIncreases[0].name).toBe('Strength');
      expect(result.abilityScoreIncreases[0].amount).toBe(2);
      expect(result.abilityScoreIncreases[1].name).toBe('Dexterity');
      expect(result.abilityScoreIncreases[1].amount).toBe(1);
    });

    it('skips feats that are not found (findFeat returns null)', () => {
      findFeat.mockReturnValue(null);

      const formData = makeFormData({ feats: ['Nonexistent'] });

      const result = applyFeatBuffsToFormData(formData, []);

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('skips choice/any ability score increases when applying side effects to formData', () => {
      const formData = makeFormData();

      findFeat.mockReturnValue({
        benefits: ['Choose one ability score. Increase the chosen ability score by 2'],
      });

      applyFeatBuffsToFormData(formData, []);

      // "any" name should be filtered out; no ability should be modified
      expect(formData.abilities.every(a => a.featIncrease === 0)).toBe(true);
    });

    it('aggregates ability score increases from multiple feats into the same ability', () => {
      const formData = makeFormData({ feats: ['FeatA', 'FeatB'] });

      findFeat
        .mockReturnValueOnce({
          benefits: ['Increase your Strength score by 2'],
        })
        .mockReturnValueOnce({
          benefits: ['Increase your Strength score by 1'],
        });

      applyFeatBuffsToFormData(formData, []);

      expect(formData.abilities[0].featIncrease).toBe(3);
    });
  });
});

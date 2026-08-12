// @cleaned-by-ai
import { describe, it, expect } from 'vitest';

import { computeFeatBuffs } from './featBuffService.js';

describe('computeFeatBuffs — 5e ruleset', () => {
  describe('null/undefined/empty handling', () => {
    it('returns empty result when feat is null', () => {
      expect(computeFeatBuffs(null, '5e')).toEqual({
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      });
    });

    it('returns empty result when feat is undefined', () => {
      expect(computeFeatBuffs(undefined, '5e')).toEqual({
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      });
    });

    it('returns empty result when feat has no benefits property', () => {
      expect(computeFeatBuffs({}, '5e')).toEqual({
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      });
    });

    it('returns empty result when benefits is not an array', () => {
      expect(computeFeatBuffs({ benefits: 'not-an-array' }, '5e')).toEqual({
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      });
    });

    it('returns empty result when benefits is an empty array', () => {
      expect(computeFeatBuffs({ benefits: [] }, '5e')).toEqual({
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      });
    });
  });

  describe('ability score increases', () => {
    it('parses a single ability score increase', () => {
      const result = computeFeatBuffs(
        { benefits: ['Increase your Strength score by 2'] },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, max_value: 20 },
      ]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('parses case-insensitive ability score increase', () => {
      const result = computeFeatBuffs(
        { benefits: ['increase your intelligence score by 1'] },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'intelligence', amount: 1, isChoice: false, max_value: 20 },
      ]);
    });

    it('parses an ability score increase with "or" as two choice entries', () => {
      const result = computeFeatBuffs(
        { benefits: ['Increase your Strength or Dexterity score by 1'] },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 1, isChoice: true, max_value: 20 },
        { name: 'Dexterity', amount: 1, isChoice: true, max_value: 20 },
      ]);
    });

    it('parses a "choose one" ability score increase', () => {
      const result = computeFeatBuffs(
        { benefits: ['Choose one ability score. Increase the chosen ability score by 2'] },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 2,
          isChoice: true,
          description: 'Choose one ability score. Increase the chosen ability score by 2',
          max_value: 20,
        },
      ]);
    });
  });

  describe('proficiencies', () => {
    it('parses a proficiency gain', () => {
      const result = computeFeatBuffs(
        { benefits: ['You gain proficiency with heavy armor'] },
        '5e'
      );

      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
      ]);
    });

    it('parses a proficiency choice', () => {
      const result = computeFeatBuffs(
        { benefits: ['You gain proficiency in any combination of two skills of your choice'] },
        '5e'
      );

      expect(result.proficiencies).toEqual([
        { name: 'Two Skills', type: 'proficiency', isChoice: true },
      ]);
    });
  });

  describe('features (speed, initiative, HP, language, resistance)', () => {
    it('parses a speed increase', () => {
      const result = computeFeatBuffs(
        { benefits: ['Your speed increases by 10 feet'] },
        '5e'
      );

      expect(result.features).toEqual([
        { name: 'Speed Bonus', description: 'Your speed increases by 10 feet', type: 'speed', value: 10 },
      ]);
    });

    it('parses an initiative bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['You gain a +5 bonus to initiative'] },
        '5e'
      );

      expect(result.features).toEqual([
        { name: 'Initiative Bonus', description: 'You gain a +5 bonus to initiative', type: 'initiative', value: 5 },
      ]);
    });

    it('parses an HP per level bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['your hit point maximum increases by an additional 2 hit points'] },
        '5e'
      );

      expect(result.features).toEqual([
        { name: 'Hit Point Bonus', description: 'your hit point maximum increases by an additional 2 hit points', type: 'hp_per_level', value: 2 },
      ]);
    });

    it('parses a flat HP bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['Your hit point maximum increases by 10'] },
        '5e'
      );

      expect(result.features).toEqual([
        { name: 'Hit Point Bonus', description: 'Your hit point maximum increases by 10', type: 'hp_flat', value: 10 },
      ]);
    });

    it('parses a language bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['You learn 2 languages of your choice'] },
        '5e'
      );

      expect(result.features).toEqual([
        { name: 'Language Bonus', description: 'You learn 2 languages of your choice', type: 'language', value: 2 },
      ]);
    });

    it('parses a resistance with "have" wording', () => {
      const result = computeFeatBuffs(
        { benefits: ['You have resistance to fire'] },
        '5e'
      );

      expect(result.resistances).toEqual(['fire']);
    });

    it('parses a resistance with "gain" wording', () => {
      const result = computeFeatBuffs(
        { benefits: ['You gain resistance to cold'] },
        '5e'
      );

      expect(result.resistances).toEqual(['cold']);
    });
  });

  describe('fallback and filtering', () => {
    it('classifies unrecognized benefit text as a passive feature', () => {
      const result = computeFeatBuffs(
        { benefits: ['You can cast detect magic at will'] },
        '5e'
      );

      expect(result.features).toEqual([
        { name: 'Passive Benefit', description: 'You can cast detect magic at will', type: 'passive' },
      ]);
    });

    it('skips non-string benefit entries', () => {
      const result = computeFeatBuffs(
        { benefits: ['Increase your Strength score by 2', null, 42, {}] },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, max_value: 20 },
      ]);
    });

    it('aggregates multiple benefits from a single feat', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'Increase your Strength score by 2',
            'You gain proficiency with heavy armor',
            'Your speed increases by 10 feet',
          ],
        },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, max_value: 20 },
      ]);
      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
      ]);
      expect(result.features).toEqual([
        { name: 'Speed Bonus', description: 'Your speed increases by 10 feet', type: 'speed', value: 10 },
      ]);
    });
  });
});

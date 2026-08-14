// @improved-by-ai
import { describe, it, expect } from 'vitest';

import { computeFeatBuffs } from './featBuffService.js';

describe('computeFeatBuffs — 5e ruleset', () => {
  describe('null/undefined/empty handling', () => {
    it('returns empty result for null, undefined, or missing-benefit feats', () => {
      const emptyResult = {
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      };

      expect(computeFeatBuffs(null, '5e')).toEqual(emptyResult);
      expect(computeFeatBuffs(undefined, '5e')).toEqual(emptyResult);
      expect(computeFeatBuffs({}, '5e')).toEqual(emptyResult);
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

    it('returns empty result when feat has automation but no benefits', () => {
      expect(
        computeFeatBuffs({ automation: { type: 'custom' } }, '5e')
      ).toEqual({
        abilityScoreIncreases: [],
        proficiencies: [],
        resistances: [],
        features: [],
      });
    });
  });

  describe('ability score increases', () => {
    it('parses a single ability score increase with default max_value 20', () => {
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

    it('preserves the raw captured ability name from the text', () => {
      const result = computeFeatBuffs(
        { benefits: ['increase your intelligence score by 1'] },
        '5e'
      );

      expect(result.abilityScoreIncreases[0].name).toBe('intelligence');
      expect(result.abilityScoreIncreases[0].amount).toBe(1);
    });

    it('parses an "or" ability score increase as two choice entries', () => {
      const result = computeFeatBuffs(
        { benefits: ['Increase your Strength or Dexterity score by 1'] },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 1, isChoice: true, max_value: 20 },
        { name: 'Dexterity', amount: 1, isChoice: true, max_value: 20 },
      ]);
    });

    it('parses a "choose one" ability score increase with description', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'Choose one ability score. Increase the chosen ability score by 2',
          ],
        },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 2,
          isChoice: true,
          description:
            'Choose one ability score. Increase the chosen ability score by 2',
          max_value: 20,
        },
      ]);
    });

    it('parses "Increase it by" wording the same as "Increase the chosen ability score by"', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'Choose one ability score. Increase it by 1, to a maximum of 20.',
          ],
        },
        '5e'
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 1,
          isChoice: true,
          description:
            'Choose one ability score. Increase it by 1, to a maximum of 20.',
          max_value: 20,
        },
      ]);
    });

    it('sets max_value to 30 when benefit text mentions maximum of 30', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'Increase your Strength score by 2, to a maximum of 30.',
          ],
        },
        '5e'
      );

      expect(result.abilityScoreIncreases[0].max_value).toBe(30);
    });

    it('sets max_value to 30 for OR pattern when benefit text mentions maximum of 30', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'Increase your Strength or Dexterity score by 2, to a maximum of 30.',
          ],
        },
        '5e'
      );

      expect(result.abilityScoreIncreases[0].max_value).toBe(30);
      expect(result.abilityScoreIncreases[1].max_value).toBe(30);
    });
  });

  describe('proficiencies', () => {
    it('parses a proficiency gain with title-cased name', () => {
      const result = computeFeatBuffs(
        { benefits: ['You gain proficiency with heavy armor'] },
        '5e'
      );

      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
      ]);
    });

    it('parses a proficiency choice with title-cased name', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'You gain proficiency in any combination of two skills of your choice',
          ],
        },
        '5e'
      );

      expect(result.proficiencies).toEqual([
        { name: 'Two Skills', type: 'proficiency', isChoice: true },
      ]);
    });

    it('parses saving throw proficiency as a feature with automation', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'You gain proficiency in saving throws using the chosen ability.',
          ],
        },
        '5e'
      );

      const saveProfFeature = result.features.find(
        (f) => f.automation?.type === 'save_proficiency'
      );
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.name).toBe('Resilient');
      expect(saveProfFeature.type).toBe('saving_throw');
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual([
        'Dexterity',
        'Constitution',
        'Intelligence',
        'Wisdom',
        'Charisma',
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
        {
          name: 'Speed Bonus',
          description: 'Your speed increases by 10 feet',
          type: 'speed',
          value: 10,
        },
      ]);
    });

    it('parses an initiative bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['You gain a +5 bonus to initiative'] },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: 'Initiative Bonus',
          description: 'You gain a +5 bonus to initiative',
          type: 'initiative',
          value: 5,
        },
      ]);
    });

    it('parses an HP per level bonus', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'your hit point maximum increases by an additional 2 hit points',
          ],
        },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: 'Hit Point Bonus',
          description:
            'your hit point maximum increases by an additional 2 hit points',
          type: 'hp_per_level',
          value: 2,
        },
      ]);
    });

    it('parses a flat HP bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['Your hit point maximum increases by 10'] },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: 'Hit Point Bonus',
          description: 'Your hit point maximum increases by 10',
          type: 'hp_flat',
          value: 10,
        },
      ]);
    });

    it('parses a language bonus', () => {
      const result = computeFeatBuffs(
        { benefits: ['You learn 2 languages of your choice'] },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: 'Language Bonus',
          description: 'You learn 2 languages of your choice',
          type: 'language',
          value: 2,
        },
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

  describe('feat-level automation', () => {
    it('attaches single feat-level automation as a feature', () => {
      const result = computeFeatBuffs(
        {
          benefits: ['You have an unusual aura'],
          automation: { type: 'custom_trigger', condition: 'on_damage' },
        },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: 'Passive Benefit',
          description: 'You have an unusual aura',
          type: 'passive',
        },
        {
          name: undefined,
          description: undefined,
          type: 'custom_trigger',
          automation: { type: 'custom_trigger', condition: 'on_damage' },
        },
      ]);
    });

    it('attaches array of feat-level automations as features', () => {
      const result = computeFeatBuffs(
        {
          benefits: [],
          automation: [{ type: 'trigger_a' }, { type: 'trigger_b' }],
        },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: undefined,
          description: undefined,
          type: 'trigger_a',
          automation: { type: 'trigger_a' },
        },
        {
          name: undefined,
          description: undefined,
          type: 'trigger_b',
          automation: { type: 'trigger_b' },
        },
      ]);
    });

    it('does not attach automation when there are no benefits', () => {
      const result = computeFeatBuffs(
        { automation: { type: 'orphan' } },
        '5e'
      );

      expect(result.features).toEqual([]);
    });
  });

  describe('fallback and filtering', () => {
    it('classifies unrecognized benefit text as a passive feature', () => {
      const result = computeFeatBuffs(
        { benefits: ['You can cast detect magic at will'] },
        '5e'
      );

      expect(result.features).toEqual([
        {
          name: 'Passive Benefit',
          description: 'You can cast detect magic at will',
          type: 'passive',
        },
      ]);
      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
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
        {
          name: 'Speed Bonus',
          description: 'Your speed increases by 10 feet',
          type: 'speed',
          value: 10,
        },
      ]);
    });

    it('aggregates benefits across all four output categories', () => {
      const result = computeFeatBuffs(
        {
          benefits: [
            'Increase your Constitution score by 1',
            'You gain proficiency with shields',
            'You have resistance to poison',
            'Your speed increases by 5 feet',
          ],
        },
        '5e'
      );

      expect(result.abilityScoreIncreases).toHaveLength(1);
      expect(result.proficiencies).toHaveLength(1);
      expect(result.resistances).toEqual(['poison']);
      expect(result.features).toHaveLength(1);
      expect(result.features[0].type).toBe('speed');
    });
  });
});

// @improved-by-ai
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

describe('computeAllFeatBuffs — 5e ruleset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ability score increase parsing', () => {
    it('should find and parse a single 5e feat with ability score increase', () => {
      findFeat.mockReturnValue({
        name: 'Tough',
        benefits: ['Increase your Strength score by 2'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Tough'] },
        [{ name: 'Tough' }]
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 2, isChoice: false, featName: 'Tough', featDescription: undefined, max_value: 20 },
      ]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should parse ability score choice (OR pattern) in 5e', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          'Increase your Strength or Dexterity score by 1',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Strength', amount: 1, isChoice: true, featName: 'Custom Feat', featDescription: undefined, max_value: 20 },
        { name: 'Dexterity', amount: 1, isChoice: true, featName: 'Custom Feat', featDescription: undefined, max_value: 20 },
      ]);
      expect(result.proficiencies).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should parse choose-one ability increase in 5e', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          'Choose one ability score. Increase it by 1',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 1,
          isChoice: true,
          description: 'Choose one ability score. Increase it by 1',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
      expect(result.proficiencies).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should parse "Increase the chosen ability score" wording in 5e', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Resilient'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 1,
          isChoice: true,
          description: 'Increase the chosen ability score by 1, to a maximum of 20.',
          featName: 'Resilient',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should set max_value to 30 when benefit text mentions maximum of 30', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          'Increase your Strength score by 2, to a maximum of 30.',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases[0].max_value).toBe(30);
    });

    it('should set max_value to 30 for OR pattern when benefit text mentions maximum of 30', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          'Increase your Strength or Dexterity score by 2, to a maximum of 30.',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases[0].max_value).toBe(30);
      expect(result.abilityScoreIncreases[1].max_value).toBe(30);
    });
  });

  describe('proficiency parsing', () => {
    it('should parse proficiency gain in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['You gain proficiency with heavy armor'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
      ]);
      expect(result.features).toEqual([]);
    });

    it('should parse proficiency choice in 5e', () => {
      findFeat.mockReturnValue({
        benefits: [
          'You gain proficiency in any combination of skills of your choice',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Skills', type: 'proficiency', isChoice: true },
      ]);
      expect(result.features).toEqual([]);
    });
  });

  describe('feature parsing', () => {
    it('should parse speed feature in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['Your speed increases by 10 feet'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
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

    it('should parse initiative feature in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['You gain a +5 bonus to initiative'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
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

    it('should parse HP per level feature in 5e', () => {
      findFeat.mockReturnValue({
        benefits: [
          'your hit point maximum increases by an additional 2 hit point',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Hit Point Bonus',
          description:
            'your hit point maximum increases by an additional 2 hit point',
          type: 'hp_per_level',
          value: 2,
        },
      ]);
    });

    it('should parse flat HP feature in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['Your hit point maximum increases by 5'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Hit Point Bonus',
          description: 'Your hit point maximum increases by 5',
          type: 'hp_flat',
          value: 5,
        },
      ]);
    });

    it('should parse language feature in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['You learn 2 languages of your choice'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
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

    it('should classify unrecognized benefit as passive feature in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['You have an unusual aura'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Passive Benefit',
          description: 'You have an unusual aura',
          type: 'passive',
        },
      ]);
    });
  });

  describe('resistance parsing', () => {
    it('should parse "You have resistance" in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['You have resistance to fire'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.resistances).toEqual(['fire']);
    });

    it('should parse "You gain resistance" in 5e', () => {
      findFeat.mockReturnValue({
        benefits: ['You gain resistance to cold'],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.resistances).toEqual(['cold']);
    });
  });

  describe('multiple benefits in a single feat', () => {
    it('should parse both ability score increase and resistance from the same feat', () => {
      findFeat.mockReturnValue({
        name: 'War Caster',
        benefits: [
          'Increase your Constitution score by 1',
          'You have resistance to fire',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['War Caster'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        { name: 'Constitution', amount: 1, isChoice: false, featName: 'War Caster', featDescription: undefined, max_value: 20 },
      ]);
      expect(result.resistances).toEqual(['fire']);
      expect(result.proficiencies).toEqual([]);
      expect(result.features).toEqual([]);
    });
  });

  describe('feat-level automation in 5e', () => {
    it('should attach feat-level automation as a feature', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: ['You have an unusual aura'],
        automation: { type: 'custom_trigger', condition: 'on_damage' },
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Passive Benefit',
          description: 'You have an unusual aura',
          type: 'passive',
          featName: 'Custom Feat',
        },
        {
          name: 'Custom Feat',
          description: undefined,
          type: 'custom_trigger',
          automation: { type: 'custom_trigger', condition: 'on_damage' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should handle feat-level automation as an array', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [],
        automation: [
          { type: 'trigger_a' },
          { type: 'trigger_b' },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        { name: 'Custom Feat', description: undefined, type: 'trigger_a', automation: { type: 'trigger_a' }, featName: 'Custom Feat' },
        { name: 'Custom Feat', description: undefined, type: 'trigger_b', automation: { type: 'trigger_b' }, featName: 'Custom Feat' },
      ]);
    });
  });
});

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

describe('computeAllFeatBuffs — 2024 ruleset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('2024 ruleset', () => {
    it('should parse single-score ability_score_increase in 2024', () => {
      findFeat.mockReturnValue({
        name: 'Tough',
        benefits: [
          { type: 'ability_score_increase', description: '+1 STR' },
        ],
        ability_score_increase: { scores: ['Strength'], amount: 1 },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Tough'] },
        [{ name: 'Tough' }]
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'Strength',
          amount: 1,
          isChoice: false,
          description: '+1 STR',
          featName: 'Tough',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should parse two-score ability_score_increase as choice in 2024', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'ability_score_increase',
            description: '+1 to two abilities',
          },
        ],
        ability_score_increase: {
          scores: ['Strength', 'Dexterity'],
          amount: 1,
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 1,
          isChoice: true,
          scores: ['Strength', 'Dexterity'],
          description: '+1 to two abilities',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should parse variable amount ability_score_increase in 2024', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'ability_score_increase',
            description: 'Variable increase',
          },
        ],
        ability_score_increase: {
          scores: ['Strength'],
          amount: 'variable',
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: [1, 2],
          isChoice: true,
          description: 'Variable increase',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should parse proficiency with improvised weapons in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain proficiency with improvised weapons',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Improvised Weapons', type: 'proficiency' },
      ]);
    });

    it('should parse proficiency with all skills in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain proficiency in all skills',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'all_skills', type: 'skill' },
      ]);
    });

    it('should parse armor training proficiency in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description:
              'You gain training with light armor and shields',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Light Armor', type: 'proficiency' },
        { name: 'Shields', type: 'proficiency' },
      ]);
    });

    it('should parse resistance with automation in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'resistance',
            name: 'Custom Feat',
            description: 'Resistance benefit',
            automation: {
              validTypes: ['fire', 'cold', 'lightning'],
              resistanceType: ['player_choice_fire_from_list'],
            },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Resistance benefit',
          type: 'resistance_choice',
          automation: {
            validTypes: ['fire', 'cold', 'lightning'],
            resistanceType: ['player_choice_fire_from_list'],
            count: 2,
          },
        },
      ]);
    });

    it('should parse resistance without automation in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'resistance',
            name: 'Custom Feat',
            description: 'Resistance to poison',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Resistance to poison',
          type: 'resistance',
        },
      ]);
    });

    it('should parse saving throw benefit in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'saving_throw',
            name: 'Custom Feat',
            description: 'Saving throw benefit',
            automation: { type: 'saving_throw_proficiency' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Saving throw benefit',
          type: 'saving_throw',
          automation: { type: 'saving_throw_proficiency' },
        },
      ]);
    });

    it('should parse Savage Attacker damage benefit in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'damage',
            name: 'Savage Attacker',
            description: 'Reroll damage once per turn',
            automation: { type: 'reroll_damage_once_per_turn' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Savage Attacker',
          description: 'Reroll damage once per turn',
          type: 'reroll_damage_once_per_turn',
          automation: { type: 'reroll_damage_once_per_turn' },
        },
      ]);
    });

    it('should parse free spell benefit in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'spell',
            name: 'Level 1 Spell',
            description: 'Free spell benefit',
            automation: { type: 'free_spell' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Level 1 Spell',
          description: 'Free spell benefit',
          type: 'free_spell',
          automation: { type: 'free_spell' },
        },
      ]);
    });

    it('should parse generic spell benefit in 2024', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'spell',
            name: 'Custom Spell',
            description: 'Spell benefit',
            automation: { type: 'spell' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Spell',
          description: 'Spell benefit',
          type: 'spell',
          automation: { type: 'spell' },
        },
      ]);
    });

    it('should parse Great Weapon Fighting in 2024 default case', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'some_type',
            name: 'Great Weapon Fighting',
            description: 'Damage reroll',
            automation: { type: 'great_weapon_fighting' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Great Weapon Fighting',
          description: 'Damage reroll',
          type: 'great_weapon_fighting',
          automation: { type: 'great_weapon_fighting' },
        },
      ]);
    });

    it('should handle unknown benefit type in 2024 default case', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'unknown_type',
            name: 'Unknown Feat',
            description: 'Some unknown benefit',
            automation: { custom: true },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Unknown Feat',
          description: 'Some unknown benefit',
          type: 'unknown_type',
          automation: { custom: true },
        },
      ]);
    });
  });
});

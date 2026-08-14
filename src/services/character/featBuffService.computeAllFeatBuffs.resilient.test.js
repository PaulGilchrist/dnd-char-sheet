// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { findFeat } from '../../services/shared/featFinder.js';
import {
  computeAllFeatBuffs,
} from './featBuffService.js';

vi.mock('../../services/shared/featFinder.js', () => ({
  findFeat: vi.fn(),
}));

describe('computeAllFeatBuffs — Resilient feat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('5e Resilient', () => {
    it('should parse saving throw proficiency benefit from string benefits', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
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
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.name).toBe('Resilient');
      expect(saveProfFeature.description).toBe('You gain proficiency in saving throws using the chosen ability.');
      expect(saveProfFeature.type).toBe('saving_throw');
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
      expect(saveProfFeature.featName).toBe('Resilient');
    });

    it('should keep hardcoded saveType when no featAbilityChoices exist', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Resilient'] },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
    });

    it('should resolve saveType from featAbilityChoices object value', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        {
          rules: '5e',
          feats: ['Resilient'],
          featAbilityChoices: {
            'Resilient-0': { assignment: 'Dexterity' },
          },
        },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Dexterity');
      expect(saveProfFeature.automation.fallbackTypes).toBeUndefined();
    });

    it('should resolve saveType from featAbilityChoices string value', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        {
          rules: '5e',
          feats: ['Resilient'],
          featAbilityChoices: {
            'Resilient-0': 'Constitution',
          },
        },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Constitution');
      expect(saveProfFeature.automation.fallbackTypes).toBeUndefined();
    });

    it('should keep fallbackTypes when featAbilityChoices has no matching key', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        {
          rules: '5e',
          feats: ['Resilient'],
          featAbilityChoices: {
            'OtherFeat-0': { assignment: 'Wisdom' },
          },
        },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
    });

    it('should keep hardcoded saveType when featAbilityChoices value is null', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        {
          rules: '5e',
          feats: ['Resilient'],
          featAbilityChoices: {
            'Resilient-0': null,
          },
        },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
    });

    it('should keep hardcoded saveType when featAbilityChoices is not an object', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        {
          rules: '5e',
          feats: ['Resilient'],
          featAbilityChoices: 'invalid',
        },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
    });
  });

  describe('2024 Resilient', () => {
    it('should parse saving_throw benefit from structured benefits', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          {
            type: 'ability_score_increase',
            name: 'Ability Score Increase',
            description: 'Choose one ability in which you lack saving throw proficiency. Increase the chosen ability score by 1, to a maximum of 20.',
          },
          {
            type: 'saving_throw',
            name: 'Saving Throw Proficiency',
            description: 'You gain saving throw proficiency with the chosen ability.',
            automation: {
              type: 'save_proficiency',
              saveType: 'Strength',
              fallbackTypes: ['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
            },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Resilient'] },
        []
      );

      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.name).toBe('Saving Throw Proficiency');
      expect(saveProfFeature.type).toBe('saving_throw');
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
      expect(saveProfFeature.featName).toBe('Resilient');
    });

    it('should resolve 2024 saveType from featAbilityChoices', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          {
            type: 'ability_score_increase',
            name: 'Ability Score Increase',
            description: 'Choose one ability in which you lack saving throw proficiency. Increase the chosen ability score by 1, to a maximum of 20.',
          },
          {
            type: 'saving_throw',
            name: 'Saving Throw Proficiency',
            description: 'You gain saving throw proficiency with the chosen ability.',
            automation: {
              type: 'save_proficiency',
              saveType: 'Strength',
              fallbackTypes: ['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
            },
          },
        ],
        ability_score_increase: {
          scores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
          amount: 1,
          max_value: 20,
        },
      });

      const result = computeAllFeatBuffs(
        {
          rules: '2024',
          feats: ['Resilient'],
          featAbilityChoices: {
            'Resilient-0': { assignment: 'Constitution' },
          },
        },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Constitution');
      expect(saveProfFeature.automation.fallbackTypes).toBeUndefined();
    });
  });

  describe('Resilient edge cases', () => {
    it('should return empty result when findFeat returns null for Resilient', () => {
      findFeat.mockReturnValue(null);

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Resilient'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should handle Resilient with no automation on benefit text', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Resilient'] },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
    });

    it('should handle duplicate Resilient feats in the list', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Resilient', 'Resilient'] },
        []
      );

      const saveProfFeatures = result.features.filter(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeatures).toHaveLength(2);
      expect(saveProfFeatures.every(f => f.featName === 'Resilient')).toBe(true);
    });

    it('should resolve saveType from choices even when feat has top-level automation without fallbackTypes', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
        automation: {
          type: 'save_proficiency',
          saveType: 'Wisdom',
        },
      });

      const result = computeAllFeatBuffs(
        {
          rules: '5e',
          feats: ['Resilient'],
          featAbilityChoices: {
            'Resilient-0': { assignment: 'Charisma' },
          },
        },
        []
      );

      // Benefit text parsing creates feature with hardcoded fallbackTypes,
      // so resolveSaveTypeFromChoices still runs and overwrites saveType
      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Charisma');
      expect(saveProfFeature.automation.fallbackTypes).toBeUndefined();
    });

    it('should handle Resilient with empty automation object', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
        automation: {},
      });

      const result = computeAllFeatBuffs(
        { rules: '5e', feats: ['Resilient'] },
        []
      );

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.automation.fallbackTypes).toEqual(['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
    });
  });
});

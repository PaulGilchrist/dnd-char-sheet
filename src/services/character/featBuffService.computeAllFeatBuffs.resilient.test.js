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

describe('computeAllFeatBuffs — Resilient feat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Resilient feat', () => {
    it('should parse 5e Resilient save proficiency benefit', () => {
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

      expect(result.features).toEqual([
        {
          name: 'Resilient',
          description: 'You gain proficiency in saving throws using the chosen ability.',
          type: 'saving_throw',
          automation: {
            type: 'save_proficiency',
            saveType: 'Strength',
            fallbackTypes: ['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
          },
          featName: 'Resilient',
        },
      ]);
    });

    it('should parse 2024 Resilient saving_throw benefit', () => {
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

      const saveProfFeature = result.features.find(f => f.automation?.type === 'save_proficiency');
      expect(saveProfFeature).toBeDefined();
      expect(saveProfFeature.name).toBe('Saving Throw Proficiency');
      expect(saveProfFeature.automation.saveType).toBe('Strength');
      expect(saveProfFeature.featName).toBe('Resilient');
    });

    it('should resolve 5e Resilient saveType from featAbilityChoices', () => {
      findFeat.mockReturnValue({
        name: 'Resilient',
        benefits: [
          'Increase the chosen ability score by 1, to a maximum of 20.',
          'You gain proficiency in saving throws using the chosen ability.',
        ],
        automation: {
          type: 'save_proficiency',
          saveType: 'Strength',
          fallbackTypes: ['Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
        },
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

    it('should resolve 2024 Resilient saveType from featAbilityChoices', () => {
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
  });
});

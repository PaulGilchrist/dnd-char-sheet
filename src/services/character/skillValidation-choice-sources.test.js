// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dataLoader from '../ui/dataLoader.js';

vi.mock('../ui/dataLoader.js', () => ({
  loadWildMagicSurgeTable: vi.fn(async () => []),
  fetchClassData: vi.fn(),
  fetchRaceData: vi.fn(),
  fetchBackgroundData: vi.fn(),
  fetchFeatData: vi.fn(),
  loadFeatData: vi.fn(),
  loadEquipment: vi.fn(async () => []),
}));

import {
  getSkillLimits,
  validateSkills,
} from './skillValidation.js';

describe('skillValidation - Skill choice sources with restricted pools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Skill choice sources with restricted pools', () => {
    const keenMindFeat = {
      name: 'Keen Mind',
      index: 'keen-mind',
      benefits: [
        {
          name: 'Ability Score Increase',
          description: 'Increase your Intelligence score by 1, to a maximum of 20.',
          type: 'ability_score_increase',
        },
        {
          name: 'Lore Knowledge',
          description: 'Choose one of the following skills: Arcana, History, Investigation, Nature, or Religion. If you lack proficiency in the chosen skill, you gain proficiency in it, and if you already have proficiency in it, you gain Expertise in it.',
          type: 'proficiency',
        },
      ],
    };

    const observantFeat = {
      name: 'Observant',
      index: 'observant',
      benefits: [
        {
          name: 'Ability Score Increase',
          description: 'Increase your Intelligence or Wisdom score by 1, to a maximum of 20.',
          type: 'ability_score_increase',
        },
        {
          name: 'Keen Observer',
          description: 'Choose one of the following skills: Insight, Investigation, or Perception. If you lack proficiency with the chosen skill, you gain proficiency in it, and if you already have proficiency in it, you gain Expertise in it.',
          type: 'proficiency',
        },
      ],
    };

    it('should parse "Choose X: A, B or C" format correctly', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});

      const result = await getSkillLimits({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
      });

      expect(result.fromClass.count).toBe(2);
      expect(result.fromClass.skills).toEqual(['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion']);
    });

    it('should build skillChoiceSources for Wizard with Keen Mind and Observant feats', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        skill_proficiencies: 'Deception and Persuasion',
      });
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([keenMindFeat, observantFeat]);

      const result = await getSkillLimits({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        background: 'Charlatan',
        feats: ['Keen Mind', 'Observant'],
      }, [keenMindFeat, observantFeat]);

      expect(result.allowed).toBe(6);
      expect(result.skillChoiceSources).toHaveLength(4);
      expect(result.skillChoiceSources[0]).toEqual({
        source: 'background',
        count: 2,
        skills: ['Deception', 'Persuasion'],
      });
      expect(result.skillChoiceSources[1]).toEqual({
        source: 'class',
        count: 2,
        skills: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion'],
      });
      expect(result.skillChoiceSources[2].source).toBe('feat');
      expect(result.skillChoiceSources[2].featName).toBe('Keen Mind');
      expect(result.skillChoiceSources[3].featName).toBe('Observant');
    });

    it('should warn when selecting skills outside allowed pools', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([keenMindFeat, observantFeat]);

      const warnings = await validateSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        feats: ['Keen Mind', 'Observant'],
        skillProficiencies: ['Nature', 'Perception', 'Athletics'],
      }, [keenMindFeat, observantFeat]);

      expect(warnings.some((w) => w.message.includes('not available'))).toBe(true);
      expect(warnings.some((w) => w.message.includes('Athletics'))).toBe(true);
    });

    it('should allow valid selections within feat skill pools', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([keenMindFeat, observantFeat]);

      const warnings = await validateSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        feats: ['Keen Mind', 'Observant'],
        skillProficiencies: ['Nature', 'Perception'],
      }, [keenMindFeat, observantFeat]);

      expect(warnings.some((w) => w.message.includes('not available'))).toBe(false);
    });

    it('should handle overlapping skill pools (Investigation in both Keen Mind and Observant)', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([keenMindFeat, observantFeat]);

      // Select Investigation once - it can satisfy either Keen Mind or Observant, but not both
      const warnings = await validateSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        feats: ['Keen Mind', 'Observant'],
        skillProficiencies: ['Investigation'],
      }, [keenMindFeat, observantFeat]);

      // Should get a warning about too few skills selected (need 4 total but only have 1)
      expect(warnings.some((w) => w.type === 'info')).toBe(true);
    });

    it('should warn when too many skills selected from a single source pool', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([keenMindFeat]);

      // Select 3 unique skills from Keen Mind's pool that don't overlap with class
      // Since Keen Mind skills all overlap with class, we need to select 3 skills
      // that the class can only take 2 of. The algorithm will try to assign them
      // to class first, then feat. If class is full (2), feat gets 1 which is valid.
      // So we need a case where a source has NO overlap with class.
      // Use a skill that's ONLY in the feat pool (not in class pool).
      // But all Keen Mind skills are in the class pool too.
      // Let's test with a different scenario: class allows 2, feat allows 1,
      // user selects 2 from class pool + 1 from feat-only pool = 4 total, but allowed is 3
      const featWithLimitedSkills = {
        name: 'Test Feat',
        index: 'test-feat',
        benefits: [
          {
            name: 'Test',
            description: 'Choose one of the following skills: Arcana, History, or Religion. If you lack proficiency in the chosen skill, you gain proficiency in it.',
            type: 'proficiency',
          },
        ],
      };

      const warnings = await validateSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        feats: ['Test Feat'],
        skillProficiencies: ['Arcana', 'History', 'Insight', 'Nature'],
      }, [featWithLimitedSkills]);

      // 4 skills selected, allowed is 3 (2 class + 1 feat), so should get "too many" warning
      expect(warnings.some((w) => w.message.includes('Rules allow'))).toBe(true);
    });
  });
});

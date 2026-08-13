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
  getPreSelectedSkills,
} from './skillValidation.js';

describe('skillValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSkillLimits', () => {
    it('should return skill limits for 2024 ruleset', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2 from Arcana, History',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        skill_proficiencies: 'Insight',
      });
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        skill_proficiencies: 'Deception and Persuasion',
      });

      const result = await getSkillLimits({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        background: 'Charlatan',
      });

      expect(result.allowed).toBe(5);
      expect(result.fromClass.isChoice).toBe(true);
      expect(result.fromClass.count).toBe(2);
      expect(result.fromRace.skills).toEqual(['Insight']);
      expect(result.fromBackground.skills).toEqual(['Deception', 'Persuasion']);
    });

    it('should return skill limits for 5e ruleset', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2 from Arcana, History',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        skill_proficiencies: 'Insight',
      });

      const result = await getSkillLimits({
        rules: '5e',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        background: 'Acolyte',
      });

      expect(result.allowed).toBe(5);
      expect(result.fromClass.isChoice).toBe(true);
      expect(result.fromBackground.count).toBe(2);
    });

    it('should return defaults when all data is null', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue(null);

      const result = await getSkillLimits({});

      expect(result.allowed).toBe(2);
      expect(result.fromClass).toEqual({ count: 0, skills: [], isChoice: true });
      expect(result.fromRace).toEqual({ count: 0, skills: [], isChoice: false });
      expect(result.fromBackground).toEqual({ count: 2, skills: [], isChoice: true });
    });

    it('should handle race with no skill_proficiencies field', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 1 from Arcana',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});

      const result = await getSkillLimits({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
      });

      expect(result.fromRace.count).toBe(0);
      expect(result.fromRace.skills).toEqual([]);
    });

    it('should parse "Choose X from..." format correctly', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 3 from Arcana, History, Insight, Religion',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});

      const result = await getSkillLimits({
        rules: '2024',
        class: { name: 'Cleric' },
        race: { name: 'Human' },
      });

      expect(result.fromClass.count).toBe(3);
      expect(result.fromClass.skills).toEqual(['Arcana', 'History', 'Insight', 'Religion']);
    });

    it('should handle race with comma-separated skills', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        skill_proficiencies: 'Insight, Perception, Survival',
      });

      const result = await getSkillLimits({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Dwarf' },
      });

      expect(result.fromRace.skills).toEqual(['Insight', 'Perception', 'Survival']);
    });

    it('should return zero when no class, race, or background provided in 2024', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue(null);

      const result = await getSkillLimits({ rules: '2024' });

      expect(result.allowed).toBe(0);
      expect(result.fromClass.count).toBe(0);
      expect(result.fromRace.count).toBe(0);
      expect(result.fromBackground.count).toBe(0);
    });

    it('should handle 5e background count override', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2 from Arcana, History',
      });

      const result = await getSkillLimits({
        rules: '5e',
        class: { name: 'Wizard' },
      });

      expect(result.allowed).toBe(4);
      expect(result.fromBackground.count).toBe(2);
      expect(result.fromBackground.isChoice).toBe(true);
    });
  });

  describe('getPreSelectedSkills', () => {
    it('should return pre-selected skills from race', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        skill_proficiencies: 'Insight and Perception',
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2 from Arcana, History',
      });

      const result = await getPreSelectedSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Dwarf' },
      });

      expect(result).toEqual(['Insight', 'Perception']);
    });

    it('should return pre-selected skills from background in 2024', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        skill_proficiencies: 'Deception and Persuasion',
      });

      const result = await getPreSelectedSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        background: 'Charlatan',
      });

      expect(result).toEqual(['Deception', 'Persuasion']);
    });

    it('should not pre-select skills for 5e backgrounds', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        skill_proficiencies: 'Deception and Persuasion',
      });

      const result = await getPreSelectedSkills({
        rules: '5e',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
        background: 'Acolyte',
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when no skills are pre-selected', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        skill_proficiencies: 'Choose 1 from Insight, Perception',
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Choose 2 from Arcana, History',
      });

      const result = await getPreSelectedSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
      });

      expect(result).toEqual([]);
    });

    it('should return pre-selected skills from class when not a choice', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Insight',
      });
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({});

      const result = await getPreSelectedSkills({
        rules: '2024',
        class: { name: 'Wizard' },
      });

      expect(result).toEqual(['Insight']);
    });

    it('should deduplicate skills from multiple sources', async () => {
      vi.mocked(dataLoader.fetchRaceData).mockResolvedValue({
        skill_proficiencies: 'Insight',
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        skill_proficiencies: 'Insight',
      });

      const result = await getPreSelectedSkills({
        rules: '2024',
        class: { name: 'Wizard' },
        race: { name: 'Human' },
      });

      expect(result).toEqual(['Insight']);
    });

    it('should return empty array when no race or class provided', async () => {
      const result = await getPreSelectedSkills({ rules: '2024' });

      expect(result).toEqual([]);
    });
  });
});

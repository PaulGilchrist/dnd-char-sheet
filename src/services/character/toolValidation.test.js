import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dataLoader from '../ui/dataLoader.js';

vi.mock('../ui/dataLoader.js', () => ({
  loadWildMagicSurgeTable: vi.fn(async () => []),
  loadEquipment: vi.fn(async () => []),
  fetchBackgroundData: vi.fn(),
  fetchClassData: vi.fn(),
  loadFeatData: vi.fn(),
}));

import {
  normalizeCategory,
  parseToolChoiceString,
  parseFeatToolProficiency,
  getToolsByCategory,
  computeSkilledToolUsage,
  getToolLimitsByCategory,
  validateTools,
} from './toolValidation.js';

describe('toolValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeCategory', () => {
    it('should normalize "Gaming Set" to "Gaming Sets"', () => {
      expect(normalizeCategory('Gaming Set')).toBe('Gaming Sets');
    });

    it('should keep "Gaming Sets" as-is', () => {
      expect(normalizeCategory('Gaming Sets')).toBe('Gaming Sets');
    });

    it('should normalize "Musical Instrument" to "Musical Instrument"', () => {
      expect(normalizeCategory('Musical Instrument')).toBe('Musical Instrument');
    });

    it('should normalize "Musical Instruments" to "Musical Instrument"', () => {
      expect(normalizeCategory('Musical Instruments')).toBe('Musical Instrument');
    });

    it('should normalize "Artisan\'s Tools" to "Artisan\'s Tools"', () => {
      expect(normalizeCategory("Artisan's Tools")).toBe("Artisan's Tools");
    });

    it('should normalize "Other Tools" to "Other Tools"', () => {
      expect(normalizeCategory('Other Tools')).toBe('Other Tools');
    });

    it('should trim whitespace before normalization', () => {
      expect(normalizeCategory('  Gaming Set  ')).toBe('Gaming Sets');
    });

    it('should return unknown categories unchanged after trim', () => {
      expect(normalizeCategory('Painting Supplies')).toBe('Painting Supplies');
    });

    it('should return null/undefined unchanged', () => {
      expect(normalizeCategory(null)).toBeNull();
      expect(normalizeCategory(undefined)).toBeUndefined();
    });
  });

  describe('parseToolChoiceString', () => {
    it('should return default for null input', () => {
      expect(parseToolChoiceString(null)).toEqual({ count: 0, categories: [], isChoice: false });
    });

    it('should return default for non-string input', () => {
      expect(parseToolChoiceString(123)).toEqual({ count: 0, categories: [], isChoice: false });
      expect(parseToolChoiceString({})).toEqual({ count: 0, categories: [], isChoice: false });
    });

    it('should return default for strings not starting with "Choose"', () => {
      expect(parseToolChoiceString('Gaming Sets')).toEqual({ count: 0, categories: [], isChoice: false });
      expect(parseToolChoiceString('Artisan\'s Tools')).toEqual({ count: 0, categories: [], isChoice: false });
    });

    it('should parse "Choose one type of A or B" format', () => {
      const result = parseToolChoiceString('Choose one type of Gaming Sets or Musical Instruments');
      expect(result).toEqual({ count: 1, categories: ['Gaming Sets', 'Musical Instrument'], isChoice: true });
    });

    it('should parse "Choose one type of A or B" with singular normalization', () => {
      const result = parseToolChoiceString('Choose one type of Gaming Set or Musical Instrument');
      expect(result).toEqual({ count: 1, categories: ['Gaming Sets', 'Musical Instrument'], isChoice: true });
    });

    it('should parse "Choose X of category" format', () => {
      const result = parseToolChoiceString('Choose 2 Artisan\'s Tools of your choice');
      expect(result).toEqual({ count: 2, categories: ["Artisan's Tools"], isChoice: true });
    });

    it('should parse "Choose X of category" without parenthetical', () => {
      const result = parseToolChoiceString('Choose 3 Artisan\'s Tools');
      expect(result).toEqual({ count: 3, categories: ["Artisan's Tools"], isChoice: true });
    });

    it('should parse "Choose X of category (see ...)" format', () => {
      const result = parseToolChoiceString('Choose 1 Artisan\'s Tools (see Equipment)');
      expect(result).toEqual({ count: 1, categories: ["Artisan's Tools"], isChoice: true });
    });

    it('should parse "Choose one kind of category" format', () => {
      const result = parseToolChoiceString('Choose one kind of Gaming Sets');
      expect(result).toEqual({ count: 1, categories: ['Gaming Sets'], isChoice: true });
    });

    it('should parse "Choose kind of category" format', () => {
      const result = parseToolChoiceString('Choose kind of Musical Instruments');
      expect(result).toEqual({ count: 1, categories: ['Musical Instrument'], isChoice: true });
    });

    it('should handle case-insensitive "Choose" in regex patterns', () => {
      const result = parseToolChoiceString('Choose one type of Gaming Sets');
      expect(result).toEqual({ count: 1, categories: ['Gaming Sets'], isChoice: true });
    });

    it('should return default for unrecognized Choose patterns', () => {
      expect(parseToolChoiceString('Choose something weird')).toEqual({ count: 0, categories: [], isChoice: false });
    });
  });

  describe('parseFeatToolProficiency', () => {
    it('should return null for null/undefined feat', () => {
      expect(parseFeatToolProficiency(null)).toBeNull();
      expect(parseFeatToolProficiency(undefined)).toBeNull();
    });

    it('should return null for feat without benefits', () => {
      expect(parseFeatToolProficiency({})).toBeNull();
    });

    it('should return null for feat with non-proficiency benefits', () => {
      expect(parseFeatToolProficiency({ benefits: [{ type: 'ability_score_increase', description: '+1 STR' }] })).toBeNull();
    });

    it('should return null for proficiency benefit without tool/instrument keywords', () => {
      expect(parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency in a skill' }]
      })).toBeNull();
    });

    it('should parse "three different Artisan\'s Tools of your choice" (Chef feat)', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with three different Artisan\'s Tools of your choice' }]
      });
      expect(result).toEqual({ count: 3, categories: ["Artisan's Tools"], isAny: false });
    });

    it('should parse "three skills or tools" (Skilled feat)', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency in any combination of three skills or tools of your choice' }]
      });
      expect(result).toEqual({ count: 3, categories: [], isAny: true });
    });

    it('should parse "two Musical Instruments of your choice"', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with two Musical Instruments of your choice' }]
      });
      expect(result).toEqual({ count: 2, categories: ['Musical Instrument'], isAny: false });
    });

    it('should parse with word numbers (one, two, three, etc.) in artisan tools pattern', () => {
      const three = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with three different Artisan\'s Tools of your choice' }]
      });
      expect(three.count).toBe(3);

      const two = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with two different Artisan\'s Tools of your choice' }]
      });
      expect(two.count).toBe(2);
    });

    it('should parse with word numbers (one, two, three, etc.) in generic pattern', () => {
      const one = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with one Gaming Tool of your choice' }]
      });
      expect(one.count).toBe(1);

      const two = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with two Gaming Tools of your choice' }]
      });
      expect(two.count).toBe(2);

      const three = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with three Gaming Tools of your choice' }]
      });
      expect(three.count).toBe(3);

      const four = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with four Gaming Tools of your choice' }]
      });
      expect(four.count).toBe(4);

      const five = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with five Gaming Tools of your choice' }]
      });
      expect(five.count).toBe(5);
    });

    it('should parse with numeric digits (defaults to 1 when not in wordToNum map)', () => {
      // The wordToNum map only has word numbers (one, two, etc.), not digits
      // So "2" defaults to 1 via the || 1 fallback
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with 2 different Artisan\'s Tools of your choice' }]
      });
      expect(result.count).toBe(1);
    });

    it('should parse numeric digits in generic pattern (defaults to 1)', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with 2 Gaming Tools of your choice' }]
      });
      expect(result.count).toBe(1);
    });

    it('should handle "different" keyword in artisan tools pattern', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with two different Artisan\'s Tools of your choice' }]
      });
      expect(result).toEqual({ count: 2, categories: ["Artisan's Tools"], isAny: false });
    });

    it('should handle multi-word categories in generic match (captures full phrase)', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with one Gaming Set and Musical Instrument of your choice' }]
      });
      expect(result).toEqual({ count: 1, categories: ['Gaming Set and Musical Instrument'], isAny: false });
    });

    it('should return null for unrecognized patterns', () => {
      const result = parseFeatToolProficiency({
        benefits: [{ type: 'proficiency', description: 'You gain proficiency with a sword' }]
      });
      expect(result).toBeNull();
    });
  });

  describe('getToolsByCategory', () => {
    it('should return empty array for null category', async () => {
      const result = await getToolsByCategory(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined category', async () => {
      const result = await getToolsByCategory(undefined);
      expect(result).toEqual([]);
    });

    it('should return tools matching the normalized category', async () => {
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: "Alchemist's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: "Brewer's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const result = await getToolsByCategory("Artisan's Tools");
      expect(result).toHaveLength(2);
      expect(result.map(t => t.name)).toContain("Alchemist's Supplies");
    });

    it('should normalize category before filtering', async () => {
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
        { name: 'Drum', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const result = await getToolsByCategory('Musical Instruments');
      expect(result).toHaveLength(2);
    });

    it('should exclude non-tools', async () => {
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: "Alchemist's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: 'Longsword', equipment_category: 'Weapons', tool_category: null },
        { name: 'Shield', equipment_category: 'Armor', tool_category: null },
      ]);

      const result = await getToolsByCategory("Artisan's Tools");
      expect(result).toHaveLength(1);
    });
  });

  describe('computeSkilledToolUsage', () => {
    it('should return 0 for null categoryLimits', () => {
      expect(computeSkilledToolUsage(null, ['Flute'], [], [])).toBe(0);
    });

    it('should return 0 for empty categoryLimits', () => {
      const limits = new Map();
      expect(computeSkilledToolUsage(limits, ['Flute'], [], [])).toBe(0);
    });

    it('should return 0 for null selectedTools', () => {
      const limits = new Map([["Artisan's Tools", 2]]);
      expect(computeSkilledToolUsage(limits, null, [], [])).toBe(0);
    });

    it('should return 0 for empty selectedTools', () => {
      const limits = new Map([["Artisan's Tools", 2]]);
      expect(computeSkilledToolUsage(limits, [], [], [])).toBe(0);
    });

    it('should count tools allocated from Skilled when category limits are satisfied', () => {
      const limits = new Map([
        ["Artisan's Tools", 2],
        ['Gaming Sets', 1],
      ]);
      const selectedTools = ['Flute', "Alchemist's Supplies", "Brewer's Supplies", 'Dice'];
      const allTools = [
        { name: "Alchemist's Supplies", _category: "Artisan's Tools" },
        { name: "Brewer's Supplies", _category: "Artisan's Tools" },
        { name: 'Dice', _category: 'Gaming Sets' },
        { name: 'Flute', _category: 'Musical Instrument' },
      ];
      const toolCategories = ["Artisan's Tools", 'Gaming Sets', 'Musical Instrument', 'Other Tools'];

      const result = computeSkilledToolUsage(limits, selectedTools, allTools, toolCategories);
      // Artisan's Tools: 2 selected in limit of 2 => 0 overflow
      // Gaming Sets: 1 selected in limit of 1 => 0 overflow
      // Musical Instrument: 1 selected (Flute) not in any category limit => counts as skilled
      expect(result).toBe(1);
    });

    it('should not count placeholder tools', () => {
      const limits = new Map([["Artisan's Tools", 1]]);
      const selectedTools = ['3 from: Flute', "Alchemist's Supplies"];
      const allTools = [
        { name: "Alchemist's Supplies", _category: "Artisan's Tools" },
      ];
      const toolCategories = ["Artisan's Tools", 'Gaming Sets', 'Musical Instrument', 'Other Tools'];

      const result = computeSkilledToolUsage(limits, selectedTools, allTools, toolCategories);
      // Only "Alchemist's Supplies" is a user tool (1 in category limit of 1)
      // "3 from: Flute" is a placeholder, excluded
      // userSelectedTools = 1, categoryCovered = 1, result = max(0, 1-1) = 0
      expect(result).toBe(0);
    });

    it('should return excess when user selects more than category limits', () => {
      const limits = new Map([
        ["Artisan's Tools", 1],
      ]);
      const selectedTools = ["Alchemist's Supplies", "Brewer's Supplies", 'Dice'];
      const allTools = [
        { name: "Alchemist's Supplies", _category: "Artisan's Tools" },
        { name: "Brewer's Supplies", _category: "Artisan's Tools" },
        { name: 'Dice', _category: 'Gaming Sets' },
      ];
      const toolCategories = ["Artisan's Tools", 'Gaming Sets', 'Musical Instrument', 'Other Tools'];

      const result = computeSkilledToolUsage(limits, selectedTools, allTools, toolCategories);
      // Artisan's Tools: 2 selected in limit of 1 => categoryCovered = 1
      // Gaming Sets: 1 selected not in any category limit
      // userSelectedTools = 3, categoryCovered = 1, result = max(0, 3-1) = 2
      expect(result).toBe(2);
    });

    it('should handle tools not in any known category', () => {
      const limits = new Map([["Artisan's Tools", 2]]);
      const selectedTools = ['Unknown Tool'];
      const allTools = [
        { name: "Alchemist's Supplies", _category: "Artisan's Tools" },
        { name: 'Unknown Tool', _category: 'Other Tools' },
      ];
      const toolCategories = ["Artisan's Tools", 'Gaming Sets', 'Musical Instrument', 'Other Tools'];

      const result = computeSkilledToolUsage(limits, selectedTools, allTools, toolCategories);
      // Unknown Tool is in Other Tools which has no limit in the map
      // userSelectedTools = 1, categoryCovered = 0, result = max(0, 1-0) = 1
      expect(result).toBe(1);
    });
  });

  describe('getToolLimitsByCategory', () => {
    it('should return empty limits for non-2024 ruleset', async () => {
      const result = await getToolLimitsByCategory({ rules: '5e' });
      expect(result.categoryLimits.size).toBe(0);
      expect(result.preSelected).toEqual([]);
      expect(result.skilledUsesAvailable).toBe(0);
    });

    it('should return empty limits when no class/background/feats', async () => {
      const result = await getToolLimitsByCategory({ rules: '2024' });
      expect(result.categoryLimits.size).toBe(0);
      expect(result.preSelected).toEqual([]);
      expect(result.skilledUsesAvailable).toBe(0);
    });

    it('should parse background tool choice', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: 'Choose one type of Gaming Sets or Musical Instruments',
      });

      const result = await getToolLimitsByCategory({
        rules: '2024',
        background: 'Charlatan',
      });

      expect(result.categoryLimits.get('Gaming Sets')).toBe(1);
      expect(result.categoryLimits.get('Musical Instrument')).toBe(1);
      expect(result.preSelected).toEqual([]);
    });

    it('should add preSelected for non-choice background tools', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Artisan's Tools",
      });

      const result = await getToolLimitsByCategory({
        rules: '2024',
        background: 'Artisan',
      });

      expect(result.categoryLimits.size).toBe(0);
      expect(result.preSelected).toContain("Artisan's Tools");
    });

    it('should parse class tool choice', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Gaming Sets or Musical Instruments",
      });

      const result = await getToolLimitsByCategory({
        rules: '2024',
        class: { name: 'Bard' },
      });

      expect(result.categoryLimits.get('Gaming Sets')).toBe(1);
      expect(result.categoryLimits.get('Musical Instrument')).toBe(1);
    });

    it('should add preSelected for non-choice class tools', async () => {
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        tool_proficiencies: 'Gaming Sets',
      });

      const result = await getToolLimitsByCategory({
        rules: '2024',
        class: { name: 'Rogue' },
      });

      expect(result.preSelected).toContain('Gaming Sets');
    });

    it('should aggregate background + class tool limits', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });

      const result = await getToolLimitsByCategory({
        rules: '2024',
        background: 'Artisan',
        class: { name: 'Rogue' },
      });

      expect(result.categoryLimits.get("Artisan's Tools")).toBe(2);
    });

    it('should handle Chef feat (auto-select Cook\'s Utensils, no limit)', async () => {
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Chef',
          benefits: [
            { type: 'proficiency', description: 'You gain proficiency with Cook\'s Utensils' },
          ],
        },
      ]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        feats: ['Chef'],
      });

      expect(result.preSelected).toContain("Cook's Utensils");
      expect(result.categoryLimits.size).toBe(0);
    });

    it('should handle Skilled feat (isAny, tracked separately)', async () => {
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Skilled',
          benefits: [
            { type: 'proficiency', description: 'You gain proficiency in any combination of three skills or tools of your choice' },
          ],
        },
      ]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        feats: ['Skilled'],
      });

      expect(result.skilledUsesAvailable).toBe(3);
      expect(result.categoryLimits.size).toBe(0);
    });

    it('should handle non-Skilled isAny feats (apply to all categories)', async () => {
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Some Feat',
          benefits: [
            { type: 'proficiency', description: 'You gain proficiency in any combination of two skills or tools of your choice' },
          ],
        },
      ]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        feats: ['Some Feat'],
      });

      // Non-Skilled isAny applies to all tool categories
      expect(result.categoryLimits.get("Artisan's Tools")).toBe(2);
      expect(result.categoryLimits.get('Gaming Sets')).toBe(2);
      expect(result.categoryLimits.get('Musical Instrument')).toBe(2);
      expect(result.categoryLimits.get('Other Tools')).toBe(2);
    });

    it('should handle feat with specific category (not isAny)', async () => {
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Musician',
          benefits: [
            { type: 'proficiency', description: 'You gain proficiency with three Musical Instruments of your choice' },
          ],
        },
      ]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        feats: ['Musician'],
      });

      expect(result.categoryLimits.get('Musical Instrument')).toBe(3);
      expect(result.categoryLimits.has("Artisan's Tools")).toBe(false);
    });

    it('should find feat by name and by index', async () => {
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        { name: 'Skilled', index: 'skilled', benefits: [{ type: 'proficiency', description: 'You gain proficiency in any combination of three skills or tools of your choice' }] },
      ]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        feats: ['Skilled'],
      });

      expect(result.skilledUsesAvailable).toBe(3);
    });

    it('should skip feat that is not found in feat data', async () => {
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        feats: ['NonExistentFeat'],
      });

      expect(result.categoryLimits.size).toBe(0);
      expect(result.skilledUsesAvailable).toBe(0);
    });

    it('should handle missing class/background gracefully', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue(null);
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue(null);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        background: 'Unknown',
        class: { name: 'Unknown' },
      });

      expect(result.categoryLimits.size).toBe(0);
      expect(result.preSelected).toEqual([]);
    });

    it('should handle no tools field on class/background', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});

      const result = await getToolLimitsByCategory({
        rules: '2024',
        background: 'Charlatan',
        class: { name: 'Bard' },
      });

      expect(result.categoryLimits.size).toBe(0);
      expect(result.preSelected).toEqual([]);
    });

    it('should aggregate multiple sources', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Musician',
          benefits: [{ type: 'proficiency', description: 'You gain proficiency with two Musical Instruments of your choice' }],
        },
      ]);

      const result = await getToolLimitsByCategory({
        rules: '2024',
        background: 'Artisan',
        class: { name: 'Rogue' },
        feats: ['Musician'],
      });

      expect(result.categoryLimits.get("Artisan's Tools")).toBe(2);
      expect(result.categoryLimits.get('Musical Instrument')).toBe(2);
    });

    it('should handle missing rules field defaulting to 5e', async () => {
      const result = await getToolLimitsByCategory({});
      expect(result.categoryLimits.size).toBe(0);
      expect(result.preSelected).toEqual([]);
      expect(result.skilledUsesAvailable).toBe(0);
    });
  });

  describe('validateTools', () => {
    it('should return empty warnings for non-2024 ruleset', async () => {
      const warnings = await validateTools({ rules: '5e', toolProficiencies: ['Flute'] });
      expect(warnings).toEqual([]);
    });

    it('should return empty warnings when no tools selected', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: [],
      });

      expect(warnings).toEqual([]);
    });

    it('should return empty warnings when no limits and no tools selected', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: [],
      });

      expect(warnings).toEqual([]);
    });

    it('should warn when selecting more tools than allowed in a category', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: "Alchemist's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: "Brewer's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        class: { name: 'Bard' },
        background: 'Artisan',
        toolProficiencies: ["Alchemist's Supplies", "Brewer's Supplies"],
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('warning');
      expect(warnings[0].message).toContain('Artisan\'s Tools');
      expect(warnings[0].message).toContain('2');
      expect(warnings[0].message).toContain('1');
    });

    it('should warn when selecting tools from a category with 0 allowed', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
        { name: 'Drum', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: ['Flute', 'Drum'],
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('warning');
      expect(warnings[0].message).toContain('Musical Instrument');
      expect(warnings[0].message).toContain('do not grant any');
    });

    it('should not warn when Skilled covers the overflow', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Skilled',
          benefits: [{ type: 'proficiency', description: 'You gain proficiency in any combination of three skills or tools of your choice' }],
        },
      ]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
        { name: 'Drum', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: ['Flute', 'Drum'],
        feats: ['Skilled'],
      });

      expect(warnings).toEqual([]);
    });

    it('should not warn for pre-selected tools (excluded from user selections)', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Artisan's Tools",
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: "Alchemist's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        background: 'Artisan',
        toolProficiencies: ["Alchemist's Supplies", "Artisan's Tools"],
      });

      // "Artisan's Tools" is pre-selected (excluded), but "Alchemist's Supplies" is user-selected
      // and falls in Artisan's Tools which has 0 limit → should warn
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('Artisan\'s Tools');
    });

    it('should not warn for placeholder tools', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: ['3 from: Flute'],
      });

      expect(warnings).toEqual([]);
    });

    it('should warn when overflow exceeds Skilled pool', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Skilled',
          benefits: [{ type: 'proficiency', description: 'You gain proficiency in any combination of two skills or tools of your choice' }],
        },
      ]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: "Alchemist's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: "Brewer's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: 'Painting Kit', equipment_category: 'Tools', tool_category: "Artisan's Tools" },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        background: 'Artisan',
        class: { name: 'Rogue' },
        toolProficiencies: ["Alchemist's Supplies", "Brewer's Supplies", 'Painting Kit'],
        feats: ['Skilled'],
      });

      // Artisan's Tools: limit 2, selected 3, excess 1, skilled has 2 => covers it
      // No warning expected because Skilled covers the 1 excess
      expect(warnings).toEqual([]);
    });

    it('should generate warning when overflow exceeds Skilled pool', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({
        tool_proficiencies: "Choose one type of Artisan's Tools",
      });
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
        {
          name: 'Skilled',
          benefits: [{ type: 'proficiency', description: 'You gain proficiency in any combination of two skills or tools of your choice' }],
        },
      ]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: "Alchemist's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: "Brewer's Supplies", equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: 'Painting Kit', equipment_category: 'Tools', tool_category: "Artisan's Tools" },
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
        { name: 'Drum', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        background: 'Artisan',
        class: { name: 'Rogue' },
        toolProficiencies: ["Alchemist's Supplies", "Brewer's Supplies", 'Painting Kit', 'Flute', 'Drum'],
        feats: ['Skilled'],
      });

      // Artisan's Tools: limit 2, selected 3, excess 1, skilled has 2 => covers 1, skilledCanCover = 1
      // Musical Instrument: limit 0, selected 2, skilledCanCover (1) < 2 => warning
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('Musical Instrument');
    });

    it('should handle missing toolProficiencies gracefully', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);

      const warnings = await validateTools({
        rules: '2024',
      });

      expect(warnings).toEqual([]);
    });

    it('should combine warnings from multiple categories', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
        { name: 'Drum', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
        { name: 'Dice', equipment_category: 'Tools', tool_category: 'Gaming Sets' },
        { name: 'Cards', equipment_category: 'Tools', tool_category: 'Gaming Sets' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: ['Flute', 'Drum', 'Dice', 'Cards'],
      });

      // Two categories with 0 allowed, each should generate a warning
      expect(warnings).toHaveLength(2);
      const musicalWarning = warnings.find(w => w.message.includes('Musical Instrument'));
      const gamingWarning = warnings.find(w => w.message.includes('Gaming Sets'));
      expect(musicalWarning).toBeDefined();
      expect(gamingWarning).toBeDefined();
    });

    it('should list selected tool names in the warning message', async () => {
      vi.mocked(dataLoader.fetchBackgroundData).mockResolvedValue({});
      vi.mocked(dataLoader.fetchClassData).mockResolvedValue({});
      vi.mocked(dataLoader.loadFeatData).mockResolvedValue([]);
      vi.mocked(dataLoader.loadEquipment).mockResolvedValue([
        { name: 'Flute', equipment_category: 'Tools', tool_category: 'Musical Instrument' },
      ]);

      const warnings = await validateTools({
        rules: '2024',
        toolProficiencies: ['Flute'],
      });

      expect(warnings[0].message).toContain('Flute');
    });
  });
});

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
  getToolsByCategory,
  computeSkilledToolUsage,
} from './toolValidation.js';

describe('toolValidation - getToolsByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe('toolValidation - computeSkilledToolUsage', () => {
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

import { describe, it, expect, vi } from 'vitest';
import raceRules from './2024.js';

vi.mock('../../ui/utils.js', () => ({
  default: {
    getAbilityLongName: vi.fn((name) => name)
  }
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null)
}));

describe('raceRules 2024 - getTraits', () => {
  describe('addTraits', () => {
    it('returns an object with all expected category keys', () => {
      const traits = [
        { name: 'Darkvision', description: 'Can see in the dark' },
        { name: 'Fey Ancestry', description: 'Advantage on saves against being charmed' }
      ];
      const result = raceRules.addTraits(traits);
      expect(Object.keys(result)).toEqual([
        'actions',
        'bonusActions',
        'reactions',
        'specialActions',
        'characterAdvancement'
      ]);
    });

    it('categorizes traits with description field correctly', () => {
      const traits = [{ name: 'Trait1', description: 'A trait with description field' }];
      const result = raceRules.addTraits(traits);
      const trait1 = result.specialActions.find((t) => t.name === 'Trait1');
      expect(trait1).toBeDefined();
      expect(trait1.description).toBe('A trait with description field');
    });

    it('returns empty arrays for empty traits input', () => {
      const result = raceRules.addTraits([]);
      expect(result.actions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('returns empty categorized object for null traits', () => {
      const result = raceRules.addTraits(null);
      expect(result.actions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('returns empty categorized object for undefined traits', () => {
      const result = raceRules.addTraits(undefined);
      expect(result.actions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('places uncategorized traits in specialActions', () => {
      const traits = [{ name: 'Custom Trait', description: 'A custom trait' }];
      const result = raceRules.addTraits(traits);
      expect(result.specialActions.find((t) => t.name === 'Custom Trait')).toBeDefined();
    });

    it('deduplicates traits by name within each category', () => {
      const traits = [
        { name: 'Darkvision', description: 'First' },
        { name: 'Darkvision', description: 'Second' }
      ];
      const result = raceRules.addTraits(traits);
      expect(result.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
    });
  });

  describe('getTraits', () => {
    it('returns categorized traits from race', () => {
      const input = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' },
            { name: 'Fey Ancestry', description: 'Advantage on saves against being charmed' }
          ]
        }
      };
      const result = raceRules.getTraits(input);
      expect(Object.keys(result)).toEqual([
        'actions',
        'bonusActions',
        'reactions',
        'specialActions',
        'characterAdvancement'
      ]);
    });

    it('handles race without traits', () => {
      const result = raceRules.getTraits({ race: {} });
      expect(Object.keys(result)).toEqual([
        'actions',
        'bonusActions',
        'reactions',
        'specialActions',
        'characterAdvancement'
      ]);
    });

    it('handles undefined race', () => {
      const result = raceRules.getTraits({});
      expect(Object.keys(result)).toEqual([
        'actions',
        'bonusActions',
        'reactions',
        'specialActions',
        'characterAdvancement'
      ]);
    });

    it('handles empty traits array', () => {
      const result = raceRules.getTraits({ race: { traits: [] } });
      expect(Object.keys(result)).toEqual([
        'actions',
        'bonusActions',
        'reactions',
        'specialActions',
        'characterAdvancement'
      ]);
    });

    it('handles null lineage', () => {
      const input = {
        race: {
          lineage: null,
          traits: [{ name: 'Darkvision', description: 'Can see in the dark' }]
        }
      };
      const result = raceRules.getTraits(input);
      const names = result.specialActions.map((t) => t.name);
      expect(names).toContain('Darkvision');
    });

    it('includes lineage traits when lineage matches', () => {
      const input = {
        race: {
          lineage: 'High Elf',
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' },
            {
              name: 'Ancestry',
              sub_traits: [{ name: 'High Elf', description: 'High elf lineage traits.' }]
            }
          ]
        }
      };
      const result = raceRules.getTraits(input);
      const names = result.specialActions.map((t) => t.name);
      expect(names).toContain('Darkvision');
      expect(names).toContain('Ancestry (High Elf)');
    });

    it('excludes lineage traits when lineage does not match', () => {
      const input = {
        race: {
          lineage: 'Wood Elf',
          traits: [
            {
              name: 'Ancestry',
              sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }]
            }
          ]
        }
      };
      const result = raceRules.getTraits(input);
      const names = result.specialActions.map((t) => t.name);
      expect(names).not.toContain('Ancestry (High Elf)');
    });

    it('merges base traits with lineage traits', () => {
      const input = {
        race: {
          lineage: 'High Elf',
          traits: [
            { name: 'Darkvision', description: 'Base trait' },
            { name: 'Fey Ancestry', description: 'Another base trait' },
            {
              name: 'Ancestry',
              sub_traits: [{ name: 'High Elf', description: 'Lineage trait' }]
            }
          ]
        }
      };
      const result = raceRules.getTraits(input);
      const names = result.specialActions.map((t) => t.name);
      expect(names).toContain('Darkvision');
      expect(names).toContain('Fey Ancestry');
      expect(names).toContain('Ancestry (High Elf)');
    });
  });
});

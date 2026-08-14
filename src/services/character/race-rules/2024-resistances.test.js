// // @improved-by-ai
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

describe('raceRules 2024 - getResistances', () => {
  describe('getResistances', () => {
    it('returns empty array when playerSummary has no race', () => {
      expect(raceRules.getResistances({})).toEqual([]);
    });

    it('returns empty array when race has no traits or subrace', () => {
      expect(raceRules.getResistances({ race: { name: 'Human' } })).toEqual([]);
    });

    it('extracts resistance from subrace damage_resistance', () => {
      const input = { race: { subrace: { damage_resistance: 'Fire' } } };
      expect(raceRules.getResistances(input)).toContain('Fire');
    });

    it('extracts resistance from trait description', () => {
      const input = {
        race: { traits: [{ description: 'You have resistance to cold damage.' }] }
      };
      expect(raceRules.getResistances(input)).toContain('cold');
    });

    it('combines subrace and trait resistances', () => {
      const input = {
        race: {
          subrace: { damage_resistance: 'Fire' },
          traits: [{ description: 'You have resistance to poison.' }]
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('Fire');
      expect(result).toContain('poison');
    });

    it('combines subrace, trait, and playerSummary resistances', () => {
      const input = {
        race: {
          subrace: { damage_resistance: 'Fire' },
          traits: [{ description: 'You have resistance to cold.' }]
        },
        resistances: ['Acid']
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('Fire');
      expect(result).toContain('cold');
      expect(result).toContain('Acid');
    });

    it('deduplicates resistances across sources', () => {
      const input = {
        race: { traits: [{ description: 'You have resistance to fire.' }] },
        resistances: ['fire']
      };
      const result = raceRules.getResistances(input);
      expect(result.filter((r) => r === 'fire').length).toBe(1);
    });

    it('returns resistances sorted alphabetically', () => {
      const input = {
        race: { traits: [] },
        resistances: [{ name: 'Zebra' }, { name: 'Alpha' }, { name: 'Middle' }]
      };
      const result = raceRules.getResistances(input);
      expect(result[0].name).toBe('Alpha');
      expect(result[1].name).toBe('Middle');
      expect(result[2].name).toBe('Zebra');
    });

    it('skips "the" keyword from resistance extraction', () => {
      const input = {
        race: { traits: [{ description: 'You have resistance to the magic damage.' }] }
      };
      const result = raceRules.getResistances(input);
      expect(result).not.toContain('the');
    });

    it('handles trait with no description field', () => {
      const input = { race: { traits: [{ name: 'Some Trait' }] } };
      expect(raceRules.getResistances(input)).toEqual([]);
    });

    it('handles missing campaignName gracefully', () => {
      const input = {
        race: { traits: [{ description: 'You have resistance to fire.' }] }
      };
      expect(raceRules.getResistances(input)).toContain('fire');
    });

    it('handles undefined race property', () => {
      expect(raceRules.getResistances({ race: undefined })).toEqual([]);
    });

    it('handles null race property', () => {
      expect(raceRules.getResistances({ race: null })).toEqual([]);
    });

    it('handles traits as null', () => {
      expect(raceRules.getResistances({ race: { traits: null } })).toEqual([]);
    });

    it('handles traits as undefined', () => {
      expect(raceRules.getResistances({ race: { traits: undefined } })).toEqual([]);
    });

    it('handles playerSummary resistances as null', () => {
      const input = { race: { traits: [] }, resistances: null };
      expect(raceRules.getResistances(input)).toEqual([]);
    });

    it('handles missing subrace gracefully', () => {
      const input = { race: { name: 'Human', subrace: undefined } };
      expect(raceRules.getResistances(input)).toEqual([]);
    });

    it('extracts only single-word resistance per match from trait description', () => {
      const input = {
        race: {
          traits: [{ description: 'You have resistance to fire and cold damage.' }]
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('fire');
      expect(result).not.toContain('cold');
    });

    it('extracts multiple resistances from separate trait descriptions', () => {
      const input = {
        race: {
          traits: [
            { description: 'You have resistance to fire damage.' },
            { description: 'You have resistance to cold damage.' }
          ]
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('fire');
      expect(result).toContain('cold');
    });

    it('adds Tiefling Fiendish Legacy resistances based on subrace name', () => {
      const input = {
        race: {
          name: 'Tiefling',
          subrace: { name: 'Abyssal Tiefling' }
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('Poison');
    });

    it('adds Chthonic Tiefling Necrotic resistance', () => {
      const input = {
        race: {
          name: 'Tiefling',
          subrace: { name: 'Chthonic Tiefling' }
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('Necrotic');
    });

    it('adds Infernal Tiefling Fire resistance', () => {
      const input = {
        race: {
          name: 'Tiefling',
          subrace: { name: 'Infernal Tiefling' }
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('Fire');
    });

    it('does not add Fiendish Legacies trait text as resistance for Tiefling', () => {
      const input = {
        race: {
          name: 'Tiefling',
          subrace: { name: 'Abyssal Tiefling' },
          traits: [{ name: 'Fiendish Legacies', description: 'Resistance to poison damage per legacy.' }]
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).toContain('Poison');
      // Should not contain "legacies" or other trait text
      expect(result).not.toContain('legacies');
    });

    it('skips Fiendish Legacies trait for any Tiefling subrace', () => {
      const input = {
        race: {
          name: 'Tiefling',
          subrace: { name: 'Some Other Subrace' },
          traits: [{ name: 'Fiendish Legacies', description: 'You have resistance to fire damage.' }]
        }
      };
      const result = raceRules.getResistances(input);
      expect(result).not.toContain('fire');
    });
  });
});

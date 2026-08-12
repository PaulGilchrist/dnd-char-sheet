import { describe, it, expect, vi } from 'vitest';
import raceRules from './5e.js';

vi.mock('../../ui/utils.js', () => ({
  default: {
    getAbilityLongName: vi.fn((name) => name)
  }
}));

describe('raceRules 5e - getResistances', () => {
  describe('getResistances', () => {
    it('returns empty array when playerSummary has no race', () => {
      const playerSummary = { race: {} };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toEqual([]);
    });

    it('adds Poison resistance for Dwarf race', () => {
      const playerSummary = { race: { name: 'Dwarf' } };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Poison');
    });

    it('does not add Poison resistance for non-Dwarf race', () => {
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getResistances(playerSummary);
      expect(result).not.toContain('Poison');
    });

    it('adds subrace damage_resistance for non-Dwarf races', () => {
      const playerSummary = {
        race: {
          name: 'Human',
          subrace: { damage_resistance: 'Fire' }
        }
      };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Fire');
    });

    it('does not add subrace damage_resistance for Dwarf', () => {
      const playerSummary = {
        race: {
          name: 'Dwarf',
          subrace: { damage_resistance: 'Fire' }
        }
      };
      const result = raceRules.getResistances(playerSummary);
      expect(result).not.toContain('Fire');
    });

    it('adds Charm resistance for Elf race', () => {
      const playerSummary = { race: { name: 'Elf' } };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Charm');
    });

    it('adds Frightened resistance for Halfling race', () => {
      const playerSummary = { race: { name: 'Halfling' } };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Frightened');
    });

    it('adds Poison resistance for Scout Halfling subrace in addition to Frightened', () => {
      const playerSummary = {
        race: {
          name: 'Halfling',
          subrace: { name: 'Scout Halfling' }
        }
      };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Frightened');
      expect(result).toContain('Poison');
    });

    it('does not add extra Poison for non-Scout Halfling subrace', () => {
      const playerSummary = {
        race: {
          name: 'Halfling',
          subrace: { name: 'Lightfoot Halfling' }
        }
      };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Frightened');
      expect(result).not.toContain('Poison');
    });

    it('adds Fire resistance for Tiefling race', () => {
      const playerSummary = { race: { name: 'Tiefling' } };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toContain('Fire');
    });

    it('includes and deduplicates resistances from playerSummary', () => {
      const playerSummary = {
        race: { name: 'Elf' },
        resistances: ['Charm', 'Lightning']
      };
      const result = raceRules.getResistances(playerSummary);
      expect(result.filter((r) => r === 'Charm').length).toBe(1);
      expect(result).toContain('Lightning');
    });

    it('returns resistances sorted alphabetically', () => {
      const playerSummary = {
        race: { name: 'Elf' },
        resistances: ['Zebra', 'Alpha', 'Middle']
      };
      const result = raceRules.getResistances(playerSummary);
      expect(result).toEqual(['Alpha', 'Charm', 'Middle', 'Zebra']);
    });
  });
});

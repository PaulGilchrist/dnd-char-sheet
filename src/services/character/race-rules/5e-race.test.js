import { describe, it, expect, vi } from 'vitest';
import raceRules from './5e.js';
import utils from '../../ui/utils.js';

vi.mock('../../ui/utils.js', () => ({
  default: {
    getAbilityLongName: vi.fn((name) => name)
  }
}));

describe('raceRules 5e - getRace', () => {
  describe('getRace', () => {
    it('returns undefined when race is not found in allRaces', () => {
      const allRaces = [];
      const playerSummary = { race: { name: 'Custom Race' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result).toBeUndefined();
    });

    it('returns a clone of the found race (not the original reference)', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
      expect(result).not.toBe(allRaces[0]);
    });

    it('merges playerSummary race data into the result', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = {
        race: {
          name: 'Human',
          customProperty: 'custom value'
        }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
      expect(result.customProperty).toBe('custom value');
    });

    it('resolves subrace from JSON data and merges playerSummary subrace data', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [
            {
              name: 'High Elf',
              damage_resistance: 'Fire',
              traits: []
            }
          ]
        }
      ];
      const playerSummary = {
        race: {
          name: 'Elf',
          subrace: { name: 'High Elf' }
        },
        subrace: { customProp: 'value' }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace.name).toBe('High Elf');
      expect(result.subrace.damage_resistance).toBe('Fire');
      expect(result.subrace.customProp).toBe('value');
    });

    it('sets subrace to null when no subrace is selected', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [
            {
              name: 'High Elf',
              damage_resistance: 'Fire'
            }
          ]
        }
      ];
      const playerSummary = {
        race: { name: 'Elf' }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace).toBeNull();
    });

    it('removes subraces array from the result', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [
            {
              name: 'High Elf',
              damage_resistance: 'Fire'
            }
          ]
        }
      ];
      const playerSummary = {
        race: { name: 'Elf' }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subraces).toBeUndefined();
    });

    it('converts ability_score abbreviations via utils.getAbilityLongName', () => {
      const allRaces = [
        {
          name: 'Human',
          ability_bonuses: [{ ability_score: 'STR', bonus: 1 }]
        }
      ];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(utils.getAbilityLongName).toHaveBeenCalledWith('STR');
      expect(result.ability_bonuses[0].ability_score).toBe('STR');
    });

    it('converts subrace ability_score abbreviations via utils.getAbilityLongName', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [
            {
              name: 'High Elf',
              ability_bonuses: [{ ability_score: 'INT', bonus: 1 }]
            }
          ]
        }
      ];
      const playerSummary = {
        race: {
          name: 'Elf',
          subrace: { name: 'High Elf' }
        }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace.ability_bonuses[0].ability_score).toBe('INT');
    });

    it('handles race without ability_bonuses', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.ability_bonuses).toBeUndefined();
    });

    it('handles race without traits', () => {
      const allRaces = [{ name: 'Human' }];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
    });

    it('returns undefined when subrace name does not match any subrace', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [
            {
              name: 'High Elf',
              damage_resistance: 'Fire'
            }
          ]
        }
      ];
      const playerSummary = {
        race: {
          name: 'Elf',
          subrace: { name: 'Wood Elf' }
        }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace).toBeNull();
    });
  });
});

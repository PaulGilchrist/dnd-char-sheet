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

describe('raceRules 2024 - getRace', () => {
  describe('getRace', () => {
    it('returns playerSummary.race when race not found in allRaces', () => {
      const allRaces = [];
      const playerSummary = { race: { name: 'Custom Race' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result).toEqual({ name: 'Custom Race' });
    });

    it('returns a clone of found race (not same reference)', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
      expect(result).not.toBe(allRaces[0]);
    });

    it('merges playerSummary race data into result', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human', customProperty: 'custom value' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
      expect(result.customProperty).toBe('custom value');
    });

    it('resolves subrace from JSON data', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [{ name: 'High Elf', damage_resistance: 'Fire', traits: [] }]
        }
      ];
      const playerSummary = { race: { name: 'Elf', subrace: { name: 'High Elf' } } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace.name).toBe('High Elf');
      expect(result.subrace.damage_resistance).toBe('Fire');
    });

    it('merges playerSummary subrace data over JSON data', () => {
      const allRaces = [
        {
          name: 'Elf',
          subraces: [{ name: 'High Elf', damage_resistance: 'Fire' }]
        }
      ];
      const playerSummary = {
        race: { name: 'Elf', subrace: { name: 'High Elf', customProp: 'value' } }
      };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace.name).toBe('High Elf');
      expect(result.subrace.damage_resistance).toBe('Fire');
      expect(result.subrace.customProp).toBe('value');
    });

    it('handles subrace not found in subraces list', () => {
      const allRaces = [{ name: 'Elf', subraces: [] }];
      const playerSummary = { race: { name: 'Elf', subrace: { name: 'High Elf' } } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.subrace).toEqual({ name: 'High Elf' });
    });

    it('resolves lineage from sub_traits', () => {
      const allRaces = [
        {
          name: 'Elf',
          traits: [{ name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }] }]
        }
      ];
      const playerSummary = { race: { name: 'Elf', lineage: 'High Elf' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.traits[0].selectedLineage).toBeDefined();
      expect(result.traits[0].selectedLineage.name).toBe('High Elf');
    });

    it('leaves selectedLineage undefined when lineage not found in sub_traits', () => {
      const allRaces = [
        {
          name: 'Elf',
          traits: [{ name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }] }]
        }
      ];
      const playerSummary = { race: { name: 'Elf', lineage: 'Wood Elf' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.traits[0].selectedLineage).toBeUndefined();
    });

    it('does not set selectedLineage when no lineage specified', () => {
      const allRaces = [
        {
          name: 'Elf',
          traits: [{ name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }] }]
        }
      ];
      const playerSummary = { race: { name: 'Elf' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.traits[0].selectedLineage).toBeUndefined();
    });

    it('does not crash when race has no traits and lineage is specified', () => {
      const allRaces = [{ name: 'Human' }];
      const playerSummary = { race: { name: 'Human', lineage: 'Some Lineage' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
    });

    it('passes ability_bonuses through getAbilityLongName transformation', () => {
      const allRaces = [{ name: 'Human', ability_bonuses: [{ ability_score: 'STR', bonus: 1 }] }];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.ability_bonuses[0].ability_score).toBe('STR');
    });

    it('handles race without ability_bonuses', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result = raceRules.getRace(allRaces, playerSummary);
      expect(result.ability_bonuses).toBeUndefined();
    });
  });
});

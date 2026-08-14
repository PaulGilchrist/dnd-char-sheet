// @improved-by-ai
import { describe, it, expect } from 'vitest';
import raceRules from './5e.js';

describe('raceRules 5e - getTraits', () => {
  describe('addTraits', () => {
    it('categorizes traits into the correct category keys', () => {
      const traits = [
        { name: 'Darkvision', description: 'Can see in the dark' },
        { name: 'Fey Ancestry', description: 'Advantage on saves against being charmed' }
      ];
      const result = raceRules.addTraits(traits);
      expect(result).toEqual({
        actions: [],
        bonusActions: [],
        reactions: [],
        specialActions: expect.arrayContaining([
          expect.objectContaining({ name: 'Darkvision' }),
          expect.objectContaining({ name: 'Fey Ancestry' })
        ]),
        characterAdvancement: []
      });
    });

    it('supports traits with description field', () => {
      const traits = [
        { name: 'Trait1', description: 'A trait with description field' }
      ];
      const result = raceRules.addTraits(traits);
      const trait = result.specialActions.find((t) => t.name === 'Trait1');
      expect(trait).toBeDefined();
      expect(trait.description).toBe('A trait with description field');
    });

    it('returns empty category arrays for empty input', () => {
      const result = raceRules.addTraits([]);
      expect(result.actions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('returns empty category arrays for null input', () => {
      const result = raceRules.addTraits(null);
      expect(result.actions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('returns empty category arrays for undefined input', () => {
      const result = raceRules.addTraits(undefined);
      expect(result.actions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('places traits not in any category into specialActions', () => {
      const traits = [
        { name: 'Custom Trait', description: 'A custom trait' }
      ];
      const result = raceRules.addTraits(traits);
      expect(result.specialActions.find((t) => t.name === 'Custom Trait')).toBeDefined();
    });

    it('deduplicates traits by name', () => {
      const traits = [
        { name: 'Darkvision', description: 'First' },
        { name: 'Darkvision', description: 'Second' }
      ];
      const result = raceRules.addTraits(traits);
      expect(result.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
      expect(result.specialActions[0].description).toBe('First');
    });

    it('handles traits without description field', () => {
      const traits = [{ name: 'Trait Without Description' }];
      const result = raceRules.addTraits(traits);
      const trait = result.specialActions.find((t) => t.name === 'Trait Without Description');
      expect(trait).toBeDefined();
      expect(trait.description).toBeUndefined();
    });
  });

  describe('getTraits', () => {
    it('returns categorized traits from race', () => {
      const playerStats = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' },
            { name: 'Fey Ancestry', description: 'Advantage on saves against being charmed' }
          ]
        }
      };
      const result = raceRules.getTraits(playerStats);
      expect(result).toEqual({
        actions: [],
        bonusActions: [],
        reactions: [],
        specialActions: expect.any(Array),
        characterAdvancement: []
      });
    });

    it('handles race without traits', () => {
      const playerStats = { race: {} };
      const result = raceRules.getTraits(playerStats);
      expect(result).toEqual({
        actions: [],
        bonusActions: [],
        reactions: [],
        specialActions: [],
        characterAdvancement: []
      });
    });

    it('merges subrace racial_traits with base traits and deduplicates', () => {
      const playerStats = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' }
          ],
          subrace: {
            racial_traits: [
              { name: 'Elven Weapon Training', description: 'Proficient with handaxes' }
            ]
          }
        }
      };
      const result = raceRules.getTraits(playerStats);
      const names = result.specialActions.map((t) => t.name);
      expect(names).toContain('Darkvision');
      expect(names).toContain('Elven Weapon Training');
    });

    it('deduplicates traits when base and subrace have the same trait', () => {
      const playerStats = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' }
          ],
          subrace: {
            racial_traits: [
              { name: 'Darkvision', description: 'Extended darkvision' }
            ]
          }
        }
      };
      const result = raceRules.getTraits(playerStats);
      expect(result.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
    });

    it('handles subrace without racial_traits', () => {
      const playerStats = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' }
          ],
          subrace: {}
        }
      };
      const result = raceRules.getTraits(playerStats);
      expect(result.specialActions.find((t) => t.name === 'Darkvision')).toBeDefined();
    });

    it('handles null subrace', () => {
      const playerStats = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' }
          ],
          subrace: null
        }
      };
      const result = raceRules.getTraits(playerStats);
      expect(result.specialActions.find((t) => t.name === 'Darkvision')).toBeDefined();
    });

    it('handles empty traits array', () => {
      const playerStats = {
        race: {
          traits: []
        }
      };
      const result = raceRules.getTraits(playerStats);
      expect(result).toEqual({
        actions: [],
        bonusActions: [],
        reactions: [],
        specialActions: [],
        characterAdvancement: []
      });
    });

    it('merges multiple subrace racial_traits with base traits', () => {
      const playerStats = {
        race: {
          traits: [
            { name: 'Darkvision', description: 'Can see in the dark' }
          ],
          subrace: {
            racial_traits: [
              { name: 'Elven Weapon Training', description: 'Weapon proficiency' },
              { name: 'Fey Ancestry', description: 'Charm resistance' }
            ]
          }
        }
      };
      const result = raceRules.getTraits(playerStats);
      const names = result.specialActions.map((t) => t.name);
      expect(names).toContain('Darkvision');
      expect(names).toContain('Elven Weapon Training');
      expect(names).toContain('Fey Ancestry');
    });
  });
});

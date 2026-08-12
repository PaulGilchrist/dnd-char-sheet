import { describe, it, expect, vi } from 'vitest';
import raceRules from './5e.js';

vi.mock('../../ui/utils.js', () => ({
  default: {
    getAbilityLongName: vi.fn((name) => name)
  }
}));

describe('raceRules 5e - getSenses', () => {
  describe('getSenses', () => {
    it('returns sorted array when playerStats has no senses or race traits', () => {
      const playerStats = { race: { traits: [] } };
      const result = raceRules.getSenses(playerStats);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('preserves existing senses and returns sorted', () => {
      const playerStats = {
        senses: [{ name: 'Normal Vision', value: '60 ft.' }],
        race: { traits: [] }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Normal Vision', value: '60 ft.' });
    });

    it('adds Darkvision when race has Darkvision trait and it is not already present', () => {
      const playerStats = {
        senses: [],
        race: {
          traits: [{ name: 'Darkvision' }]
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Darkvision', value: '60 ft.' });
    });

    it('does not duplicate Darkvision when already in senses', () => {
      const playerStats = {
        senses: [{ name: 'Darkvision', value: '120 ft.' }],
        race: {
          traits: [{ name: 'Darkvision' }]
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result.filter((s) => s.name === 'Darkvision').length).toBe(1);
      expect(result.find((s) => s.name === 'Darkvision').value).toBe('120 ft.');
    });

    it('does not add Darkvision when race does not have the trait', () => {
      const playerStats = {
        senses: [],
        race: {
          traits: [{ name: 'Other Trait' }]
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Darkvision', value: '60 ft.' });
    });

    it('adds Passive Perception when Wisdom ability with Perception skill exists', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        abilities: [
          {
            name: 'Wisdom',
            bonus: 2,
            skills: [{ name: 'Perception', bonus: 5 }]
          }
        ]
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Passive Perception', value: '15' });
    });

    it('falls back to ability bonus when Perception skill is missing', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        abilities: [
          {
            name: 'Wisdom',
            bonus: 3,
            skills: []
          }
        ]
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Passive Perception', value: '13' });
    });

    it('adds Passive Investigation when Intelligence ability with Investigation skill exists', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        abilities: [
          {
            name: 'Intelligence',
            bonus: 1,
            skills: [{ name: 'Investigation', bonus: 3 }]
          }
        ]
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Passive Investigation', value: '13' });
    });

    it('adds Passive Insight when Wisdom ability with Insight skill exists', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        abilities: [
          {
            name: 'Wisdom',
            bonus: 2,
            skills: [{ name: 'Insight', bonus: 2 }]
          }
        ]
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Passive Insight', value: '12' });
    });

    it('does not add passive skills when abilities array is missing', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Passive Perception', value: '10' });
      expect(result).not.toContainEqual({ name: 'Passive Investigation', value: '10' });
      expect(result).not.toContainEqual({ name: 'Passive Insight', value: '10' });
    });

    it('does not add passive skills when the relevant ability is missing', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        abilities: [
          {
            name: 'Strength',
            bonus: 2,
            skills: []
          }
        ]
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Passive Perception', value: '12' });
    });

    it('falls back to ability bonus when skill is missing for Passive Perception', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        abilities: [
          {
            name: 'Wisdom',
            bonus: 2,
            skills: [{ name: 'Animal Handling', bonus: 0 }]
          }
        ]
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Passive Perception', value: '12' });
    });

    it('returns senses sorted alphabetically by name', () => {
      const playerStats = {
        senses: [
          { name: 'Zebra Vision', value: '10 ft.' },
          { name: 'Alpha Vision', value: '5 ft.' }
        ],
        race: { traits: [] }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result[0].name).toBe('Alpha Vision');
      expect(result[1].name).toBe('Zebra Vision');
    });

    it('adds Feral Senses when a class feature has Feral Senses', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {
          class_levels: [
            { features: [{ name: 'Other Feature' }] },
            { features: [{ name: 'Feral Senses' }] }
          ]
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Feral Senses', value: '' });
    });

    it('does not add Feral Senses when no class feature has it', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {
          class_levels: [
            { features: [{ name: 'Other Feature' }] }
          ]
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Feral Senses', value: '' });
    });

    it('does not duplicate Feral Senses when already in senses', () => {
      const playerStats = {
        senses: [{ name: 'Feral Senses', value: '120 ft.' }],
        race: { traits: [] },
        class: {
          class_levels: [
            { features: [{ name: 'Feral Senses' }] }
          ]
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result.filter((s) => s.name === 'Feral Senses').length).toBe(1);
      expect(result.find((s) => s.name === 'Feral Senses').value).toBe('120 ft.');
    });

    it('handles missing class_levels gracefully', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {}
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Feral Senses', value: '' });
    });

    it('adds Blindvision 10 ft. when Blind Fighting fighting style is selected', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {
          fightingStyles: ['Blind Fighting']
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });

    it('does not add Blindvision when Blind Fighting is not selected', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {
          fightingStyles: ['Dueling']
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });

    it('does not add Blindvision when fightingStyles is empty', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {
          fightingStyles: []
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });

    it('does not duplicate Blindvision when already in senses', () => {
      const playerStats = {
        senses: [{ name: 'Blindvision', value: '30 ft.' }],
        race: { traits: [] },
        class: {
          fightingStyles: ['Blind Fighting']
        }
      };
      const result = raceRules.getSenses(playerStats);
      expect(result.filter((s) => s.name === 'Blindvision').length).toBe(1);
      expect(result.find((s) => s.name === 'Blindvision').value).toBe('30 ft.');
    });

    it('handles missing fightingStyles gracefully', () => {
      const playerStats = {
        senses: [],
        race: { traits: [] },
        class: {}
      };
      const result = raceRules.getSenses(playerStats);
      expect(result).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });
  });
});

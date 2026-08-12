import { describe, it, expect, vi } from 'vitest';
import raceRules from './5e.js';

vi.mock('../../ui/utils.js', () => ({
  default: {
    getAbilityLongName: vi.fn((name) => name)
  }
}));

describe('raceRules 5e - getRacialBonus', () => {
  describe('getRacialBonus', () => {
    it('returns 0 when race has no ability_bonuses', () => {
      const playerStats = { race: {} };
      const result = raceRules.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(0);
    });

    it('returns 0 when ability name is not in ability_bonuses', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }]
        }
      };
      const result = raceRules.getRacialBonus(playerStats, 'Dexterity');
      expect(result).toBe(0);
    });

    it('returns the bonus from race ability_bonuses', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }]
        }
      };
      const result = raceRules.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(2);
    });

    it('returns the bonus from subrace ability_bonuses', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: {
            ability_bonuses: [{ ability_score: 'Dexterity', bonus: 1 }]
          }
        }
      };
      const result = raceRules.getRacialBonus(playerStats, 'Dexterity');
      expect(result).toBe(1);
    });

    it('sums bonuses from race and subrace for the same ability', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: {
            ability_bonuses: [{ ability_score: 'Strength', bonus: 1 }]
          }
        }
      };
      const result = raceRules.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(3);
    });

    it('returns race bonus when subrace is null', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: null
        }
      };
      const result = raceRules.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(2);
    });

    it('returns race bonus when subrace exists but has no ability_bonuses', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: {}
        }
      };
      const result = raceRules.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(2);
    });
  });
});

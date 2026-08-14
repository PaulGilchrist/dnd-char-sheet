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

describe('raceRules 2024 - getRacialBonus', () => {
  describe('getRacialBonus', () => {
    it('returns 0 with no arguments', () => {
      expect(raceRules.getRacialBonus()).toBe(0);
    });

    it('returns 0 with undefined arguments', () => {
      expect(raceRules.getRacialBonus(undefined, undefined)).toBe(0);
    });

    it('returns 0 regardless of playerSummary content', () => {
      const playerSummary = {
        race: {
          name: 'Human',
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: { ability_bonuses: [{ ability_score: 'Dexterity', bonus: 1 }] }
        }
      };
      expect(raceRules.getRacialBonus(playerSummary, 'Strength')).toBe(0);
      expect(raceRules.getRacialBonus(playerSummary, 'Dexterity')).toBe(0);
    });

    it('returns 0 when playerSummary is empty object', () => {
      expect(raceRules.getRacialBonus({}, 'Strength')).toBe(0);
    });

    it('returns 0 when playerSummary is null', () => {
      expect(raceRules.getRacialBonus(null, 'Strength')).toBe(0);
    });

    it('ignores ability name argument and always returns 0', () => {
      const playerSummary = { race: { ability_bonuses: [{ ability_score: 'STR', bonus: 5 }] } };
      expect(raceRules.getRacialBonus(playerSummary, 'STR')).toBe(0);
      expect(raceRules.getRacialBonus(playerSummary, 'DEX')).toBe(0);
      expect(raceRules.getRacialBonus(playerSummary, 'CON')).toBe(0);
    });
  });
});

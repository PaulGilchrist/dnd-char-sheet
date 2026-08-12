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

    it('returns 0 regardless of arguments', () => {
      expect(raceRules.getRacialBonus({ race: { ability_bonuses: [] } }, 'Strength')).toBe(0);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import raceRules from './5e.js';

vi.mock('../../ui/utils.js', () => ({
  default: {
    getAbilityLongName: vi.fn((name) => name)
  }
}));

describe('raceRules 5e - getImmunities', () => {
  describe('getImmunities', () => {
    it('returns empty array when playerSummary has no race or class', () => {
      const playerSummary = { race: {}, class: {} };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual([]);
    });

    it('adds Magical Sleep immunity for Elf race', () => {
      const playerSummary = { race: { name: 'Elf' }, class: {} };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toContain('Magical Sleep');
    });

    it('does not add Magical Sleep for non-Elf race', () => {
      const playerSummary = { race: { name: 'Human' }, class: {} };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).not.toContain('Magical Sleep');
    });

    it('adds Disease and Poison immunity for Monk level > 9', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Monk' },
        level: 10
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toContain('Disease');
      expect(result).toContain('Poison');
    });

    it('does not add Disease/Poison for Monk at level 9 (boundary)', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Monk' },
        level: 9
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).not.toContain('Disease');
      expect(result).not.toContain('Poison');
    });

    it('adds Disease immunity for Paladin level > 2', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Paladin' },
        level: 3
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toContain('Disease');
    });

    it('does not add Disease for Paladin at level 2 (boundary)', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Paladin' },
        level: 2
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).not.toContain('Disease');
    });

    it('includes and deduplicates immunities from playerSummary', () => {
      const playerSummary = {
        race: { name: 'Elf' },
        class: {},
        immunities: ['Magical Sleep', 'Disease']
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result.filter((i) => i === 'Magical Sleep').length).toBe(1);
      expect(result).toContain('Disease');
    });

    it('returns immunities sorted alphabetically', () => {
      const playerSummary = {
        race: { name: 'Elf' },
        class: {},
        immunities: ['Zebra', 'Alpha', 'Middle']
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Alpha', 'Magical Sleep', 'Middle', 'Zebra']);
    });
  });
});

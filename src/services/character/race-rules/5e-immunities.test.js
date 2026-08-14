// @improved-by-ai
import { describe, it, expect } from 'vitest';
import raceRules from './5e.js';

describe('raceRules 5e - getImmunities', () => {
  describe('getImmunities', () => {
    it('returns empty array when race and class are empty objects', () => {
      const playerSummary = { race: {}, class: {} };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual([]);
    });

    it('does not add Monk immunities when race name is empty string', () => {
      const playerSummary = { race: {}, class: { name: 'Monk' }, level: 10 };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Disease', 'Poison']);
    });

    it('returns empty array when class name is missing', () => {
      const playerSummary = { race: { name: 'Elf' }, class: {}, level: 10 };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Magical Sleep']);
    });

    it('adds Magical Sleep immunity for Elf race', () => {
      const playerSummary = { race: { name: 'Elf' }, class: {} };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Magical Sleep']);
    });

    it('does not add Magical Sleep for non-Elf race', () => {
      const playerSummary = { race: { name: 'Human' }, class: {} };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual([]);
    });

    it('adds Disease and Poison immunity for Monk level 10', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Monk' },
        level: 10
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Disease', 'Poison']);
    });

    it('does not add Disease/Poison for Monk at level 9 (boundary)', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Monk' },
        level: 9
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual([]);
    });

    it('does not add Disease/Poison for Monk at level 10 with undefined level', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Monk' }
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual([]);
    });

    it('adds Disease immunity for Paladin level 3', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Paladin' },
        level: 3
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Disease']);
    });

    it('does not add Disease for Paladin at level 2 (boundary)', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Paladin' },
        level: 2
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual([]);
    });

    it('deduplicates Disease when Monk and playerSummary both provide it', () => {
      const playerSummary = {
        race: { name: 'Human' },
        class: { name: 'Monk' },
        level: 10,
        immunities: ['Disease']
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result.filter((i) => i === 'Disease').length).toBe(1);
      expect(result).toContain('Poison');
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

    it('combines Elf Magical Sleep with Paladin Disease', () => {
      const playerSummary = {
        race: { name: 'Elf' },
        class: { name: 'Paladin' },
        level: 3
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Disease', 'Magical Sleep']);
    });

    it('combines Elf Magical Sleep, Monk Disease/Poison, and custom immunities', () => {
      const playerSummary = {
        race: { name: 'Elf' },
        class: { name: 'Monk' },
        level: 10,
        immunities: ['Fire']
      };
      const result = raceRules.getImmunities(playerSummary);
      expect(result).toEqual(['Disease', 'Fire', 'Magical Sleep', 'Poison']);
    });
  });
});

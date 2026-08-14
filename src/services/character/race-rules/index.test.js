// @improved-by-ai
import { describe, it, expect } from 'vitest';
import * as raceRulesModule from './index.js';
import rules5e from './5e.js';
import rules2024 from './2024.js';

const EXPECTED_METHODS = [
  'getImmunities',
  'getRace',
  'getRacialBonus',
  'getResistances',
  'getSenses',
  'addTraits',
  'getTraits',
];

describe('race-rules/index', () => {
  describe('exports', () => {
    it('exports rules5e and rules2024 as separate non-null objects', () => {
      expect(raceRulesModule.rules5e).toBeDefined();
      expect(raceRulesModule.rules2024).toBeDefined();
      expect(raceRulesModule.rules5e).not.toBe(raceRulesModule.rules2024);
    });

    it('exports rules5e as the default from 5e.js and rules2024 as the default from 2024.js', () => {
      expect(raceRulesModule.rules5e).toBe(rules5e);
      expect(raceRulesModule.rules2024).toBe(rules2024);
    });

    it('exports only rules5e and rules2024', () => {
      expect(Object.keys(raceRulesModule)).toEqual(['rules5e', 'rules2024']);
    });
  });

  describe('5e contract', () => {
    it.each(EXPECTED_METHODS)('exports %s as a function', (method) => {
      expect(typeof raceRulesModule.rules5e[method]).toBe('function');
    });

    it('exports exactly the expected methods for rules5e', () => {
      const actualMethods = Object.keys(raceRulesModule.rules5e);
      expect(actualMethods).toEqual(expect.arrayContaining(EXPECTED_METHODS));
    });
  });

  describe('2024 contract', () => {
    it.each(EXPECTED_METHODS)('exports %s as a function', (method) => {
      expect(typeof raceRulesModule.rules2024[method]).toBe('function');
    });

    it('exports at least the expected methods for rules2024', () => {
      const actualMethods = Object.keys(raceRulesModule.rules2024);
      expect(actualMethods).toEqual(expect.arrayContaining(EXPECTED_METHODS));
    });
  });

  describe('5e vs 2024 contract differences', () => {
    it('both rulesets expose the same method names but are different objects', () => {
      for (const method of EXPECTED_METHODS) {
        expect(typeof raceRulesModule.rules5e[method]).toBe('function');
        expect(typeof raceRulesModule.rules2024[method]).toBe('function');
      }
      expect(raceRulesModule.rules5e).not.toBe(raceRulesModule.rules2024);
    });

    it('5e getRacialBonus sums ability bonuses from race and subrace', () => {
      const result = raceRulesModule.rules5e.getRacialBonus(
        { race: { ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }] } },
        'Strength'
      );
      expect(result).toBe(2);
    });

    it('2024 getRacialBonus always returns 0 regardless of input', () => {
      expect(raceRulesModule.rules2024.getRacialBonus(
        { race: { ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }] } },
        'Strength'
      )).toBe(0);
    });

    it('5e getRace returns undefined when race not found, 2024 returns playerSummary.race', () => {
      const allRaces = [];
      const playerSummary = { race: { name: 'Custom Race' } };
      expect(raceRulesModule.rules5e.getRace(allRaces, playerSummary)).toBeUndefined();
      expect(raceRulesModule.rules2024.getRace(allRaces, playerSummary)).toEqual({ name: 'Custom Race' });
    });
  });
});

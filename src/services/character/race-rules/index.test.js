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
    it('exports rules5e as a defined object', () => {
      expect(raceRulesModule.rules5e).toBeDefined();
      expect(typeof raceRulesModule.rules5e).toBe('object');
    });

    it('exports rules2024 as a defined object', () => {
      expect(raceRulesModule.rules2024).toBeDefined();
      expect(typeof raceRulesModule.rules2024).toBe('object');
    });

    it('exports are different objects', () => {
      expect(raceRulesModule.rules5e).not.toBe(raceRulesModule.rules2024);
    });

    it('exports rules5e as the default from 5e.js', () => {
      expect(raceRulesModule.rules5e).toBe(rules5e);
    });

    it('exports rules2024 as the default from 2024.js', () => {
      expect(raceRulesModule.rules2024).toBe(rules2024);
    });

    it('exports only rules5e and rules2024', () => {
      expect(Object.keys(raceRulesModule)).toEqual(['rules5e', 'rules2024']);
    });
  });

  describe('rules5e contract', () => {
    it.each(EXPECTED_METHODS)('has method %s as a function', (method) => {
      expect(typeof raceRulesModule.rules5e[method]).toBe('function');
    });

    it('has no unexpected methods beyond the expected set', () => {
      const actualMethods = Object.keys(raceRulesModule.rules5e);
      expect(actualMethods).toEqual(expect.arrayContaining(EXPECTED_METHODS));
    });
  });

  describe('rules2024 contract', () => {
    it.each(EXPECTED_METHODS)('has method %s as a function', (method) => {
      expect(typeof raceRulesModule.rules2024[method]).toBe('function');
    });

    it('has no unexpected methods beyond the expected set', () => {
      const actualMethods = Object.keys(raceRulesModule.rules2024);
      expect(actualMethods).toEqual(expect.arrayContaining(EXPECTED_METHODS));
    });
  });

  describe('5e vs 2024 differences', () => {
    it('exports are not the same reference even though they share the same method names', () => {
      for (const method of EXPECTED_METHODS) {
        expect(typeof raceRulesModule.rules5e[method]).toBe('function');
        expect(typeof raceRulesModule.rules2024[method]).toBe('function');
      }
      expect(raceRulesModule.rules5e).not.toBe(raceRulesModule.rules2024);
    });

    it('5e getRacialBonus returns a non-zero value for a race with ability bonuses', () => {
      const result = raceRulesModule.rules5e.getRacialBonus(
        { race: { ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }] } },
        'Strength'
      );
      expect(result).toBe(2);
    });

    it('2024 getRacialBonus returns 0 regardless of input', () => {
      const result = raceRulesModule.rules2024.getRacialBonus(
        { race: { ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }] } },
        'Strength'
      );
      expect(result).toBe(0);
    });

    it('5e getRacialBonus sums bonuses from race and subrace for same ability', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: {
            ability_bonuses: [{ ability_score: 'Strength', bonus: 1 }]
          }
        }
      };
      const result = raceRulesModule.rules5e.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(3);
    });

    it('5e getRacialBonus returns race bonus when subrace is null', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: null
        }
      };
      const result = raceRulesModule.rules5e.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(2);
    });

    it('5e getRacialBonus returns race bonus when subrace has no ability_bonuses', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }],
          subrace: {}
        }
      };
      const result = raceRulesModule.rules5e.getRacialBonus(playerStats, 'Strength');
      expect(result).toBe(2);
    });

    it('5e getRacialBonus returns 0 when ability not found', () => {
      const playerStats = {
        race: {
          ability_bonuses: [{ ability_score: 'Strength', bonus: 2 }]
        }
      };
      const result = raceRulesModule.rules5e.getRacialBonus(playerStats, 'Dexterity');
      expect(result).toBe(0);
    });

    it('5e getRace returns undefined when race not found, 2024 returns playerSummary.race', () => {
      const allRaces = [];
      const playerSummary = { race: { name: 'Custom Race' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e).toBeUndefined();
      expect(result2024).toEqual({ name: 'Custom Race' });
    });

    it('5e getRace returns cloned race, 2024 getRace also returns cloned race', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e).not.toBe(allRaces[0]);
      expect(result2024).not.toBe(allRaces[0]);
    });

    it('5e getRace removes subraces array from result, 2024 does not', () => {
      const allRaces = [{ name: 'Elf', subraces: [{ name: 'High Elf' }] }];
      const playerSummary = { race: { name: 'Elf' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e.subraces).toBeUndefined();
      expect(result2024.subraces).toEqual([{ name: 'High Elf' }]);
    });

    it('5e getRace sets subrace to null when not found, 2024 leaves original subrace object', () => {
      const allRaces = [{ name: 'Elf', subraces: [{ name: 'High Elf' }] }];
      const playerSummary = { race: { name: 'Elf', subrace: { name: 'Wood Elf' } } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e.subrace).toBeNull();
      expect(result2024.subrace).toEqual({ name: 'Wood Elf' });
    });

    it('5e getRace sets subrace to null when no subrace selected, 2024 returns subrace from data', () => {
      const allRaces = [{ name: 'Elf', subraces: [{ name: 'High Elf' }] }];
      const playerSummary5e = { race: { name: 'Elf' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary5e);
      expect(result5e.subrace).toBeNull();

      const playerSummary2024 = { race: { name: 'Elf', subrace: { name: 'High Elf' } } };
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary2024);
      expect(result2024.subrace).toEqual({ name: 'High Elf' });
    });

    it('5e getRace resolves subrace and merges playerSummary subrace data, 2024 does too', () => {
      const allRaces = [{ name: 'Elf', subraces: [{ name: 'High Elf', damage_resistance: 'Fire' }] }];
      const playerSummary5e = { race: { name: 'Elf', subrace: { name: 'High Elf' } }, subrace: { customProp: 'value' } };
      const playerSummary2024 = { race: { name: 'Elf', subrace: { name: 'High Elf', customProp: 'value' } } };

      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary2024);

      expect(result5e.subrace.name).toBe('High Elf');
      expect(result5e.subrace.damage_resistance).toBe('Fire');
      expect(result5e.subrace.customProp).toBe('value');

      expect(result2024.subrace.name).toBe('High Elf');
      expect(result2024.subrace.damage_resistance).toBe('Fire');
      expect(result2024.subrace.customProp).toBe('value');
    });

    it('5e getRace merges playerSummary race data into result, 2024 does too', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary5e = { race: { name: 'Human', customProperty: 'custom value' } };
      const playerSummary2024 = { race: { name: 'Human', customProperty: 'custom value' } };

      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary2024);

      expect(result5e.name).toBe('Human');
      expect(result5e.customProperty).toBe('custom value');
      expect(result2024.name).toBe('Human');
      expect(result2024.customProperty).toBe('custom value');
    });

    it('5e getRace does not set selectedLineage when no lineage specified, 2024 does too', () => {
      const allRaces = [{ name: 'Elf', traits: [{ name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }] }] }];
      const playerSummary5e = { race: { name: 'Elf' } };
      const playerSummary2024 = { race: { name: 'Elf' } };

      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary2024);

      expect(result5e.subrace).toBeNull();
      expect(result2024.traits[0].selectedLineage).toBeUndefined();
    });

    it('2024 getRace resolves lineage from sub_traits', () => {
      const allRaces = [{ name: 'Elf', traits: [{ name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }] }] }];
      const playerSummary = { race: { name: 'Elf', lineage: 'High Elf' } };
      const result = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result.traits[0].selectedLineage).toBeDefined();
      expect(result.traits[0].selectedLineage.name).toBe('High Elf');
    });

    it('2024 getRace does not set selectedLineage when lineage not found in sub_traits', () => {
      const allRaces = [{ name: 'Elf', traits: [{ name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'High elf traits.' }] }] }];
      const playerSummary = { race: { name: 'Elf', lineage: 'Wood Elf' } };
      const result = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result.traits[0].selectedLineage).toBeUndefined();
    });

    it('2024 getRace does not crash when race has no traits and lineage is specified', () => {
      const allRaces = [{ name: 'Human' }];
      const playerSummary = { race: { name: 'Human', lineage: 'Some Lineage' } };
      const result = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result.name).toBe('Human');
    });

    it('5e getSenses uses trait name matching, 2024 uses regex on description', () => {
      const playerStats5e = { race: { traits: [{ name: 'Darkvision' }] } };
      const playerStats2024 = { race: { traits: [{ description: 'You have darkvision with a range of 60 feet.' }] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e).toContainEqual({ name: 'Darkvision', value: '60 ft.' });
      expect(result2024).toContainEqual({ name: 'Darkvision', value: '60 ft.' });
    });

    it('5e getSenses adds Feral Senses as a sense name, 2024 adds Blindsight 30 ft.', () => {
      const playerStats5e = { race: { traits: [] }, class: { class_levels: [{ features: [{ name: 'Feral Senses' }] }] } };
      const playerStats2024 = { race: { traits: [] }, class: { class_levels: [{ features: [{ name: 'Feral Senses' }] }] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e).toContainEqual({ name: 'Feral Senses', value: '' });
      expect(result2024).toContainEqual({ name: 'Blindsight', value: '30 ft.' });
    });

    it('5e getSenses adds Blindvision when Blind Fighting fighting style is selected, 2024 does too', () => {
      const playerStats5e = { race: { traits: [] }, class: { fightingStyles: ['Blind Fighting'] } };
      const playerStats2024 = { race: { traits: [] }, class: { fightingStyles: ['Blind Fighting'] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e).toContainEqual({ name: 'Blindvision', value: '10 ft.' });
      expect(result2024).toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });

    it('5e getSenses does not duplicate Blindvision when already present, 2024 does too', () => {
      const playerStats5e = { senses: [{ name: 'Blindvision', value: '30 ft.' }], race: { traits: [] }, class: { fightingStyles: ['Blind Fighting'] } };
      const playerStats2024 = { senses: [{ name: 'Blindvision', value: '30 ft.' }], race: { traits: [] }, class: { fightingStyles: ['Blind Fighting'] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e.filter((s) => s.name === 'Blindvision').length).toBe(1);
      expect(result2024.filter((s) => s.name === 'Blindvision').length).toBe(1);
    });

    it('2024 getSenses overrides darkvision to 120 ft for Drow lineage', () => {
      const input = { senses: [{ name: 'Darkvision', value: '60 ft.' }], race: { lineage: 'Drow', traits: [] } };
      const result = raceRulesModule.rules2024.getSenses(input);
      const dv = result.find((s) => s.name === 'Darkvision');
      expect(dv.value).toBe('120 ft.');
    });

    it('2024 getSenses overrides darkvision to 120 ft for Deep Gnome lineage', () => {
      const input = { senses: [{ name: 'Darkvision', value: '60 ft.' }], race: { lineage: 'Deep Gnome', traits: [] } };
      const result = raceRulesModule.rules2024.getSenses(input);
      const dv = result.find((s) => s.name === 'Darkvision');
      expect(dv.value).toBe('120 ft.');
    });

    it('2024 getSenses does not add tremorsense for Stonecunning trait', () => {
      const input = { senses: [], race: { traits: [{ name: 'Stonecunning', description: 'You have tremorsense with a range of 60 feet.' }] } };
      const result = raceRulesModule.rules2024.getSenses(input);
      expect(result).not.toContainEqual({ name: 'Tremorsense', value: '60 ft.' });
    });

    it('5e getImmunities has hardcoded race checks (Elf, Monk, Paladin), 2024 extracts from traits', () => {
      const elfSummary5e = { race: { name: 'Elf' }, class: {}, level: 1 };
      const tranceInput2024 = { race: { traits: [{ name: 'Trance', description: "Magic can't put you to sleep." }] } };
      const result5e = raceRulesModule.rules5e.getImmunities(elfSummary5e);
      const result2024 = raceRulesModule.rules2024.getImmunities(tranceInput2024);
      expect(result5e).toContain('Magical Sleep');
      expect(result2024).toContain('Magical Sleep');
    });

    it('5e getImmunities includes and deduplicates from playerSummary immunities, 2024 does too', () => {
      const playerSummary5e = { race: { name: 'Elf' }, class: {}, immunities: ['Magical Sleep', 'Disease'] };
      const playerSummary2024 = { race: { traits: [{ description: 'You have immunity to poison.' }] }, immunities: ['poison'] };
      const result5e = raceRulesModule.rules5e.getImmunities(playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getImmunities(playerSummary2024);
      expect(result5e.filter((i) => i === 'Magical Sleep').length).toBe(1);
      expect(result2024.filter((i) => i === 'poison').length).toBe(1);
    });

    it('5e getResistances has hardcoded race checks (Dwarf, Elf, Halfling, Tiefling), 2024 extracts from traits', () => {
      const dwarfSummary5e = { race: { name: 'Dwarf' } };
      const resistanceInput2024 = { race: { traits: [{ description: 'You have resistance to fire.' }] } };
      const result5e = raceRulesModule.rules5e.getResistances(dwarfSummary5e);
      const result2024 = raceRulesModule.rules2024.getResistances(resistanceInput2024);
      expect(result5e).toContain('Poison');
      expect(result2024).toContain('fire');
    });

    it('5e getResistances includes and deduplicates from playerSummary resistances, 2024 does too', () => {
      const playerSummary5e = { race: { name: 'Elf' }, resistances: ['Charm', 'Lightning'] };
      const playerSummary2024 = { race: { traits: [{ description: 'You have resistance to fire.' }] }, resistances: ['fire'] };
      const result5e = raceRulesModule.rules5e.getResistances(playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getResistances(playerSummary2024);
      expect(result5e.filter((r) => r === 'Charm').length).toBe(1);
      expect(result2024.filter((r) => r === 'fire').length).toBe(1);
    });

    it('2024 getResistances extracts Fiendish Legacy resistances by subrace name', () => {
      const abyssal = raceRulesModule.rules2024.getResistances({ race: { name: 'Tiefling', subrace: { name: 'Abyssal Tiefling' } } });
      const chthonic = raceRulesModule.rules2024.getResistances({ race: { name: 'Tiefling', subrace: { name: 'Chthonic Tiefling' } } });
      const infernal = raceRulesModule.rules2024.getResistances({ race: { name: 'Tiefling', subrace: { name: 'Infernal Tiefling' } } });
      expect(abyssal).toContain('Poison');
      expect(chthonic).toContain('Necrotic');
      expect(infernal).toContain('Fire');
    });

    it('5e getTraits merges base traits with subrace racial_traits, 2024 merges base traits with lineage traits', () => {
      const playerStats5e = { race: { traits: [{ name: 'Darkvision' }], subrace: { racial_traits: [{ name: 'Elven Weapon Training' }] } } };
      const playerStats2024 = { race: { lineage: 'High Elf', traits: [{ name: 'Darkvision' }, { name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'Lineage trait' }] }] } };
      const result5e = raceRulesModule.rules5e.getTraits(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getTraits(playerStats2024);
      const names5e = result5e.specialActions.map((t) => t.name);
      const names2024 = result2024.specialActions.map((t) => t.name);
      expect(names5e).toContain('Darkvision');
      expect(names5e).toContain('Elven Weapon Training');
      expect(names2024).toContain('Darkvision');
      expect(names2024).toContain('Ancestry (High Elf)');
    });

    it('5e getTraits handles null subrace gracefully, 2024 handles null lineage gracefully', () => {
      const playerStats5e = { race: { traits: [{ name: 'Darkvision', description: 'Can see in the dark' }], subrace: null } };
      const playerStats2024 = { race: { lineage: null, traits: [{ name: 'Darkvision', description: 'Can see in the dark' }] } };
      const result5e = raceRulesModule.rules5e.getTraits(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getTraits(playerStats2024);
      expect(result5e.specialActions.find((t) => t.name === 'Darkvision')).toBeDefined();
      expect(result2024.specialActions.find((t) => t.name === 'Darkvision')).toBeDefined();
    });

    it('5e getTraits deduplicates when base and subrace have the same trait, 2024 does too', () => {
      const playerStats5e = { race: { traits: [{ name: 'Darkvision', description: 'First' }], subrace: { racial_traits: [{ name: 'Darkvision', description: 'Second' }] } } };
      const playerStats2024 = { race: { lineage: 'High Elf', traits: [{ name: 'Darkvision', description: 'First' }, { name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'Second' }] }] } };
      const result5e = raceRulesModule.rules5e.getTraits(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getTraits(playerStats2024);
      expect(result5e.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
      expect(result2024.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
    });

    it('addTraits returns same category keys for both rulesets', () => {
      const traits = [{ name: 'Darkvision', description: 'Can see in the dark' }];
      const result5e = raceRulesModule.rules5e.addTraits(traits);
      const result2024 = raceRulesModule.rules2024.addTraits(traits);
      expect(Object.keys(result5e)).toEqual(['actions', 'bonusActions', 'reactions', 'specialActions', 'characterAdvancement']);
      expect(Object.keys(result2024)).toEqual(['actions', 'bonusActions', 'reactions', 'specialActions', 'characterAdvancement']);
    });

    it('addTraits deduplicates traits by name for both rulesets', () => {
      const traits = [{ name: 'Darkvision', description: 'First' }, { name: 'Darkvision', description: 'Second' }];
      const result5e = raceRulesModule.rules5e.addTraits(traits);
      const result2024 = raceRulesModule.rules2024.addTraits(traits);
      expect(result5e.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
      expect(result2024.specialActions.filter((t) => t.name === 'Darkvision').length).toBe(1);
    });

    it('addTraits handles null input for both rulesets', () => {
      const result5e = raceRulesModule.rules5e.addTraits(null);
      const result2024 = raceRulesModule.rules2024.addTraits(null);
      expect(result5e.actions).toEqual([]);
      expect(result5e.specialActions).toEqual([]);
      expect(result2024.actions).toEqual([]);
      expect(result2024.specialActions).toEqual([]);
    });

    it('addTraits handles undefined input for both rulesets', () => {
      const result5e = raceRulesModule.rules5e.addTraits(undefined);
      const result2024 = raceRulesModule.rules2024.addTraits(undefined);
      expect(result5e.actions).toEqual([]);
      expect(result5e.specialActions).toEqual([]);
      expect(result2024.actions).toEqual([]);
      expect(result2024.specialActions).toEqual([]);
    });

    it('getTraits handles empty traits array for both rulesets', () => {
      const result5e = raceRulesModule.rules5e.getTraits({ race: { traits: [] } });
      const result2024 = raceRulesModule.rules2024.getTraits({ race: { traits: [] } });
      expect(result5e.actions).toEqual([]);
      expect(result5e.specialActions).toEqual([]);
      expect(result2024.actions).toEqual([]);
      expect(result2024.specialActions).toEqual([]);
    });

    it('getTraits handles undefined race for both rulesets', () => {
      const result5e = raceRulesModule.rules5e.getTraits({ race: {} });
      const result2024 = raceRulesModule.rules2024.getTraits({});
      expect(Object.keys(result5e)).toEqual(['actions', 'bonusActions', 'reactions', 'specialActions', 'characterAdvancement']);
      expect(Object.keys(result2024)).toEqual(['actions', 'bonusActions', 'reactions', 'specialActions', 'characterAdvancement']);
    });

    it('5e getImmunities returns combined Monk immunities at correct level, 2024 returns empty for same input', () => {
      const monkSummary = { race: { name: 'Human' }, class: { name: 'Monk' }, level: 10 };
      const result5e = raceRulesModule.rules5e.getImmunities(monkSummary);
      const result2024 = raceRulesModule.rules2024.getImmunities(monkSummary);
      expect(result5e).toContain('Disease');
      expect(result5e).toContain('Poison');
      expect(result2024).toEqual([]);
    });

    it('5e getResistances adds Poison resistance for Scout Halfling subrace, 2024 extracts from trait description', () => {
      const halfling5e = { race: { name: 'Halfling', subrace: { name: 'Scout Halfling' } } };
      const halfling2024 = { race: { traits: [{ description: 'You have resistance to poison.' }] } };
      const result5e = raceRulesModule.rules5e.getResistances(halfling5e);
      const result2024 = raceRulesModule.rules2024.getResistances(halfling2024);
      expect(result5e).toContain('Frightened');
      expect(result5e).toContain('Poison');
      expect(result2024).toContain('poison');
    });

    it('5e getResistances does not add subrace damage_resistance for Dwarf, 2024 extracts from subrace', () => {
      const dwarf5e = { race: { name: 'Dwarf', subrace: { damage_resistance: 'Fire' } } };
      const dwarf2024 = { race: { subrace: { damage_resistance: 'Fire' } } };
      const result5e = raceRulesModule.rules5e.getResistances(dwarf5e);
      const result2024 = raceRulesModule.rules2024.getResistances(dwarf2024);
      expect(result5e).not.toContain('Fire');
      expect(result2024).toContain('Fire');
    });

    it('5e getRace returns cloned race (not original reference), 2024 does too', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e.name).toBe('Human');
      expect(result5e).not.toBe(allRaces[0]);
      expect(result2024.name).toBe('Human');
      expect(result2024).not.toBe(allRaces[0]);
    });

    it('5e getRace handles race without ability_bonuses, 2024 does too', () => {
      const allRaces = [{ name: 'Human', traits: [] }];
      const playerSummary = { race: { name: 'Human' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e.ability_bonuses).toBeUndefined();
      expect(result2024.ability_bonuses).toBeUndefined();
    });

    it('5e getResistances returns empty array for non-resistance races, 2024 does too', () => {
      const result5e = raceRulesModule.rules5e.getResistances({ race: { name: 'Human' } });
      const result2024 = raceRulesModule.rules2024.getResistances({ race: { name: 'Human' } });
      expect(result5e).toEqual([]);
      expect(result2024).toEqual([]);
    });

    it('5e getSenses returns sorted array when no senses or traits, 2024 does too', () => {
      const playerStats = { race: { traits: [] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats);
      expect(Array.isArray(result5e)).toBe(true);
      expect(result5e.length).toBe(0);
      expect(Array.isArray(result2024)).toBe(true);
      expect(result2024.length).toBe(0);
    });

    it('5e getSenses does not add Darkvision when race does not have the trait, 2024 does too', () => {
      const playerStats = { senses: [], race: { traits: [{ name: 'Other Trait' }] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats);
      expect(result5e).not.toContainEqual({ name: 'Darkvision', value: '60 ft.' });
      expect(result2024).not.toContainEqual({ name: 'Darkvision', value: '60 ft.' });
    });

    it('5e getSenses does not add passive skills when abilities array is missing, 2024 does too', () => {
      const playerStats = { senses: [], race: { traits: [] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats);
      expect(result5e).not.toContainEqual({ name: 'Passive Perception', value: '10' });
      expect(result2024).not.toContainEqual({ name: 'Passive Perception', value: '10' });
    });

    it('5e getSenses does not add passive skills when relevant ability is missing, 2024 does too', () => {
      const playerStats = { senses: [], race: { traits: [] }, abilities: [{ name: 'Strength', bonus: 2, skills: [] }] };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats);
      expect(result5e).not.toContainEqual({ name: 'Passive Perception', value: '12' });
      expect(result2024).not.toContainEqual({ name: 'Passive Perception', value: '12' });
    });

    it('5e getSenses falls back to ability bonus when skill is missing for Passive Perception, 2024 does too', () => {
      const playerStats = { senses: [], race: { traits: [] }, abilities: [{ name: 'Wisdom', bonus: 2, skills: [{ name: 'Animal Handling', bonus: 0 }] }] };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats);
      expect(result5e).toContainEqual({ name: 'Passive Perception', value: '12' });
      expect(result2024).toContainEqual({ name: 'Passive Perception', value: '12' });
    });

    it('5e getSenses does not duplicate Darkvision when already in senses, 2024 does too', () => {
      const playerStats = { senses: [{ name: 'Darkvision', value: '120 ft.' }], race: { traits: [{ name: 'Darkvision' }] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats);
      expect(result5e.filter((s) => s.name === 'Darkvision').length).toBe(1);
      expect(result5e.find((s) => s.name === 'Darkvision').value).toBe('120 ft.');

      const playerStats2024 = { senses: [{ name: 'Darkvision', value: '120 ft.' }], race: { traits: [{ description: 'You have darkvision with a range of 60 feet.' }] } };
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result2024.filter((s) => s.name === 'Darkvision').length).toBe(1);
      expect(result2024.find((s) => s.name === 'Darkvision').value).toBe('120 ft.');
    });

    it('5e getSenses does not duplicate Feral Senses when already in senses, 2024 does too for Blindsight', () => {
      const playerStats5e = { senses: [{ name: 'Feral Senses', value: '120 ft.' }], race: { traits: [] }, class: { class_levels: [{ features: [{ name: 'Feral Senses' }] }] } };
      const playerStats2024 = { senses: [{ name: 'Blindsight', value: '60 ft.' }], race: { traits: [] }, class: { class_levels: [{ features: [{ name: 'Feral Senses' }] }] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e.filter((s) => s.name === 'Feral Senses').length).toBe(1);
      expect(result2024.filter((s) => s.name === 'Blindsight').length).toBe(1);
    });

    it('5e getRace handles race without traits, 2024 does too', () => {
      const allRaces = [{ name: 'Human' }];
      const playerSummary = { race: { name: 'Human' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e.name).toBe('Human');
      expect(result2024.name).toBe('Human');
    });

    it('5e getResistances returns sorted array, 2024 does too', () => {
      const playerSummary5e = { race: { name: 'Elf' }, resistances: ['Zebra', 'Alpha', 'Middle'] };
      const playerSummary2024 = { race: { traits: [] }, resistances: [{ name: 'Zebra' }, { name: 'Alpha' }, { name: 'Middle' }] };
      const result5e = raceRulesModule.rules5e.getResistances(playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getResistances(playerSummary2024);
      expect(result5e).toEqual(['Alpha', 'Charm', 'Middle', 'Zebra']);
      expect(result2024[0].name).toBe('Alpha');
      expect(result2024[1].name).toBe('Middle');
      expect(result2024[2].name).toBe('Zebra');
    });

    it('5e getImmunities returns immunities sorted alphabetically, 2024 does too', () => {
      const playerSummary5e = { race: { name: 'Elf' }, class: {}, immunities: ['Zebra', 'Alpha', 'Middle'] };
      const playerSummary2024 = { race: { traits: [] }, immunities: ['Zebra', 'Alpha', 'Middle'] };
      const result5e = raceRulesModule.rules5e.getImmunities(playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getImmunities(playerSummary2024);
      expect(result5e).toEqual(['Alpha', 'Magical Sleep', 'Middle', 'Zebra']);
      expect(result2024).toEqual(['Alpha', 'Middle', 'Zebra']);
    });

    it('5e getImmunities returns empty array when no race or class immunity conditions met, 2024 does too', () => {
      const playerSummary5e = { race: {}, class: {} };
      const playerSummary2024 = {};
      const result5e = raceRulesModule.rules5e.getImmunities(playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getImmunities(playerSummary2024);
      expect(result5e).toEqual([]);
      expect(result2024).toEqual([]);
    });

    it('5e getResistances returns empty array when no race, 2024 does too', () => {
      const result5e = raceRulesModule.rules5e.getResistances({ race: {} });
      const result2024 = raceRulesModule.rules2024.getResistances({});
      expect(result5e).toEqual([]);
      expect(result2024).toEqual([]);
    });

    it('5e getSenses handles missing class_levels gracefully, 2024 does too', () => {
      const playerStats5e = { senses: [], race: { traits: [] }, class: {} };
      const playerStats2024 = { senses: [], race: { traits: [] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e).not.toContainEqual({ name: 'Feral Senses', value: '' });
      expect(result2024).not.toContainEqual({ name: 'Blindsight', value: '30 ft.' });
    });

    it('5e getSenses does not add Blindvision when Blind Fighting not selected, 2024 does too', () => {
      const playerStats5e = { senses: [], race: { traits: [] }, class: { fightingStyles: ['Dueling'] } };
      const playerStats2024 = { senses: [], race: { traits: [] }, class: { fightingStyles: ['Dueling'] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
      expect(result2024).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });

    it('5e getSenses handles missing fightingStyles gracefully, 2024 does too', () => {
      const playerStats5e = { senses: [], race: { traits: [] }, class: {} };
      const playerStats2024 = { senses: [], race: { traits: [] }, class: {} };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
      expect(result2024).not.toContainEqual({ name: 'Blindvision', value: '10 ft.' });
    });

    it('5e addTraits places traits not in any category into specialActions, 2024 does too', () => {
      const traits = [{ name: 'Custom Trait', description: 'A custom trait' }];
      const result5e = raceRulesModule.rules5e.addTraits(traits);
      const result2024 = raceRulesModule.rules2024.addTraits(traits);
      expect(result5e.specialActions.find((t) => t.name === 'Custom Trait')).toBeDefined();
      expect(result2024.specialActions.find((t) => t.name === 'Custom Trait')).toBeDefined();
    });

    it('5e getTraits handles race without traits, 2024 does too', () => {
      const result5e = raceRulesModule.rules5e.getTraits({ race: {} });
      const result2024 = raceRulesModule.rules2024.getTraits({ race: {} });
      expect(result5e).toEqual({ actions: [], bonusActions: [], reactions: [], specialActions: [], characterAdvancement: [] });
      expect(result2024).toEqual({ actions: [], bonusActions: [], reactions: [], specialActions: [], characterAdvancement: [] });
    });

    it('5e getTraits handles empty traits array, 2024 does too', () => {
      const result5e = raceRulesModule.rules5e.getTraits({ race: { traits: [] } });
      const result2024 = raceRulesModule.rules2024.getTraits({ race: { traits: [] } });
      expect(result5e).toEqual({ actions: [], bonusActions: [], reactions: [], specialActions: [], characterAdvancement: [] });
      expect(result2024).toEqual({ actions: [], bonusActions: [], reactions: [], specialActions: [], characterAdvancement: [] });
    });

    it('5e gets senses sorted alphabetically by name, 2024 does too', () => {
      const playerStats5e = { senses: [{ name: 'Zebra Vision', value: '10 ft.' }, { name: 'Alpha Vision', value: '5 ft.' }], race: { traits: [] } };
      const playerStats2024 = { senses: [{ name: 'Zebra Vision', value: '10 ft.' }, { name: 'Alpha Vision', value: '5 ft.' }], race: { traits: [] } };
      const result5e = raceRulesModule.rules5e.getSenses(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getSenses(playerStats2024);
      expect(result5e[0].name).toBe('Alpha Vision');
      expect(result5e[1].name).toBe('Zebra Vision');
      expect(result2024[0].name).toBe('Alpha Vision');
      expect(result2024[1].name).toBe('Zebra Vision');
    });

    it('5e getImmunities returns combined Monk+Paladin immunities at correct levels, 2024 returns empty', () => {
      const playerSummary = { race: { name: 'Human' }, class: { name: 'Monk' }, level: 10 };
      const result5e = raceRulesModule.rules5e.getImmunities(playerSummary);
      const result2024 = raceRulesModule.rules2024.getImmunities(playerSummary);
      expect(result5e).toContain('Disease');
      expect(result5e).toContain('Poison');
      expect(result2024).toEqual([]);
    });

    it('5e getImmunities does not add Monk immunities at level 9, 2024 returns empty', () => {
      const playerSummary = { race: { name: 'Human' }, class: { name: 'Monk' }, level: 9 };
      const result5e = raceRulesModule.rules5e.getImmunities(playerSummary);
      const result2024 = raceRulesModule.rules2024.getImmunities(playerSummary);
      expect(result5e).not.toContain('Disease');
      expect(result5e).not.toContain('Poison');
      expect(result2024).toEqual([]);
    });

    it('5e getResistances adds subrace damage_resistance for non-Dwarf races, 2024 does too', () => {
      const playerSummary5e = { race: { name: 'Human', subrace: { damage_resistance: 'Fire' } } };
      const playerSummary2024 = { race: { subrace: { damage_resistance: 'Fire' } } };
      const result5e = raceRulesModule.rules5e.getResistances(playerSummary5e);
      const result2024 = raceRulesModule.rules2024.getResistances(playerSummary2024);
      expect(result5e).toContain('Fire');
      expect(result2024).toContain('Fire');
    });

    it('5e getRace returns undefined when race not found in allRaces, 2024 returns playerSummary.race', () => {
      const allRaces = [];
      const playerSummary = { race: { name: 'Custom Race' } };
      const result5e = raceRulesModule.rules5e.getRace(allRaces, playerSummary);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces, playerSummary);
      expect(result5e).toBeUndefined();
      expect(result2024).toEqual({ name: 'Custom Race' });
    });

    it('5e getRace handles subrace without racial_traits, 2024 handles subrace not found in subraces list', () => {
      const playerStats5e = { race: { traits: [{ name: 'Darkvision', description: 'Can see in the dark' }], subrace: {} } };
      const allRaces2024 = [{ name: 'Elf', subraces: [] }];
      const playerSummary2024 = { race: { name: 'Elf', subrace: { name: 'High Elf' } } };
      const result5e = raceRulesModule.rules5e.getTraits(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getRace(allRaces2024, playerSummary2024);
      expect(result5e.specialActions.find((t) => t.name === 'Darkvision')).toBeDefined();
      expect(result2024.subrace).toEqual({ name: 'High Elf' });
    });

    it('5e getTraits merges subrace racial_traits with base traits, 2024 merges base traits with lineage and subrace traits', () => {
      const playerStats5e = { race: { traits: [{ name: 'Darkvision', description: 'Base trait' }], subrace: { racial_traits: [{ name: 'Subrace Trait', description: 'Subrace trait' }] } } };
      const playerStats2024 = { race: { lineage: 'High Elf', traits: [{ name: 'Darkvision', description: 'Base trait' }, { name: 'Ancestry', sub_traits: [{ name: 'High Elf', description: 'Lineage trait' }] }], subrace: { traits: [{ name: 'Subrace Trait', description: 'Subrace trait' }] } } };
      const result5e = raceRulesModule.rules5e.getTraits(playerStats5e);
      const result2024 = raceRulesModule.rules2024.getTraits(playerStats2024);
      const names5e = result5e.specialActions.map((t) => t.name);
      const names2024 = result2024.specialActions.map((t) => t.name);
      expect(names5e).toContain('Darkvision');
      expect(names5e).toContain('Subrace Trait');
      expect(names2024).toContain('Darkvision');
      expect(names2024).toContain('Subrace Trait');
    });

    it('2024 getImmunities handles undefined race gracefully', () => {
      const result = raceRulesModule.rules2024.getImmunities({});
      expect(result).toEqual([]);
    });

    it('2024 getResistances handles undefined race gracefully', () => {
      const result = raceRulesModule.rules2024.getResistances({});
      expect(result).toEqual([]);
    });

    it('2024 getSenses handles undefined race gracefully', () => {
      const result = raceRulesModule.rules2024.getSenses({ senses: [] });
      expect(result).toEqual([]);
    });

    it('2024 getSenses returns empty array when race has no traits', () => {
      const result = raceRulesModule.rules2024.getSenses({ senses: [], race: {} });
      expect(result).toEqual([]);
    });

    it('2024 getImmunities returns empty array when race has no traits', () => {
      const result = raceRulesModule.rules2024.getImmunities({ race: { traits: [] } });
      expect(result).toEqual([]);
    });

    it('2024 getResistances returns empty array when race has no traits or subrace', () => {
      const result = raceRulesModule.rules2024.getResistances({ race: { name: 'Human' } });
      expect(result).toEqual([]);
    });
  });
});

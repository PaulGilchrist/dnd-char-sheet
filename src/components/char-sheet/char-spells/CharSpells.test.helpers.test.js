// @improved-by-ai
import { describe, it, expect } from 'vitest';
import * as helpers from './CharSpells.test.helpers.js';

describe('CharSpells.test.helpers', () => {
  describe('mockPlayerStats', () => {
    it('is a valid 5e character mock with all required top-level properties', () => {
      expect(helpers.mockPlayerStats).toMatchObject({
        name: 'Test Character',
        rules: '5e (default)',
        proficiency: 4,
        automation: { passives: [], actions: [] },
        activeConditions: [],
      });
    });

    it('has spellAbilities with correct computed values for a +3 modifier character', () => {
      const { spellAbilities } = helpers.mockPlayerStats;
      expect(spellAbilities).toMatchObject({
        toHit: 5,
        modifier: 3,
        saveDc: 13,
        cantrips_known: 3,
        prepared_spells: 5,
        maxPreparedSpells: 5,
        spell_slots_level_1: 4,
        spell_slots_level_2: 3,
      });
    });

    it('has 4 spells covering cantrips, prepared, unprepared, with and without damage', () => {
      const spells = helpers.mockPlayerStats.spellAbilities.spells;
      expect(spells).toHaveLength(4);

      const names = spells.map((s) => s.name);
      expect(names).toEqual(
        expect.arrayContaining(['Fireball', 'Magic Missile', 'Light', 'Detect Magic'])
      );
    });

    it('represents Fireball as a prepared level 3 spell with fire damage', () => {
      const fireball = helpers.mockPlayerStats.spellAbilities.spells.find(
        (s) => s.name === 'Fireball'
      );
      expect(fireball).toMatchObject({
        level: 3,
        casting_time: '1 action',
        range: '150 feet',
        duration: 'Instantaneous',
        components: ['V', 'S', 'M'],
        damage: { damage_at_slot_level: { '3': '8d6' }, damage_type: 'Fire' },
        prepared: 'Prepared',
      });
    });

    it('represents Magic Missile as a level 1 spell with force damage', () => {
      const missile = helpers.mockPlayerStats.spellAbilities.spells.find(
        (s) => s.name === 'Magic Missile'
      );
      expect(missile).toMatchObject({
        level: 1,
        casting_time: '1 action',
        damage: { damage_at_slot_level: { '1': '1d4+1' }, damage_type: 'Force' },
        prepared: 'Always',
      });
    });

    it('represents Light as a level 0 cantrip', () => {
      const light = helpers.mockPlayerStats.spellAbilities.spells.find(
        (s) => s.name === 'Light'
      );
      expect(light).toMatchObject({
        level: 0,
        casting_time: '1 action',
        prepared: 'Always',
      });
    });

    it('represents Detect Magic as a level 1 spell without damage', () => {
      const detect = helpers.mockPlayerStats.spellAbilities.spells.find(
        (s) => s.name === 'Detect Magic'
      );
      expect(detect).toMatchObject({
        level: 1,
        duration: 'Concentration, up to 10 minutes',
        prepared: 'Always',
      });
      expect(detect.damage).toBeUndefined();
    });
  });

  describe('mockPlayerStats2024', () => {
    it('is a valid 2024 ruleset character mock without 5e-specific properties', () => {
      expect(helpers.mockPlayerStats2024).toMatchObject({
        name: 'Test Character',
        rules: '2024',
      });
      expect(helpers.mockPlayerStats2024.class).toBeUndefined();
      expect(helpers.mockPlayerStats2024.proficiency).toBeUndefined();
      expect(helpers.mockPlayerStats2024.automation).toBeUndefined();
      expect(helpers.mockPlayerStats2024.activeConditions).toBeUndefined();
    });

    it('has the same spell list as the 5e mock', () => {
      const fiveESpells = helpers.mockPlayerStats.spellAbilities.spells;
      const twoTwentyFourSpells = helpers.mockPlayerStats2024.spellAbilities.spells;
      expect(twoTwentyFourSpells).toHaveLength(fiveESpells.length);
      twoTwentyFourSpells.forEach((spell, i) => {
        expect(spell.name).toBe(fiveESpells[i].name);
        expect(spell.level).toBe(fiveESpells[i].level);
      });
    });
  });

  describe('mockPlayerStats2024Wizard', () => {
    it('is a valid 2024 wizard character mock with class but no 5e-specific properties', () => {
      expect(helpers.mockPlayerStats2024Wizard).toMatchObject({
        name: 'Test Wizard',
        rules: '2024',
        class: { name: 'Wizard' },
      });
      expect(helpers.mockPlayerStats2024Wizard.proficiency).toBeUndefined();
      expect(helpers.mockPlayerStats2024Wizard.automation).toBeUndefined();
      expect(helpers.mockPlayerStats2024Wizard.activeConditions).toBeUndefined();
    });

    it('has fewer prepared spells than the base 2024 mock', () => {
      const base = helpers.mockPlayerStats2024.spellAbilities.prepared_spells;
      const wizard = helpers.mockPlayerStats2024Wizard.spellAbilities.prepared_spells;
      expect(wizard).toBe(4);
      expect(wizard).toBeLessThan(base);
    });

    it('includes both prepared and unprepared spells for wizard testing', () => {
      const spells = helpers.mockPlayerStats2024Wizard.spellAbilities.spells;
      const prepared = spells.filter((s) => s.prepared === 'Prepared' || s.prepared === 'Always');
      const unprepared = spells.filter((s) => s.prepared === '');
      expect(prepared).toHaveLength(2);
      expect(unprepared).toHaveLength(2);
    });

    it('represents Shield as an unprepared reaction spell', () => {
      const shield = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.find(
        (s) => s.name === 'Shield'
      );
      expect(shield).toMatchObject({
        level: 1,
        casting_time: '1 reaction',
        prepared: '',
      });
    });

    it('represents Detect Magic as an unprepared ritual spell', () => {
      const detect = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.find(
        (s) => s.name === 'Detect Magic'
      );
      expect(detect).toMatchObject({
        level: 1,
        ritual: true,
        prepared: '',
      });
    });
  });

  describe('mockHandleTogglePreparedSpells', () => {
    it('is a mock function that tracks call arguments and count', () => {
      helpers.mockHandleTogglePreparedSpells('Fireball');
      expect(helpers.mockHandleTogglePreparedSpells).toHaveBeenCalledTimes(1);
      expect(helpers.mockHandleTogglePreparedSpells).toHaveBeenCalledWith('Fireball');

      helpers.mockHandleTogglePreparedSpells('Shield');
      expect(helpers.mockHandleTogglePreparedSpells).toHaveBeenLastCalledWith('Shield');
    });
  });

  describe('mockGateMetamagic', () => {
    it('is a mock function that tracks call arguments and count', () => {
      helpers.mockGateMetamagic('Empowered Spell');
      expect(helpers.mockGateMetamagic).toHaveBeenCalledTimes(1);
      expect(helpers.mockGateMetamagic).toHaveBeenCalledWith('Empowered Spell');
    });
  });

  describe('mockGateUpcast', () => {
    it('is a mock function that always returns false', () => {
      expect(helpers.mockGateUpcast()).toBe(false);
      expect(helpers.mockGateUpcast('Fireball', 3)).toBe(false);
      expect(helpers.mockGateUpcast).toHaveBeenNthCalledWith(1);
      expect(helpers.mockGateUpcast).toHaveBeenNthCalledWith(2, 'Fireball', 3);
    });
  });

  describe('mockGetCantripAutoLevel', () => {
    it('is a mock function that always returns null', () => {
      expect(helpers.mockGetCantripAutoLevel()).toBeNull();
      expect(helpers.mockGetCantripAutoLevel('Fire Bolt')).toBeNull();
    });
  });

  describe('all exports', () => {
    it('exports exactly the 7 expected helpers', () => {
      const exportedNames = Object.keys(helpers).sort();
      expect(exportedNames).toEqual([
        'mockGateMetamagic',
        'mockGateUpcast',
        'mockGetCantripAutoLevel',
        'mockHandleTogglePreparedSpells',
        'mockPlayerStats',
        'mockPlayerStats2024',
        'mockPlayerStats2024Wizard',
      ]);
    });
  });
});

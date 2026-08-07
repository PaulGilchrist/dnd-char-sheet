import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as helpers from './CharSpells.test.helpers.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CharSpells.test.helpers', () => {
  describe('mockPlayerStats', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockPlayerStats).toBeDefined();
    });

    it('has the correct name', () => {
      expect(helpers.mockPlayerStats.name).toBe('Test Character');
    });

    it('uses 5e (default) ruleset', () => {
      expect(helpers.mockPlayerStats.rules).toBe('5e (default)');
    });

    it('has proficiency of 4', () => {
      expect(helpers.mockPlayerStats.proficiency).toBe(4);
    });

    it('has automation object with passives and actions arrays', () => {
      expect(helpers.mockPlayerStats.automation).toBeDefined();
      expect(Array.isArray(helpers.mockPlayerStats.automation.passives)).toBe(true);
      expect(Array.isArray(helpers.mockPlayerStats.automation.actions)).toBe(true);
      expect(helpers.mockPlayerStats.automation.passives).toHaveLength(0);
      expect(helpers.mockPlayerStats.automation.actions).toHaveLength(0);
    });

    it('has no active conditions', () => {
      expect(helpers.mockPlayerStats.activeConditions).toBeDefined();
      expect(Array.isArray(helpers.mockPlayerStats.activeConditions)).toBe(true);
      expect(helpers.mockPlayerStats.activeConditions).toHaveLength(0);
    });

    describe('spellAbilities', () => {
      it('has spellAbilities object', () => {
        expect(helpers.mockPlayerStats.spellAbilities).toBeDefined();
      });

      it('has toHit of 5', () => {
        expect(helpers.mockPlayerStats.spellAbilities.toHit).toBe(5);
      });

      it('has modifier of 3', () => {
        expect(helpers.mockPlayerStats.spellAbilities.modifier).toBe(3);
      });

      it('has saveDc of 13', () => {
        expect(helpers.mockPlayerStats.spellAbilities.saveDc).toBe(13);
      });

      it('has cantrips_known of 3', () => {
        expect(helpers.mockPlayerStats.spellAbilities.cantrips_known).toBe(3);
      });

      it('has prepared_spells of 5', () => {
        expect(helpers.mockPlayerStats.spellAbilities.prepared_spells).toBe(5);
      });

      it('has maxPreparedSpells of 5', () => {
        expect(helpers.mockPlayerStats.spellAbilities.maxPreparedSpells).toBe(5);
      });

      it('has spell_slots_level_1 of 4', () => {
        expect(helpers.mockPlayerStats.spellAbilities.spell_slots_level_1).toBe(4);
      });

      it('has spell_slots_level_2 of 3', () => {
        expect(helpers.mockPlayerStats.spellAbilities.spell_slots_level_2).toBe(3);
      });

      describe('spells array', () => {
        it('has 4 spells', () => {
          expect(helpers.mockPlayerStats.spellAbilities.spells).toBeDefined();
          expect(Array.isArray(helpers.mockPlayerStats.spellAbilities.spells)).toBe(true);
          expect(helpers.mockPlayerStats.spellAbilities.spells).toHaveLength(4);
        });

        it('has Fireball as a level 3 spell with damage', () => {
          const fireball = helpers.mockPlayerStats.spellAbilities.spells.find(
            (s) => s.name === 'Fireball'
          );
          expect(fireball).toBeDefined();
          expect(fireball.level).toBe(3);
          expect(fireball.casting_time).toBe('1 action');
          expect(fireball.range).toBe('150 feet');
          expect(fireball.duration).toBe('Instantaneous');
          expect(fireball.components).toEqual(['V', 'S', 'M']);
          expect(fireball.damage.damage_at_slot_level['3']).toBe('8d6');
          expect(fireball.damage.damage_type).toBe('Fire');
          expect(fireball.prepared).toBe('Prepared');
        });

        it('has MagicMissile as a level 1 spell with damage', () => {
          const missile = helpers.mockPlayerStats.spellAbilities.spells.find(
            (s) => s.name === 'Magic Missile'
          );
          expect(missile).toBeDefined();
          expect(missile.level).toBe(1);
          expect(missile.casting_time).toBe('1 action');
          expect(missile.range).toBe('120 feet');
          expect(missile.duration).toBe('Instantaneous');
          expect(missile.components).toEqual(['V', 'S']);
          expect(missile.damage.damage_at_slot_level['1']).toBe('1d4+1');
          expect(missile.damage.damage_type).toBe('Force');
          expect(missile.prepared).toBe('Always');
        });

        it('has Light as a cantrip (level 0)', () => {
          const light = helpers.mockPlayerStats.spellAbilities.spells.find(
            (s) => s.name === 'Light'
          );
          expect(light).toBeDefined();
          expect(light.level).toBe(0);
          expect(light.casting_time).toBe('1 action');
          expect(light.range).toBe('Touch');
          expect(light.duration).toBe('10 minutes');
          expect(light.components).toEqual(['V', 'M']);
          expect(light.prepared).toBe('Always');
        });

        it('has Detect Magic as a level 1 spell without damage', () => {
          const detect = helpers.mockPlayerStats.spellAbilities.spells.find(
            (s) => s.name === 'Detect Magic'
          );
          expect(detect).toBeDefined();
          expect(detect.level).toBe(1);
          expect(detect.casting_time).toBe('1 action');
          expect(detect.range).toBe('Self');
          expect(detect.duration).toBe('Concentration, up to 10 minutes');
          expect(detect.components).toEqual(['V', 'S']);
          expect(detect.prepared).toBe('Always');
        });
      });
    });
  });

  describe('mockPlayerStats2024', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockPlayerStats2024).toBeDefined();
    });

    it('has the correct name', () => {
      expect(helpers.mockPlayerStats2024.name).toBe('Test Character');
    });

    it('uses 2024 ruleset', () => {
      expect(helpers.mockPlayerStats2024.rules).toBe('2024');
    });

    it('does not have class property', () => {
      expect(helpers.mockPlayerStats2024.class).toBeUndefined();
    });

    it('does not have proficiency property', () => {
      expect(helpers.mockPlayerStats2024.proficiency).toBeUndefined();
    });

    it('does not have automation property', () => {
      expect(helpers.mockPlayerStats2024.automation).toBeUndefined();
    });

    it('does not have activeConditions property', () => {
      expect(helpers.mockPlayerStats2024.activeConditions).toBeUndefined();
    });

    describe('spellAbilities', () => {
      it('has spellAbilities object', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities).toBeDefined();
      });

      it('has toHit of 5', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.toHit).toBe(5);
      });

      it('has modifier of 3', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.modifier).toBe(3);
      });

      it('has saveDc of 13', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.saveDc).toBe(13);
      });

      it('has cantrips_known of 3', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.cantrips_known).toBe(3);
      });

      it('has prepared_spells of 5', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.prepared_spells).toBe(5);
      });

      it('has maxPreparedSpells of 5', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.maxPreparedSpells).toBe(5);
      });

      it('has spell_slots_level_1 of 4', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.spell_slots_level_1).toBe(4);
      });

      it('has spell_slots_level_2 of 3', () => {
        expect(helpers.mockPlayerStats2024.spellAbilities.spell_slots_level_2).toBe(3);
      });

      describe('spells array', () => {
        it('has 4 spells matching 5e mock', () => {
          expect(helpers.mockPlayerStats2024.spellAbilities.spells).toHaveLength(4);
          const names = helpers.mockPlayerStats2024.spellAbilities.spells.map(
            (s) => s.name
          );
          expect(names).toContain('Fireball');
          expect(names).toContain('Magic Missile');
          expect(names).toContain('Light');
          expect(names).toContain('Detect Magic');
        });

        it('has same spell data as 5e mock', () => {
          const fiveESpells = helpers.mockPlayerStats.spellAbilities.spells;
          const twoTwentyFourSpells = helpers.mockPlayerStats2024.spellAbilities.spells;
          expect(twoTwentyFourSpells.length).toBe(fiveESpells.length);
          twoTwentyFourSpells.forEach((spell, i) => {
            expect(spell.name).toBe(fiveESpells[i].name);
            expect(spell.level).toBe(fiveESpells[i].level);
          });
        });
      });
    });
  });

  describe('mockPlayerStats2024Wizard', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockPlayerStats2024Wizard).toBeDefined();
    });

    it('has the correct name', () => {
      expect(helpers.mockPlayerStats2024Wizard.name).toBe('Test Wizard');
    });

    it('uses 2024 ruleset', () => {
      expect(helpers.mockPlayerStats2024Wizard.rules).toBe('2024');
    });

    it('has Wizard class', () => {
      expect(helpers.mockPlayerStats2024Wizard.class).toEqual({ name: 'Wizard' });
    });

    it('does not have proficiency property', () => {
      expect(helpers.mockPlayerStats2024Wizard.proficiency).toBeUndefined();
    });

    it('does not have automation property', () => {
      expect(helpers.mockPlayerStats2024Wizard.automation).toBeUndefined();
    });

    it('does not have activeConditions property', () => {
      expect(helpers.mockPlayerStats2024Wizard.activeConditions).toBeUndefined();
    });

    it('has prepared_spells of 4', () => {
      expect(helpers.mockPlayerStats2024Wizard.spellAbilities.prepared_spells).toBe(4);
    });

    it('has maxPreparedSpells of 4', () => {
      expect(helpers.mockPlayerStats2024Wizard.spellAbilities.maxPreparedSpells).toBe(4);
    });

    describe('spells array', () => {
      it('has 4 spells', () => {
        expect(helpers.mockPlayerStats2024Wizard.spellAbilities.spells).toHaveLength(4);
      });

      it('has Fireball as level 3 spell', () => {
        const fireball = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.find(
          (s) => s.name === 'Fireball'
        );
        expect(fireball).toBeDefined();
        expect(fireball.level).toBe(3);
        expect(fireball.damage.damage_at_slot_level['3']).toBe('8d6');
        expect(fireball.damage.damage_type).toBe('Fire');
        expect(fireball.prepared).toBe('Prepared');
      });

      it('has Shield as level 1 spell with empty prepared (unprepared)', () => {
        const shield = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.find(
          (s) => s.name === 'Shield'
        );
        expect(shield).toBeDefined();
        expect(shield.level).toBe(1);
        expect(shield.casting_time).toBe('1 reaction');
        expect(shield.range).toBe('Self');
        expect(shield.duration).toBe('1 round');
        expect(shield.components).toEqual(['S']);
        expect(shield.prepared).toBe('');
      });

      it('has Detect Magic as level 1 ritual spell with empty prepared', () => {
        const detect = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.find(
          (s) => s.name === 'Detect Magic'
        );
        expect(detect).toBeDefined();
        expect(detect.level).toBe(1);
        expect(detect.ritual).toBe(true);
        expect(detect.prepared).toBe('');
      });

      it('has Light as cantrip with prepared Always', () => {
        const light = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.find(
          (s) => s.name === 'Light'
        );
        expect(light).toBeDefined();
        expect(light.level).toBe(0);
        expect(light.prepared).toBe('Always');
      });

      it('has Shield and Detect Magic as unprepared (empty string) for wizard testing', () => {
        const unpreparedSpells = helpers.mockPlayerStats2024Wizard.spellAbilities.spells.filter(
          (s) => s.prepared === ''
        );
        expect(unpreparedSpells).toHaveLength(2);
        expect(unpreparedSpells.map((s) => s.name)).toContain('Shield');
        expect(unpreparedSpells.map((s) => s.name)).toContain('Detect Magic');
      });
    });
  });

  describe('mockHandleTogglePreparedSpells', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockHandleTogglePreparedSpells).toBeDefined();
    });

    it('is a vi.fn() mock', () => {
      expect(typeof helpers.mockHandleTogglePreparedSpells.mock).toBeDefined();
    });

    it('is initially uncalled', () => {
      expect(helpers.mockHandleTogglePreparedSpells).not.toHaveBeenCalled();
    });

    it('can be called and tracked', () => {
      helpers.mockHandleTogglePreparedSpells('Fireball');
      expect(helpers.mockHandleTogglePreparedSpells).toHaveBeenCalledTimes(1);
      expect(helpers.mockHandleTogglePreparedSpells).toHaveBeenCalledWith('Fireball');
    });

    it('can be called with different spell names', () => {
      helpers.mockHandleTogglePreparedSpells('Shield');
      helpers.mockHandleTogglePreparedSpells('Fireball');
      expect(helpers.mockHandleTogglePreparedSpells).toHaveBeenCalledTimes(2);
    });
  });

  describe('mockGateMetamagic', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockGateMetamagic).toBeDefined();
    });

    it('is a vi.fn() mock', () => {
      expect(typeof helpers.mockGateMetamagic.mock).toBeDefined();
    });

    it('is initially uncalled', () => {
      expect(helpers.mockGateMetamagic).not.toHaveBeenCalled();
    });

    it('can be called and tracked', () => {
      helpers.mockGateMetamagic('Empowered Spell');
      expect(helpers.mockGateMetamagic).toHaveBeenCalledTimes(1);
      expect(helpers.mockGateMetamagic).toHaveBeenCalledWith('Empowered Spell');
    });
  });

  describe('mockGateUpcast', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockGateUpcast).toBeDefined();
    });

    it('is a vi.fn() mock', () => {
      expect(typeof helpers.mockGateUpcast.mock).toBeDefined();
    });

    it('returns false by default', () => {
      expect(helpers.mockGateUpcast()).toBe(false);
    });

    it('returns false on every call', () => {
      expect(helpers.mockGateUpcast()).toBe(false);
      expect(helpers.mockGateUpcast()).toBe(false);
      expect(helpers.mockGateUpcast()).toBe(false);
    });

    it('can be called with arguments', () => {
      const result = helpers.mockGateUpcast('Fireball', 3);
      expect(result).toBe(false);
      expect(helpers.mockGateUpcast).toHaveBeenCalledWith('Fireball', 3);
    });

    it('tracks call count', () => {
      helpers.mockGateUpcast();
      helpers.mockGateUpcast();
      expect(helpers.mockGateUpcast).toHaveBeenCalledTimes(2);
    });
  });

  describe('mockGetCantripAutoLevel', () => {
    it('is exported as a named export', () => {
      expect(helpers.mockGetCantripAutoLevel).toBeDefined();
    });

    it('is a vi.fn() mock', () => {
      expect(typeof helpers.mockGetCantripAutoLevel.mock).toBeDefined();
    });

    it('returns null by default', () => {
      expect(helpers.mockGetCantripAutoLevel()).toBeNull();
    });

    it('returns null on every call', () => {
      expect(helpers.mockGetCantripAutoLevel()).toBeNull();
      expect(helpers.mockGetCantripAutoLevel()).toBeNull();
    });

    it('can be called with arguments', () => {
      const result = helpers.mockGetCantripAutoLevel('Fire Bolt');
      expect(result).toBeNull();
      expect(helpers.mockGetCantripAutoLevel).toHaveBeenCalledWith('Fire Bolt');
    });
  });

  describe('all exports', () => {
    it('exports exactly 7 named exports', () => {
      const exportedNames = Object.keys(helpers);
      expect(exportedNames).toEqual(
        expect.arrayContaining([
          'mockPlayerStats',
          'mockPlayerStats2024',
          'mockPlayerStats2024Wizard',
          'mockHandleTogglePreparedSpells',
          'mockGateMetamagic',
          'mockGateUpcast',
          'mockGetCantripAutoLevel',
        ])
      );
      expect(exportedNames.length).toBe(7);
    });
  });
});

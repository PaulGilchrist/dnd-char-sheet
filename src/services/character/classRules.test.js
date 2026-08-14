// @improved-by-ai
import { describe, it, expect } from 'vitest';
import classRules from './classRules.js';

describe('classRules', () => {
  describe('getClass', () => {
    const mockClasses = [
      {
        name: 'Wizard',
        index: 'wizard',
        saving_throws: ['INT'],
        class_levels: [],
        subclasses: [{ name: 'Abjuration', class_levels: [] }],
      },
      {
        name: 'Fighter',
        index: 'fighter',
        saving_throws: ['STR', 'CON'],
        class_levels: [],
      },
      {
        name: 'Bard',
        index: 'bard',
        class_levels: [],
      },
    ];

    it('returns merged class data for a valid class', () => {
      const playerSummary = { class: { name: 'Wizard' } };
      const result = classRules.getClass(mockClasses, playerSummary);

      expect(result.name).toBe('Wizard');
      expect(result.saving_throws).toEqual(['Intelligence']);
      expect(result.subclass).toBeNull();
      expect(result.subclasses).toBeUndefined();
    });

    it('converts all saving_throws abbreviations to full names', () => {
      const playerSummary = { class: { name: 'Fighter' } };
      const result = classRules.getClass(mockClasses, playerSummary);
      expect(result.saving_throws).toEqual(['Strength', 'Constitution']);
    });

    it('includes subclass when specified in playerSummary', () => {
      const playerSummary = { class: { name: 'Wizard', subclass: { name: 'Abjuration' } } };
      const result = classRules.getClass(mockClasses, playerSummary);
      expect(result.subclass.name).toBe('Abjuration');
    });

    it('sets subclass to null when not specified', () => {
      const playerSummary = { class: { name: 'Wizard' } };
      const result = classRules.getClass(mockClasses, playerSummary);
      expect(result.subclass).toBeNull();
    });

    it('merges playerSummary class properties onto base class', () => {
      const playerSummary = { class: { name: 'Wizard', customProperty: 'custom value' } };
      const result = classRules.getClass(mockClasses, playerSummary);
      expect(result.customProperty).toBe('custom value');
    });

    it('returns empty class_levels when class is not found', () => {
      const playerSummary = { class: { name: 'NonExistent' } };
      const result = classRules.getClass(mockClasses, playerSummary);
      expect(result).toEqual({ class_levels: [] });
    });

    it('returns empty class_levels when allClasses is empty', () => {
      const playerSummary = { class: { name: 'Wizard' } };
      const result = classRules.getClass([], playerSummary);
      expect(result).toEqual({ class_levels: [] });
    });

    it('throws when playerSummary.class is missing', () => {
      expect(() => classRules.getClass(mockClasses, {})).toThrow(TypeError);
    });

    it('deep-merges subclass data from playerSummary onto found subclass', () => {
      const playerSummary = { class: { name: 'Wizard', subclass: { name: 'Abjuration', customProp: 'x' } } };
      const result = classRules.getClass(mockClasses, playerSummary);
      expect(result.subclass.name).toBe('Abjuration');
      expect(result.subclass.customProp).toBe('x');
      expect(result.subclass.class_levels).toEqual([]);
    });

    it('does not mutate the original allClasses array', () => {
      const original = JSON.stringify(mockClasses[0]);
      classRules.getClass(mockClasses, { class: { name: 'Wizard' } });
      expect(JSON.stringify(mockClasses[0])).toBe(original);
    });
  });

  describe('getDruidMaxWildShapeChallengeRating', () => {
    it('returns wild_shape_max_cr from class_specific when set', () => {
      const playerStats = {
        class: {
          name: 'Druid',
          class_levels: [{ level: 3, class_specific: { wild_shape_max_cr: 1 / 2 } }],
        },
        level: 3,
      };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(1 / 2);
    });

    it('returns 1 for Circle of Moon Druid levels 2-5', () => {
      const playerStats = { class: { name: 'Druid', subclass: { name: 'Circle of the Moon' } }, level: 4 };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(1);
    });

    it('returns floor(level/3) for Circle of Moon Druid level 6+', () => {
      const playerStats = { class: { name: 'Druid', subclass: { name: 'Circle of the Moon' } }, level: 9 };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(3);
    });

    it('prefers class_specific over Moon subclass modifier', () => {
      const playerStats = {
        class: {
          name: 'Druid',
          subclass: { name: 'Circle of the Moon' },
          class_levels: [{ level: 4, class_specific: { wild_shape_max_cr: 1 } }],
        },
        level: 4,
      };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(1);
    });

    it('returns 0 when playerStats.class is missing', () => {
      expect(classRules.getDruidMaxWildShapeChallengeRating({})).toBe(0);
    });

    it('returns 0 when class_levels is missing', () => {
      const playerStats = { class: { name: 'Druid' }, level: 3 };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(0);
    });

    it('returns 0 for non-Moon subclass at level > 5', () => {
      const playerStats = {
        class: { name: 'Druid', subclass: { name: 'Land' }, class_levels: [{ level: 8, class_specific: { wild_shape_max_cr: 1 / 2 } }] },
        level: 8,
      };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(1 / 2);
    });

    it('returns 0 for level 1 even with Moon subclass', () => {
      const playerStats = { class: { name: 'Druid', subclass: { name: 'Circle of the Moon' } }, level: 1 };
      expect(classRules.getDruidMaxWildShapeChallengeRating(playerStats)).toBe(0);
    });
  });

  describe('getDruidWildShapeUses', () => {
    it('always returns 2 per 5e rules', () => {
      expect(classRules.getDruidWildShapeUses()).toBe(2);
    });

    it('returns 2 regardless of playerStats arguments', () => {
      expect(classRules.getDruidWildShapeUses({})).toBe(2);
      expect(classRules.getDruidWildShapeUses(null)).toBe(2);
      expect(classRules.getDruidWildShapeUses(undefined)).toBe(2);
    });
  });

  describe('getDruidBeastKnownForms', () => {
    it('always returns 0 per 5e rules', () => {
      expect(classRules.getDruidBeastKnownForms()).toBe(0);
    });

    it('returns 0 regardless of playerStats arguments', () => {
      expect(classRules.getDruidBeastKnownForms({})).toBe(0);
    });
  });

  describe('getDruidBeastFlySpeed', () => {
    it('returns true when wild_shape_fly is true', () => {
      const playerStats = {
        class: { name: 'Druid', class_levels: [{ level: 4, class_specific: { wild_shape_fly: true } }] },
        level: 4,
      };
      expect(classRules.getDruidBeastFlySpeed(playerStats)).toBe(true);
    });

    it('returns false when wild_shape_fly is false', () => {
      const playerStats = {
        class: { name: 'Druid', class_levels: [{ level: 1, class_specific: { wild_shape_fly: false } }] },
        level: 1,
      };
      expect(classRules.getDruidBeastFlySpeed(playerStats)).toBe(false);
    });

    it('returns undefined when wild_shape_fly is not set', () => {
      const playerStats = {
        class: { name: 'Druid', class_levels: [{ level: 1, class_specific: {} }] },
        level: 1,
      };
      expect(classRules.getDruidBeastFlySpeed(playerStats)).toBeUndefined();
    });

    it('returns undefined when class_levels is missing', () => {
      const playerStats = { class: { name: 'Druid' }, level: 1 };
      expect(classRules.getDruidBeastFlySpeed(playerStats)).toBeUndefined();
    });

    it('returns undefined when class is missing', () => {
      expect(classRules.getDruidBeastFlySpeed({})).toBeUndefined();
    });
  });

  describe('getFeatures', () => {
    it('returns categorized features from class levels up to player level', () => {
      const playerStats = {
        class: {
          name: 'Fighter',
          class_levels: [
            { level: 1, features: ['Weapon Training'] },
            { level: 2, features: ['Second Wind', 'Action Surge'] },
            { level: 3, features: ['Extra Attack'] },
          ],
        },
        level: 2,
        subclass: null,
      };
      const result = classRules.getFeatures(playerStats);
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('bonusActions');
      expect(result).toHaveProperty('reactions');
      expect(result).toHaveProperty('specialActions');
      expect(result).toHaveProperty('characterAdvancement');
    });

    it('filters out class levels beyond player level', () => {
      const playerStats = {
        class: {
          name: 'Fighter',
          class_levels: [
            { level: 1, features: [{ name: 'Weapon Training' }] },
            { level: 2, features: [{ name: 'Second Wind' }] },
            { level: 3, features: [{ name: 'Action Surge' }] },
          ],
        },
        level: 2,
        subclass: null,
      };
      const result = classRules.getFeatures(playerStats);
      const allFeatureNames = [
        ...result.actions, ...result.bonusActions, ...result.reactions,
        ...result.specialActions, ...result.characterAdvancement,
      ].map((f) => f.name);
      expect(allFeatureNames).toContain('Second Wind');
      expect(allFeatureNames).not.toContain('Action Surge');
    });

    it('merges subclass features with class features', () => {
      const playerStats = {
        class: {
          name: 'Fighter',
          class_levels: [{ level: 1, features: [{ name: 'Weapon Training' }] }],
          subclass: {
            name: 'Battle Master',
            class_levels: [{ level: 3, features: [{ name: 'Combat Maneuvers' }] }],
          },
        },
        level: 3,
      };
      const result = classRules.getFeatures(playerStats);
      const allFeatureNames = [
        ...result.actions, ...result.bonusActions, ...result.reactions,
        ...result.specialActions, ...result.characterAdvancement,
      ].map((f) => f.name);
      expect(allFeatureNames).toContain('Weapon Training');
      expect(allFeatureNames).toContain('Combat Maneuvers');
    });

    it('returns empty categories when class has no features', () => {
      const playerStats = {
        class: { name: 'Fighter', class_levels: [{ level: 1 }] },
        level: 1,
        subclass: null,
      };
      const result = classRules.getFeatures(playerStats);
      expect(result.actions).toEqual([]);
      expect(result.bonusActions).toEqual([]);
      expect(result.reactions).toEqual([]);
      expect(result.specialActions).toEqual([]);
      expect(result.characterAdvancement).toEqual([]);
    });

    it('throws when class_levels is missing', () => {
      const playerStats = { class: { name: 'Fighter' }, level: 1, subclass: null };
      expect(() => classRules.getFeatures(playerStats)).toThrow(TypeError);
    });

    it('does not include subclass features when subclass is null', () => {
      const playerStats = {
        class: {
          name: 'Fighter',
          class_levels: [{ level: 1, features: [{ name: 'Weapon Training' }] }],
          subclass: null,
        },
        level: 1,
      };
      const result = classRules.getFeatures(playerStats);
      const allFeatureNames = [
        ...result.actions, ...result.bonusActions, ...result.reactions,
        ...result.specialActions, ...result.characterAdvancement,
      ].map((f) => f.name);
      expect(allFeatureNames).toEqual(['Weapon Training']);
    });
  });

  describe('getHighestSubclassLevel', () => {
    it('returns 0 when no subclass exists', () => {
      const playerStats = { class: { name: 'Wizard', subclass: null }, level: 5 };
      expect(classRules.getHighestSubclassLevel(playerStats)).toBe(0);
    });

    it('returns highest subclass level object <= player level', () => {
      const playerStats = {
        class: {
          name: 'Wizard',
          subclass: { name: 'Abjuration', class_levels: [{ level: 2 }, { level: 3 }, { level: 4 }, { level: 5 }] },
        },
        level: 4,
      };
      const result = classRules.getHighestSubclassLevel(playerStats);
      expect(result.level).toBe(4);
    });

    it('returns 0 when player level is below first subclass level', () => {
      const playerStats = {
        class: {
          name: 'Wizard',
          subclass: { name: 'Abjuration', class_levels: [{ level: 2 }] },
        },
        level: 1,
      };
      expect(classRules.getHighestSubclassLevel(playerStats)).toBe(0);
    });

    it('returns 0 when subclass has no class_levels', () => {
      const playerStats = { class: { name: 'Wizard', subclass: { name: 'Abjuration' } }, level: 5 };
      expect(classRules.getHighestSubclassLevel(playerStats)).toBe(0);
    });

    it('returns 0 when subclass is undefined', () => {
      const playerStats = { class: { name: 'Wizard' }, level: 5 };
      expect(classRules.getHighestSubclassLevel(playerStats)).toBe(0);
    });
  });

  describe('getRogueSneakAttack', () => {
    it('returns sneak_attack from current level class_specific', () => {
      const playerStats = {
        class: {
          name: 'Rogue',
          class_levels: [{ level: 5, class_specific: { sneak_attack: { dice_count: 5, dice_value: 6 } } }],
        },
        level: 5,
      };
      expect(classRules.getRogueSneakAttack(playerStats)).toEqual({ dice_count: 5, dice_value: 6 });
    });

    it('returns default when class_specific is missing', () => {
      const playerStats = { class: { name: 'Rogue' }, level: 1 };
      expect(classRules.getRogueSneakAttack(playerStats)).toEqual({ dice_count: 0, dice_value: 6 });
    });

    it('returns default when class_levels is missing', () => {
      const playerStats = { class: { name: 'Rogue' }, level: 1 };
      expect(classRules.getRogueSneakAttack(playerStats)).toEqual({ dice_count: 0, dice_value: 6 });
    });

    it('returns default when class is missing', () => {
      expect(classRules.getRogueSneakAttack({})).toEqual({ dice_count: 0, dice_value: 6 });
    });

    it('returns default when class_specific.sneak_attack is missing', () => {
      const playerStats = {
        class: { name: 'Rogue', class_levels: [{ level: 5, class_specific: {} }] },
        level: 5,
      };
      expect(classRules.getRogueSneakAttack(playerStats)).toEqual({ dice_count: 0, dice_value: 6 });
    });
  });

  describe('getClericFeatures', () => {
    it('returns channel_divinity_charges and destroy_undead_cr from class_specific', () => {
      const playerStats = {
        class: {
          name: 'Cleric',
          class_levels: [{ level: 5, class_specific: { channel_divinity_charges: 2, destroy_undead_cr: 1 / 2 } }],
        },
        level: 5,
      };
      expect(classRules.getClericFeatures(playerStats)).toEqual({ maxChannelDivinity: 2, destroyUndeadCR: 1 / 2 });
    });

    it('returns defaults when class_specific is missing', () => {
      const playerStats = { class: { name: 'Cleric' }, level: 5 };
      expect(classRules.getClericFeatures(playerStats)).toEqual({ maxChannelDivinity: 0, destroyUndeadCR: null });
    });

    it('returns defaults when class_levels is missing', () => {
      const playerStats = { class: { name: 'Cleric' }, level: 5 };
      expect(classRules.getClericFeatures(playerStats)).toEqual({ maxChannelDivinity: 0, destroyUndeadCR: null });
    });

    it('returns defaults when class is missing', () => {
      expect(classRules.getClericFeatures({})).toEqual({ maxChannelDivinity: 0, destroyUndeadCR: null });
    });
  });

  describe('getDruidFeatures', () => {
    it('returns wild shape features with correct defaults', () => {
      const playerStats = {
        class: { name: 'Druid', class_levels: [{ level: 2, class_specific: {} }] },
        level: 2,
      };
      const result = classRules.getDruidFeatures(playerStats);
      expect(result.maxWildShapeUses).toBe(2);
      expect(result.maxWildShapeChallengeRating).toBe(0);
      expect(result.beastKnownForms).toBe(0);
      expect(result.wildShapeLimitations).toBe('walk only (no swim or fly)');
    });

    it('sets wildShapeLimitations based on fly flag', () => {
      const flyStats = {
        class: { name: 'Druid', class_levels: [{ level: 4, class_specific: { wild_shape_fly: true } }] },
        level: 4,
      };
      expect(classRules.getDruidFeatures(flyStats).wildShapeLimitations).toBe('walk, swim, or fly');
    });

    it('sets wildShapeLimitations based on swim flag when fly is absent', () => {
      const swimStats = {
        class: { name: 'Druid', class_levels: [{ level: 4, class_specific: { wild_shape_swim: true } }] },
        level: 4,
      };
      expect(classRules.getDruidFeatures(swimStats).wildShapeLimitations).toBe('walk or swim only (no fly)');
    });

    it('prefers fly over swim when both are set', () => {
      const bothStats = {
        class: { name: 'Druid', class_levels: [{ level: 4, class_specific: { wild_shape_fly: true, wild_shape_swim: true } }] },
        level: 4,
      };
      expect(classRules.getDruidFeatures(bothStats).wildShapeLimitations).toBe('walk, swim, or fly');
    });

    it('returns defaults when class_levels is missing', () => {
      const playerStats = { class: { name: 'Druid' }, level: 2 };
      const result = classRules.getDruidFeatures(playerStats);
      expect(result.maxWildShapeUses).toBe(2);
      expect(result.maxWildShapeChallengeRating).toBe(0);
      expect(result.beastKnownForms).toBe(0);
      expect(result.wildShapeLimitations).toBe('walk only (no swim or fly)');
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getDruidFeatures({});
      expect(result.maxWildShapeUses).toBe(2);
      expect(result.maxWildShapeChallengeRating).toBe(0);
      expect(result.beastKnownForms).toBe(0);
      expect(result.wildShapeLimitations).toBe('walk only (no swim or fly)');
    });
  });

  describe('getPaladinFeatures', () => {
    it('returns channel_divinity_charges, aura_range, and extraAttacks', () => {
      const playerStats = {
        class: { name: 'Paladin', class_levels: [{ level: 5, class_specific: { channel_divinity_charges: 2, aura_range: 10 } }] },
        level: 5,
      };
      expect(classRules.getPaladinFeatures(playerStats)).toEqual({ maxChannelDivinity: 2, auraRange: 10, extraAttacks: 1 });
    });

    it('returns 0 extraAttacks when level <= 4', () => {
      const playerStats = { class: { name: 'Paladin' }, level: 3 };
      expect(classRules.getPaladinFeatures(playerStats).extraAttacks).toBe(0);
    });

    it('returns default auraRange when not set in class_specific', () => {
      const playerStats = { class: { name: 'Paladin', class_levels: [{ level: 5, class_specific: {} }] }, level: 5 };
      expect(classRules.getPaladinFeatures(playerStats).auraRange).toBeNull();
    });

    it('returns defaults when class_levels is missing', () => {
      const playerStats = { class: { name: 'Paladin' }, level: 5 };
      expect(classRules.getPaladinFeatures(playerStats)).toEqual({ maxChannelDivinity: 0, auraRange: null, extraAttacks: 1 });
    });

    it('returns defaults when class is missing', () => {
      expect(classRules.getPaladinFeatures({})).toEqual({ maxChannelDivinity: 0, auraRange: null, extraAttacks: 0 });
    });
  });

  describe('getSorcererFeatures', () => {
    it('returns sorcerer features from class_specific', () => {
      const playerStats = {
        class: {
          name: 'Sorcerer',
          class_levels: [{ level: 3, class_specific: { sorcery_points: 3, metamagic_known: 2, creating_spell_slots: [{ sorcery_point_cost: 2 }] } }],
        },
        level: 3,
      };
      const result = classRules.getSorcererFeatures(playerStats);
      expect(result.maxSorceryPoints).toBe(3);
      expect(result.metamagicKnown).toBe(2);
      expect(result.creatingSpellSlotCosts).toEqual([2]);
      expect(result.maxInnateSorcery).toBe(0);
    });

    it('returns defaults when class_specific is missing', () => {
      const playerStats = { class: { name: 'Sorcerer' }, level: 3 };
      const result = classRules.getSorcererFeatures(playerStats);
      expect(result.maxSorceryPoints).toBe(0);
      expect(result.metamagicKnown).toBe(0);
      expect(result.creatingSpellSlotCosts).toEqual([]);
      expect(result.maxInnateSorcery).toBe(0);
    });

    it('returns defaults when class_levels is missing', () => {
      const playerStats = { class: { name: 'Sorcerer' }, level: 3 };
      const result = classRules.getSorcererFeatures(playerStats);
      expect(result.maxSorceryPoints).toBe(0);
      expect(result.metamagicKnown).toBe(0);
      expect(result.creatingSpellSlotCosts).toEqual([]);
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getSorcererFeatures({});
      expect(result.maxSorceryPoints).toBe(0);
      expect(result.metamagicKnown).toBe(0);
      expect(result.creatingSpellSlotCosts).toEqual([]);
    });
  });

  describe('getWarlockFeatures', () => {
    it('returns arcanum data when level > 10', () => {
      const playerStats = {
        class: {
          name: 'Warlock',
          class_levels: [{ level: 13, class_specific: { invocations_known: 10, mystic_arcanum_level_6: 5 } }],
        },
        level: 13,
      };
      const result = classRules.getWarlockFeatures(playerStats);
      expect(result.invocationsKnown).toBe(10);
      expect(result.hasArcanum).toBe(true);
      expect(result.arcanumLevels.level6).toBe(5);
      expect(result.arcanumLevels.level7).toBe(0);
      expect(result.arcanumLevels.level8).toBe(0);
      expect(result.arcanumLevels.level9).toBe(0);
    });

    it('returns all-zero arcanumLevels when level <= 10', () => {
      const playerStats = {
        class: {
          name: 'Warlock',
          class_levels: [{ level: 8, class_specific: { invocations_known: 4 } }],
        },
        level: 8,
      };
      const result = classRules.getWarlockFeatures(playerStats);
      expect(result.hasArcanum).toBe(false);
      expect(result.arcanumLevels).toEqual({ level6: 0, level7: 0, level8: 0, level9: 0 });
    });

    it('uses class.arcanums when provided', () => {
      const playerStats = {
        class: {
          name: 'Warlock',
          arcanums: [{ name: 'Foresight', level: 9 }],
          class_levels: [{ level: 13, class_specific: { invocations_known: 10 } }],
        },
        level: 13,
      };
      expect(classRules.getWarlockFeatures(playerStats).arcanums).toEqual([{ name: 'Foresight', level: 9 }]);
    });

    it('returns null pactBoon and empty invocations when not set', () => {
      const playerStats = {
        class: { name: 'Warlock', class_levels: [{ level: 1 }] },
        level: 1,
      };
      const result = classRules.getWarlockFeatures(playerStats);
      expect(result.pactBoon).toBeNull();
      expect(result.invocations).toEqual([]);
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getWarlockFeatures({});
      expect(result.invocationsKnown).toBe(0);
      expect(result.hasArcanum).toBe(false);
      expect(result.pactBoon).toBeNull();
      expect(result.invocations).toEqual([]);
    });
  });

  describe('getWizardFeatures', () => {
    it('returns arcaneRecoveryLevels from class_specific', () => {
      const playerStats = {
        class: { name: 'Wizard', class_levels: [{ level: 4, class_specific: { arcane_recovery_levels: 3 } }] },
        level: 4,
      };
      expect(classRules.getWizardFeatures(playerStats)).toEqual({ arcaneRecoveryLevels: 3, arcaneWard: false, arcaneWardMax: 0, showWizardFeatures: true });
    });

    it('returns arcaneWard: true for Abjurer with automation passive', () => {
      const playerStats = {
        class: { name: 'Wizard', subclass: { name: 'Abjuration' }, class_levels: [{ level: 4 }] },
        level: 4,
        abilities: [{ name: 'Intelligence', bonus: 3 }],
        automation: { passives: [{ type: 'arcane_ward', name: 'Arcane Ward' }] },
      };
      const result = classRules.getWizardFeatures(playerStats);
      expect(result.arcaneWard).toBe(true);
      expect(result.arcaneWardMax).toBe(11);
    });

    it('calculates arcaneWardMax with INT bonus', () => {
      const playerStats = {
        class: { name: 'Wizard', subclass: { name: 'Abjuration' }, class_levels: [{ level: 7 }] },
        level: 7,
        abilities: [{ name: 'Intelligence', bonus: 5 }],
        automation: { passives: [{ type: 'arcane_ward' }] },
      };
      const result = classRules.getWizardFeatures(playerStats);
      // (2 * 7) + 5 = 19
      expect(result.arcaneWardMax).toBe(19);
    });

    it('returns arcaneWard: false when automation passives is missing', () => {
      const playerStats = {
        class: { name: 'Wizard', subclass: { name: 'Abjuration' }, class_levels: [{ level: 4 }] },
        level: 4,
        abilities: [{ name: 'Intelligence', bonus: 3 }],
      };
      const result = classRules.getWizardFeatures(playerStats);
      expect(result.arcaneWard).toBe(false);
      expect(result.arcaneWardMax).toBe(0);
    });

    it('defaults intMod to 0 when Intelligence ability is missing', () => {
      const playerStats = {
        class: { name: 'Wizard', subclass: { name: 'Abjuration' }, class_levels: [{ level: 4 }] },
        level: 4,
        abilities: [{ name: 'Strength', bonus: 3 }],
        automation: { passives: [{ type: 'arcane_ward' }] },
      };
      const result = classRules.getWizardFeatures(playerStats);
      // (2 * 4) + 0 = 8
      expect(result.arcaneWardMax).toBe(8);
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getWizardFeatures({});
      expect(result.arcaneRecoveryLevels).toBe(0);
      expect(result.arcaneWard).toBe(false);
      expect(result.arcaneWardMax).toBe(0);
      expect(result.showWizardFeatures).toBe(true);
    });
  });

  describe('getMonkFeatures', () => {
    it('returns hardcoded values', () => {
      expect(classRules.getMonkFeatures()).toEqual({
        martialArtsDie: 4, unarmoredMovementIncrease: 0, maxFocusPoints: 0, wisdomBonus: 0,
      });
    });

    it('returns the same values regardless of arguments', () => {
      expect(classRules.getMonkFeatures({})).toEqual({ martialArtsDie: 4, unarmoredMovementIncrease: 0, maxFocusPoints: 0, wisdomBonus: 0 });
      expect(classRules.getMonkFeatures(null)).toEqual({ martialArtsDie: 4, unarmoredMovementIncrease: 0, maxFocusPoints: 0, wisdomBonus: 0 });
    });
  });

  describe('getRangerFeatures', () => {
    it('returns extraAttacks based on level', () => {
      const highLevel = { class: { name: 'Ranger' }, level: 5 };
      expect(classRules.getRangerFeatures(highLevel).extraAttacks).toBe(1);
      const lowLevel = { class: { name: 'Ranger' }, level: 3 };
      expect(classRules.getRangerFeatures(lowLevel).extraAttacks).toBe(0);
    });

    it('returns favoredEnemies: 0', () => {
      const playerStats = { class: { name: 'Ranger' }, level: 5 };
      expect(classRules.getRangerFeatures(playerStats).favoredEnemies).toBe(0);
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getRangerFeatures({});
      expect(result.favoredEnemies).toBe(0);
      expect(result.extraAttacks).toBe(0);
    });
  });

  describe('getRogueFeatures', () => {
    it('returns sneakAttack and expertise', () => {
      const playerStats = {
        class: { name: 'Rogue', expertise: ['Stealth'], class_levels: [{ level: 5, class_specific: { sneak_attack: { dice_count: 5, dice_value: 6 } } }] },
        level: 5,
        expertise: ['Stealth'],
      };
      const result = classRules.getRogueFeatures(playerStats);
      expect(result.sneakAttack).toEqual({ dice_count: 5, dice_value: 6 });
      expect(result.expertise).toEqual(['Stealth']);
    });

    it('returns empty expertise array when not set', () => {
      const playerStats = { class: { name: 'Rogue' }, level: 5 };
      const result = classRules.getRogueFeatures(playerStats);
      expect(result.expertise).toEqual([]);
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getRogueFeatures({});
      expect(result.sneakAttack).toEqual({ dice_count: 0, dice_value: 6 });
      expect(result.expertise).toEqual([]);
    });
  });

  describe('getBardFeatures', () => {
    it('returns subclassMagicalSecrets for College of Lore bard level > 2', () => {
      const playerStats = {
        class: {
          name: 'Bard',
          subclass: { name: 'Lore', class_levels: [{ level: 6, subclass_specific: { additional_magical_secrets_max_lvl: 2 } }] },
          class_levels: [{ level: 6, class_specific: { bardic_inspiration_die: 'd8' } }],
        },
        level: 6,
      };
      const result = classRules.getBardFeatures(playerStats);
      expect(result.bardicDie).toBe('d8');
      expect(result.subclassMagicalSecrets).toBe(2);
      expect(result.songOfRestDie).toBeNull();
      expect(result.magicalSecrets).toBeNull();
    });

    it('returns 0 subclassMagicalSecrets for non-Lore subclass', () => {
      const playerStats = {
        class: {
          name: 'Bard',
          subclass: { name: 'Valley' },
          class_levels: [{ level: 6, class_specific: { bardic_inspiration_die: 'd8' } }],
        },
        level: 6,
      };
      expect(classRules.getBardFeatures(playerStats).subclassMagicalSecrets).toBe(0);
    });

    it('returns 0 subclassMagicalSecrets for Lore bard at level <= 2', () => {
      const playerStats = {
        class: {
          name: 'Bard',
          subclass: { name: 'Lore', class_levels: [{ level: 6, subclass_specific: { additional_magical_secrets_max_lvl: 2 } }] },
          class_levels: [{ level: 2, class_specific: { bardic_inspiration_die: 'd6' } }],
        },
        level: 2,
      };
      expect(classRules.getBardFeatures(playerStats).subclassMagicalSecrets).toBe(0);
    });

    it('returns defaults when class_levels is missing', () => {
      const playerStats = { class: { name: 'Bard' }, level: 6 };
      const result = classRules.getBardFeatures(playerStats);
      expect(result.bardicDie).toBe(0);
      expect(result.songOfRestDie).toBeNull();
      expect(result.magicalSecrets).toBeNull();
      expect(result.subclassMagicalSecrets).toBe(0);
    });

    it('returns defaults when class is missing', () => {
      const result = classRules.getBardFeatures({});
      expect(result.bardicDie).toBe(0);
      expect(result.songOfRestDie).toBeNull();
      expect(result.magicalSecrets).toBeNull();
      expect(result.subclassMagicalSecrets).toBe(0);
    });
  });
});

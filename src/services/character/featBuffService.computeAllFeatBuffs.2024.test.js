// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { findFeat } from '../../services/shared/featFinder.js';
import {
  computeAllFeatBuffs,
} from './featBuffService.js';

vi.mock('../../services/shared/featFinder.js', () => ({
  findFeat: vi.fn(),
}));

describe('computeAllFeatBuffs — 2024 ruleset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ability_score_increase parsing', () => {
    it('should parse single-score ability_score_increase with featName attached', () => {
      findFeat.mockReturnValue({
        name: 'Tough',
        benefits: [
          { type: 'ability_score_increase', description: '+1 STR' },
        ],
        ability_score_increase: { scores: ['Strength'], amount: 1 },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Tough'] },
        [{ name: 'Tough' }]
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'Strength',
          amount: 1,
          isChoice: false,
          description: '+1 STR',
          featName: 'Tough',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
      expect(result.proficiencies).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should parse single-score ability_score_increase with custom max_value', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: '+1 STR to 30' },
        ],
        ability_score_increase: { scores: ['Strength'], amount: 1, max_value: 30 },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'Strength',
          amount: 1,
          isChoice: false,
          description: '+1 STR to 30',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 30,
        },
      ]);
    });

    it('should parse two-score ability_score_increase as a choice with scores array', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: '+1 to two abilities' },
        ],
        ability_score_increase: {
          scores: ['Strength', 'Dexterity'],
          amount: 1,
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: 1,
          isChoice: true,
          scores: ['Strength', 'Dexterity'],
          description: '+1 to two abilities',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should parse variable amount ability_score_increase as a choice', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: 'Variable increase' },
        ],
        ability_score_increase: {
          scores: ['Strength'],
          amount: 'variable',
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: [1, 2],
          isChoice: true,
          description: 'Variable increase',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should parse multi-score ability_score_increase (>2) as a choice with array amount', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: 'Pick any ability' },
        ],
        ability_score_increase: {
          scores: ['Strength', 'Dexterity', 'Constitution'],
          amount: 1,
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: [1],
          isChoice: true,
          description: 'Pick any ability',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should parse multi-score ability_score_increase with array amount', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: 'Multi ASI' },
        ],
        ability_score_increase: {
          scores: ['STR', 'DEX', 'CON'],
          amount: [1, 2],
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toEqual([
        {
          name: 'any',
          amount: [1, 2],
          isChoice: true,
          description: 'Multi ASI',
          featName: 'Custom Feat',
          featDescription: undefined,
          max_value: 20,
        },
      ]);
    });

    it('should default amount to 1 when non-numeric for two-score case', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: '+? STR/DEX' },
        ],
        ability_score_increase: {
          scores: ['Strength', 'Dexterity'],
          amount: 'unknown',
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases[0].amount).toBe(1);
    });

    it('should default amount to 1 when non-numeric for single-score case', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          { type: 'ability_score_increase', description: '+? STR' },
        ],
        ability_score_increase: {
          scores: ['Strength'],
          amount: 'unknown',
        },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases[0].amount).toBe(1);
    });
  });

  describe('proficiency parsing', () => {
    it('should parse improvised weapon proficiency', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain proficiency with improvised weapons',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Improvised Weapons', type: 'proficiency' },
      ]);
      expect(result.abilityScoreIncreases).toEqual([]);
      expect(result.resistances).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should parse all skills proficiency', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain proficiency in all skills',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'all_skills', type: 'skill' },
      ]);
    });

    it('should parse armor training with shields', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain training with light armor and shields',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Light Armor', type: 'proficiency' },
        { name: 'Shields', type: 'proficiency' },
      ]);
    });

    it('should parse armor training without shields', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain training with heavy armor.',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Heavy Armor', type: 'proficiency' },
      ]);
    });

    it('should parse martial weapon proficiency', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Weapon Training',
            description: 'You gain proficiency with Martial weapons.',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Weapon Training'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Martial Weapons', type: 'proficiency' },
      ]);
    });

    it('should parse simple weapon proficiency', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Weapon Training',
            description: 'You gain proficiency with Simple weapons.',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Weapon Training'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Simple Weapons', type: 'proficiency' },
      ]);
    });

    it('should parse proficiency choice with count (three different tools)', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Tool Proficiency',
            description: 'You gain proficiency with three different Artisan\'s Tools of your choice.',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Tool Proficiency'] },
        []
      );

      expect(result.proficiencies).toEqual([
        {
          name: 'Tool Proficiency',
          type: 'proficiency',
          isChoice: true,
          choose: 3,
          from: ["Artisan's Tools"],
        },
      ]);
    });

    it('should parse generic proficiency when no special pattern matches', () => {
      findFeat.mockReturnValue({
        benefits: [
          {
            type: 'proficiency',
            name: 'Custom Feat',
            description: 'You gain proficiency with casting focuses',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: 'Custom Feat', type: 'proficiency' },
      ]);
    });
  });

  describe('resistance parsing', () => {
    it('should parse resistance with automation as resistance_choice feature', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'resistance',
            name: 'Custom Feat',
            description: 'Resistance benefit',
            automation: {
              validTypes: ['fire', 'cold', 'lightning'],
              resistanceType: ['player_choice_fire_from_list'],
            },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Resistance benefit',
          type: 'resistance_choice',
          automation: {
            validTypes: ['fire', 'cold', 'lightning'],
            resistanceType: ['player_choice_fire_from_list'],
            count: 2,
          },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse resistance without automation as plain resistance feature', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'resistance',
            name: 'Custom Feat',
            description: 'Resistance to poison',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Resistance to poison',
          type: 'resistance',
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse resistance with empty validTypes as plain resistance', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'resistance',
            name: 'Custom Feat',
            description: 'Resistance to poison',
            automation: {
              validTypes: [],
              resistanceType: ['fixed'],
            },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Resistance to poison',
          type: 'resistance',
          automation: {
            validTypes: [],
            resistanceType: ['fixed'],
          },
          featName: 'Custom Feat',
        },
      ]);
    });
  });

  describe('saving_throw parsing', () => {
    it('should parse saving_throw benefit with automation', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'saving_throw',
            name: 'Custom Feat',
            description: 'Saving throw benefit',
            automation: { type: 'saving_throw_proficiency' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Feat',
          description: 'Saving throw benefit',
          type: 'saving_throw',
          automation: { type: 'saving_throw_proficiency' },
          featName: 'Custom Feat',
        },
      ]);
    });
  });

  describe('damage benefit parsing', () => {
    it('should parse Savage Attacker damage benefit with reroll_damage_once_per_turn', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'damage',
            name: 'Savage Attacker',
            description: 'Reroll damage once per turn',
            automation: { type: 'reroll_damage_once_per_turn' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Savage Attacker',
          description: 'Reroll damage once per turn',
          type: 'reroll_damage_once_per_turn',
          automation: { type: 'reroll_damage_once_per_turn' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse Great Weapon Fighting damage benefit', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'damage',
            name: 'Great Weapon Fighting',
            description: 'Damage reroll',
            automation: { type: 'great_weapon_fighting' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Great Weapon Fighting',
          description: 'Damage reroll',
          type: 'great_weapon_fighting',
          automation: { type: 'great_weapon_fighting' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse Enhanced Unarmed Strike damage benefit', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'damage',
            name: 'Enhanced Unarmed Strike',
            description: 'Improved unarmed damage',
            automation: { type: 'enhanced_unarmed', damage: '1d6' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Enhanced Unarmed Strike',
          description: 'Improved unarmed damage',
          type: 'damage',
          automation: { type: 'enhanced_unarmed', damage: '1d6' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse Two Weapon Fighting from Enhanced Unarmed name', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'damage',
            name: 'Extra Attack Damage',
            description: 'Bonus attack damage',
            automation: { type: 'two_weapon_fighting' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Two Weapon Fighting',
          description: 'Bonus attack damage',
          type: 'two_weapon_fighting',
          automation: { type: 'two_weapon_fighting' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse Dual Wielding as two_weapon_fighting', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'damage',
            name: 'Dual Wielding',
            description: 'Off-hand attack bonus',
            automation: { type: 'dual_wielding' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Dual Wielding',
          description: 'Off-hand attack bonus',
          type: 'two_weapon_fighting',
          automation: { type: 'two_weapon_fighting' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should pass through unknown damage type as feature', () => {
      findFeat.mockReturnValue({
        name: 'Unknown Feat',
        benefits: [
          {
            type: 'damage',
            name: 'Unknown Feat',
            description: 'Some unknown damage benefit',
            automation: { custom: true },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Unknown Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Unknown Feat',
          description: 'Some unknown damage benefit',
          type: 'damage',
          automation: { custom: true },
          featName: 'Unknown Feat',
        },
      ]);
    });
  });

  describe('spell benefit parsing', () => {
    it('should parse free_spell benefit type', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'spell',
            name: 'Level 1 Spell',
            description: 'Free spell benefit',
            automation: { type: 'free_spell' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Level 1 Spell',
          description: 'Free spell benefit',
          type: 'free_spell',
          automation: { type: 'free_spell' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse level 1 spell with automation as free_spell', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'spell',
            name: 'Level 1 Spell',
            description: 'Spell benefit',
            automation: { type: 'some_spell' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Level 1 Spell',
          description: 'Spell benefit',
          type: 'free_spell',
          automation: { type: 'some_spell' },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse Minor Telekinesis with custom automation', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'spell',
            name: 'Minor Telekinesis',
            description: 'Mage Hand enhancement',
            automation: { type: 'minor_telekinesis' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Minor Telekinesis',
          description: 'Mage Hand enhancement',
          type: 'spell',
          automation: {
            type: 'minor_telekinesis_spell',
            spell: 'Mage Hand',
          },
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should parse generic spell benefit without special handling', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'spell',
            name: 'Custom Spell',
            description: 'Spell benefit',
            automation: { type: 'spell' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Custom Spell',
          description: 'Spell benefit',
          type: 'spell',
          automation: { type: 'spell' },
          featName: 'Custom Feat',
        },
      ]);
    });
  });

  describe('bonus_action parsing', () => {
    it('should parse bonus_action benefit with automation', () => {
      findFeat.mockReturnValue({
        name: 'Custom Feat',
        benefits: [
          {
            type: 'bonus_action',
            name: 'Speedy Recovery',
            description: 'Heal with hit die',
            automation: { type: 'self_healing' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Speedy Recovery',
          description: 'Heal with hit die',
          type: 'bonus_action',
          automation: { type: 'self_healing' },
          isBonusAction: true,
          featName: 'Custom Feat',
        },
      ]);
    });

    it('should extract tool proficiency from bonus_action description', () => {
      findFeat.mockReturnValue({
        name: 'Brew Poison',
        benefits: [
          {
            type: 'bonus_action',
            name: 'Brew Poison',
            description: "You gain proficiency with the Poisoner's Kit. With 1 hour of work using such a kit and expending 50 GP worth of materials, you can create a number of poison doses equal to your Proficiency Bonus.",
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Brew Poison'] },
        []
      );

      expect(result.proficiencies).toEqual([
        { name: "the Poisoner's Kit" },
      ]);
      expect(result.features).toEqual([
        {
          name: 'Brew Poison',
          description: "You gain proficiency with the Poisoner's Kit. With 1 hour of work using such a kit and expending 50 GP worth of materials, you can create a number of poison doses equal to your Proficiency Bonus.",
          type: 'bonus_action',
          isBonusAction: true,
          featName: 'Brew Poison',
        },
      ]);
    });
  });

  describe('default/fallback handling', () => {
    it('should handle unknown benefit type as feature with benefit type', () => {
      findFeat.mockReturnValue({
        name: 'Unknown Feat',
        benefits: [
          {
            type: 'unknown_type',
            name: 'Unknown Feat',
            description: 'Some unknown benefit',
            automation: { custom: true },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Unknown Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Unknown Feat',
          description: 'Some unknown benefit',
          type: 'unknown_type',
          automation: { custom: true },
          featName: 'Unknown Feat',
        },
      ]);
    });

    it('should handle Savage Strike name in default case as reroll_damage_once_per_turn', () => {
      findFeat.mockReturnValue({
        name: 'Savage Strike',
        benefits: [
          {
            type: 'action',
            name: 'Savage Strike',
            description: 'Extra damage on strike',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Savage Strike'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Savage Attacker',
          description: 'Extra damage on strike',
          type: 'reroll_damage_once_per_turn',
          automation: { type: 'reroll_damage_once_per_turn' },
          featName: 'Savage Strike',
        },
      ]);
    });

    it('should handle Tavern Brawler damage reroll in default case', () => {
      findFeat.mockReturnValue({
        name: 'Tavern Brawler',
        benefits: [
          {
            type: 'action',
            name: 'Tavern Brawler Damage Reroll',
            description: 'Reroll 1s on damage',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Tavern Brawler'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Tavern Brawler Damage Reroll',
          description: 'Reroll 1s on damage',
          type: 'passive',
          automation: { type: 'tavern_brawler_reroll_ones' },
          featName: 'Tavern Brawler',
        },
      ]);
    });

    it('should handle Tavern Brawler push in default case', () => {
      findFeat.mockReturnValue({
        name: 'Tavern Brawler',
        benefits: [
          {
            type: 'action',
            name: 'Tavern Brawler Push',
            description: 'Push creature',
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Tavern Brawler'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Tavern Brawler Push',
          description: 'Push creature',
          type: 'action',
          automation: { type: 'tavern_brawler_push', oncePerTurn: true },
          featName: 'Tavern Brawler',
        },
      ]);
    });

    it('should handle weapon_mastery_choice in default case', () => {
      findFeat.mockReturnValue({
        name: 'Mastery Feat',
        benefits: [
          {
            type: 'action',
            name: 'Mastery Property',
            description: 'Weapon mastery',
            automation: { type: 'weapon_mastery_choice' },
          },
        ],
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Mastery Feat'] },
        []
      );

      expect(result.features).toEqual([
        {
          name: 'Mastery Property',
          description: 'Weapon mastery',
          type: 'passive',
          automation: { type: 'weapon_mastery_choice' },
          featName: 'Mastery Feat',
        },
      ]);
    });
  });

  describe('filtering and aggregation', () => {
    it('should skip benefits without a type property', () => {
      findFeat.mockReturnValue({
        benefits: [
          { type: 'ability_score_increase', description: 'Valid' },
          { description: 'No type' },
          null,
        ],
        ability_score_increase: { scores: ['STR'], amount: 1 },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toHaveLength(1);
    });

    it('should aggregate benefits from multiple benefit objects in a single feat', () => {
      findFeat.mockReturnValue({
        benefits: [
          { type: 'ability_score_increase', description: '+1 STR' },
          { type: 'proficiency', name: 'Heavy Armor', description: 'Gain heavy armor proficiency' },
          { type: 'spell', name: 'Fire Bolt', description: 'Learn fire bolt' },
        ],
        ability_score_increase: { scores: ['Strength'], amount: 1 },
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Custom Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toHaveLength(1);
      expect(result.proficiencies).toHaveLength(1);
      expect(result.features).toHaveLength(1);
    });

    it('should aggregate buffs from multiple 2024 feats', () => {
      findFeat
        .mockReturnValueOnce({
          name: 'ASI Feat',
          benefits: [
            { type: 'ability_score_increase', description: '+1 STR' },
          ],
          ability_score_increase: { scores: ['Strength'], amount: 1 },
        })
        .mockReturnValueOnce({
          name: 'Prof Feat',
          benefits: [
            { type: 'proficiency', name: 'Prof Feat', description: 'You gain training with heavy armor and shields' },
          ],
        });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['ASI Feat', 'Prof Feat'] },
        []
      );

      expect(result.abilityScoreIncreases).toHaveLength(1);
      expect(result.proficiencies).toHaveLength(2);
      expect(result.abilityScoreIncreases[0].featName).toBe('ASI Feat');
      expect(result.proficiencies[0].name).toBe('Heavy Armor');
      expect(result.proficiencies[1].name).toBe('Shields');
    });

    it('should attach featName to all features from all feats', () => {
      findFeat
        .mockReturnValueOnce({
          name: 'Feat A',
          benefits: [
            { type: 'resistance', name: 'Feat A', description: 'Resistance to fire', automation: { validTypes: [], resistanceType: ['fixed'] } },
          ],
        })
        .mockReturnValueOnce({
          name: 'Feat B',
          benefits: [
            { type: 'spell', name: 'Fire Bolt', description: 'Learn fire bolt', automation: { type: 'spell' } },
          ],
        });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Feat A', 'Feat B'] },
        []
      );

      expect(result.features[0].featName).toBe('Feat A');
      expect(result.features[1].featName).toBe('Feat B');
    });

    it('should attach featName and featDescription to ability score increases', () => {
      findFeat.mockReturnValue({
        name: 'Tough',
        benefits: [
          { type: 'ability_score_increase', description: '+1 STR' },
        ],
        ability_score_increase: { scores: ['Strength'], amount: 1 },
        description: 'Extra hit points',
      });

      const result = computeAllFeatBuffs(
        { rules: '2024', feats: ['Tough'] },
        [{ name: 'Tough' }]
      );

      expect(result.abilityScoreIncreases[0].featName).toBe('Tough');
      expect(result.abilityScoreIncreases[0].featDescription).toBe('Extra hit points');
    });
  });
});

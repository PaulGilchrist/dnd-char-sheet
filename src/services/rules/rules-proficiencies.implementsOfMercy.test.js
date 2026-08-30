// Regression test for CLA-181 — Implements of Mercy (2024 Warrior of Mercy)
// Feature must grant proficiency in Insight and Medicine skills and Herbalism Kit.
import { describe, it, expect, vi } from 'vitest';
import { cloneDeep } from 'lodash';
import { getProficiencies } from './rules-proficiencies.js';
import { getAbilities } from './core/abilityCalc2024.js';
import classRules from '../character/classRules2024.js';
import { getCategories } from '../character/featureCategories.js';
import classesData from '../../../public/data/2024/classes.json';

const mockSkills = [
  { name: 'Athletics', ability: 'Strength' },
  { name: 'Acrobatics', ability: 'Dexterity' },
  { name: 'Sleight of Hand', ability: 'Dexterity' },
  { name: 'Stealth', ability: 'Dexterity' },
  { name: 'Arcana', ability: 'Intelligence' },
  { name: 'History', ability: 'Intelligence' },
  { name: 'Investigation', ability: 'Intelligence' },
  { name: 'Nature', ability: 'Intelligence' },
  { name: 'Religion', ability: 'Intelligence' },
  { name: 'Animal Handling', ability: 'Wisdom' },
  { name: 'Insight', ability: 'Wisdom' },
  { name: 'Medicine', ability: 'Wisdom' },
  { name: 'Perception', ability: 'Wisdom' },
  { name: 'Survival', ability: 'Wisdom' },
  { name: 'Deception', ability: 'Charisma' },
  { name: 'Intimidation', ability: 'Charisma' },
  { name: 'Performance', ability: 'Charisma' },
  { name: 'Persuasion', ability: 'Charisma' },
];

vi.mock('../ui/dataLoader.js', () => ({
  loadSkills: vi.fn(async () => mockSkills),
  loadBackgroundData: vi.fn(() => null),
}));

function makeMercyMonk() {
  const summary = {
    name: 'MercyMonk',
    level: 17,
    rules: '2024',
    class: { name: 'Monk', major: { name: 'Warrior of Mercy' } },
    background: 'Acolyte',
    skillProficiencies: ['Insight', 'Religion'],
    abilities: [
      { name: 'Strength', baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 },
      { name: 'Dexterity', baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 },
      { name: 'Constitution', baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 },
      { name: 'Intelligence', baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 },
      { name: 'Wisdom', baseScore: 16, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 },
      { name: 'Charisma', baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 },
    ],
  };
  const playerStats = cloneDeep(summary);
  playerStats.class = classRules.getClass(classesData, summary);
  playerStats.race = { traits: [], starting_proficiencies: [] };
  return playerStats;
}

describe('CLA-181 Implements of Mercy (2024 Warrior of Mercy)', () => {
  describe('data', () => {
    it('Warrior of Mercy major declares bonus_proficiencies with Insight, Medicine, and Herbalism Kit', () => {
      const monk = classesData.find(c => c.name === 'Monk');
      const major = monk.majors.find(m => m.name === 'Warrior of Mercy');
      expect(major.bonus_proficiencies).toEqual(
        expect.arrayContaining(['Skill: Insight', 'Skill: Medicine', 'Herbalism Kit'])
      );
    });
  });

  describe('skill proficiencies', () => {
    it('grants Insight and Medicine beyond the lv1 class skill choice', () => {
      const playerStats = makeMercyMonk();
      const [, skillProfs] = getProficiencies(playerStats, true, playerStats);
      expect(skillProfs).toContain('Insight');
      expect(skillProfs).toContain('Medicine');
      expect(skillProfs).toContain('Religion');
    });

    it('computes Medicine skill bonus as WIS modifier + proficiency bonus', async () => {
      const playerStats = makeMercyMonk();
      const [, skillProfs] = getProficiencies(playerStats, true, playerStats);
      playerStats.skillProficiencies = skillProfs;
      const abilities = await getAbilities(playerStats);
      const wisdom = abilities.find(a => a.name === 'Wisdom');
      const medicine = wisdom.skills.find(s => s.name === 'Medicine');
      const insight = wisdom.skills.find(s => s.name === 'Insight');
      expect(wisdom.bonus).toBe(3);
      expect(medicine.bonus).toBe(9);
      expect(insight.bonus).toBe(9);
    });
  });

  describe('tool proficiencies', () => {
    it('grants Herbalism Kit and excludes Skill: entries from the non-skill pool', () => {
      const playerStats = makeMercyMonk();
      const [, profs] = getProficiencies(playerStats, false, playerStats);
      expect(profs).toContain('Herbalism Kit');
      expect(profs.some(p => p.startsWith('Skill'))).toBe(false);
    });
  });

  describe('feature display', () => {
    it('categorizes Implements of Mercy as character advancement', () => {
      const playerStats = makeMercyMonk();
      const features = classRules.getFeatures(playerStats);
      expect(features.characterAdvancement.map(f => f.name)).toContain('Implements of Mercy');
    });

    it('does not hide Implements of Mercy behind featuresToIgnore', () => {
      const categories = getCategories('2024');
      expect(categories.featuresToIgnore).not.toContain('Implements of Mercy');
      expect(categories.characterAdvancement).toContain('Implements of Mercy');
    });
  });
});

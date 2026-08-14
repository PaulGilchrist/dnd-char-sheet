// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { getProficiencyChoiceCount } from './proficiencyUtils2024.js';

describe('proficiencyUtils2024', () => {
  describe('getProficiencyChoiceCount', () => {
    describe('class.skill_proficiency_choices parsing', () => {
      it('parses "Choose X" format with single digit', () => {
        const playerStats = {
          class: { skill_proficiency_choices: 'Choose 2' },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(2);
      });

      it('parses "Choose X" format with multi-digit number', () => {
        const playerStats = {
          class: { skill_proficiency_choices: 'Choose 10' },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(10);
      });

      it('handles extra whitespace around the number', () => {
        const playerStats = {
          class: { skill_proficiency_choices: 'Choose  3' },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(3);
      });

      it('returns 0 when skill_proficiency_choices is missing', () => {
        const playerStats = { class: {}, race: {} };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('returns 0 when skill_proficiency_choices is null', () => {
        const playerStats = { class: { skill_proficiency_choices: null }, race: {} };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('returns 0 when skill_proficiency_choices is empty string', () => {
        const playerStats = { class: { skill_proficiency_choices: '' }, race: {} };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('returns 0 for non-matching format', () => {
        const playerStats = {
          class: { skill_proficiency_choices: 'Choose two skills' },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('ignores skill_proficiency_choices when skills=false', () => {
        const playerStats = {
          class: { skill_proficiency_choices: 'Choose 5' },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(0);
      });
    });

    describe('race.starting_proficiency_options', () => {
      it('counts race starting_proficiency_options for skills when skills=true', () => {
        const playerStats = {
          class: {},
          race: {
            starting_proficiency_options: {
              choose: 2,
              from: ['Skill: Perception', 'Skill: Stealth'],
            },
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(2);
      });

      it('excludes race starting_proficiency_options non-skills when skills=true', () => {
        const playerStats = {
          class: {},
          race: {
            starting_proficiency_options: {
              choose: 2,
              from: ['Light Armor', 'Medium Armor'],
            },
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('counts race starting_proficiency_options for non-skills when skills=false', () => {
        const playerStats = {
          class: {},
          race: {
            starting_proficiency_options: {
              choose: 3,
              from: ['Heavy Armor', 'Martial Weapons', 'Shields'],
            },
          },
        };
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(3);
      });

      it('excludes race starting_proficiency_options skills when skills=false', () => {
        const playerStats = {
          class: {},
          race: {
            starting_proficiency_options: {
              choose: 2,
              from: ['Skill: Perception', 'Skill: Stealth'],
            },
          },
        };
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(0);
      });

      it('returns 0 when starting_proficiency_options is missing', () => {
        const playerStats = { class: {}, race: {} };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('returns 0 when starting_proficiency_options is null', () => {
        const playerStats = { class: {}, race: { starting_proficiency_options: null } };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('returns 0 when from array is empty', () => {
        const playerStats = {
          class: {},
          race: {
            starting_proficiency_options: {
              choose: 2,
              from: [],
            },
          },
        };
        // Accessing from[0] on empty array yields undefined, startsWith throws
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });
    });

    describe('race.traits proficiency choices', () => {
      it('counts race trait proficiency choices for skills', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: ['Skill: Survival'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(1);
      });

      it('excludes race trait non-skill choices when skills=true', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 2,
                  from: ['Heavy Armor', 'Martial Weapons'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('counts race trait non-skill choices when skills=false', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 2,
                  from: ['Heavy Armor', 'Martial Weapons'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(2);
      });

      it('handles race traits being null', () => {
        const playerStats = { class: {}, race: { traits: null } };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits being undefined', () => {
        const playerStats = { class: {}, race: { traits: undefined } };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits being empty array', () => {
        const playerStats = { class: {}, race: { traits: [] } };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits without proficiency_choices', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [{ name: 'Darkvision' }],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits with null proficiency_choices', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [{ proficiency_choices: null }],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits with undefined proficiency_choices', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [{ proficiency_choices: undefined }],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits with empty from array (skipped via guard)', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: [],
                },
              },
            ],
          },
        };
        // Source uses `pc.from && pc.from.length > 0` guard, so empty from is skipped
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits with missing from property (skipped via guard)', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                },
              },
            ],
          },
        };
        // Source uses `pc.from && pc.from.length > 0` guard, so missing from is skipped
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles race traits with undefined from[0]', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: [undefined],
                },
              },
            ],
          },
        };
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });

      it('sums choices from multiple race traits for skills', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: ['Skill: Survival'],
                },
              },
              {
                proficiency_choices: {
                  choose: 2,
                  from: ['Skill: Perception', 'Skill: Insight'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(3);
      });

      it('handles mixed skill/non-skill choices across multiple traits for skills', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 2,
                  from: ['Skill: Perception'],
                },
              },
              {
                proficiency_choices: {
                  choose: 3,
                  from: ['Heavy Armor', 'Martial Weapons'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(2);
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(3);
      });

      it('handles mixed skill/non-skill choices across multiple traits for non-skills', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 2,
                  from: ['Skill: Perception'],
                },
              },
              {
                proficiency_choices: {
                  choose: 3,
                  from: ['Heavy Armor', 'Martial Weapons'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(3);
      });

      it('handles choose=0 in race trait', () => {
        const playerStats = {
          class: {},
          race: {
            traits: [
              {
                proficiency_choices: {
                  choose: 0,
                  from: ['Skill: Survival'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });
    });

    describe('class.major proficiency choices (subclass)', () => {
      it('counts subclass proficiency_choices for skills', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [
                {
                  choose: 2,
                  from: ['Skill: History', 'Skill: Arcana'],
                },
              ],
            },
          },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(2);
      });

      it('excludes subclass non-skill choices when skills=true', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [
                {
                  choose: 2,
                  from: ['Heavy Armor', 'Martial Weapons'],
                },
              ],
            },
          },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('counts subclass non-skill choices when skills=false', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [
                {
                  choose: 2,
                  from: ['Heavy Armor', 'Martial Weapons'],
                },
              ],
            },
          },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(2);
      });

      it('handles class.major without proficiency_choices', () => {
        const playerStats = {
          class: { major: { name: 'Battle Master' } },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles class without major', () => {
        const playerStats = {
          class: { name: 'Fighter' },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles class.major being null', () => {
        const playerStats = {
          class: { major: null },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles class.major.proficiency_choices being empty array', () => {
        const playerStats = {
          class: { major: { proficiency_choices: [] } },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles class.major.proficiency_choices entry with empty from (skipped via guard)', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [{ choose: 1, from: [] }],
            },
          },
          race: {},
        };
        // Source uses `pc.from && pc.from.length > 0` guard, so empty from is skipped
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles class.major.proficiency_choices entry with missing from (skipped via guard)', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [{ choose: 1 }],
            },
          },
          race: {},
        };
        // Source uses `pc.from && pc.from.length > 0` guard, so missing from is skipped
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(0);
      });

      it('handles class.major.proficiency_choices entry with undefined from[0]', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [{ choose: 1, from: [undefined] }],
            },
          },
          race: {},
        };
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });

      it('sums choices from multiple subclass entries', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [
                { choose: 1, from: ['Skill: History'] },
                { choose: 2, from: ['Skill: Arcana', 'Skill: Nature'] },
              ],
            },
          },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(3);
      });

      it('handles multiple subclass entries with mixed skill/non-skill', () => {
        const playerStats = {
          class: {
            major: {
              proficiency_choices: [
                { choose: 1, from: ['Skill: History'] },
                { choose: 2, from: ['Heavy Armor', 'Martial Weapons'] },
              ],
            },
          },
          race: {},
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(1);
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(2);
      });
    });

    describe('combined sources', () => {
      it('sums choices from all sources combined for skills', () => {
        const playerStats = {
          class: {
            skill_proficiency_choices: 'Choose 2',
            major: {
              proficiency_choices: [
                {
                  choose: 1,
                  from: ['Skill: Insight'],
                },
              ],
            },
          },
          race: {
            starting_proficiency_options: {
              choose: 1,
              from: ['Skill: Survival'],
            },
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: ['Skill: Perception'],
                },
              },
            ],
          },
        };
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(5);
      });

      it('sums choices from all sources combined for non-skills', () => {
        const playerStats = {
          class: {
            skill_proficiency_choices: 'Choose 2',
            major: {
              proficiency_choices: [
                {
                  choose: 1,
                  from: ['Heavy Armor'],
                },
              ],
            },
          },
          race: {
            starting_proficiency_options: {
              choose: 1,
              from: ['Medium Armor'],
            },
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: ['Shields'],
                },
              },
            ],
          },
        };
        // class.skill_proficiency_choices is ignored for non-skills
        expect(getProficiencyChoiceCount(playerStats, false)).toBe(3);
      });

      it('only counts skill sources when skills=true even if non-skill sources exist', () => {
        const playerStats = {
          class: {
            skill_proficiency_choices: 'Choose 2',
            major: {
              proficiency_choices: [
                { choose: 1, from: ['Heavy Armor'] },
              ],
            },
          },
          race: {
            starting_proficiency_options: {
              choose: 1,
              from: ['Medium Armor'],
            },
            traits: [
              {
                proficiency_choices: {
                  choose: 1,
                  from: ['Shields'],
                },
              },
            ],
          },
        };
        // Only class.skill_proficiency_choices applies; all others are non-skill
        expect(getProficiencyChoiceCount(playerStats, true)).toBe(2);
      });
    });

    describe('default skills parameter', () => {
      it('defaults skills to true when not provided', () => {
        const playerStats = {
          class: { skill_proficiency_choices: 'Choose 3' },
          race: {},
        };
        // Without the second arg, should default to true and parse the class choice
        expect(getProficiencyChoiceCount(playerStats)).toBe(3);
      });

      it('defaults skills to true even when non-skill sources exist', () => {
        const playerStats = {
          class: {},
          race: {
            starting_proficiency_options: {
              choose: 2,
              from: ['Heavy Armor'],
            },
          },
        };
        expect(getProficiencyChoiceCount(playerStats)).toBe(0);
      });
    });

    describe('error handling', () => {
      it('throws when playerStats has no class property', () => {
        const playerStats = { race: {} };
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });

      it('throws when playerStats has no race property', () => {
        const playerStats = { class: {} };
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });

      it('throws when playerStats.class is undefined', () => {
        const playerStats = { class: undefined, race: {} };
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });

      it('throws when playerStats.race is undefined', () => {
        const playerStats = { class: {}, race: undefined };
        expect(() => getProficiencyChoiceCount(playerStats, true)).toThrow(TypeError);
      });
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { WIZARD_STEPS, getTotalSteps, getStepConfig } from './steps-config.js';

describe('steps-config', () => {
  describe('WIZARD_STEPS', () => {
    it('should have exactly 17 steps', () => {
      expect(WIZARD_STEPS.length).toBe(17);
    });

    it('should have steps numbered 1 through 17 with no gaps', () => {
      const stepNumbers = WIZARD_STEPS.map((step) => step.step);
      expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    it('should have unique step numbers', () => {
      const stepNumbers = WIZARD_STEPS.map((step) => step.step);
      const unique = new Set(stepNumbers);
      expect(unique.size).toBe(stepNumbers.length);
    });

    it('should have all required properties on each step', () => {
      for (const step of WIZARD_STEPS) {
        expect(step).toHaveProperty('step');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('component');
        expect(step).toHaveProperty('getProps');
        expect(typeof step.getProps).toBe('function');
      }
    });

    it('should have non-empty string titles for all steps', () => {
      for (const step of WIZARD_STEPS) {
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
      }
    });

    it('should have components that are defined', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.component).toBeDefined();
      }
    });

    it('should have steps in ascending order', () => {
      for (let i = 1; i < WIZARD_STEPS.length; i++) {
        expect(WIZARD_STEPS[i].step).toBe(WIZARD_STEPS[i - 1].step + 1);
      }
    });
  });

  describe('Step titles', () => {
    const expectedTitles = {
      1: 'Ruleset',
      2: 'Basic Information',
      3: 'Race',
      4: 'Subrace',
      5: 'Background',
      6: 'Class',
      7: 'Subclass / Major',
      8: 'Feats',
      9: 'Ability Scores',
      10: 'Skill Proficiencies',
      11: 'Tool Proficiencies',
      12: 'Languages & Fighting Styles',
      13: 'Resistances & Immunities',
      14: 'Spells',
      15: 'Magic Items',
      16: 'Inventory',
      17: 'Special Actions',
    };

    it('should have correct titles for all steps', () => {
      for (const [stepNum, expectedTitle] of Object.entries(expectedTitles)) {
        const step = getStepConfig(Number(stepNum));
        expect(step).toBeDefined();
        expect(step.title).toBe(expectedTitle);
      }
    });
  });

  describe('getTotalSteps', () => {
    it('should return the number of wizard steps', () => {
      expect(getTotalSteps()).toBe(17);
    });

    it('should match WIZARD_STEPS.length', () => {
      expect(getTotalSteps()).toBe(WIZARD_STEPS.length);
    });
  });

  describe('getStepConfig', () => {
    it('should return config for all valid step numbers 1-17', () => {
      for (let i = 1; i <= 17; i++) {
        const step = getStepConfig(i);
        expect(step).toBeDefined();
        expect(step.step).toBe(i);
      }
    });

    it('should return undefined for invalid step numbers', () => {
      expect(getStepConfig(0)).toBeUndefined();
      expect(getStepConfig(-1)).toBeUndefined();
      expect(getStepConfig(18)).toBeUndefined();
      expect(getStepConfig(100)).toBeUndefined();
    });

    it('should return undefined for non-numeric input', () => {
      expect(getStepConfig(null)).toBeUndefined();
      expect(getStepConfig(undefined)).toBeUndefined();
      expect(getStepConfig('1')).toBeUndefined();
    });

    it('should return the same object reference for repeated calls', () => {
      const config1 = getStepConfig(1);
      const config2 = getStepConfig(1);
      expect(config1).toBe(config2);
    });


  });

  describe('getProps functions', () => {
    describe('Step 1 - Ruleset getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(1);
        const mockFn = vi.fn();
        const errors = { ruleset: 'Invalid ruleset' };
        const props = step.getProps({
          ruleset: '5e',
          errors,
          onRulesetChange: mockFn,
        });
        expect(props).toEqual({
          ruleset: '5e',
          errors,
          onRulesetChange: mockFn,
        });
      });

      it('should handle 2024 ruleset', () => {
        const step = getStepConfig(1);
        const props = step.getProps({
          ruleset: '2024',
          errors: {},
          onRulesetChange: vi.fn(),
        });
        expect(props.ruleset).toBe('2024');
      });
    });

    describe('Step 2 - Basic Information getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(2);
        const props = step.getProps({
          formData: { name: 'Test' },
          errors: {},
          backgrounds: [{ name: 'Acolyte' }],
          ruleset: '5e',
          campaignName: 'test',
          onInputChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: { name: 'Test' },
          errors: {},
          backgrounds: [{ name: 'Acolyte' }],
          ruleset: '5e',
          campaignName: 'test',
          onInputChange: expect.any(Function),
        });
      });
    });

    describe('Step 3 - Race getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(3);
        const props = step.getProps({
          formData: { race: { name: 'Human' } },
          errors: {},
          allRacesData: [{ name: 'Human' }],
          racesData: [{ name: 'Human' }],
          ruleset: '5e',
          onInputChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: { race: { name: 'Human' } },
          errors: {},
          allRacesData: [{ name: 'Human' }],
          racesData: [{ name: 'Human' }],
          ruleset: '5e',
          onInputChange: expect.any(Function),
        });
      });
    });

    describe('Step 4 - Subrace getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(4);
        const props = step.getProps({
          formData: { race: { name: 'Dragonborn', subrace: { name: 'Red' } } },
          errors: {},
          allRacesData: [{ name: 'Dragonborn' }],
          racesData: [{ name: 'Dragonborn' }],
          ruleset: '5e',
          onInputChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: { race: { name: 'Dragonborn', subrace: { name: 'Red' } } },
          errors: {},
          allRacesData: [{ name: 'Dragonborn' }],
          racesData: [{ name: 'Dragonborn' }],
          ruleset: '5e',
          onInputChange: expect.any(Function),
        });
      });
    });

    describe('Step 5 - Background getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(5);
        const props = step.getProps({
          formData: { background: 'Acolyte' },
          errors: {},
          backgrounds: [{ name: 'Acolyte' }],
          ruleset: '2024',
          onInputChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: { background: 'Acolyte' },
          errors: {},
          backgrounds: [{ name: 'Acolyte' }],
          ruleset: '2024',
          onInputChange: expect.any(Function),
        });
      });
    });

    describe('Step 6 - Class getProps', () => {
      it('should pass through all input props including classSubtypes', () => {
        const step = getStepConfig(6);
        const props = step.getProps({
          formData: { class: { name: 'Fighter' } },
          errors: {},
          allClassesData: [{ name: 'Fighter' }],
          classSubtypes: [{ className: 'Fighter', subtypes: [{ name: 'Battle Master' }] }],
          ruleset: '5e',
          onInputChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: { class: { name: 'Fighter' } },
          errors: {},
          allClassesData: [{ name: 'Fighter' }],
          classSubtypes: [{ className: 'Fighter', subtypes: [{ name: 'Battle Master' }] }],
          ruleset: '5e',
          onInputChange: expect.any(Function),
        });
      });
    });

    describe('Step 7 - Subclass / Major getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(7);
        const props = step.getProps({
          formData: { class: { name: 'Fighter', subclass: { name: 'Battle Master' } } },
          errors: {},
          classSubtypes: [{ className: 'Fighter', subtypes: [{ name: 'Battle Master' }] }],
          ruleset: '5e',
          onInputChange: vi.fn(),
          allClassesData: [{ name: 'Fighter' }],
        });
        expect(props).toEqual({
          formData: { class: { name: 'Fighter', subclass: { name: 'Battle Master' } } },
          errors: {},
          classSubtypes: [{ className: 'Fighter', subtypes: [{ name: 'Battle Master' }] }],
          ruleset: '5e',
          onInputChange: expect.any(Function),
          allClassesData: [{ name: 'Fighter' }],
        });
      });
    });

    describe('Step 8 - Feats getProps', () => {
      it('should pass through all input props including computedBuffs', () => {
        const step = getStepConfig(8);
        const props = step.getProps({
          formData: {},
          allFeats: [{ name: 'Great Weapon Master' }],
          onArrayFieldChange: vi.fn(),
          preSelectedFeats: [],
          computedBuffs: { str: { value: 1 } },
        });
        expect(props).toEqual({
          formData: {},
          allFeats: [{ name: 'Great Weapon Master' }],
          onArrayFieldChange: expect.any(Function),
          preSelectedFeats: [],
          computedBuffs: { str: { value: 1 } },
        });
      });
    });

    describe('Step 9 - Ability Scores getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(9);
        const props = step.getProps({
          formData: {},
          errors: {},
          onAbilityBaseScoreChange: vi.fn(),
          onAbilityMiscIncreaseChange: vi.fn(),
          updateBackgroundIncrease: vi.fn(),
          backgroundAbilityNames: ['Strength'],
          backgroundAbilityAssignments: {},
          backgroundValidationWarnings: {},
          allFeats: [],
          featAbilityChoices: {},
          featAbilityAssignments: {},
          handleFeatAbilityChoice: vi.fn(),
        });
        expect(props).toEqual({
          formData: {},
          errors: {},
          onAbilityBaseScoreChange: expect.any(Function),
          onAbilityMiscIncreaseChange: expect.any(Function),
          onBackgroundIncreaseChange: expect.any(Function),
          backgroundAbilityChoices: ['Strength'],
          backgroundAbilityAssignments: {},
          backgroundValidationWarnings: {},
          allFeats: [],
          featAbilityChoices: {},
          featAbilityAssignments: {},
          onFeatAbilityChoiceChange: expect.any(Function),
        });
      });

      it('should map updateBackgroundIncrease to onBackgroundIncreaseChange', () => {
        const step = getStepConfig(9);
        const mockFn = vi.fn();
        const props = step.getProps({
          updateBackgroundIncrease: mockFn,
        });
        expect(props.onBackgroundIncreaseChange).toBe(mockFn);
      });

      it('should map handleFeatAbilityChoice to onFeatAbilityChoiceChange', () => {
        const step = getStepConfig(9);
        const mockFn = vi.fn();
        const props = step.getProps({
          handleFeatAbilityChoice: mockFn,
        });
        expect(props.onFeatAbilityChoiceChange).toBe(mockFn);
      });

      it('should map backgroundAbilityNames to backgroundAbilityChoices', () => {
        const step = getStepConfig(9);
        const names = ['Dexterity', 'Constitution'];
        const props = step.getProps({
          backgroundAbilityNames: names,
        });
        expect(props.backgroundAbilityChoices).toBe(names);
      });

      it('should pass through onFeatAbilityModeChange and racesData', () => {
        const step = getStepConfig(9);
        const modeFn = vi.fn();
        const races = [{ name: 'Human' }];
        const props = step.getProps({
          onFeatAbilityModeChange: modeFn,
          racesData: races,
        });
        expect(props.onFeatAbilityModeChange).toBe(modeFn);
        expect(props.racesData).toBe(races);
      });
    });

    describe('Step 10 - Skill Proficiencies getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(10);
        const props = step.getProps({
          formData: {},
          errors: {},
          onSkillToggle: vi.fn(),
          onSkillExpertiseToggle: vi.fn(),
          skillLimits: {},
          expertiseLimits: {},
          warnings: [],
          preSelectedSkills: [],
        });
        expect(props).toEqual({
          formData: {},
          errors: {},
          onSkillToggle: expect.any(Function),
          onSkillExpertiseToggle: expect.any(Function),
          skillLimits: {},
          expertiseLimits: {},
          warnings: [],
          preSelectedSkills: [],
        });
      });
    });

    describe('Step 11 - Tool Proficiencies getProps', () => {
      it('should pass through all input props including skillLimits', () => {
        const step = getStepConfig(11);
        const props = step.getProps({
          formData: {},
          errors: {},
          onToolToggle: vi.fn(),
          toolLimits: {},
          toolWarnings: [],
          preSelectedTools: [],
          skillLimits: {},
        });
        expect(props).toEqual({
          formData: {},
          errors: {},
          onToolToggle: expect.any(Function),
          toolLimits: {},
          toolWarnings: [],
          preSelectedTools: [],
          skillLimits: {},
        });
      });
    });

    describe('Step 12 - Languages & Fighting Styles getProps', () => {
      it('should map languageWarnings to warnings', () => {
        const step = getStepConfig(12);
        const mockWarnings = ['Too many languages'];
        const props = step.getProps({
          formData: {},
          errors: {},
          onLanguageToggle: vi.fn(),
          onFightingStyleToggle: vi.fn(),
          languageLimits: {},
          fightingStyleLimits: {},
          languageWarnings: mockWarnings,
          preSelectedLanguages: [],
          preSelectedFightingStyles: [],
        });
        expect(props.warnings).toBe(mockWarnings);
        expect(props).toHaveProperty('preSelectedLanguages');
        expect(props).toHaveProperty('preSelectedFightingStyles');
      });
    });

    describe('Step 13 - Resistances & Immunities getProps', () => {
      it('should map resistanceWarnings to warnings', () => {
        const step = getStepConfig(13);
        const mockWarnings = ['Too many resistances'];
        const props = step.getProps({
          formData: {},
          onResistanceToggle: vi.fn(),
          onImmunityToggle: vi.fn(),
          resistanceWarnings: mockWarnings,
          preSelectedResistances: [],
          preSelectedImmunities: [],
        });
        expect(props.warnings).toBe(mockWarnings);
        expect(props).toHaveProperty('preSelectedResistances');
        expect(props).toHaveProperty('preSelectedImmunities');
      });
    });

    describe('Step 14 - Spells getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(14);
        const props = step.getProps({
          formData: {},
          allSpells: [{ name: 'Fireball' }],
          onArrayFieldChange: vi.fn(),
          preSelectedSpells: [],
        });
        expect(props).toEqual({
          formData: {},
          allSpells: [{ name: 'Fireball' }],
          onArrayFieldChange: expect.any(Function),
          preSelectedSpells: [],
        });
      });
    });

    describe('Step 15 - Magic Items getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(15);
        const props = step.getProps({
          formData: {},
          allMagicItems: [{ name: 'Ring of Protection' }],
          ruleset: '5e',
          classSubtypes: [],
          onArrayFieldChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: {},
          allMagicItems: [{ name: 'Ring of Protection' }],
          ruleset: '5e',
          classSubtypes: [],
          onArrayFieldChange: expect.any(Function),
        });
      });
    });

    describe('Step 16 - Inventory getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(16);
        const props = step.getProps({
          formData: {},
          tempInventory: [],
          onInventoryChange: vi.fn(),
          onTempInventoryChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: {},
          tempInventory: [],
          onInventoryChange: expect.any(Function),
          onTempInventoryChange: expect.any(Function),
        });
      });
    });

    describe('Step 17 - Special Actions getProps', () => {
      it('should pass through all input props', () => {
        const step = getStepConfig(17);
        const props = step.getProps({
          formData: {},
          onArrayFieldChange: vi.fn(),
        });
        expect(props).toEqual({
          formData: {},
          onArrayFieldChange: expect.any(Function),
        });
      });
    });
  });
});

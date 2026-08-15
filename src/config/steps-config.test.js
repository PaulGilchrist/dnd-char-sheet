// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { WIZARD_STEPS, getTotalSteps, getStepConfig } from './steps-config.js';

const isRenderableComponent = (value) =>
  typeof value === 'function' ||
  (typeof value === 'object' &&
    value !== null &&
    (typeof value.type === 'function' || typeof value.render === 'function'));

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

describe('steps-config', () => {
  describe('WIZARD_STEPS integrity', () => {
    it('numbers steps contiguously from 1 with no gaps or duplicates', () => {
      const stepNumbers = WIZARD_STEPS.map((step) => step.step);
      expect(stepNumbers).toEqual(
        Array.from({ length: stepNumbers.length }, (_, i) => i + 1)
      );
    });

    it('uses a distinct component for every step', () => {
      const components = WIZARD_STEPS.map((step) => step.component);
      expect(new Set(components).size).toBe(components.length);
    });

    it('declares step, title, component, and getProps on every step', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.step).toBeTypeOf('number');
        expect(step.title).toBeTypeOf('string');
        expect(step.title.length).toBeGreaterThan(0);
        expect(isRenderableComponent(step.component)).toBe(true);
        expect(step.getProps).toBeTypeOf('function');
      }
    });
  });

  describe('step titles', () => {
    it('assigns the expected title to every step', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.title).toBe(expectedTitles[step.step]);
      }
    });

    it('defines a title for every configured step number', () => {
      expect(Object.keys(expectedTitles).map(Number)).toEqual(
        WIZARD_STEPS.map((step) => step.step)
      );
    });
  });

  describe('getTotalSteps', () => {
    it('equals the number of configured steps', () => {
      expect(getTotalSteps()).toBe(WIZARD_STEPS.length);
    });

    it('is consistent with getStepConfig across the full range', () => {
      for (let step = 1; step <= getTotalSteps(); step++) {
        expect(getStepConfig(step)).toBeDefined();
      }
    });
  });

  describe('getStepConfig', () => {
    it('returns the matching config for any valid step number', () => {
      for (const step of WIZARD_STEPS) {
        expect(getStepConfig(step.step)).toBe(step);
      }
    });

    it('returns undefined for out-of-range step numbers', () => {
      expect(getStepConfig(0)).toBeUndefined();
      expect(getStepConfig(-1)).toBeUndefined();
      expect(getStepConfig(getTotalSteps() + 1)).toBeUndefined();
      expect(getStepConfig(100)).toBeUndefined();
    });

    it('returns undefined for non-numeric input', () => {
      for (const input of [null, undefined, '', '1', 1.5, NaN, true, false, {}]) {
        expect(getStepConfig(input)).toBeUndefined();
      }
    });

    it('returns a stable config reference across repeated lookups', () => {
      for (const step of WIZARD_STEPS) {
        expect(getStepConfig(step.step)).toBe(getStepConfig(step.step));
      }
    });
  });

  describe('getProps contracts', () => {
    const stepInputs = {
      1: { ruleset: '5e', errors: {}, onRulesetChange: () => {} },
      2: {
        formData: { name: 'Test' },
        errors: {},
        backgrounds: [{ name: 'Acolyte' }],
        ruleset: '5e',
        campaignName: 'test-campaign',
        onInputChange: () => {},
      },
      3: {
        formData: { race: { name: 'Human' } },
        errors: {},
        allRacesData: [{ name: 'Human' }],
        racesData: [{ name: 'Human' }],
        ruleset: '5e',
        onInputChange: () => {},
      },
      4: {
        formData: { race: { name: 'Dragonborn', subrace: { name: 'Red' } } },
        errors: {},
        allRacesData: [{ name: 'Dragonborn' }],
        racesData: [{ name: 'Dragonborn' }],
        ruleset: '5e',
        onInputChange: () => {},
      },
      5: {
        formData: { background: 'Acolyte' },
        errors: {},
        backgrounds: [{ name: 'Acolyte' }],
        ruleset: '2024',
        onInputChange: () => {},
      },
      6: {
        formData: { class: { name: 'Fighter' } },
        errors: {},
        allClassesData: [{ name: 'Fighter' }],
        classSubtypes: [{ className: 'Fighter', subtypes: [{ name: 'Battle Master' }] }],
        ruleset: '5e',
        onInputChange: () => {},
      },
      7: {
        formData: { class: { name: 'Fighter', subclass: { name: 'Battle Master' } } },
        errors: {},
        classSubtypes: [{ className: 'Fighter', subtypes: [{ name: 'Battle Master' }] }],
        ruleset: '5e',
        onInputChange: () => {},
        allClassesData: [{ name: 'Fighter' }],
      },
      8: {
        formData: {},
        allFeats: [{ name: 'Great Weapon Master' }],
        onArrayFieldChange: () => {},
        preSelectedFeats: [],
        computedBuffs: { str: { value: 1 } },
      },
      9: {
        formData: {},
        errors: {},
        onAbilityBaseScoreChange: () => {},
        onAbilityMiscIncreaseChange: () => {},
        updateBackgroundIncrease: () => {},
        backgroundAbilityNames: ['Strength'],
        backgroundAbilityAssignments: {},
        backgroundValidationWarnings: {},
        allFeats: [],
        featAbilityChoices: {},
        featAbilityAssignments: {},
        handleFeatAbilityChoice: () => {},
        onFeatAbilityModeChange: () => {},
        racesData: [{ name: 'Human' }],
      },
      10: {
        formData: {},
        errors: {},
        onSkillToggle: () => {},
        onSkillExpertiseToggle: () => {},
        skillLimits: {},
        expertiseLimits: {},
        warnings: [],
        preSelectedSkills: [],
      },
      11: {
        formData: {},
        errors: {},
        onToolToggle: () => {},
        toolLimits: {},
        toolWarnings: [],
        preSelectedTools: [],
        skillLimits: {},
      },
      12: {
        formData: {},
        errors: {},
        onLanguageToggle: () => {},
        onFightingStyleToggle: () => {},
        languageLimits: {},
        fightingStyleLimits: {},
        languageWarnings: [],
        preSelectedLanguages: [],
        preSelectedFightingStyles: [],
      },
      13: {
        formData: {},
        onResistanceToggle: () => {},
        onImmunityToggle: () => {},
        resistanceWarnings: [],
        preSelectedResistances: [],
        preSelectedImmunities: [],
      },
      14: {
        formData: {},
        allSpells: [{ name: 'Fireball' }],
        onArrayFieldChange: () => {},
        preSelectedSpells: [],
      },
      15: {
        formData: {},
        allMagicItems: [{ name: 'Ring of Protection' }],
        ruleset: '5e',
        classSubtypes: [],
        onArrayFieldChange: () => {},
      },
      16: {
        formData: {},
        tempInventory: [],
        onInventoryChange: () => {},
        onTempInventoryChange: () => {},
      },
      17: {
        formData: {},
        onArrayFieldChange: () => {},
      },
    };

    const stepRenames = {
      9: {
        updateBackgroundIncrease: 'onBackgroundIncreaseChange',
        backgroundAbilityNames: 'backgroundAbilityChoices',
        handleFeatAbilityChoice: 'onFeatAbilityChoiceChange',
      },
      12: { languageWarnings: 'warnings' },
      13: { resistanceWarnings: 'warnings' },
    };

    for (const [stepNumber, input] of Object.entries(stepInputs)) {
      it(`step ${stepNumber} maps wizard inputs to ${expectedTitles[Number(stepNumber)]} props`, () => {
        const renames = stepRenames[stepNumber] ?? {};
        const outputToInput = Object.fromEntries(
          Object.entries(renames).map(([from, to]) => [to, from])
        );
        const props = getStepConfig(Number(stepNumber)).getProps(input);

        for (const key of Object.keys(input)) {
          const outputKey = renames[key] ?? key;
          expect(props[outputKey]).toBe(input[key]);
        }

        for (const outputKey of Object.keys(props)) {
          const sourceKey = outputToInput[outputKey] ?? outputKey;
          expect(input).toHaveProperty(sourceKey);
        }
      });
    }

    it('renames updateBackgroundIncrease, backgroundAbilityNames, and handleFeatAbilityChoice on step 9', () => {
      const step = getStepConfig(9);
      const updateBackgroundIncrease = () => {};
      const handleFeatAbilityChoice = () => {};
      const backgroundAbilityNames = ['Strength', 'Dexterity'];
      const props = step.getProps({ updateBackgroundIncrease, handleFeatAbilityChoice, backgroundAbilityNames });

      expect(props.onBackgroundIncreaseChange).toBe(updateBackgroundIncrease);
      expect(props.onFeatAbilityChoiceChange).toBe(handleFeatAbilityChoice);
      expect(props.backgroundAbilityChoices).toBe(backgroundAbilityNames);
    });

    it('maps languageWarnings to warnings on step 12', () => {
      const step = getStepConfig(12);
      const warnings = ['Too many languages'];
      expect(step.getProps({ languageWarnings: warnings }).warnings).toBe(warnings);
    });

    it('maps resistanceWarnings to warnings on step 13', () => {
      const step = getStepConfig(13);
      const warnings = ['Too many resistances'];
      expect(step.getProps({ resistanceWarnings: warnings }).warnings).toBe(warnings);
    });
  });
});

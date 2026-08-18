// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { WIZARD_STEPS, getTotalSteps, getStepConfig } from './steps-config.js';

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
    it('has 17 numbered steps contiguously from 1 with no gaps or duplicates', () => {
      expect(WIZARD_STEPS).toHaveLength(17);
      const stepNumbers = WIZARD_STEPS.map((step) => step.step);
      expect(stepNumbers).toEqual(
        Array.from({ length: stepNumbers.length }, (_, i) => i + 1)
      );
    });

    it('uses a distinct component for every step', () => {
      const components = WIZARD_STEPS.map((step) => step.component);
      expect(new Set(components).size).toBe(components.length);
    });

    it('defines step (number), title (non-empty string), component (renderable), and getProps (function) on every step', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.step).toBeTypeOf('number');
        expect(step.title).toBeTypeOf('string');
        expect(step.title.length).toBeGreaterThan(0);
        const isRenderable = typeof step.component === 'function' ||
          (typeof step.component === 'object' && step.component !== null && typeof step.component.type === 'function');
        expect(isRenderable).toBe(true);
        expect(step.getProps).toBeTypeOf('function');
      }
    });
  });

  describe('step titles', () => {
    it('assigns the expected title to every step', () => {
      for (const step of WIZARD_STEPS) {
        expect(`${step.step}: ${step.title}`).toBe(`${step.step}: ${expectedTitles[step.step]}`);
      }
    });
  });

  describe('getTotalSteps', () => {
    it('returns the number of steps in WIZARD_STEPS', () => {
      expect(getTotalSteps()).toBe(WIZARD_STEPS.length);
    });
  });

  describe('getStepConfig', () => {
    it('returns the matching config by reference for every valid step number', () => {
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

    it('returns undefined for non-numeric and string inputs', () => {
      for (const input of [null, undefined, '', '1', 'abc', 1.5, NaN, true, false, {}]) {
        expect(getStepConfig(input)).toBeUndefined();
      }
    });
  });

  describe('getProps contracts', () => {
    const stepInputs = {
      1: { ruleset: '5e', errors: {}, onRulesetChange: () => {} },
      2: { formData: { name: 'Test' }, errors: {}, backgrounds: [], ruleset: '5e', campaignName: 'test', onInputChange: () => {} },
      3: { formData: {}, errors: {}, allRacesData: [], racesData: [], ruleset: '5e', onInputChange: () => {} },
      4: { formData: {}, errors: {}, allRacesData: [], racesData: [], ruleset: '5e', onInputChange: () => {} },
      5: { formData: {}, errors: {}, backgrounds: [], ruleset: '5e', onInputChange: () => {} },
      6: { formData: {}, errors: {}, allClassesData: [], classSubtypes: [], ruleset: '5e', onInputChange: () => {} },
      7: { formData: {}, errors: {}, classSubtypes: [], ruleset: '5e', onInputChange: () => {}, allClassesData: [] },
      8: { formData: {}, allFeats: [], onArrayFieldChange: () => {}, preSelectedFeats: [], computedBuffs: {} },
      9: { formData: {}, errors: {}, onAbilityBaseScoreChange: () => {}, onAbilityMiscIncreaseChange: () => {}, updateBackgroundIncrease: () => {}, backgroundAbilityNames: [], backgroundAbilityAssignments: {}, backgroundValidationWarnings: {}, allFeats: [], featAbilityChoices: {}, featAbilityAssignments: {}, handleFeatAbilityChoice: () => {}, onFeatAbilityModeChange: () => {}, racesData: [] },
      10: { formData: {}, errors: {}, onSkillToggle: () => {}, onSkillExpertiseToggle: () => {}, skillLimits: {}, expertiseLimits: {}, warnings: [], preSelectedSkills: [] },
      11: { formData: {}, errors: {}, onToolToggle: () => {}, toolLimits: {}, toolWarnings: [], preSelectedTools: [], skillLimits: {} },
      12: { formData: {}, errors: {}, onLanguageToggle: () => {}, onFightingStyleToggle: () => {}, languageLimits: {}, fightingStyleLimits: {}, languageWarnings: [], preSelectedLanguages: [], preSelectedFightingStyles: [] },
      13: { formData: {}, onResistanceToggle: () => {}, onImmunityToggle: () => {}, resistanceWarnings: [], preSelectedResistances: [], preSelectedImmunities: [] },
      14: { formData: {}, allSpells: [], onArrayFieldChange: () => {}, preSelectedSpells: [] },
      15: { formData: {}, allMagicItems: [], ruleset: '5e', classSubtypes: [], onArrayFieldChange: () => {} },
      16: { formData: {}, tempInventory: [], onInventoryChange: () => {}, onTempInventoryChange: () => {} },
      17: { formData: {}, onArrayFieldChange: () => {} },
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
      it(`step ${stepNumber} getProps maps input keys to output keys correctly`, () => {
        const renames = stepRenames[Number(stepNumber)] ?? {};
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
  });
});

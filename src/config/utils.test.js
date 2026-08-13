import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dataLoader from '../services/ui/dataLoader.js';

const mockValidationRules = {
  level_range: { min: 1, max: 20 },
  point_buy: {
    total_points: 27,
    min_base_score: 8,
    max_base_score: 15,
    max_total_score: 20,
    max_total_score_level_20: 24,
    costs: { '8': 0, '9': 1, '10': 2, '11': 3, '12': 4, '13': 5, '14': 7, '15': 9 }
  },
  ability_score_max: { standard: 20, level_20: 24 }
};

describe('character-creation/utils', () => {
  describe('getPointBuyCosts', () => {
    beforeEach(() => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(mockValidationRules);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns costs from loaded rules', async () => {
      const utils = await import('./utils.js');
      const costs = await utils.getPointBuyCosts('5e');
      expect(costs).toEqual(mockValidationRules.point_buy.costs);
    });

    it('falls back to default costs when rules lack point_buy.costs', async () => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue({});
      const utils = await import('./utils.js');
      const costs = await utils.getPointBuyCosts('5e');
      expect(costs).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
    });
  });

  describe('getPointBuyCostsSync', () => {
    it('returns default costs when cache is empty', async () => {
      vi.spyOn(dataLoader, 'getCachedPointBuyCosts').mockReturnValue(null);
      const utils = await import('./utils.js');
      const costs = utils.getPointBuyCostsSync('5e');
      expect(costs).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
    });

    it('returns cached costs when available', async () => {
      const cachedCosts = { '8': 0, '9': 1, '10': 2, '11': 3, '12': 4, '13': 5, '14': 6, '15': 8 };
      vi.spyOn(dataLoader, 'getCachedPointBuyCosts').mockReturnValue(cachedCosts);
      const utils = await import('./utils.js');
      const costs = utils.getPointBuyCostsSync('5e');
      expect(costs).toEqual(cachedCosts);
    });
  });

  describe('validateFinalFormData', () => {
    let utils;

    beforeEach(async () => {
      utils = await import('./utils.js');
    });

    it('returns no errors when all required fields are present', () => {
      const formData = {
        name: 'Test Character',
        level: 1,
        alignment: 'Lawful Good',
        race: { name: 'Human' },
        class: { name: 'Wizard' },
        expertSkills: []
      };
      expect(utils.validateFinalFormData(formData)).toEqual({});
    });

    it('returns an error when name is absent or whitespace-only', () => {
      expect(utils.validateFinalFormData({
        level: 1,
        alignment: 'Lawful Good',
        race: { name: 'Human' },
        class: { name: 'Wizard' },
        expertSkills: []
      })).toHaveProperty('name');

      expect(utils.validateFinalFormData({
        name: '   ',
        level: 1,
        alignment: 'Lawful Good',
        race: { name: 'Human' },
        class: { name: 'Wizard' },
        expertSkills: []
      })).toHaveProperty('name');
    });

    it('returns errors for absent required fields', () => {
      const errors = utils.validateFinalFormData({});
      const expectedFields = ['name', 'level', 'alignment', 'race', 'class', 'expertSkills'];
      expectedFields.forEach(field => {
        expect(errors).toHaveProperty(field);
      });
    });

    it('skips abilities, inventory, and skillProficiencies from validation', () => {
      const errors = utils.validateFinalFormData({
        name: 'Test',
        level: 1,
        alignment: 'Good',
        race: { name: 'Human' },
        class: { name: 'Wizard' },
        expertSkills: [],
        abilities: [],
        inventory: {},
        skillProficiencies: []
      });
      expect(errors).not.toHaveProperty('abilities');
      expect(errors).not.toHaveProperty('inventory');
      expect(errors).not.toHaveProperty('skillProficiencies');
    });

    it('rejects falsy values for required fields', () => {
      const errors = utils.validateFinalFormData({
        name: undefined,
        level: null,
        alignment: '',
        race: null,
        class: undefined,
        expertSkills: null
      });
      expect(errors).toHaveProperty('name');
      expect(errors).toHaveProperty('level');
      expect(errors).toHaveProperty('alignment');
      expect(errors).toHaveProperty('race');
      expect(errors).toHaveProperty('class');
      expect(errors).toHaveProperty('expertSkills');
    });
  });

  describe('validateLevel', () => {
    let utils;

    beforeEach(async () => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(mockValidationRules);
      utils = await import('./utils.js');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns no errors for valid levels at boundaries and mid-range', async () => {
      expect(await utils.validateLevel(1, '5e')).toEqual({});
      expect(await utils.validateLevel(10, '5e')).toEqual({});
      expect(await utils.validateLevel(20, '5e')).toEqual({});
    });

    it('returns an error for out-of-range levels', async () => {
      expect((await utils.validateLevel(0, '5e')).level).toBeDefined();
      expect((await utils.validateLevel(21, '5e')).level).toBeDefined();
    });

    it('returns an error for falsy level values', async () => {
      expect((await utils.validateLevel(null, '5e')).level).toBeDefined();
      expect((await utils.validateLevel(undefined, '5e')).level).toBeDefined();
      expect((await utils.validateLevel(0, '5e')).level).toBeDefined();
      expect((await utils.validateLevel('', '5e')).level).toBeDefined();
    });

    it('respects custom min/max from validation rules', async () => {
      const customRules = {
        level_range: { min: 1, max: 10 },
        point_buy: {},
        ability_score_max: {}
      };
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(customRules);
      const utils2 = await import('./utils.js');
      expect((await utils2.validateLevel(11, '5e')).level).toBeDefined();
      expect(await utils2.validateLevel(10, '5e')).toEqual({});
    });

    it('uses defaults when level_range is missing from rules', async () => {
      const noRangeRules = { point_buy: {}, ability_score_max: {} };
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(noRangeRules);
      const utils2 = await import('./utils.js');
      expect(await utils2.validateLevel(1, '5e')).toEqual({});
      expect((await utils2.validateLevel(21, '5e')).level).toBeDefined();
    });
  });

  describe('validateAbility', () => {
    let utils;

    beforeEach(async () => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(mockValidationRules);
      utils = await import('./utils.js');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns no errors for valid base scores', async () => {
      expect(await utils.validateAbility({ baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1)).toEqual({});
    });

    it('returns no errors for boundary base scores', async () => {
      const minScore = await utils.validateAbility({ baseScore: 8, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(minScore).toEqual({});

      const maxScore = await utils.validateAbility({ baseScore: 15, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(maxScore).toEqual({});
    });

    it('returns an error when baseScore is below the allowed range', async () => {
      expect((await utils.validateAbility({ baseScore: 7, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1)).baseScore).toBeDefined();
    });

    it('returns an error when baseScore exceeds the point buy max', async () => {
      expect((await utils.validateAbility({ baseScore: 16, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1)).baseScore).toBeDefined();
    });

    it('returns an error when totalScore exceeds the level-1 maximum of 20', async () => {
      const errors = await utils.validateAbility({ baseScore: 15, featIncrease: 6, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(errors).toHaveProperty('totalScore');
    });

    it('allows a higher totalScore max at level 20', async () => {
      const errors = await utils.validateAbility({ baseScore: 15, featIncrease: 5, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 20);
      expect(errors).not.toHaveProperty('totalScore');
    });

    it('accounts for featIncrease and backgroundIncrease in total score', async () => {
      const errors = await utils.validateAbility({ baseScore: 15, featIncrease: 6, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(errors).toHaveProperty('totalScore');
    });

    it('returns an error for negative miscIncrease', async () => {
      expect((await utils.validateAbility({ baseScore: 10, featIncrease: 0, miscIncrease: -1, backgroundIncrease: 0 }, 0, '5e', 1)).miscIncrease).toBeDefined();
    });

    it('coerces string baseScore to number via parseInt', async () => {
      const errors = await utils.validateAbility({ baseScore: '10', featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(errors).toEqual({});
    });

    it('treats missing/NaN values as defaults (baseScore=8, increases=0)', async () => {
      const errors = await utils.validateAbility({ baseScore: 'invalid', featIncrease: 'x', miscIncrease: 'y', backgroundIncrease: 'z' }, 0, '5e', 1);
      expect(errors).toEqual({});
    });

    it('uses custom min/max from validation rules', async () => {
      const customRules = {
        level_range: { min: 1, max: 20 },
        point_buy: { min_base_score: 10, max_base_score: 14, max_total_score: 18 },
        ability_score_max: {}
      };
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(customRules);
      const utils2 = await import('./utils.js');

      const baseErrors = await utils2.validateAbility({ baseScore: 9, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(baseErrors).toHaveProperty('baseScore');

      const totalErrors = await utils2.validateAbility({ baseScore: 14, featIncrease: 0, miscIncrease: 5, backgroundIncrease: 0 }, 0, '5e', 1);
      expect(totalErrors).toHaveProperty('totalScore');
    });
  });

  describe('validateStep', () => {
    let utils;

    beforeEach(async () => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(mockValidationRules);
      utils = await import('./utils.js');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('Step 2: Basic Information', () => {
      it('returns an error when name is missing or whitespace-only', async () => {
        let errors = await utils.validateStep(2, { level: 1, alignment: 'Good' }, {}, [], [], '5e');
        expect(errors).toHaveProperty('name');
        errors = await utils.validateStep(2, { name: '   ', level: 1, alignment: 'Good' }, {}, [], [], '5e');
        expect(errors).toHaveProperty('name');
      });

      it('returns an error when alignment is missing', async () => {
        const formData = { name: 'Test', level: 1 };
        const errors = await utils.validateStep(2, formData, {}, [], [], '5e');
        expect(errors).toHaveProperty('alignment');
      });

      it('returns an error when level is missing', async () => {
        const formData = { name: 'Test', alignment: 'Good' };
        const errors = await utils.validateStep(2, formData, {}, [], [], '5e');
        expect(errors).toHaveProperty('level');
      });

      it('returns no errors when all required fields are present for 5e', async () => {
        const formData = { name: 'Test', level: 1, alignment: 'Good' };
        const errors = await utils.validateStep(2, formData, {}, [], [], '5e');
        expect(errors).toEqual({});
      });

      it('passes through existing errors', async () => {
        const existingErrors = { custom: 'existing error' };
        const formData = { name: 'Test', level: 1, alignment: 'Good' };
        const errors = await utils.validateStep(2, formData, existingErrors, [], [], '5e');
        expect(errors).toEqual({});
      });
    });

    describe('Step 3: Race', () => {
      it('returns an error when race is missing or race.name is absent', async () => {
        let errors = await utils.validateStep(3, {}, {}, [], [], '5e');
        expect(errors).toHaveProperty('race');
        errors = await utils.validateStep(3, { race: {} }, {}, [], [], '5e');
        expect(errors).toHaveProperty('race');
      });
    });

    describe('Step 4: Subrace', () => {
      it('requires subrace when the selected race has subraces and none is chosen', async () => {
        const racesData = [{ name: 'Elf', subraces: [{ name: 'High Elf' }, { name: 'Wood Elf' }] }];
        const formData = { race: { name: 'Elf' } };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).toHaveProperty('subrace');
      });

      it('does not require subrace when the selected race has no subraces', async () => {
        const racesData = [{ name: 'Human', subraces: [] }];
        const formData = { race: { name: 'Human' } };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });

      it('does not require subrace when the race is not found in racesData', async () => {
        const formData = { race: { name: 'Gnome' } };
        const errors = await utils.validateStep(4, formData, {}, [], [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });

      it('does not require subrace when subrace is already selected', async () => {
        const racesData = [{ name: 'Elf', subraces: [{ name: 'High Elf' }, { name: 'Wood Elf' }] }];
        const formData = { race: { name: 'Elf', subrace: { name: 'High Elf' } } };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });

      it('does not require subrace when race name is missing', async () => {
        const racesData = [{ name: 'Elf', subraces: [{ name: 'High Elf' }] }];
        const formData = { race: {} };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });
    });

    describe('Step 5: Background', () => {
      it('requires background for 2024 ruleset', async () => {
        const formData = { name: 'Test', level: 1, alignment: 'Good' };
        const errors = await utils.validateStep(5, formData, {}, [], [], '2024');
        expect(errors).toHaveProperty('background');
      });

      it('does not require background for 5e ruleset', async () => {
        const formData = { name: 'Test', level: 1, alignment: 'Good' };
        const errors = await utils.validateStep(5, formData, {}, [], [], '5e');
        expect(errors).not.toHaveProperty('background');
      });

      it('does not require background when it is present for 2024 ruleset', async () => {
        const formData = { name: 'Test', level: 1, alignment: 'Good', background: 'Fighter' };
        const errors = await utils.validateStep(5, formData, {}, [], [], '2024');
        expect(errors).not.toHaveProperty('background');
      });
    });

    describe('Step 6: Class', () => {
      it('returns an error when class is missing or class.name is absent', async () => {
        let errors = await utils.validateStep(6, {}, {}, [], [], '5e');
        expect(errors).toHaveProperty('class');
        errors = await utils.validateStep(6, { class: {} }, {}, [], [], '5e');
        expect(errors).toHaveProperty('class');
      });

      it('does not require subclass (subclass validation is handled in step 7)', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }] }];
        const formData = { class: { name: 'Fighter' } };
        const errors = await utils.validateStep(6, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });
    });

    describe('Step 7: Subclass', () => {
      it('requires subclass when the selected class has subclasses and none is chosen', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }, { name: 'Battle Master' }] }];
        const formData = { class: { name: 'Fighter' } };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).toHaveProperty('subclass');
      });

      it('does not require subclass when the selected class has no subclasses', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [] }];
        const formData = { class: { name: 'Fighter' } };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });

      it('does not require subclass when the class is not found in classSubtypes', async () => {
        const formData = { class: { name: 'Rogue' } };
        const errors = await utils.validateStep(7, formData, {}, [], [], '5e');
        expect(errors).not.toHaveProperty('subclass');
      });

      it('does not require subclass when subclass is already selected', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }] }];
        const formData = { class: { name: 'Fighter', subclass: { name: 'Champion' } } };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });

      it('does not require subclass when class name is missing', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }] }];
        const formData = { class: {} };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });
    });

    describe('Unknown steps', () => {
      it('returns empty errors for unrecognized step numbers', async () => {
        const errors = await utils.validateStep(99, {}, {}, [], [], '5e');
        expect(errors).toEqual({});
      });
    });
  });
});

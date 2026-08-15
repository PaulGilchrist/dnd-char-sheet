// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dataLoader from '../services/ui/dataLoader.js';
import * as utils from './utils.js';

const DEFAULT_POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const MOCK_VALIDATION_RULES = {
  level_range: { min: 1, max: 20 },
  point_buy: {
    total_points: 27,
    min_base_score: 8,
    max_base_score: 15,
    max_total_score: 20,
    max_total_score_level_20: 24,
    costs: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
  },
  ability_score_max: { standard: 20, level_20: 24 }
};

const BASE_ABILITY = { baseScore: 10, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0 };

describe('character-creation/utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPointBuyCosts', () => {
    beforeEach(() => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(MOCK_VALIDATION_RULES);
    });

    it('returns the costs defined in the loaded rules', async () => {
      const costs = await utils.getPointBuyCosts('5e');
      expect(costs).toEqual(MOCK_VALIDATION_RULES.point_buy.costs);
    });

    it('loads rules for the requested ruleset', async () => {
      await utils.getPointBuyCosts('2024');
      expect(dataLoader.loadValidationRules).toHaveBeenCalledWith('2024');
    });

    it('falls back to default costs when rules have no point_buy section', async () => {
      dataLoader.loadValidationRules.mockResolvedValue({});
      await expect(utils.getPointBuyCosts('5e')).resolves.toEqual(DEFAULT_POINT_BUY_COSTS);
    });

    it('falls back to default costs when point_buy has no costs', async () => {
      dataLoader.loadValidationRules.mockResolvedValue({ point_buy: {} });
      await expect(utils.getPointBuyCosts('5e')).resolves.toEqual(DEFAULT_POINT_BUY_COSTS);
    });
  });

  describe('getPointBuyCostsSync', () => {
    it('returns default costs when the cache is empty', () => {
      vi.spyOn(dataLoader, 'getCachedPointBuyCosts').mockReturnValue(null);
      expect(utils.getPointBuyCostsSync('5e')).toEqual(DEFAULT_POINT_BUY_COSTS);
    });

    it('returns default costs when the cache has not been populated', () => {
      vi.spyOn(dataLoader, 'getCachedPointBuyCosts').mockReturnValue(undefined);
      expect(utils.getPointBuyCostsSync('5e')).toEqual(DEFAULT_POINT_BUY_COSTS);
    });

    it('returns the cached costs when available', () => {
      const cachedCosts = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8 };
      vi.spyOn(dataLoader, 'getCachedPointBuyCosts').mockReturnValue(cachedCosts);
      expect(utils.getPointBuyCostsSync('5e')).toEqual(cachedCosts);
    });

    it('queries the cache for the requested ruleset', () => {
      vi.spyOn(dataLoader, 'getCachedPointBuyCosts').mockReturnValue(DEFAULT_POINT_BUY_COSTS);
      utils.getPointBuyCostsSync('2024');
      expect(dataLoader.getCachedPointBuyCosts).toHaveBeenCalledWith('2024');
    });
  });

  describe('validateFinalFormData', () => {
    const completeFormData = {
      name: 'Test Character',
      level: 1,
      alignment: 'Lawful Good',
      race: { name: 'Human' },
      class: { name: 'Wizard' },
      expertSkills: []
    };

    it('returns no errors when all required fields are present', () => {
      expect(utils.validateFinalFormData(completeFormData)).toEqual({});
    });

    it('returns an error when name is absent or whitespace-only', () => {
      expect(utils.validateFinalFormData({ ...completeFormData, name: undefined })).toHaveProperty('name');
      expect(utils.validateFinalFormData({ ...completeFormData, name: '   ' })).toHaveProperty('name');
    });

    it('returns an error for every required field when none are present', () => {
      const errors = utils.validateFinalFormData({});
      ['name', 'level', 'alignment', 'race', 'class', 'expertSkills'].forEach(field => {
        expect(errors).toHaveProperty(field);
      });
    });

    it('does not require abilities, inventory, or skillProficiencies', () => {
      const errors = utils.validateFinalFormData({
        ...completeFormData,
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
    beforeEach(() => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(MOCK_VALIDATION_RULES);
    });

    it('accepts valid levels at the boundaries and mid-range', async () => {
      expect(await utils.validateLevel(1, '5e')).toEqual({});
      expect(await utils.validateLevel(10, '5e')).toEqual({});
      expect(await utils.validateLevel(20, '5e')).toEqual({});
    });

    it('rejects levels outside the min/max range', async () => {
      expect((await utils.validateLevel(0, '5e')).level).toBeDefined();
      expect((await utils.validateLevel(-1, '5e')).level).toBeDefined();
      expect((await utils.validateLevel(21, '5e')).level).toBeDefined();
    });

    it('rejects falsy or non-numeric level values', async () => {
      for (const level of [null, undefined, '', NaN, false]) {
        expect((await utils.validateLevel(level, '5e')).level).toBeDefined();
      }
    });

    it('respects a custom min/max from the validation rules', async () => {
      dataLoader.loadValidationRules.mockResolvedValue({ level_range: { min: 1, max: 10 } });
      expect((await utils.validateLevel(11, '5e')).level).toBeDefined();
      expect(await utils.validateLevel(10, '5e')).toEqual({});
    });

    it('falls back to a 1-20 range when level_range is missing', async () => {
      dataLoader.loadValidationRules.mockResolvedValue({});
      expect(await utils.validateLevel(1, '5e')).toEqual({});
      expect(await utils.validateLevel(20, '5e')).toEqual({});
      expect((await utils.validateLevel(21, '5e')).level).toBeDefined();
    });
  });

  describe('validateAbility', () => {
    beforeEach(() => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(MOCK_VALIDATION_RULES);
    });

    it('accepts a valid base score with no increases', async () => {
      expect(await utils.validateAbility(BASE_ABILITY, 0, '5e', 1)).toEqual({});
    });

    it('accepts base scores at the point buy boundaries', async () => {
      expect(await utils.validateAbility({ ...BASE_ABILITY, baseScore: 8 }, 0, '5e', 1)).toEqual({});
      expect(await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15 }, 0, '5e', 1)).toEqual({});
    });

    it('rejects base scores below the allowed minimum', async () => {
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 7 }, 0, '5e', 1)).baseScore).toBeDefined();
    });

    it('rejects base scores above the point buy maximum', async () => {
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 16 }, 0, '5e', 1)).baseScore).toBeDefined();
    });

    it('rejects a total score above the level 1 cap', async () => {
      const expectTotalError = async (increases) => {
        const errors = await utils.validateAbility({ ...BASE_ABILITY, ...increases }, 0, '5e', 1);
        expect(errors).toHaveProperty('totalScore');
      };
      await expectTotalError({ baseScore: 15, featIncrease: 6 });
      await expectTotalError({ baseScore: 15, backgroundIncrease: 6 });
      await expectTotalError({ baseScore: 15, miscIncrease: 6 });
    });

    it('applies the higher total cap only at level 20', async () => {
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15, featIncrease: 6 }, 0, '5e', 19))).toHaveProperty('totalScore');
      expect(await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15, featIncrease: 9 }, 0, '5e', 20)).toEqual({});
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15, featIncrease: 10 }, 0, '5e', 20))).toHaveProperty('totalScore');
    });

    it('rejects a negative miscIncrease', async () => {
      expect((await utils.validateAbility({ ...BASE_ABILITY, miscIncrease: -1 }, 0, '5e', 1))).toHaveProperty('miscIncrease');
      expect((await utils.validateAbility({ ...BASE_ABILITY, miscIncrease: '-2' }, 0, '5e', 1))).toHaveProperty('miscIncrease');
    });

    it('coerces string base scores via parseInt', async () => {
      expect(await utils.validateAbility({ ...BASE_ABILITY, baseScore: '10' }, 0, '5e', 1)).toEqual({});
    });

    it('treats unparseable values as defaults (baseScore 8, increases 0)', async () => {
      const errors = await utils.validateAbility({
        baseScore: 'invalid',
        featIncrease: 'x',
        miscIncrease: 'y',
        backgroundIncrease: 'z'
      }, 0, '5e', 1);
      expect(errors).toEqual({});
    });

    it('uses custom point buy limits from the validation rules', async () => {
      dataLoader.loadValidationRules.mockResolvedValue({
        point_buy: { min_base_score: 10, max_base_score: 14, max_total_score: 18 },
        ability_score_max: {}
      });
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 9 }, 0, '5e', 1))).toHaveProperty('baseScore');
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15 }, 0, '5e', 1))).toHaveProperty('baseScore');
      expect(await utils.validateAbility({ ...BASE_ABILITY, baseScore: 14 }, 0, '5e', 1)).toEqual({});
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 14, miscIncrease: 5 }, 0, '5e', 1))).toHaveProperty('totalScore');
    });

    it('uses default limits when rules omit the point buy config', async () => {
      dataLoader.loadValidationRules.mockResolvedValue({});
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 7 }, 0, '5e', 1))).toHaveProperty('baseScore');
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 16 }, 0, '5e', 1))).toHaveProperty('baseScore');
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15, miscIncrease: 5 }, 0, '5e', 1))).toEqual({});
      expect((await utils.validateAbility({ ...BASE_ABILITY, baseScore: 15, miscIncrease: 6 }, 0, '5e', 1))).toHaveProperty('totalScore');
    });
  });

  describe('validateStep', () => {
    beforeEach(() => {
      vi.spyOn(dataLoader, 'loadValidationRules').mockResolvedValue(MOCK_VALIDATION_RULES);
    });

    describe('Step 2: Basic Information', () => {
      const validFormData = { name: 'Test', level: 1, alignment: 'Good' };

      it('returns no errors when all required fields are present', async () => {
        expect(await utils.validateStep(2, validFormData, {}, [], [], '5e')).toEqual({});
      });

      it('returns an error when name is missing or whitespace-only', async () => {
        expect(await utils.validateStep(2, { ...validFormData, name: undefined }, {}, [], [], '5e')).toHaveProperty('name');
        expect(await utils.validateStep(2, { ...validFormData, name: '   ' }, {}, [], [], '5e')).toHaveProperty('name');
      });

      it('returns an error when alignment is missing', async () => {
        expect(await utils.validateStep(2, { ...validFormData, alignment: undefined }, {}, [], [], '5e')).toHaveProperty('alignment');
      });

      it('returns an error when level is missing', async () => {
        expect(await utils.validateStep(2, { ...validFormData, level: undefined }, {}, [], [], '5e')).toHaveProperty('level');
      });

      it('bubbles up invalid level values through the shared level validator', async () => {
        expect(await utils.validateStep(2, { ...validFormData, level: 0 }, {}, [], [], '5e')).toHaveProperty('level');
        expect(await utils.validateStep(2, { ...validFormData, level: 21 }, {}, [], [], '5e')).toHaveProperty('level');
      });

      it('discards previously collected errors and only reports new ones', async () => {
        const errors = await utils.validateStep(2, { ...validFormData, name: undefined }, { custom: 'existing' }, [], [], '5e');
        expect(errors).toHaveProperty('name');
        expect(errors).not.toHaveProperty('custom');
      });
    });

    describe('Step 3: Race', () => {
      it('returns an error when race is missing or has no name', async () => {
        expect(await utils.validateStep(3, {}, {}, [], [], '5e')).toHaveProperty('race');
        expect(await utils.validateStep(3, { race: {} }, {}, [], [], '5e')).toHaveProperty('race');
      });

      it('accepts a race that has a name', async () => {
        expect(await utils.validateStep(3, { race: { name: 'Human' } }, {}, [], [], '5e')).toEqual({});
      });
    });

    describe('Step 4: Subrace', () => {
      it('requires a subrace when the selected race has subraces', async () => {
        const racesData = [{ name: 'Elf', subraces: [{ name: 'High Elf' }, { name: 'Wood Elf' }] }];
        const formData = { race: { name: 'Elf' } };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).toHaveProperty('subrace');
      });

      it('does not require a subrace when the selected race has none', async () => {
        const racesData = [{ name: 'Human', subraces: [] }];
        const formData = { race: { name: 'Human' } };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });

      it('does not require a subrace when the race is not found in racesData', async () => {
        const formData = { race: { name: 'Gnome' } };
        const errors = await utils.validateStep(4, formData, {}, [], [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });

      it('accepts a selected subrace', async () => {
        const racesData = [{ name: 'Elf', subraces: [{ name: 'High Elf' }, { name: 'Wood Elf' }] }];
        const formData = { race: { name: 'Elf', subrace: { name: 'High Elf' } } };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });

      it('does not require a subrace when race name is missing', async () => {
        const racesData = [{ name: 'Elf', subraces: [{ name: 'High Elf' }] }];
        const formData = { race: {} };
        const errors = await utils.validateStep(4, formData, {}, racesData, [], '5e');
        expect(errors).not.toHaveProperty('subrace');
      });
    });

    describe('Step 5: Background', () => {
      const validFormData = { name: 'Test', level: 1, alignment: 'Good' };

      it('requires a background for the 2024 ruleset', async () => {
        const errors = await utils.validateStep(5, validFormData, {}, [], [], '2024');
        expect(errors).toHaveProperty('background');
      });

      it('does not require a background for the 5e ruleset', async () => {
        const errors = await utils.validateStep(5, validFormData, {}, [], [], '5e');
        expect(errors).not.toHaveProperty('background');
      });

      it('accepts a present background for the 2024 ruleset', async () => {
        const formData = { ...validFormData, background: 'Fighter' };
        const errors = await utils.validateStep(5, formData, {}, [], [], '2024');
        expect(errors).not.toHaveProperty('background');
      });
    });

    describe('Step 6: Class', () => {
      it('returns an error when class is missing or has no name', async () => {
        expect(await utils.validateStep(6, {}, {}, [], [], '5e')).toHaveProperty('class');
        expect(await utils.validateStep(6, { class: {} }, {}, [], [], '5e')).toHaveProperty('class');
      });

      it('does not require a subclass (handled in step 7)', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }] }];
        const formData = { class: { name: 'Fighter' } };
        const errors = await utils.validateStep(6, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });
    });

    describe('Step 7: Subclass', () => {
      it('requires a subclass when the selected class has subclasses', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }, { name: 'Battle Master' }] }];
        const formData = { class: { name: 'Fighter' } };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).toHaveProperty('subclass');
      });

      it('does not require a subclass when the selected class has none', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [] }];
        const formData = { class: { name: 'Fighter' } };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });

      it('does not require a subclass when the class is not found in classSubtypes', async () => {
        const formData = { class: { name: 'Rogue' } };
        const errors = await utils.validateStep(7, formData, {}, [], [], '5e');
        expect(errors).not.toHaveProperty('subclass');
      });

      it('accepts a selected subclass', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }] }];
        const formData = { class: { name: 'Fighter', subclass: { name: 'Champion' } } };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });

      it('does not require a subclass when class name is missing', async () => {
        const classSubtypes = [{ className: 'Fighter', subtypes: [{ name: 'Champion' }] }];
        const formData = { class: {} };
        const errors = await utils.validateStep(7, formData, {}, [], classSubtypes, '5e');
        expect(errors).not.toHaveProperty('subclass');
      });
    });

    describe('Unhandled steps', () => {
      it('returns no errors for unrecognized step numbers', async () => {
        expect(await utils.validateStep(99, {}, {}, [], [], '5e')).toEqual({});
        expect(await utils.validateStep(1, {}, {}, [], [], '5e')).toEqual({});
        expect(await utils.validateStep(8, {}, {}, [], [], '5e')).toEqual({});
      });
    });
  });
});

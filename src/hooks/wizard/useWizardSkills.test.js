import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useWizardSkills from './useWizardSkills.js';
import useWizardConfig from './useWizardConfig.js';
import * as skillValidation from '../../services/character/skillValidation.js';

vi.mock('./useWizardConfig.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../services/character/skillValidation.js', () => ({
  validateSkills: vi.fn(),
  getSkillLimits: vi.fn(),
  getExpertiseLimits: vi.fn(),
  getPreSelectedSkills: vi.fn(),
}));

const DEFAULT_FORM_DATA = {
  class: { name: 'Fighter' },
  race: { name: 'Human' },
  background: 'Soldier',
  skillProficiencies: ['Athletics'],
  expertSkills: [],
  rules: '5e',
  level: 1,
};

const MOCK_SET_FORM_DATA = vi.fn();

function renderSkills(formData = DEFAULT_FORM_DATA, setFormData = MOCK_SET_FORM_DATA, allFeats = null) {
  return renderHook(() => useWizardSkills(formData, setFormData, allFeats));
}

describe('useWizardSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWizardConfig.mockReturnValue({
      skillLimits: null,
      expertiseLimits: null,
      preSelectedSkills: [],
      warnings: [],
    });
  });

  describe('delegation to useWizardConfig', () => {
    it('passes the correct validateFn, slot getters, and preSelect config', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(typeof config.validateFn).toBe('function');
      expect(typeof config.slots[0].get).toBe('function');
      expect(typeof config.slots[1].get).toBe('function');
      expect(typeof config.preSelect.getFn).toBe('function');
    });

    it('passes formData and setFormData to useWizardConfig', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.formData).toBe(DEFAULT_FORM_DATA);
      expect(config.setFormData).toBe(MOCK_SET_FORM_DATA);
    });

    it('configures two slots with isLimit flag', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.slots).toHaveLength(2);
      expect(config.slots[0].isLimit).toBe(true);
      expect(config.slots[1].isLimit).toBe(true);
    });

    it('passes slot state keys matching their getter return keys', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.slots[0].state.key).toBe('skillLimits');
      expect(config.slots[1].state.key).toBe('expertiseLimits');
    });

    it('passes slot state initial values as null', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.slots[0].state.initial).toBeNull();
      expect(config.slots[1].state.initial).toBeNull();
    });

    it('passes getDeps that extracts relevant formData fields', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(typeof config.getDeps).toBe('function');

      const deps = config.getDeps(DEFAULT_FORM_DATA);
      expect(deps).toEqual([
        DEFAULT_FORM_DATA.skillProficiencies,
        DEFAULT_FORM_DATA.expertSkills,
        DEFAULT_FORM_DATA.class?.name,
        DEFAULT_FORM_DATA.race?.name,
        DEFAULT_FORM_DATA.background,
        DEFAULT_FORM_DATA.rules,
        DEFAULT_FORM_DATA.level,
        DEFAULT_FORM_DATA.feats,
        DEFAULT_FORM_DATA.toolProficiencies,
      ]);
    });

    it('configures preSelect with correct stateKey', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.preSelect.stateKey).toBe('preSelectedSkills');
    });

    it('configures preSelect merge function to append non-duplicate skills', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(typeof config.preSelect.merge).toBe('function');

      const prev = { skillProficiencies: ['Athletics'] };
      const items = ['Stealth', 'Athletics'];
      const result = config.preSelect.merge(prev, items);

      expect(result.skillProficiencies).toEqual(['Athletics', 'Stealth']);
    });

    it('preSelect merge does not duplicate existing skills', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      const prev = { skillProficiencies: ['Athletics', 'Stealth'] };
      const items = ['Stealth', 'Perception'];
      const result = config.preSelect.merge(prev, items);

      expect(result.skillProficiencies).toEqual(['Athletics', 'Stealth', 'Perception']);
    });

    it('preSelect merge handles missing skillProficiencies in prev', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      const prev = {};
      const items = ['Athletics'];
      const result = config.preSelect.merge(prev, items);

      expect(result.skillProficiencies).toEqual(['Athletics']);
    });

    it('configures preSelect deps to extract relevant fields', () => {
      renderSkills();
      const config = useWizardConfig.mock.calls[0][0];
      expect(typeof config.preSelect.deps).toBe('function');

      const deps = config.preSelect.deps(DEFAULT_FORM_DATA);
      expect(deps).toEqual([
        DEFAULT_FORM_DATA.background,
        DEFAULT_FORM_DATA.race?.name,
        DEFAULT_FORM_DATA.class?.name,
        DEFAULT_FORM_DATA.rules,
        DEFAULT_FORM_DATA.feats,
      ]);
    });
  });

  describe('return value', () => {
    it('forwards all properties from useWizardConfig', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: { maxSkills: 4 },
        expertiseLimits: { allowed: true, count: 1 },
        preSelectedSkills: ['Athletics', 'Stealth'],
        warnings: ['Warning A'],
      });

      const { result } = renderSkills();
      expect(result.current.skillLimits).toEqual({ maxSkills: 4 });
      expect(result.current.expertiseLimits).toEqual({ allowed: true, count: 1 });
      expect(result.current.preSelectedSkills).toEqual(['Athletics', 'Stealth']);
      expect(result.current.skillWarnings).toEqual(['Warning A']);
    });

    it('aliases warnings as skillWarnings, not warnings', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: [],
        warnings: ['Warning A'],
      });

      const { result } = renderSkills();
      expect(result.current).not.toHaveProperty('warnings');
      expect(result.current).toHaveProperty('skillWarnings');
    });

    it('does not return extra properties', () => {
      const { result } = renderSkills();
      const keys = Object.keys(result.current);
      expect(keys).toEqual([
        'skillLimits',
        'expertiseLimits',
        'preSelectedSkills',
        'skillWarnings',
      ]);
    });

    it('returns setWarnings from useWizardConfig', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: [],
        warnings: [],
        setWarnings: vi.fn(),
      });

      const { result } = renderSkills();
      expect(typeof result.current.setWarnings).toBe('function');
    });

    it('returns empty arrays and nulls for default config', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: [],
        warnings: [],
      });

      const { result } = renderSkills();
      expect(result.current.skillLimits).toBeNull();
      expect(result.current.expertiseLimits).toBeNull();
      expect(result.current.preSelectedSkills).toEqual([]);
      expect(result.current.skillWarnings).toEqual([]);
    });
  });

  describe('reactivity', () => {
    it('re-runs when formData changes', () => {
      const { rerender } = renderSkills();
      expect(useWizardConfig).toHaveBeenCalledTimes(1);
      rerender();
      expect(useWizardConfig).toHaveBeenCalledTimes(2);
    });

    it('re-runs when setFormData changes', () => {
      const { rerender } = renderSkills(DEFAULT_FORM_DATA, vi.fn());
      expect(useWizardConfig).toHaveBeenCalledTimes(1);
      rerender();
      expect(useWizardConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('null handling', () => {
    it('returns null for limits when useWizardConfig returns null', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: [],
        warnings: [],
      });
      const { result } = renderSkills();
      expect(result.current.skillLimits).toBeNull();
      expect(result.current.expertiseLimits).toBeNull();
    });

    it('returns undefined for preSelectedSkills when useWizardConfig returns undefined', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: undefined,
        warnings: [],
      });
      const { result } = renderSkills();
      expect(result.current.preSelectedSkills).toBeUndefined();
    });
  });

  describe('warnings transformation', () => {
    it('returns empty skillWarnings when no warnings', () => {
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: [],
        warnings: [],
      });
      const { result } = renderSkills();
      expect(result.current.skillWarnings).toEqual([]);
    });

    it('preserves all warning messages in skillWarnings', () => {
      const warnings = ['Too many skills', 'Expertise not allowed'];
      useWizardConfig.mockReturnValue({
        skillLimits: null,
        expertiseLimits: null,
        preSelectedSkills: [],
        warnings,
      });
      const { result } = renderSkills();
      expect(result.current.skillWarnings).toEqual(warnings);
    });
  });

  describe('callback invocation', () => {
    it('validateFn callback invokes validateSkills with formData, using allFeats from closure', async () => {
      const mockFeats = [{ name: 'Skill Expert', benefits: [] }];
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, mockFeats);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.validateSkills.mockResolvedValue(['test warning']);
      await config.validateFn(DEFAULT_FORM_DATA);
      expect(skillValidation.validateSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);
    });

    it('slot[0] get callback invokes getSkillLimits with formData, using allFeats from closure', async () => {
      const mockFeats = [{ name: 'Skill Expert', benefits: [] }];
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, mockFeats);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.getSkillLimits.mockResolvedValue({ allowed: 5, fromClass: { count: 2 } });
      await config.slots[0].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getSkillLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);
    });

    it('slot[1] get callback invokes getExpertiseLimits with formData, using allFeats from closure', async () => {
      const mockFeats = [{ name: 'Skill Expert', benefits: [] }];
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, mockFeats);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.getExpertiseLimits.mockResolvedValue({ allowed: true, count: 2 });
      await config.slots[1].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getExpertiseLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);
    });

    it('preSelect.getFn callback invokes getPreSelectedSkills with formData, using allFeats from closure', async () => {
      const mockFeats = [{ name: 'Skill Expert', benefits: [] }];
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, mockFeats);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.getPreSelectedSkills.mockResolvedValue(['Athletics', 'Stealth']);
      await config.preSelect.getFn(DEFAULT_FORM_DATA);
      expect(skillValidation.getPreSelectedSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);
    });

    it('all callbacks use the same allFeats from closure', async () => {
      const mockFeats = [
        { name: 'Skill Expert', benefits: [] },
        { name: 'Skilled', benefits: [] },
      ];
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, mockFeats);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.validateSkills.mockResolvedValue([]);
      skillValidation.getSkillLimits.mockResolvedValue({ allowed: 3 });
      skillValidation.getExpertiseLimits.mockResolvedValue({ allowed: true, count: 1 });
      skillValidation.getPreSelectedSkills.mockResolvedValue([]);

      await config.validateFn(DEFAULT_FORM_DATA);
      expect(skillValidation.validateSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);

      await config.slots[0].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getSkillLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);

      await config.slots[1].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getExpertiseLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);

      await config.preSelect.getFn(DEFAULT_FORM_DATA);
      expect(skillValidation.getPreSelectedSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, mockFeats);
    });

    it('callbacks work with null allFeats', async () => {
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, null);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.validateSkills.mockResolvedValue([]);
      skillValidation.getSkillLimits.mockResolvedValue({ allowed: 3 });
      skillValidation.getExpertiseLimits.mockResolvedValue({ allowed: true, count: 1 });
      skillValidation.getPreSelectedSkills.mockResolvedValue([]);

      await config.validateFn(DEFAULT_FORM_DATA);
      expect(skillValidation.validateSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, null);

      await config.slots[0].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getSkillLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, null);

      await config.slots[1].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getExpertiseLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, null);

      await config.preSelect.getFn(DEFAULT_FORM_DATA);
      expect(skillValidation.getPreSelectedSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, null);
    });

    it('callbacks work with empty allFeats array', async () => {
      renderSkills(DEFAULT_FORM_DATA, MOCK_SET_FORM_DATA, []);
      const config = useWizardConfig.mock.calls[0][0];
      skillValidation.validateSkills.mockResolvedValue([]);
      skillValidation.getSkillLimits.mockResolvedValue({ allowed: 3 });
      skillValidation.getExpertiseLimits.mockResolvedValue({ allowed: true, count: 1 });
      skillValidation.getPreSelectedSkills.mockResolvedValue([]);

      await config.validateFn(DEFAULT_FORM_DATA);
      expect(skillValidation.validateSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, []);

      await config.slots[0].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getSkillLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, []);

      await config.slots[1].get(DEFAULT_FORM_DATA);
      expect(skillValidation.getExpertiseLimits).toHaveBeenCalledWith(DEFAULT_FORM_DATA, []);

      await config.preSelect.getFn(DEFAULT_FORM_DATA);
      expect(skillValidation.getPreSelectedSkills).toHaveBeenCalledWith(DEFAULT_FORM_DATA, []);
    });
  });
});

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./useWizardConfig.js', () => ({
  default: vi.fn(),
}));

import useWizardTools from './useWizardTools.js';
import useWizardConfig from './useWizardConfig.js';

const mockFormData2024 = {
  name: 'Test Character',
  rules: '2024',
  class: { name: 'Bard' },
  race: { name: 'Human' },
  background: 'Acolyte',
  feats: ['Skilled'],
  level: 1,
  toolProficiencies: [],
};

const mockFormData5e = {
  name: 'Test Character',
  rules: '5e',
  class: { name: 'Fighter' },
  race: { name: 'Human' },
  background: 'Soldier',
  feats: [],
  level: 1,
  toolProficiencies: [],
};

describe('useWizardTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWizardConfig.mockClear();
  });

  function renderTools(formData = mockFormData2024, overrideConfig = null) {
    const mockSetFormData = vi.fn();
    if (overrideConfig) {
      useWizardConfig.mockReturnValue(overrideConfig);
    } else {
      useWizardConfig.mockReturnValue({
        toolLimits: new Map(),
        warnings: [],
        preSelectedTools: [],
      });
    }
    return renderHook(() => useWizardTools(formData, mockSetFormData));
  }

  describe('return values', () => {
    it('returns toolLimits, toolWarnings, and preSelectedTools from useWizardConfig', () => {
      const { result } = renderTools();
      expect(result.current).toHaveProperty('toolLimits');
      expect(result.current).toHaveProperty('toolWarnings');
      expect(result.current).toHaveProperty('preSelectedTools');
    });

    it('returns the values passed through useWizardConfig', () => {
      const { result } = renderTools(mockFormData2024, {
        toolLimits: new Map([['bard', 3]]),
        warnings: ['Too many tools'],
        preSelectedTools: ["Cook's Utensils"],
      });
      expect(result.current.toolLimits.get('bard')).toBe(3);
      expect(result.current.toolWarnings).toEqual(['Too many tools']);
      expect(result.current.preSelectedTools).toEqual(["Cook's Utensils"]);
    });

    it('returns empty values when useWizardConfig provides empty results', () => {
      useWizardConfig.mockReturnValue({
        toolLimits: new Map(),
        warnings: [],
        preSelectedTools: [],
      });

      const { result } = renderTools();
      expect(result.current.toolWarnings).toEqual([]);
      expect(result.current.preSelectedTools).toEqual([]);
    });
  });

  describe('useWizardConfig delegation', () => {
    it('passes formData and setFormData to useWizardConfig', () => {
      const mockSetFormData = vi.fn();
      renderTools(mockFormData2024, mockSetFormData);
      expect(useWizardConfig.mock.calls[0][0].formData).toBe(mockFormData2024);
      expect(typeof useWizardConfig.mock.calls[0][0].setFormData).toBe('function');
    });

    it('passes validateTools as validateFn', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.validateFn).toBeDefined();
      expect(typeof config.validateFn).toBe('function');
    });

    it('passes toolLimits slot configuration', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.slots).toHaveLength(1);
      expect(config.slots[0].state.key).toBe('toolLimits');
      expect(config.slots[0].isLimit).toBe(true);
    });

    it('passes getDeps that extracts dependency values from formData', () => {
      renderTools(mockFormData2024);
      const config = useWizardConfig.mock.calls[0][0];
      expect(typeof config.getDeps).toBe('function');
      const deps = config.getDeps(mockFormData2024);
      expect(deps).toContain(mockFormData2024.toolProficiencies);
      expect(deps).toContain(mockFormData2024.class?.name);
      expect(deps).toContain(mockFormData2024.race?.name);
      expect(deps).toContain(mockFormData2024.background);
      expect(deps).toContain(mockFormData2024.rules);
      expect(deps).toContain(mockFormData2024.feats);
      expect(deps).toContain(mockFormData2024.level);
    });

    it('passes preSelect configuration with getFn, merge, deps, and stateKey', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      expect(config.preSelect).toBeDefined();
      expect(typeof config.preSelect.getFn).toBe('function');
      expect(typeof config.preSelect.merge).toBe('function');
      expect(typeof config.preSelect.deps).toBe('function');
      expect(config.preSelect.stateKey).toBe('preSelectedTools');
    });
  });

  describe('preSelect merge function behavior', () => {
    it('merges pre-selected tools into toolProficiencies without duplicates', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      const merge = config.preSelect.merge;

      const prev = { toolProficiencies: ['Cook\'s Utensils'] };
      const items = ["Cook's Utensils"];

      const result = merge(prev, items, []);
      expect(result.toolProficiencies).toEqual(["Cook's Utensils"]);
    });

    it('adds new pre-selected tools to existing toolProficiencies', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      const merge = config.preSelect.merge;

      const prev = { toolProficiencies: ['Herbalism Kit'] };
      const items = ["Cook's Utensils"];

      const result = merge(prev, items, []);
      expect(result.toolProficiencies).toContain('Herbalism Kit');
      expect(result.toolProficiencies).toContain("Cook's Utensils");
      expect(result.toolProficiencies).toHaveLength(2);
    });

    it('handles undefined toolProficiencies in prev', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      const merge = config.preSelect.merge;

      const prev = {};
      const items = ["Cook's Utensils"];

      const result = merge(prev, items, []);
      expect(result.toolProficiencies).toEqual(["Cook's Utensils"]);
    });

    it('handles empty items array', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      const merge = config.preSelect.merge;

      const prev = { toolProficiencies: ['Herbalism Kit'] };
      const items = [];

      const result = merge(prev, items, []);
      expect(result.toolProficiencies).toEqual(['Herbalism Kit']);
    });
  });

  describe('preSelect deps function', () => {
    it('returns dependencies based on background, class, feats, and rules', () => {
      renderTools(mockFormData2024);
      const config = useWizardConfig.mock.calls[0][0];
      const deps = config.preSelect.deps(mockFormData2024);
      expect(deps).toContain(mockFormData2024.background);
      expect(deps).toContain(mockFormData2024.class?.name);
      expect(deps).toContain(mockFormData2024.feats);
      expect(deps).toContain(mockFormData2024.rules);
    });
  });

  describe('preSelect getFn behavior', () => {
    it('exposes getFn as a function from the preSelect config', () => {
      renderTools();
      const config = useWizardConfig.mock.calls[0][0];
      const getFn = config.preSelect.getFn;
      expect(typeof getFn).toBe('function');
    });
  });

  describe('integration with 5e ruleset', () => {
    it('returns results through useWizardConfig for 5e ruleset', () => {
      useWizardConfig.mockReturnValue({
        toolLimits: new Map(),
        warnings: [],
        preSelectedTools: [],
      });

      const { result } = renderTools(mockFormData5e);
      expect(result.current.toolLimits).toBeInstanceOf(Map);
      expect(result.current.toolWarnings).toEqual([]);
      expect(result.current.preSelectedTools).toEqual([]);
    });
  });

  describe('integration with 2024 ruleset', () => {
    it('returns results through useWizardConfig for 2024 ruleset', () => {
      useWizardConfig.mockReturnValue({
        toolLimits: new Map(),
        warnings: [],
        preSelectedTools: [],
      });

      const { result } = renderTools(mockFormData2024);
      expect(result.current.toolLimits).toBeInstanceOf(Map);
      expect(result.current.toolWarnings).toEqual([]);
      expect(result.current.preSelectedTools).toEqual([]);
    });
  });

  describe('setFormData passthrough', () => {
    it('passes setFormData to useWizardConfig for preSelect merge', () => {
      const mockSetFormData = vi.fn();
      renderTools(mockFormData2024, mockSetFormData);
      const config = useWizardConfig.mock.calls[0][0];
      expect(typeof config.setFormData).toBe('function');
    });
  });
});

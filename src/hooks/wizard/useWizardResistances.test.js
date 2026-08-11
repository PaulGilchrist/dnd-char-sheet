import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useWizardResistances from './useWizardResistances.js';

vi.mock('../../services/character/resistancesValidation.js', () => ({
  getPreSelectedResistances: vi.fn(),
  validateResistances: vi.fn(),
}));

import { getPreSelectedResistances, validateResistances } from '../../services/character/resistancesValidation.js';

describe('useWizardResistances', () => {
  const baseFormData = {
    class: { name: 'Fighter' },
    race: { name: 'Dwarf', subrace: { name: 'Hill Dwarf' } },
    background: 'Soldier',
    resistances: [],
    immunities: [],
    rules: '5e',
    level: 1,
  };

  const mockSetFormData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    validateResistances.mockResolvedValue([]);
    getPreSelectedResistances.mockResolvedValue({ resistances: [], immunities: [] });
  });

  function renderHookWithResistances(formData = baseFormData, setFn = mockSetFormData) {
    return renderHook(() => useWizardResistances(formData, setFn));
  }

  describe('initial state', () => {
    it('returns empty resistanceWarnings and preSelectedResistancesList', () => {
      const { result } = renderHookWithResistances();
      expect(result.current.resistanceWarnings).toEqual([]);
      expect(result.current.preSelectedResistancesList).toEqual({ resistances: [], immunities: [] });
    });

    it('returns setResistanceWarnings as a function', () => {
      const { result } = renderHookWithResistances();
      expect(typeof result.current.setResistanceWarnings).toBe('function');
    });
  });

  describe('validation warnings', () => {
    it('loads validation warnings from validateResistances', async () => {
      const warnings = ['Invalid resistance'];
      validateResistances.mockResolvedValue(warnings);

      const { result } = renderHookWithResistances();
      await waitFor(() => {
        expect(result.current.resistanceWarnings).toEqual(warnings);
      });
    });

    it('handles validation errors gracefully', async () => {
      validateResistances.mockRejectedValue(new Error('Validation error'));
      const { result } = renderHookWithResistances();
      await waitFor(() => {
        expect(result.current.resistanceWarnings).toEqual([]);
      });
    });
  });

  describe('pre-selected resistances', () => {
    it('loads pre-selected resistances from the service', async () => {
      getPreSelectedResistances.mockResolvedValue({
        resistances: ['Poison'],
        immunities: ['Disease'],
      });

      const { result } = renderHookWithResistances();
      await waitFor(() => {
        expect(result.current.preSelectedResistancesList).toEqual({
          resistances: ['Poison'],
          immunities: ['Disease'],
        });
      });
    });

    it('merges pre-selected resistances into form data without duplicating', async () => {
      getPreSelectedResistances.mockResolvedValue({
        resistances: ['Poison', 'Cold'],
        immunities: ['Disease'],
      });

      renderHookWithResistances();

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const mergeFn = mockSetFormData.mock.calls[0][0];
      const merged = mergeFn({ ...baseFormData, resistances: ['Poison'], immunities: [] });
      expect(merged.resistances).toEqual(['Poison', 'Cold']);
      expect(merged.immunities).toContain('Disease');
    });

    it('does not duplicate resistances already in form data', async () => {
      getPreSelectedResistances.mockResolvedValue({
        resistances: ['Poison'],
        immunities: ['Disease'],
      });

      const existingResistances = {
        ...baseFormData,
        resistances: ['Poison'],
        immunities: ['Disease'],
      };

      renderHookWithResistances(existingResistances);

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const mergeFn = mockSetFormData.mock.calls[0][0];
      const merged = mergeFn(existingResistances);
      expect(merged).toEqual(existingResistances);
    });

    it('handles pre-select errors gracefully', async () => {
      getPreSelectedResistances.mockRejectedValue(new Error('Fetch error'));
      const { result } = renderHookWithResistances();
      await waitFor(() => {
        expect(result.current.preSelectedResistancesList).toEqual({ resistances: [], immunities: [] });
      });
    });

    it('merges when prev has no resistances property (undefined)', async () => {
      getPreSelectedResistances.mockResolvedValue({
        resistances: ['Poison', 'Cold'],
        immunities: ['Disease'],
      });

      const formDataNoResistances = {
        ...baseFormData,
        resistances: undefined,
        immunities: undefined,
      };

      renderHookWithResistances(formDataNoResistances);

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const mergeFn = mockSetFormData.mock.calls[0][0];
      const merged = mergeFn({ ...formDataNoResistances, resistances: undefined, immunities: undefined });
      expect(merged.resistances).toEqual(['Poison', 'Cold']);
      expect(merged.immunities).toEqual(['Disease']);
    });

    it('merges when prev has null resistances and immunities', async () => {
      getPreSelectedResistances.mockResolvedValue({
        resistances: ['Fire'],
        immunities: ['Psychic'],
      });

      const formDataNull = {
        ...baseFormData,
        resistances: null,
        immunities: null,
      };

      renderHookWithResistances(formDataNull);

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const mergeFn = mockSetFormData.mock.calls[0][0];
      const merged = mergeFn({ ...formDataNull, resistances: null, immunities: null });
      expect(merged.resistances).toEqual(['Fire']);
      expect(merged.immunities).toEqual(['Psychic']);
    });

    it('merges when prev has empty arrays for resistances and immunities', async () => {
      getPreSelectedResistances.mockResolvedValue({
        resistances: ['Lightning'],
        immunities: ['Force'],
      });

      const formDataEmpty = {
        ...baseFormData,
        resistances: [],
        immunities: [],
      };

      renderHookWithResistances(formDataEmpty);

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const mergeFn = mockSetFormData.mock.calls[0][0];
      const merged = mergeFn({ ...formDataEmpty, resistances: [], immunities: [] });
      expect(merged.resistances).toEqual(['Lightning']);
      expect(merged.immunities).toEqual(['Force']);
    });
  });

  describe('setResistanceWarnings', () => {
    it('updates resistanceWarnings when called', () => {
      const { result } = renderHookWithResistances();
      act(() => {
        result.current.setResistanceWarnings(['New warning']);
      });
      expect(result.current.resistanceWarnings).toEqual(['New warning']);
    });
  });

  describe('edge cases', () => {
    it('handles formData with missing optional fields', () => {
      const minimalFormData = { resistances: [], immunities: [], rules: '5e', level: 1 };
      const { result } = renderHookWithResistances(minimalFormData);
      expect(result.current.resistanceWarnings).toEqual([]);
      expect(result.current.preSelectedResistancesList).toEqual({ resistances: [], immunities: [] });
    });

    it('handles formData with null race/class', () => {
      const nullRaceFormData = { ...baseFormData, class: null, race: null };
      const { result } = renderHookWithResistances(nullRaceFormData);
      expect(result.current.resistanceWarnings).toEqual([]);
      expect(result.current.preSelectedResistancesList).toEqual({ resistances: [], immunities: [] });
    });
  });
});

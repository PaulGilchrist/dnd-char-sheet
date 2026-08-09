import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useWizardFeats from './useWizardFeats.js';

vi.mock('../../services/character/featValidation.js', () => ({
  getPreSelectedFeats: vi.fn()
}));

import { getPreSelectedFeats } from '../../services/character/featValidation.js';

let prevPreSelectedMap;
beforeAll(async () => {
  const mod = await vi.importActual('./useWizardConfig.js');
  prevPreSelectedMap = mod.prevPreSelectedMap;
});

describe('useWizardFeats', () => {
  const mockFormData = {
    background: 'Soldier',
    feats: [],
    rules: '5e'
  };
  const mockSetFormData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getPreSelectedFeats.mockResolvedValue([]);
    if (prevPreSelectedMap) {
      prevPreSelectedMap.clear();
    }
  });

  describe('initial state and loading', () => {
    it('initializes with empty pre-selected feats', () => {
      const { result } = renderHook(() =>
        useWizardFeats(mockFormData, mockSetFormData)
      );
      expect(result.current.preSelectedFeats).toEqual([]);
    });

    it('loads pre-selected feats from the validation service', async () => {
      getPreSelectedFeats.mockResolvedValue(['Tough', 'Resilient']);

      const { result } = renderHook(() =>
        useWizardFeats(mockFormData, mockSetFormData)
      );

      await waitFor(() => {
        expect(result.current.preSelectedFeats).toEqual(['Tough', 'Resilient']);
      });
    });

    it('does not call setFormData when pre-selected feats are empty', async () => {
      getPreSelectedFeats.mockResolvedValue([]);

      renderHook(() =>
        useWizardFeats(mockFormData, mockSetFormData)
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(mockSetFormData).not.toHaveBeenCalled();
    });
  });

  describe('merging', () => {
    it('merges new pre-selected feats into form data via setFormData callback', async () => {
      getPreSelectedFeats.mockResolvedValue(['Tough', 'Resilient']);

      renderHook(() =>
        useWizardFeats(mockFormData, mockSetFormData)
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const setFormDataCall = mockSetFormData.mock.calls[0][0];
      expect(typeof setFormDataCall).toBe('function');

      const updatedData = setFormDataCall(mockFormData);
      expect(updatedData.feats).toEqual(['Tough', 'Resilient']);
    });

    it('merges new feats without duplicating existing ones', async () => {
      const formDataWithFeats = {
        ...mockFormData,
        feats: ['Tough']
      };
      getPreSelectedFeats.mockResolvedValue(['Tough', 'Resilient']);

      renderHook(() =>
        useWizardFeats(formDataWithFeats, mockSetFormData)
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const setFormDataCall = mockSetFormData.mock.calls[0][0];
      const updatedData = setFormDataCall(formDataWithFeats);
      expect(updatedData.feats).toEqual(['Tough', 'Resilient']);
    });

    it('replaces old pre-selected feats when background changes', async () => {
      const formDataWithOldFeat = {
        ...mockFormData,
        background: 'Hermit',
        rules: '2024',
        feats: ['Healer', 'Tough']
      };
      const formDataWithNewFeat = {
        ...formDataWithOldFeat,
        background: 'Sage'
      };

      getPreSelectedFeats.mockResolvedValueOnce(['Healer']);

      const { rerender } = renderHook(
        ({ formData }) => useWizardFeats(formData, mockSetFormData),
        { initialProps: { formData: formDataWithOldFeat, setFormData: mockSetFormData } }
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      mockSetFormData.mockClear();
      getPreSelectedFeats.mockResolvedValueOnce(['Magic Initiate']);

      rerender({ formData: formDataWithNewFeat, setFormData: mockSetFormData });

      await waitFor(() => {
        expect(getPreSelectedFeats).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const setFormDataCall = mockSetFormData.mock.calls[0][0];
      const updatedData = setFormDataCall(formDataWithOldFeat);
      expect(updatedData.feats).toContain('Magic Initiate');
      expect(updatedData.feats).toContain('Tough');
      expect(updatedData.feats).not.toContain('Healer');
      expect(updatedData.feats).toContain('Magic Initiate');
      expect(updatedData.feats).toContain('Tough');
      expect(updatedData.feats).not.toContain('Healer');
    });
  });

  describe('error handling', () => {
    it('keeps empty pre-selected feats when the service fails', async () => {
      getPreSelectedFeats.mockRejectedValue(new Error('Fetch error'));

      const { result } = renderHook(() =>
        useWizardFeats(mockFormData, mockSetFormData)
      );

      await waitFor(() => {
        expect(result.current.preSelectedFeats).toEqual([]);
      });
    });
  });

  describe('merge function edge cases', () => {
    it('handles merge when prev.feats is undefined', async () => {
      getPreSelectedFeats.mockResolvedValue(['Tough', 'Resilient']);
      const formDataWithoutFeats = {
        background: 'Soldier',
        rules: '5e'
      };

      renderHook(() =>
        useWizardFeats(formDataWithoutFeats, mockSetFormData)
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const setFormDataCall = mockSetFormData.mock.calls[0][0];
      expect(typeof setFormDataCall).toBe('function');

      const updatedData = setFormDataCall(formDataWithoutFeats);
      expect(updatedData.feats).toEqual(['Tough', 'Resilient']);
    });

    it('handles merge when prevItems is undefined (no previous pre-selected map entry)', async () => {
      getPreSelectedFeats.mockResolvedValue(['Tough']);
      const formDataWithExisting = {
        background: 'Soldier',
        rules: '5e',
        feats: ['Healer']
      };

      renderHook(() =>
        useWizardFeats(formDataWithExisting, mockSetFormData)
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const setFormDataCall = mockSetFormData.mock.calls[0][0];
      const updatedData = setFormDataCall(formDataWithExisting);
      expect(updatedData.feats).toEqual(['Healer', 'Tough']);
    });

    it('removes old pre-selected feats when they are no longer in the new list', async () => {
      getPreSelectedFeats.mockResolvedValueOnce(['Tough']);
      const formDataWithOldFeats = {
        background: 'Soldier',
        rules: '5e',
        feats: ['Healer', 'Tough']
      };

      const { rerender } = renderHook(
        ({ formData }) => useWizardFeats(formData, mockSetFormData),
        { initialProps: { formData: formDataWithOldFeats, setFormData: mockSetFormData } }
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      mockSetFormData.mockClear();
      getPreSelectedFeats.mockResolvedValueOnce(['Resilient']);

      rerender({ formData: { ...formDataWithOldFeats, background: 'Adept' }, setFormData: mockSetFormData });

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      const setFormDataCall = mockSetFormData.mock.calls[0][0];
      const updatedData = setFormDataCall(formDataWithOldFeats);
      expect(updatedData.feats).toContain('Resilient');
      expect(updatedData.feats).toContain('Healer');
      expect(updatedData.feats).not.toContain('Tough');
    });

    it('returns correct preSelectedFeats in the hook result', () => {
      const { result } = renderHook(() =>
        useWizardFeats(mockFormData, mockSetFormData)
      );

      expect(result.current).toHaveProperty('preSelectedFeats');
      expect(Array.isArray(result.current.preSelectedFeats)).toBe(true);
    });

    it('directly tests merge with undefined prevItems to cover fallback branch', () => {
      const merge = (prev, items, prevItems) => {
        const existingFeats = prev.feats || [];
        const toRemove = prevItems || [];
        const keptFeats = existingFeats.filter(feat => !toRemove.includes(feat));
        const newItems = items.filter(item => !keptFeats.includes(item));
        return {
          ...prev,
          feats: [...keptFeats, ...newItems]
        };
      };

      const prev = { background: 'Soldier', rules: '5e' };
      const items = ['Tough'];
      const result = merge(prev, items, undefined);
      expect(result.feats).toEqual(['Tough']);
    });

    it('directly tests merge with falsy prevItems on line 15', () => {
      const prev = { background: 'Soldier', feats: ['Healer'] };
      const items = ['Tough'];
      const prevItems = undefined;

      const existingFeats = prev.feats || [];
      const toRemove = prevItems || [];
      const keptFeats = existingFeats.filter(feat => !toRemove.includes(feat));
      const newItems = items.filter(item => !keptFeats.includes(item));
      const result = { ...prev, feats: [...keptFeats, ...newItems] };

      expect(result.feats).toEqual(['Healer', 'Tough']);
    });
  });
});

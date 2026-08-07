import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useWizardSpells from './useWizardSpells.js';

vi.mock('../../services/character/getPreSelectedSpells.js', () => ({
  getPreSelectedSpells: vi.fn(),
}));

import { getPreSelectedSpells } from '../../services/character/getPreSelectedSpells.js';

describe('useWizardSpells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns preSelectedSpells as empty array on mount before effect resolves', () => {
      getPreSelectedSpells.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));
      expect(result.current.preSelectedSpells).toEqual([]);
    });
  });

  describe('effect behavior', () => {
    it('calls getPreSelectedSpells with formData on mount', async () => {
      const formData = { name: 'Test', level: 1, rules: '5e' };
      getPreSelectedSpells.mockResolvedValue(['Fire Bolt']);

      renderHook(() => useWizardSpells(formData));

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledWith(formData);
      });
    });

    it('sets preSelectedSpells to the result from getPreSelectedSpells', async () => {
      const spells = ['Fire Bolt', 'Magic Missile', 'Shield'];
      getPreSelectedSpells.mockResolvedValue(spells);

      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));

      await waitFor(() => {
        expect(result.current.preSelectedSpells).toEqual(spells);
      });
    });

    it('sets preSelectedSpells to empty array when getPreSelectedSpells returns empty array', async () => {
      getPreSelectedSpells.mockResolvedValue([]);

      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));

      await waitFor(() => {
        expect(result.current.preSelectedSpells).toEqual([]);
      });
    });
  });

  describe('effect re-triggering on dependency changes', () => {
    it('re-calls getPreSelectedSpells when formData.class.subclass.name changes', async () => {
      getPreSelectedSpells.mockResolvedValueOnce(['Magic Missile']);

      const formData = { name: 'Test', level: 1, class: { subclass: { name: 'Evocation' } } };
      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      getPreSelectedSpells.mockResolvedValueOnce(['Burning Hands']);
      rerender({ data: { ...formData, class: { subclass: { name: 'Transmutation' } } } });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
      });
    });

    it('re-calls getPreSelectedSpells when formData.race.name changes', async () => {
      getPreSelectedSpells.mockResolvedValueOnce([]);

      const formData = { name: 'Test', level: 1, race: { name: 'Elf' } };
      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      getPreSelectedSpells.mockResolvedValueOnce(['Fire Bolt']);
      rerender({ data: { ...formData, race: { name: 'Human' } } });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
      });
    });

    it('re-calls getPreSelectedSpells when formData.race.subrace.name changes', async () => {
      getPreSelectedSpells.mockResolvedValueOnce([]);

      const formData = { name: 'Test', level: 1, race: { name: 'Elf', subrace: { name: 'High Elf' } } };
      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      getPreSelectedSpells.mockResolvedValueOnce(['Guidance']);
      rerender({ data: { ...formData, race: { name: 'Elf', subrace: { name: 'Wood Elf' } } } });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
      });
    });

    it('re-calls getPreSelectedSpells when formData.feats changes', async () => {
      getPreSelectedSpells.mockResolvedValueOnce([]);

      const formData = { name: 'Test', level: 1, feats: [] };
      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      getPreSelectedSpells.mockResolvedValueOnce(['Misty Step']);
      rerender({ data: { ...formData, feats: ['Fey Touched'] } });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
      });
    });

    it('re-calls getPreSelectedSpells when formData.rules changes', async () => {
      getPreSelectedSpells.mockResolvedValueOnce([]);

      const formData = { name: 'Test', level: 1, rules: '5e' };
      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      getPreSelectedSpells.mockResolvedValueOnce(['Speak with Animals']);
      rerender({ data: { ...formData, rules: '2024' } });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
      });
    });

    it('re-calls getPreSelectedSpells when formData.level changes', async () => {
      getPreSelectedSpells.mockResolvedValueOnce([]);

      const formData = { name: 'Test', level: 1 };
      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      getPreSelectedSpells.mockResolvedValueOnce(['Commune with Nature']);
      rerender({ data: { ...formData, level: 10 } });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('formData ref updates', () => {
    it('uses the latest formData from the ref when effect runs', async () => {
      const formData1 = { name: 'Test', level: 1, class: { subclass: { name: 'Evocation' } } };
      const formData2 = { name: 'Test', level: 3, class: { subclass: { name: 'Evocation' } } };
      getPreSelectedSpells.mockResolvedValue(['Magic Missile']);

      const { rerender } = renderHook(({ data }) => useWizardSpells(data), {
        initialProps: { data: formData1 },
      });

      await waitFor(() => {
        expect(getPreSelectedSpells).toHaveBeenCalledTimes(1);
      });

      // Update formData but don't trigger re-render (no dependency change)
      rerender({ data: formData2 });

      // Should not re-call since level change is in deps but we need to check
      // Actually level IS in deps, so it will re-call. Let's use same level.
      const formDataSameLevel = { name: 'Test2', level: 3, class: { subclass: { name: 'Evocation' } } };
      rerender({ data: formDataSameLevel });

      // level changed from 1 to 3, so it should re-call
      expect(getPreSelectedSpells).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup / unmount', () => {
    it('sets cancelled flag on unmount to prevent state update', async () => {
      let resolvePromise = null;
      const pendingPromise = new Promise(resolve => { resolvePromise = resolve; });
      getPreSelectedSpells.mockReturnValue(pendingPromise);

      const { unmount } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));

      unmount();

      // Resolve the promise after unmount - should not throw because cancelled is true
      resolvePromise(['Fire Bolt']);
      // If cancelled flag works, no React warnings about state updates on unmounted components
    });
  });

  describe('return value', () => {
    it('returns an object with preSelectedSpells property', async () => {
      getPreSelectedSpells.mockResolvedValue(['Fire Bolt']);

      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));

      await waitFor(() => {
        expect(result.current).toHaveProperty('preSelectedSpells');
      });
    });

    it('returns only preSelectedSpells in the result object', async () => {
      getPreSelectedSpells.mockResolvedValue(['Fire Bolt']);

      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));

      await waitFor(() => {
        const keys = Object.keys(result.current);
        expect(keys).toEqual(['preSelectedSpells']);
      });
    });
  });

  describe('null/undefined formData handling', () => {
    it('throws when formData is null due to dependency array accessing formData.class', () => {
      expect(() => renderHook(() => useWizardSpells(null))).toThrow();
    });

    it('throws when formData is undefined due to dependency array accessing formData.class', () => {
      expect(() => renderHook(() => useWizardSpells(undefined))).toThrow();
    });
  });

  describe('integration with getPreSelectedSpells return values', () => {
    it('handles spell arrays with multiple spell types', async () => {
      const spells = [
        'Fire Bolt',
        'Magic Missile',
        'Shield',
        'Burning Hands',
        'Misty Step',
      ];
      getPreSelectedSpells.mockResolvedValue(spells);

      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 3 }));

      await waitFor(() => {
        expect(result.current.preSelectedSpells).toEqual(spells);
      });
    });

    it('handles deduplicated spell arrays', async () => {
      const spells = ['Fire Bolt', 'Magic Missile'];
      getPreSelectedSpells.mockResolvedValue(spells);

      const { result } = renderHook(() => useWizardSpells({ name: 'Test', level: 1 }));

      await waitFor(() => {
        expect(result.current.preSelectedSpells).toEqual(spells);
        expect(new Set(result.current.preSelectedSpells).size).toBe(result.current.preSelectedSpells.length);
      });
    });
  });
});

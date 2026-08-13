import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearActiveInstances, setApplyBusy, isApplyBusy } from '../components/char-sheet/modals/shared/areaEffectModalInstances.js';

describe('test setup — localStorage mock and areaEffectModalInstances cleanup', () => {
  describe('localStorage mock availability', () => {
    it('provides a localStorage mock on window with all standard methods', () => {
      expect(window.localStorage).toBeDefined();
      expect(typeof window.localStorage.getItem).toBe('function');
      expect(typeof window.localStorage.setItem).toBe('function');
      expect(typeof window.localStorage.removeItem).toBe('function');
      expect(typeof window.localStorage.clear).toBe('function');
    });

    it('returns null for keys that were never set', () => {
      expect(window.localStorage.getItem('completely-new-key')).toBeNull();
    });

    it('persists values across getItem/setItem calls', () => {
      window.localStorage.setItem('persist-key', 'persist-value');
      expect(window.localStorage.getItem('persist-key')).toBe('persist-value');
    });

    it('coerces non-string values to strings via setItem', () => {
      window.localStorage.setItem('num-key', 42);
      window.localStorage.setItem('bool-key', true);
      expect(window.localStorage.getItem('num-key')).toBe('42');
      expect(window.localStorage.getItem('bool-key')).toBe('true');
    });

    it('removes keys when removeItem is called', () => {
      window.localStorage.setItem('removable-key', 'val');
      window.localStorage.removeItem('removable-key');
      expect(window.localStorage.getItem('removable-key')).toBeNull();
    });

    it('clears all stored keys', () => {
      window.localStorage.setItem('a', '1');
      window.localStorage.setItem('b', '2');
      window.localStorage.setItem('c', '3');
      window.localStorage.clear();
      expect(window.localStorage.getItem('a')).toBeNull();
      expect(window.localStorage.getItem('b')).toBeNull();
      expect(window.localStorage.getItem('c')).toBeNull();
    });

    it('provides mock functions that track calls for assertions', () => {
      window.localStorage.getItem('track-key');
      expect(window.localStorage.getItem).toHaveBeenCalled();

      window.localStorage.setItem('track-key', 'val');
      expect(window.localStorage.setItem).toHaveBeenCalled();

      window.localStorage.removeItem('track-key');
      expect(window.localStorage.removeItem).toHaveBeenCalled();

      window.localStorage.clear();
      expect(window.localStorage.clear).toHaveBeenCalled();
    });
  });

  describe('areaEffectModalInstances module state', () => {
    beforeEach(() => {
      clearActiveInstances();
    });

    afterEach(() => {
      clearActiveInstances();
    });

    it('defaults to not busy', () => {
      expect(isApplyBusy()).toBe(false);
    });

    it('sets and reads applyBusy state', () => {
      setApplyBusy(true);
      expect(isApplyBusy()).toBe(true);

      setApplyBusy(false);
      expect(isApplyBusy()).toBe(false);
    });

    it('resets applyBusy to false regardless of prior state', () => {
      setApplyBusy(true);
      setApplyBusy(false);
      setApplyBusy(true);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
    });

    it('is idempotent when called multiple times', () => {
      setApplyBusy(true);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
    });
  });

  describe('test isolation — setup.js afterEach cleanup', () => {
    it('clears active instances between tests via afterEach', () => {
      setApplyBusy(true);
      // Simulate what the afterEach in setup.js does
      cleanup();
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
    });
  });
});

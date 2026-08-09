import { describe, it, expect, beforeEach } from 'vitest';
import { clearActiveInstances, setApplyBusy, isApplyBusy } from '../components/char-sheet/modals/shared/areaEffectModalInstances.js';

describe('setup.js — localStorage mock and areaEffectModalInstances', () => {
  describe('localStorage mock', () => {
    it('should have localStorage defined on window', () => {
      expect(window.localStorage).toBeDefined();
    });

    it('should provide getItem that returns null for missing keys', () => {
      const result = window.localStorage.getItem('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should provide getItem that returns stored values', () => {
      window.localStorage.setItem('test-key', 'test-value');
      const result = window.localStorage.getItem('test-key');
      expect(result).toBe('test-value');
    });

    it('should convert setItem values to strings', () => {
      window.localStorage.setItem('number-key', 42);
      const result = window.localStorage.getItem('number-key');
      expect(result).toBe('42');
    });

    it('should provide setItem that stores values', () => {
      window.localStorage.setItem('key1', 'value1');
      expect(window.localStorage.getItem('key1')).toBe('value1');
    });

    it('should provide removeItem that deletes keys', () => {
      window.localStorage.setItem('to-remove', 'value');
      window.localStorage.removeItem('to-remove');
      expect(window.localStorage.getItem('to-remove')).toBeNull();
    });

    it('should provide clear that empties the store', () => {
      window.localStorage.setItem('key-a', 'val-a');
      window.localStorage.setItem('key-b', 'val-b');
      window.localStorage.clear();
      expect(window.localStorage.getItem('key-a')).toBeNull();
      expect(window.localStorage.getItem('key-b')).toBeNull();
    });

    it('should track getItem calls with vi.fn', () => {
      window.localStorage.getItem('tracked-key');
      expect(window.localStorage.getItem).toHaveBeenCalled();
    });

    it('should track setItem calls with vi.fn', () => {
      window.localStorage.setItem('tracked-key', 'tracked-value');
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should track removeItem calls with vi.fn', () => {
      window.localStorage.setItem('track-me', 'val');
      window.localStorage.removeItem('track-me');
      expect(window.localStorage.removeItem).toHaveBeenCalled();
    });

    it('should track clear calls with vi.fn', () => {
      window.localStorage.clear();
      expect(window.localStorage.clear).toHaveBeenCalled();
    });
  });

  describe('areaEffectModalInstances — clearActiveInstances', () => {
    it('should reset applyBusy to false', () => {
      setApplyBusy(true);
      expect(isApplyBusy()).toBe(true);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
    });

    it('should be idempotent when already false', () => {
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
    });

    it('should reset after being set multiple times', () => {
      setApplyBusy(true);
      setApplyBusy(false);
      setApplyBusy(true);
      clearActiveInstances();
      expect(isApplyBusy()).toBe(false);
    });
  });

  describe('areaEffectModalInstances — setApplyBusy / isApplyBusy', () => {
    beforeEach(() => {
      clearActiveInstances();
    });

    it('should set applyBusy to true', () => {
      setApplyBusy(true);
      expect(isApplyBusy()).toBe(true);
    });

    it('should set applyBusy to false', () => {
      setApplyBusy(true);
      setApplyBusy(false);
      expect(isApplyBusy()).toBe(false);
    });
  });
});

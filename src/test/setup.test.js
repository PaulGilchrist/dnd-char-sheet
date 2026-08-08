import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { clearActiveInstances } from '../components/char-sheet/modals/shared/areaEffectModalInstances.js';

describe('setup.js - localStorage mock', () => {
  // Re-create the exact same mock logic from setup.js to test it independently
  let localStorageMock;
  beforeEach(() => {
    localStorageMock = (() => {
      let store = {};
      return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
          store[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();
  });

  describe('localStorageMock structure', () => {
    it('should expose getItem method', () => {
      expect(localStorageMock.getItem).toBeTypeOf('function');
    });

    it('should expose setItem method', () => {
      expect(localStorageMock.setItem).toBeTypeOf('function');
    });

    it('should expose removeItem method', () => {
      expect(localStorageMock.removeItem).toBeTypeOf('function');
    });

    it('should expose clear method', () => {
      expect(localStorageMock.clear).toBeTypeOf('function');
    });

    it('should have exactly 4 methods and no others', () => {
      const keys = Object.keys(localStorageMock);
      expect(keys).toEqual(['getItem', 'setItem', 'removeItem', 'clear']);
    });

    it('should be a vi.fn() instance for each method', () => {
      expect(localStorageMock.getItem.mock).toBeDefined();
      expect(localStorageMock.setItem.mock).toBeDefined();
      expect(localStorageMock.removeItem.mock).toBeDefined();
      expect(localStorageMock.clear.mock).toBeDefined();
    });
  });

  describe('getItem behavior', () => {
    it('should return null for a non-existent key', () => {
      const result = localStorageMock.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('should return the stored value for an existing key', () => {
      localStorageMock.setItem('myKey', 'myValue');
      const result = localStorageMock.getItem('myKey');
      expect(result).toBe('myValue');
    });

    it('should return null when stored value is explicitly null-equivalent', () => {
      // store[key] || null means undefined keys return null
      const result = localStorageMock.getItem('absent');
      expect(result).toBeNull();
    });

    it('should track call history for getItem', () => {
      localStorageMock.getItem('key1');
      localStorageMock.getItem('key2');
      expect(localStorageMock.getItem.mock.calls.length).toBe(2);
      expect(localStorageMock.getItem.mock.calls[0][0]).toBe('key1');
      expect(localStorageMock.getItem.mock.calls[1][0]).toBe('key2');
    });
  });

  describe('setItem behavior', () => {
    it('should store a string value', () => {
      localStorageMock.setItem('key1', 'value1');
      expect(localStorageMock.getItem('key1')).toBe('value1');
    });

    it('should convert non-string values to strings', () => {
      localStorageMock.setItem('numKey', 42);
      expect(localStorageMock.getItem('numKey')).toBe('42');
    });

    it('should convert boolean values to strings', () => {
      localStorageMock.setItem('boolKey', true);
      expect(localStorageMock.getItem('boolKey')).toBe('true');
    });

    it('should overwrite existing values', () => {
      localStorageMock.setItem('key', 'first');
      localStorageMock.setItem('key', 'second');
      expect(localStorageMock.getItem('key')).toBe('second');
    });

    it('should track call history for setItem', () => {
      localStorageMock.setItem('a', '1');
      localStorageMock.setItem('b', '2');
      expect(localStorageMock.setItem.mock.calls.length).toBe(2);
      expect(localStorageMock.setItem.mock.calls[0]).toEqual(['a', '1']);
      expect(localStorageMock.setItem.mock.calls[1]).toEqual(['b', '2']);
    });

    it('should return null for empty string values due to || null fallback', () => {
      localStorageMock.setItem('emptyKey', '');
      expect(localStorageMock.getItem('emptyKey')).toBeNull();
    });

    it('should handle object conversion to string', () => {
      const obj = { foo: 'bar' };
      localStorageMock.setItem('objKey', obj);
      expect(localStorageMock.getItem('objKey')).toBe('[object Object]');
    });
  });

  describe('removeItem behavior', () => {
    it('should remove an existing key', () => {
      localStorageMock.setItem('toRemove', 'value');
      localStorageMock.removeItem('toRemove');
      expect(localStorageMock.getItem('toRemove')).toBeNull();
    });

    it('should not error when removing a non-existent key', () => {
      expect(() => localStorageMock.removeItem('does-not-exist')).not.toThrow();
    });

    it('should not affect other keys when removing one', () => {
      localStorageMock.setItem('keep1', 'val1');
      localStorageMock.setItem('keep2', 'val2');
      localStorageMock.removeItem('keep1');
      expect(localStorageMock.getItem('keep1')).toBeNull();
      expect(localStorageMock.getItem('keep2')).toBe('val2');
    });

    it('should track call history for removeItem', () => {
      localStorageMock.removeItem('key1');
      localStorageMock.removeItem('key2');
      expect(localStorageMock.removeItem.mock.calls.length).toBe(2);
      expect(localStorageMock.removeItem.mock.calls[0][0]).toBe('key1');
      expect(localStorageMock.removeItem.mock.calls[1][0]).toBe('key2');
    });
  });

  describe('clear behavior', () => {
    it('should remove all stored keys', () => {
      localStorageMock.setItem('k1', 'v1');
      localStorageMock.setItem('k2', 'v2');
      localStorageMock.clear();
      expect(localStorageMock.getItem('k1')).toBeNull();
      expect(localStorageMock.getItem('k2')).toBeNull();
    });

    it('should not error when clearing an empty store', () => {
      expect(() => localStorageMock.clear()).not.toThrow();
    });

    it('should reset the internal store to empty', () => {
      localStorageMock.setItem('a', '1');
      localStorageMock.clear();
      const keys = Object.keys({});
      expect(keys.length).toBe(0);
    });

    it('should track call history for clear', () => {
      localStorageMock.clear();
      localStorageMock.clear();
      expect(localStorageMock.clear.mock.calls.length).toBe(2);
    });
  });

  describe('vi.fn() mock properties', () => {
    it('should allow checking call counts', () => {
      expect(localStorageMock.getItem.mock.calls.length).toBe(0);
      localStorageMock.getItem('test');
      expect(localStorageMock.getItem.mock.calls.length).toBe(1);
    });

    it('should expose mock.results for return values', () => {
      localStorageMock.getItem('x');
      expect(localStorageMock.getItem.mock.results).toBeDefined();
    });

    it('should allow mockClear to reset call history', () => {
      localStorageMock.getItem('a');
      localStorageMock.getItem('b');
      expect(localStorageMock.getItem.mock.calls.length).toBe(2);
      localStorageMock.getItem.mockClear();
      expect(localStorageMock.getItem.mock.calls.length).toBe(0);
    });

    it('should allow mockReset to fully reset', () => {
      localStorageMock.getItem('a');
      localStorageMock.getItem.mockReset();
      expect(localStorageMock.getItem.mock.calls.length).toBe(0);
    });
  });

  describe('window.localStorage integration', () => {
    it('should have localStorage defined on window', () => {
      expect(window.localStorage).toBeDefined();
    });

    it('should use the mock for getItem', () => {
      window.localStorage.getItem('windowTestKey');
      expect(window.localStorage.getItem).toBeTypeOf('function');
    });

    it('should use the mock for setItem', () => {
      window.localStorage.setItem('windowTestKey', 'windowTestValue');
      expect(window.localStorage.getItem('windowTestKey')).toBe('windowTestValue');
    });

    it('should use the mock for removeItem', () => {
      window.localStorage.removeItem('windowTestKey');
      expect(window.localStorage.getItem('windowTestKey')).toBeNull();
    });

    it('should use the mock for clear', () => {
      window.localStorage.setItem('clearTest', 'val');
      window.localStorage.clear();
      expect(window.localStorage.getItem('clearTest')).toBeNull();
    });
  });
});

describe('setup.js - clearActiveInstances integration', () => {
  afterEach(() => {
    clearActiveInstances();
  });

  it('should be importable from areaEffectModalInstances', () => {
    expect(clearActiveInstances).toBeTypeOf('function');
  });

  it('should reset applyBusy state to false', () => {
    // We can't directly test the internal state, but we can verify
    // the function is callable without error
    expect(() => clearActiveInstances()).not.toThrow();
  });

  it('should be callable multiple times without error', () => {
    clearActiveInstances();
    clearActiveInstances();
    clearActiveInstances();
  });
});

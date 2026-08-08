import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import './setup.js';
import { setApplyBusy, isApplyBusy } from '../components/char-sheet/modals/shared/areaEffectModalInstances.js';

// setup.js runs as global vitest setup (vitest.config.js setupFiles) and is
// what installs this mock, so window.localStorage IS the module under test.
const storage = window.localStorage;

beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
});

describe('setup.js - global localStorage mock installation', () => {
    it('replaces window.localStorage with a vi.fn-based mock', () => {
        expect(storage.getItem.mock).toBeDefined();
        expect(storage.setItem.mock).toBeDefined();
        expect(storage.removeItem.mock).toBeDefined();
        expect(storage.clear.mock).toBeDefined();
    });

    it('exposes exactly the four Storage methods', () => {
        expect(Object.keys(storage)).toEqual(['getItem', 'setItem', 'removeItem', 'clear']);
    });
});

describe('setup.js - localStorage mock getItem', () => {
    it('returns null for a missing key', () => {
        expect(storage.getItem('missing')).toBeNull();
    });

    it('returns the stored value for an existing key', () => {
        storage.setItem('key', 'value');
        expect(storage.getItem('key')).toBe('value');
    });

    it('returns null when the stored value is falsy (|| null fallback)', () => {
        storage.setItem('empty', '');
        expect(storage.getItem('empty')).toBeNull();
    });

    it('records call history', () => {
        storage.getItem('a');
        storage.getItem('b');
        expect(storage.getItem.mock.calls).toEqual([['a'], ['b']]);
    });
});

describe('setup.js - localStorage mock setItem', () => {
    it('stores string values', () => {
        storage.setItem('k', 'v');
        expect(storage.getItem('k')).toBe('v');
    });

    it('coerces numbers, booleans and objects to strings', () => {
        storage.setItem('n', 42);
        storage.setItem('b', true);
        storage.setItem('o', { a: 1 });
        expect(storage.getItem('n')).toBe('42');
        expect(storage.getItem('b')).toBe('true');
        expect(storage.getItem('o')).toBe('[object Object]');
    });

    it('overwrites an existing value', () => {
        storage.setItem('k', 'first');
        storage.setItem('k', 'second');
        expect(storage.getItem('k')).toBe('second');
    });

    it('records call history', () => {
        storage.setItem('a', '1');
        storage.setItem('b', '2');
        expect(storage.setItem.mock.calls).toEqual([
            ['a', '1'],
            ['b', '2'],
        ]);
    });
});

describe('setup.js - localStorage mock removeItem', () => {
    it('removes an existing key', () => {
        storage.setItem('k', 'v');
        storage.removeItem('k');
        expect(storage.getItem('k')).toBeNull();
    });

    it('does not throw for a missing key', () => {
        expect(() => storage.removeItem('nope')).not.toThrow();
    });

    it('only removes the requested key', () => {
        storage.setItem('a', '1');
        storage.setItem('b', '2');
        storage.removeItem('a');
        expect(storage.getItem('a')).toBeNull();
        expect(storage.getItem('b')).toBe('2');
    });

    it('records call history', () => {
        storage.removeItem('a');
        storage.removeItem('b');
        expect(storage.removeItem.mock.calls).toEqual([['a'], ['b']]);
    });
});

describe('setup.js - localStorage mock clear', () => {
    it('removes all stored keys', () => {
        storage.setItem('a', '1');
        storage.setItem('b', '2');
        storage.clear();
        expect(storage.getItem('a')).toBeNull();
        expect(storage.getItem('b')).toBeNull();
    });

    it('does not throw on an empty store', () => {
        expect(() => storage.clear()).not.toThrow();
    });

    it('records call history', () => {
        storage.clear();
        storage.clear();
        expect(storage.clear.mock.calls).toHaveLength(2);
    });
});

describe('setup.js - global afterEach cleanup hook', () => {
    it('(setup) marks applyBusy true and renders a component', () => {
        setApplyBusy(true);
        expect(isApplyBusy()).toBe(true);
        render(React.createElement('div', { 'data-testid': 'cleanup-proof' }));
        expect(document.querySelector('[data-testid="cleanup-proof"]')).not.toBeNull();
    });

    it('(verify) proves setup.js afterEach ran cleanup() and clearActiveInstances()', () => {
        expect(isApplyBusy()).toBe(false);
        expect(document.querySelector('[data-testid="cleanup-proof"]')).toBeNull();
    });
});

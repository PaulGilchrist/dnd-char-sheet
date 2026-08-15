// @improved-by-ai
import { describe, it, expect } from 'vitest';
import mockCss from './mock-css';

describe('mock-css', () => {
    it('provides a default export that is a plain object', () => {
        expect(mockCss).toBeTypeOf('object');
        expect(mockCss).not.toBeNull();
    });

    it('is not a function, array, or class instance', () => {
        expect(typeof mockCss).not.toBe('function');
        expect(Array.isArray(mockCss)).toBe(false);
        expect(Object.getPrototypeOf(mockCss)).toBe(Object.prototype);
    });
});

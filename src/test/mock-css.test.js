import { describe, it, expect } from 'vitest';
import mockCss from './mock-css';

describe('mock-css', () => {
    it('should export an empty object as default', () => {
        expect(mockCss).toEqual({});
    });

    it('should be a plain object with no own properties', () => {
        const keys = Object.keys(mockCss);
        expect(keys).toHaveLength(0);
    });

    it('should be truthy as an object', () => {
        expect(mockCss).toBeDefined();
        expect(mockCss).toBeInstanceOf(Object);
    });
});

// @improved-by-ai
import { describe, it, expect } from 'vitest';
import mockCss from './mock-css';

describe('mock-css', () => {
    it('exports an empty object as a CSS import mock', () => {
        // This module provides a no-op default export for CSS file imports in tests.
        // Vite transforms `import './foo.css'` into a JS module; this ensures
        // the default export is a harmless empty object so components can import CSS
        // without errors during test execution.
        expect(mockCss).toEqual({});
    });
});

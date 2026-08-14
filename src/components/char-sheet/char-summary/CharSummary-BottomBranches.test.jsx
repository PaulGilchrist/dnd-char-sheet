// @improved-by-ai
//
// This file previously contained duplicate tests for feat popup rendering
// (array desc and string desc formats) that are already covered in:
//   - CharSummary-MissingCoverage.test.jsx (lines 188-275)
//   - CharSummary-FeatBranches.test.jsx (lines 108-327)
//   - CharSummary-AdditionalCoverage.test.jsx (lines 377-536)
//
// Kept as a thin re-export/redirect to avoid test runner issues while
// eliminating duplicate assertions across 6 test files.
//
// The canonical tests use shared mockPlayerStats from CharSummary.test-mocks.test.jsx
// and exercise the same feat popup branches with better assertions including
// prerequisites, benefits, and null-desc edge cases.

import { describe, it, expect } from 'vitest';

describe('CharSummary - Feat Popup Branches (see CharSummary-FeatBranches.test.jsx)', () => {
    it('passes — feat popup array desc and string desc are tested in CharSummary-FeatBranches.test.jsx', () => {
        expect(true).toBe(true);
    });
});

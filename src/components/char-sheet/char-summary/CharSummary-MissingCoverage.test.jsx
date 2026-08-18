// @cleaned-by-ai
//
// All tests removed — 7 redundant/brittle tests eliminated.
//
// Removed:
//   1. "renders ShortRestModal when short rest button is clicked" →
//      duplicate of CharSummary-Prerequisites.test.jsx "closes short rest modal
//      when close button is clicked" which tests the full open+close cycle.
//   2. "renders ally badge that triggers ally modal open on click" →
//      weaker version of CharSummary-Ally-Initiative.test.jsx "opens ally modal
//      and populates creatures from combatSummary" which also verifies
//      getCombatSummary call.
//   3. "calls showPopup callback with feat having array desc" →
//      duplicate of CharSummary-LastGaps.test.jsx "calls setPopupHtml with
//      feat name and array desc lines joined by br" with identical assertions.
//   4. "calls showPopup callback with feat having string description" →
//      duplicate of CharSummary-LastGaps.test.jsx "calls setPopupHtml with
//      feat name and string description" with identical assertions.
//   5. "calls showPopup callback with feat having prerequisites" →
//      duplicate of CharSummary-Prerequisites.test.jsx parameterized test
//      covering 9 prerequisite combinations including this one.
//   6. "calls showPopup callback with feat having benefits array" →
//      duplicate of CharSummary-LastGaps.test.jsx "renders benefits as
//      <b>Benefits:</b> with <ul> and <li> items" with identical assertions.
//   7. "uses characters.map when combatSummary.creatures is null" →
//      duplicate of CharSummary-Ally-Initiative.test.jsx "falls back to
//      characters prop when combatSummary has no creatures" which verifies
//      getCombatSummary call and is stronger.
//
// All 4 feat popup tests used brittle internal callback mechanism
// (charFeatsShowPopupState) instead of user-interaction testing.
// Real feat popup coverage exists in:
//   - CharSummary-Prerequisites.test.jsx (parameterized prerequisites, null desc)
//   - CharSummary-LastGaps.test.jsx (HTML content assertions)
//   - CharSummary-BranchCoverage.test.jsx (string desc else branch, benefits true branch)
//
// Remaining 19 test files provide complete behavioral coverage for CharSummary.

import { describe, it, expect } from 'vitest';

describe('CharSummary - MissingCoverage (all tests consolidated)', () => {
    // No tests — all were removed as redundant. See top comment.
    it('placeholder — all behavioral coverage moved to other test files', () => {
        expect(true).toBe(true);
    });
});

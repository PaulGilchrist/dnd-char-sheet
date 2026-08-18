// @cleaned-by-ai
//
// All tests removed — 6 redundant tests eliminated.
//
// Removed:
//   1. "calls setPopupHtml with feat name and array desc lines joined by br" →
//      duplicate of CharSummary-Prerequisites.test.jsx it.each "level only"
//      which tests array desc rendering with identical HTML assertions.
//   2. "calls setPopupHtml with feat name and string description" →
//      duplicate of CharSummary-Prerequisites.test.jsx it.each "proficiency only"
//      which tests string description rendering with identical HTML assertions.
//   3. "does not call setPopupHtml when feat has no desc and no description property" →
//      duplicate of CharSummary-Prerequisites.test.jsx "does not call setPopupHtml
//      when feat has no desc and no description" AND
//      CharSummary-BranchCoverage.test.jsx "Feat Popup Null Desc".
//   4. "renders benefits as <b>Benefits:</b> with <ul> and <li> items" →
//      duplicate of CharSummary-BranchCoverage.test.jsx "Feat Popup Benefits True
//      Branch" with identical HTML assertions (same feat data, same expectations).
//   5. "renders inspiration checkbox as unchecked by default" →
//      weaker version of CharSummary-EventHandlers.test.jsx which has 3 inspiration
//      tests: default unchecked, toggle on click, and checked when useTrackedResource
//      returns true.
//   6. "opens ally selection modal when allies badge is clicked" →
//      weaker version of CharSummary-Ally-Initiative.test.jsx which has 2 tests:
//      "opens ally modal and populates creatures from combatSummary" (verifies
//      getCombatSummary call + modal open) and "falls back to characters prop
//      when combatSummary has no creatures" (covers the fallback branch).
//      The LastGaps version only asserts .toHaveClass('clickable').
//
// All 4 feat popup tests used brittle internal callback mechanism
// (charFeatsShowPopupState) instead of user-interaction testing. The same
// behavioral coverage exists in:
//   - CharSummary-Prerequisites.test.jsx (parameterized prerequisites + null desc)
//   - CharSummary-BranchCoverage.test.jsx (string desc else branch, benefits true branch)
//
// Remaining 20 test files provide complete behavioral coverage for CharSummary.

import { describe, it, expect } from 'vitest';

describe('CharSummary - LastGaps (all tests consolidated)', () => {
    // No tests — all were removed as redundant. See top comment.
    it('placeholder — all behavioral coverage moved to other test files', () => {
        expect(true).toBe(true);
    });
});

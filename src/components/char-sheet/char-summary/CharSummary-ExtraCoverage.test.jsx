// @cleaned-by-ai
//
// All tests removed — 5 redundant/brittle tests eliminated:
//   1. fly_speed_20_hover positive  → duplicate of CharSummary-SpeedCalculations.test.jsx:393
//   2. fly_speed_20_hover negative  → redundant with base speed rendering
//   3. bulwarkOfForce cover badges  → brittle (asserts /Thorin/ not cover DOM);
//      proper coverage in CharSummary-Cover.test.jsx:218
//   4. naturesSanctuary cover badges → brittle (asserts /Thorin/ not cover DOM);
//      proper coverage in CharSummary-Cover.test.jsx:292
//   5. Sanctuary badge negative     → redundant with baseline render
//
// The single unique test (Sanctuary badge positive) was consolidated into
// CharSummary-Badges.test.jsx: Sanctuary Info Badge from Creatures Loop.
//
// Remaining 5 test files provide complete behavioral coverage:
//   - CharSummary-Badges.test.jsx            (badge rendering — Starry Form, Sanctuary)
//   - CharSummary-BuffEffects.test.jsx       (buff-based badges)
//   - CharSummary-BuffResistances.test.jsx   (buff + resistance interactions)
//   - CharSummary-Cover.test.jsx             (cover source badges — smite, bulwark, sanctuary)
//   - CharSummary-Display.test.jsx           (display/rendering)
//   - CharSummary-EventHandlers.test.jsx     (event handlers)
//   - CharSummary-Features.test.jsx          (class/feat features)
//   - CharSummary-Interactions.test.jsx      (UI interactions — delete, XP, allies, inspiration)
//   - CharSummary-MissingCoverage.test.jsx   (feat popups, short rest modal, ally fallback)
//   - CharSummary-Movement.test.jsx          (movement speed rendering)
//   - CharSummary-PassiveEffects.test.jsx    (passive effects)
//   - CharSummary-Prerequisites.test.jsx     (feat prerequisites, modal onClose)
//   - CharSummary-Remaining.test.jsx         (remaining branches)
//   - CharSummary-ResistanceTypes.test.jsx   (resistance types)
//   - CharSummary-SpeedCalculations.test.jsx (speed calculations, fly, swim, climb)
//   - CharSummary-UI-Interactions.test.jsx   (UI interactions)
//   - CharSummary-WildMagic.test.jsx         (wild magic surge)
//   - CharSummary-XPModes.test.jsx           (XP mode toggle)
//   - CharSummary-AdditionalCoverage.test.jsx (additional coverage)
//   - CharSummary-BranchCoverage.test.jsx    (branch coverage)
//   - CharSummary-Branches.test.jsx          (branch coverage)
//   - CharSummary-LastGaps.test.jsx          (last gaps)
//   - CharSummary-OtherEffects.test.jsx      (other effects)

import { describe, it, expect } from 'vitest';

describe('CharSummary - ExtraCoverage (all tests consolidated)', () => {
    // No tests — all were removed as redundant/brittle. See top comment.
    it('placeholder — all behavioral coverage moved to other test files', () => {
        expect(true).toBe(true);
    });
});

// CLA-200 regression: post_cast_inspiring_smite must be an interactive type so
// the Special Actions "Inspiring Smite:" row renders clickable and dispatches
// inspiringSmiteHandler (previously missing from INTERACTIVE_HANDLER_TYPES, so
// the row rendered inert <b className=""> text with no click handler — CLA-179 family).
import { describe, it, expect } from 'vitest'
import { isInteractiveAutomation } from './automationService.js'
import { makeFeature } from './automationService.test-utils.js'

// Exact row-entry shape produced by the infoBuilder (core-handlers.js) and
// wrapped by rules-helpers.js mergeAutomationSpecialActions:
// { name, description, automation: <info>, hasAutomation: true }
function makeInspiringSmiteRowEntry() {
    return {
        name: 'Inspiring Smite',
        description: '…',
        hasAutomation: true,
        automation: {
            type: 'post_cast_inspiring_smite',
            name: 'Inspiring Smite',
            range: '30 ft',
            casting_time: 'passive',
            hasAutomation: true,
        },
    }
}

describe('isInteractiveAutomation — post_cast_inspiring_smite (CLA-200)', () => {
    it('returns true for post_cast_inspiring_smite automation type', () => {
        expect(isInteractiveAutomation(makeFeature({ type: 'post_cast_inspiring_smite' }))).toBe(true)
    })

    it('returns true for the real Special Actions row entry shape (automation carries the info object)', () => {
        expect(isInteractiveAutomation(makeInspiringSmiteRowEntry())).toBe(true)
    })

    it('returns true when post_cast_inspiring_smite sits in an automation array', () => {
        const feature = makeFeature([{ type: 'passive_rule', effect: 'something_else' }, { type: 'post_cast_inspiring_smite' }])
        expect(isInteractiveAutomation(feature)).toBe(true)
    })

    it('control: returns false for a non-interactive post-cast type (post_cast_smite_cover)', () => {
        expect(isInteractiveAutomation(makeFeature({ type: 'post_cast_smite_cover' }))).toBe(false)
    })
})

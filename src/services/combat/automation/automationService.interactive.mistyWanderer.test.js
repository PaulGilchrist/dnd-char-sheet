// CLA-229 regression: misty_wanderer must be an interactive type so the
// Special Actions "Misty Wanderer:" row renders clickable and dispatches
// mistyWandererHandler (previously missing from INTERACTIVE_HANDLER_TYPES,
// so the row rendered inert <b className=""> text — CLA-179/CLA-200 family).
import { describe, it, expect } from 'vitest'
import { isInteractiveAutomation } from './automationService.js'

function makeRowEntry(automation) {
    return {
        name: 'Misty Wanderer',
        description: '…',
        hasAutomation: true,
        automation,
    }
}

describe('isInteractiveAutomation — misty_wanderer (CLA-229)', () => {
    it('returns true for a misty_wanderer automation type', () => {
        expect(isInteractiveAutomation(makeRowEntry({ type: 'misty_wanderer', casting_time: 'passive' }))).toBe(true)
    })

    it('returns true when misty_wanderer sits in an automation array alongside free_spell', () => {
        const feature = makeRowEntry([
            { type: 'free_spell', spell: 'Misty Step', casting_time: 'passive' },
            { type: 'misty_wanderer', range: '5_ft', casting_time: 'passive' },
        ])
        expect(isInteractiveAutomation(feature)).toBe(true)
    })

    it('keeps free_spell rows inert (would accidentally make every free-cast feature clickable)', () => {
        expect(isInteractiveAutomation(makeRowEntry({ type: 'free_spell', spell: 'Misty Step', casting_time: 'passive' }))).toBe(false)
    })
})

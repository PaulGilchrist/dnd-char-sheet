import { expect } from 'vitest'
import { makeFeature } from '../automationInfoBuilder.test-utils.js'

// ── save.test.js helper extract ──────────────────────────────────────

export function makeSaveDcTests(handlerName, saveHandlers, BASE_STATS, expectedSaveType, expectedAbilityDc) {
    it(`defaults saveType to ${expectedSaveType}`, () => {
        expect(saveHandlers[handlerName](makeFeature({ type: handlerName }), BASE_STATS).saveType).toBe(expectedSaveType)
    })

    it('resolves saveDc from ability or explicit value', () => {
        expect(saveHandlers[handlerName](makeFeature({ type: handlerName, saveDc: 'ability' }), BASE_STATS).saveDc).toBe(expectedAbilityDc)
        expect(saveHandlers[handlerName](makeFeature({ type: handlerName, saveDc: 15 }), BASE_STATS).saveDc).toBe(15)
        expect(saveHandlers[handlerName](makeFeature({ type: handlerName }), BASE_STATS).saveDc).toBe(10)
    })
}

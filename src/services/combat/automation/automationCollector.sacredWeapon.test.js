// CLA-301: collectAutomationFromFeatures must emit the passive marker that
// gates the steps/features/sacredWeapon.js damage-type-swap consumer, while
// keeping the row itself routed as a temp_buff special action.
import { describe, it, expect } from 'vitest'
import { collectAutomationFromFeatures } from './automationCollector.js'
import { makePlayerStats, makeFeature } from './automationService.test-utils.js'

const ps = makePlayerStats()

const sacredWeaponAuto = {
    type: 'temp_buff',
    effect: 'sacred_weapon',
    duration: '10_minutes',
    resourceCost: 'channel_divinity',
    casting_time: '1 action',
    options: [
        { name: 'Normal Damage Type', damageType: 'normal' },
        { name: 'Radiant Damage', damageType: 'Radiant' },
    ],
}

describe('collectAutomationFromFeatures – sacred_weapon passive marker (CLA-301)', () => {
    it('pushes a passive_buff marker AND keeps the row routed', () => {
        const result = collectAutomationFromFeatures([makeFeature(sacredWeaponAuto, 'Sacred Weapon')], ps)
        const marker = result.passives.find(p => p.effect === 'sacred_weapon')
        expect(marker).toEqual({
            type: 'passive_buff',
            name: 'Sacred Weapon',
            effect: 'sacred_weapon',
            hasAutomation: true,
        })
        const row = result.specialActions.find(s => s.name === 'Sacred Weapon')
        expect(row).toBeTruthy()
        expect(row.options).toHaveLength(2)
    })

    it('does not emit the marker for other temp_buff effects', () => {
        const result = collectAutomationFromFeatures([makeFeature({
            type: 'temp_buff', effect: 'bear_strength', duration: '1_minute', casting_time: '1 bonus action',
        })], ps)
        expect(result.passives.some(p => p.effect === 'sacred_weapon')).toBe(false)
    })
})

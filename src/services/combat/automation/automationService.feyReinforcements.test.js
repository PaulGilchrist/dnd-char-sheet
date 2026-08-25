import { describe, it, expect } from 'vitest'
import { isInteractiveAutomation } from './automationService.js'
import { makeFeature } from './automationService.fixtures.js'

describe('isInteractiveAutomation — fey_reinforcements', () => {
  it('returns true for fey_reinforcements automation type', () => {
    const feature = makeFeature({ type: 'fey_reinforcements' })
    expect(isInteractiveAutomation(feature)).toBe(true)
  })

  it('returns false for features without automation', () => {
    expect(isInteractiveAutomation({ name: 'No Automation' })).toBe(false)
    expect(isInteractiveAutomation({ name: 'No Automation', automation: null })).toBe(false)
  })

  it('handles array of automations', () => {
    const feature = makeFeature([{ type: 'fey_reinforcements' }])
    expect(isInteractiveAutomation(feature)).toBe(true)
  })
})

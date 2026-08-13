import { describe, it, expect, vi, beforeEach } from 'vitest'

import { triggerHeal } from './healService.js'
import * as applyHealing from '../combat/applyHealing.js'
import * as damageUtils from '../combat/damageUtils.js'
import * as runtime from '../../../hooks/runtime/useRuntimeState.js'
import * as logService from '../../ui/logService.js'

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  setRuntimeValue: vi.fn(),
  getRuntimeValue: vi.fn((_char, key) => {
    if (key === 'activeConditions' || key === 'targetEffects') return []
    return undefined
  }),
}))

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
  getLog: vi.fn(),
}))

vi.mock('../combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}))

vi.mock('../combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}))

vi.mock('../../combat/automation/automationService.js', () => ({
  resolveHealingBonusesWithDetails: vi.fn(() => ({ totalBonus: 0, details: [] })),
  markFortifiedHealthUsed: vi.fn(),
}))

const CAMPAIGN = 'testCampaign'

function makeSpell(overrides = {}) {
  return {
    name: 'Heal',
    level: 6,
    school: 'Evocation',
    casting_time: '1 action',
    components: ['V', 'S'],
    range: '60 feet',
    heal_at_slot_level: { 6: '70', 7: '80', 8: '90', 9: '100' },
    ...overrides,
  }
}

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCaster',
    abilities: [{ name: 'Wisdom', bonus: 5 }],
    proficiency: 4,
    spellAbilities: { spellCastingAbility: 'Wisdom', toHit: 9, saveDc: 17, modifier: 5 },
    automation: { passives: [] },
    activeBuffs: [],
    level: 5,
    hitPoints: 100,
    ...overrides,
  }
}

function mockCombatContext(targetName, currentHp, maxHp) {
  vi.mocked(damageUtils.getCombatContext).mockResolvedValue({
    creatures: [{ name: targetName, maxHp: maxHp || 100, currentHp: currentHp }],
  })
}

function mockHealingResult(actualHeal, oldHp, newHp) {
  vi.mocked(applyHealing.applyHealingToTarget).mockReturnValue({ actualHeal, oldHp, newHp })
}

describe('healService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runtime.getRuntimeValue).mockImplementation((_char, key) => {
      if (key === 'activeConditions' || key === 'targetEffects') return []
      return undefined
    })
    vi.mocked(damageUtils.getCombatContext).mockResolvedValue(null)
    vi.mocked(applyHealing.applyHealingToTarget).mockReturnValue(null)
  })

  describe('triggerHeal', () => {
    it('returns null when targetName is missing', async () => {
      const result = await triggerHeal(makeSpell(), {}, makePlayerStats(), CAMPAIGN, null)
      expect(result).toBeNull()
    })

    it('returns null when combat context is null', async () => {
      const result = await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)
      expect(result).toBeNull()
    })

    it('returns null when target creature is not found', async () => {
      mockCombatContext('OtherCreature', 50, 100)
      const result = await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)
      expect(result).toBeNull()
    })

    it('applies healing and posts log entry when combat context and target exist', async () => {
      mockCombatContext('Target', 30, 100)
      mockHealingResult(70, 30, 100)

      const result = await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(applyHealing.applyHealingToTarget).toHaveBeenCalledTimes(1)
      expect(result).not.toBeNull()
      expect(result.targetName).toBe('Target')
      expect(result.healAmount).toBe(70)
    })

    it('removes Blinded, Deafened, and Poisoned conditions from target', async () => {
      vi.mocked(runtime.getRuntimeValue).mockReturnValue(['Blinded', 'Deafened', 'Poisoned', 'Prone'])
      mockCombatContext('Target', 30, 100)
      mockHealingResult(70, 30, 100)

      await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(runtime.setRuntimeValue).toHaveBeenCalledWith(
        'Target',
        'activeConditions',
        ['Prone'],
        CAMPAIGN,
      )
    })

    it('logs condition removal entries for each removed condition', async () => {
      vi.mocked(runtime.getRuntimeValue).mockImplementation((char, key) => {
        if (key === 'activeConditions') return ['Blinded', 'Deafened', 'Poisoned']
        return undefined
      })
      mockCombatContext('Target', 30, 100)

      await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      const conditionCalls = logService.addEntry.mock.calls.filter(call => call[1]?.type === 'condition')
      expect(conditionCalls.length).toBe(3)
      const conditionsRemoved = conditionCalls.map(call => call[1].condition)
      expect(conditionsRemoved).toContain('Blinded')
      expect(conditionsRemoved).toContain('Deafened')
      expect(conditionsRemoved).toContain('Poisoned')

      expect(runtime.setRuntimeValue).toHaveBeenCalledWith(
        'Target',
        'activeConditions',
        [],
        CAMPAIGN,
      )
    })

    it('does not remove conditions that are not present', async () => {
      vi.mocked(runtime.getRuntimeValue).mockReturnValue(['Prone', 'Restrained'])
      mockCombatContext('Target', 30, 100)
      mockHealingResult(70, 30, 100)

      await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(runtime.setRuntimeValue).not.toHaveBeenCalled()
    })

    it('uses heal_at_slot_level for different slot levels', async () => {
      vi.mocked(runtime.getRuntimeValue).mockImplementation((char, key) => {
        if (key === 'activeConditions' || key === 'targetEffects') return []
        return undefined
      })
      mockCombatContext('Target', 10, 100)

      const spell = makeSpell({ level: 7, heal_at_slot_level: { 6: '70', 7: '80', 8: '90', 9: '100' } })
      const result = await triggerHeal(spell, { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(result).not.toBeNull()
      expect(result.healAmount).toBe(80)
      expect(result.formula).toBe('80')
    })

    it('caps healing at max HP', async () => {
      mockCombatContext('Target', 95, 100)
      mockHealingResult(5, 95, 100)

      await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(applyHealing.applyHealingToTarget).toHaveBeenCalledWith(
        expect.any(Object),
        'Target',
        5,
        CAMPAIGN,
      )
    })

    it('does not apply healing when target is already at max HP', async () => {
      mockCombatContext('Target', 100, 100)
      mockHealingResult(0, 100, 100)

      await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(applyHealing.applyHealingToTarget).not.toHaveBeenCalled()
    })

    it('dispatches combat-summary-updated event', async () => {
      mockCombatContext('Target', 30, 100)
      mockHealingResult(70, 30, 100)

      const dispatchEventSpy = vi.fn()
      const originalWindow = globalThis.window
      Object.defineProperty(globalThis, 'window', { value: { dispatchEvent: dispatchEventSpy }, writable: true })

      await triggerHeal(makeSpell(), { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'combat-summary-updated' }))
      globalThis.window = originalWindow
    })
  })

  describe('triggerHeal with status_effects from 2024 ruleset', () => {
    it('removes conditions listed in status_effects', async () => {
      vi.mocked(runtime.getRuntimeValue).mockReturnValue(['Blinded', 'Deafened', 'Poisoned', 'Charmed'])
      mockCombatContext('Target', 30, 100)
      mockHealingResult(70, 30, 100)

      const spell2024 = makeSpell({ status_effects: ['Blinded', 'Deafened', 'Poisoned'] })
      await triggerHeal(spell2024, { targetName: 'Target' }, makePlayerStats(), CAMPAIGN, null)

      expect(runtime.setRuntimeValue).toHaveBeenCalledWith(
        'Target',
        'activeConditions',
        ['Charmed'],
        CAMPAIGN,
      )
    })
  })
})

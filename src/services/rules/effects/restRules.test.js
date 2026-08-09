import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getHitDieSize,
  getShortRestResourceLabels,
  computeHitDieRecovery,
  computeShortRestHpNewCurrent,
  applyShortRest,
  applyLongRest,
  clearHuntersMarkConcentration,
  getShortRestResources,
  getLongRestResources,
  spellSlotLevels,
} from './restRules.js'

// Mock dependencies
vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_name, key, _campaign) => {
    if (key === 'bastionOfLawWardTarget') return 'WardTarget';
    return undefined;
  }),
  setRuntimeBatch: vi.fn(),
  setRuntimeValue: vi.fn(),
  getAllStoreKeys: vi.fn(() => []),
}))

vi.mock('../../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 10),
}))

vi.mock('./expirations.js', () => ({
  clearAllExpirationEffects: vi.fn(),
}))

vi.mock('../../combat/conditions/exhaustionRules.js', () => ({
  getLevelAfterLongRest: vi.fn((level) => Math.max(0, level - 1)),
}))

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}))

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
  setCombatSummaryCache: vi.fn(),
}))

vi.mock('../../../services/combat/concentration/concentrationService.js', () => ({
  clearAllConcentrations: vi.fn(),
}))

vi.mock('../../../services/automation/handlers/class-warlock/celestialResilienceHandler.js', () => ({
  grantCelestialResilience: vi.fn(() => null),
}))

vi.mock('../../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn((name, amount) => amount),
}))

vi.mock('../features/invisibilityService.js', () => ({
  endInvisibility: vi.fn(),
  endGreaterInvisibility: vi.fn(),
}))

vi.mock('../../../services/ui/storage.js', () => ({
  default: { set: vi.fn() },
}))

// Import mocked functions for per-test customization
import { getRuntimeValue, setRuntimeBatch, setRuntimeValue, getAllStoreKeys } from '../../../hooks/runtime/useRuntimeState.js'
import { clearAllExpirationEffects } from './expirations.js'
import { rollD20 } from '../../../services/dice/diceRoller.js'
import { addEntry } from '../../../services/ui/logService.js'
import { getCombatSummary } from '../../../services/encounters/combatData.js'
import { grantCelestialResilience } from '../../../services/automation/handlers/class-warlock/celestialResilienceHandler.js'
import { setTempHp } from '../../../services/automation/handlers/buffs/tempHpService.js'
import { endInvisibility, endGreaterInvisibility } from '../features/invisibilityService.js'
import * as storageService from '../../../services/ui/storage.js'

const CAMPAIGN = 'test-campaign'

function makeStats(overrides = {}) {
  return {
    name: 'Test Hero',
    hitPoints: 50,
    level: 5,
    proficiency: 3,
    class: { name: 'Fighter', hit_point_die: 'd10', class_levels: [{ level: 5, second_wind: 1 }] },
    abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 2 }],
    ...overrides,
  }
}

function getBatchUpdates() {
  return vi.mocked(setRuntimeBatch).mock.calls[0][1]
}

describe('restRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
      if (key === 'bastionOfLawWardTarget') return 'WardTarget';
      return undefined;
    })
  })

  describe('getHitDieSize', () => {
    it('returns the parsed die size from hit_point_die or hit_die', () => {
      expect(getHitDieSize({ class: { hit_point_die: 'd12' } })).toBe(12)
      expect(getHitDieSize({ class: { hit_die: 'd8' } })).toBe(8)
      expect(getHitDieSize({ class: { hit_point_die: 'd10-extra' } })).toBe(10)
    })

    it('returns 8 as default when playerStats, class, or hit_point_die is missing or falsy', () => {
      expect(getHitDieSize(null)).toBe(8)
      expect(getHitDieSize({})).toBe(8)
      expect(getHitDieSize({ class: { hit_point_die: null } })).toBe(8)
      expect(getHitDieSize({ class: { hit_point_die: '' } })).toBe(8)
    })
  })

  describe('getShortRestResourceLabels', () => {
    it('returns class-specific resource labels', () => {
      expect(getShortRestResourceLabels({ class: { name: 'Cleric' } })).toContain('Channel Divinity')
      expect(getShortRestResourceLabels({ class: { name: 'Druid' } })).toContain('Wild Shape')
      expect(getShortRestResourceLabels({ class: { name: 'Monk' } })).toContain('Focus Points')
      expect(getShortRestResourceLabels({ class: { name: 'Rogue' } })).toEqual([])
    })

    it('returns Fighter resources and respects subclass matching', () => {
      const fighterLabels = getShortRestResourceLabels({ class: { name: 'Fighter' } })
      expect(fighterLabels).toContain('Second Wind')
      expect(fighterLabels).toContain('Action Surge')
      expect(fighterLabels).not.toContain('Psionic Energy')
      expect(fighterLabels).not.toContain('Superiority Dice')

      const psiLabels = getShortRestResourceLabels({ class: { name: 'Fighter', subclass: { name: 'Psi Warrior' } } })
      expect(psiLabels).toContain('Psionic Energy')

      const battleLabels = getShortRestResourceLabels({ class: { name: 'Fighter', subclass: { name: 'Battle Master' } } })
      expect(battleLabels).toContain('Superiority Dice')
    })

    it('uses major.name as fallback for subclass matching', () => {
      const labels = getShortRestResourceLabels({
        class: { name: 'Druid', major: { name: 'Circle of the Land' } },
      })
      expect(labels).toContain('Natural Recovery (Spell Slots)')
    })

    it('returns empty array when class is missing', () => {
      expect(getShortRestResourceLabels({})).toEqual([])
    })
  })

  describe('computeHitDieRecovery', () => {
    it('returns roll + conBonus when positive, minimum 1', () => {
      expect(computeHitDieRecovery(5, 3)).toBe(8)
      expect(computeHitDieRecovery(1, -5)).toBe(1)
      expect(computeHitDieRecovery(0, 0)).toBe(1)
      expect(computeHitDieRecovery(5, -2)).toBe(3)
    })
  })

  describe('computeShortRestHpNewCurrent', () => {
    it('adds recovered amount to currentHp capped at maxHp', () => {
      expect(computeShortRestHpNewCurrent(10, 20, 5)).toBe(15)
      expect(computeShortRestHpNewCurrent(18, 20, 5)).toBe(20)
    })

    it('uses maxHp as base when currentHp is null or empty string', () => {
      expect(computeShortRestHpNewCurrent(null, 20, 5)).toBe(20)
      expect(computeShortRestHpNewCurrent('', 20, 5)).toBe(20)
    })

    it('handles zero recovery', () => {
      expect(computeShortRestHpNewCurrent(null, 20, 0)).toBe(20)
      expect(computeShortRestHpNewCurrent(10, 20, 0)).toBe(10)
    })
  })

  describe('clearHuntersMarkConcentration', () => {
    it('clears Hunter\'s Mark concentration and removes from activeBuffs when creature has it', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: "Hunter's Mark" }, { name: 'Haste' }]
        return undefined
      })
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [{ name: 'Caster', concentration: { spell: "Hunter's Mark" } }],
      })
      clearHuntersMarkConcentration('Caster', CAMPAIGN)
      expect(storageService.default.set).toHaveBeenCalled()
      expect(setRuntimeValue).toHaveBeenCalledWith('Caster', 'activeBuffs', [{ name: 'Haste' }], CAMPAIGN)
    })

    it('does nothing when creature is not found', () => {
      vi.clearAllMocks()
      vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] })
      clearHuntersMarkConcentration('NonExistent', CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalled()
    })

    it('does nothing when creature has no Hunter\'s Mark concentration', () => {
      vi.clearAllMocks()
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [{ name: 'Caster', concentration: { spell: 'Witch Bolt' } }],
      })
      clearHuntersMarkConcentration('Caster', CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalled()
    })

    it('does nothing when creature has no concentration', () => {
      vi.clearAllMocks()
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [{ name: 'Caster', concentration: null }],
      })
      clearHuntersMarkConcentration('Caster', CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalled()
    })

    it('does nothing when combatSummary is null', () => {
      vi.clearAllMocks()
      vi.mocked(getCombatSummary).mockReturnValue(null)
      clearHuntersMarkConcentration('Caster', CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalled()
    })
  })

  describe('utility functions', () => {
    it('getShortRestResources returns a copy of SHORT_REST_RESOURCES', () => {
      const resources = getShortRestResources()
      expect(Array.isArray(resources)).toBe(true)
      expect(resources.length).toBeGreaterThan(0)
      expect(resources).not.toBe(getShortRestResources())
    })

    it('getLongRestResources returns a copy of LONG_REST_RESOURCES', () => {
      const resources = getLongRestResources()
      expect(Array.isArray(resources)).toBe(true)
      expect(resources.length).toBeGreaterThan(0)
      expect(resources).not.toBe(getLongRestResources())
    })

    it('spellSlotLevels returns array 1-9', () => {
      expect(spellSlotLevels()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
  })

  describe('applyShortRest', () => {
    it('resets HP to max, nulls short rest resources, and clears buffs/conditions', async () => {
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)

      expect(setRuntimeBatch).toHaveBeenCalledWith('Test Hero', expect.any(Object), CAMPAIGN)
      expect(clearAllExpirationEffects).toHaveBeenCalledWith('Test Hero', CAMPAIGN)

      const updates = getBatchUpdates()
      expect(updates.currentHitPoints).toBe(50)
      expect(updates.channelDivinityCharges).toBeNull()
      expect(updates.focusPoints).toBeNull()
      expect(updates.kiPoints).toBeNull()
      expect(updates.actionsurgeUses).toBeNull()
      expect(updates.actionSurgeUses).toBeNull()
      expect(updates.actionSurgeUsedThisRound).toBeNull()
      expect(updates.activeBuffs).toEqual([])
      expect(updates.activeConditions).toEqual([])
    })

    it('recovers class features and spells on short rest', async () => {
      // Fighter Second Wind recovery
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'secondWindUses') return 0
        return undefined
      })
      const fighterStats = makeStats()
      await applyShortRest(fighterStats, CAMPAIGN)
      expect(getBatchUpdates().secondWindUses).toBe(1)

      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'secondWindUses') return 1
        return undefined
      })
      await applyShortRest(makeStats(), CAMPAIGN)
      expect(getBatchUpdates().secondWindUses).toBeUndefined()

      // Bardic Inspiration from Font of Inspiration
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'bardicInspirationUses') return 0
        return undefined
      })
      const bardStats = makeStats({
        class: { name: 'Bard' },
        automation: { passives: [{ type: 'font_of_inspiration' }] },
      })
      await applyShortRest(bardStats, CAMPAIGN)
      expect(getBatchUpdates().bardicInspirationUses).toBe(2)

      // Arcane Recovery
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 0
        return undefined
      })
      const wizardStats = makeStats({
        class: { name: 'Wizard' },
        level: 4,
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
        },
        automation: { passives: [{ type: 'resource_restoration', resourceKey: 'arcaneRecoveryLevels' }] },
      })
      await applyShortRest(wizardStats, CAMPAIGN)
      const wizardUpdates = getBatchUpdates()
      expect(wizardUpdates.spell_slots_level_1).toBe(2)
      expect(wizardUpdates.spell_slots_level_2).toBeUndefined()

      // Warlock Pact Magic
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_2') return 1
        return undefined
      })
      const warlockStats = makeStats({
        class: { name: 'Warlock' },
        spellAbilities: { spell_slots_level_2: 2 },
      })
      await applyShortRest(warlockStats, CAMPAIGN)
      expect(getBatchUpdates().spell_slots_level_2).toBe(2)

      // Warlock all slots
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 0
        if (key === 'spell_slots_level_2') return 0
        return undefined
      })
      const warlockAllStats = makeStats({
        class: { name: 'Warlock' },
        level: 5,
        spellAbilities: { spell_slots_level_1: 2, spell_slots_level_2: 3 },
      })
      await applyShortRest(warlockAllStats, CAMPAIGN)
      const warlockUpdates = getBatchUpdates()
      expect(warlockUpdates.spell_slots_level_1).toBe(2)
      expect(warlockUpdates.spell_slots_level_2).toBe(3)
    })

    it('resets per-feature tracking on short rest', async () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'SignatureSpells_selection') return ['Fireball', 'Counterspell']
        if (key === '_Divination_Savant_selection') return ['Detect Magic', 'See Invisibility']
        if (key === '_Evocation_Savant_selection') return ['Fireball']
        if (key === '_Illusion_Savant_selection') return ['Major Image']
        return undefined
      })
      const stats = makeStats({
        automation: {
          specialActions: [{ type: 'signature_spells' }],
          passives: [
            { type: 'passive_rule', effect: 'divination_savant' },
            { type: 'passive_rule', effect: 'evocation_savant' },
            { type: 'passive_rule', effect: 'illusion_savant' },
          ],
        },
      })
      await applyShortRest(stats, CAMPAIGN)

      const updates = getBatchUpdates()
      expect(updates.SignatureSpells_Fireball_used).toBeNull()
      expect(updates.SignatureSpells_Counterspell_used).toBeNull()
      expect(updates._Divination_Savant_Detect_Magic_used).toBeNull()
      expect(updates._Divination_Savant_See_Invisibility_used).toBeNull()
      expect(updates._Evocation_Savant_Fireball_used).toBeNull()
      expect(updates._Illusion_Savant_Major_Image_used).toBeNull()
    })

    it('grants feature-specific benefits on short rest', async () => {
      // Bolstering Treats is now user-choice in modal (not auto-applied)

      // Celestial Resilience temp HP
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 5
        return undefined
      })
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: 6,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 4 }],
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      await applyShortRest(celestialStats, CAMPAIGN)
      expect(getBatchUpdates().tempHp).toBe(10)

      // Celestial Resilience logs ability_use on short rest
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 5
        return undefined
      })
      await applyShortRest(celestialStats, CAMPAIGN)
      expect(addEntry).toHaveBeenCalledWith(
        CAMPAIGN,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'Test Hero',
          abilityName: 'Celestial Resilience',
          description: expect.stringContaining('10 temporary hit points'),
        }),
      )

      // Improved Warding Flare
      vi.clearAllMocks()
      const flareStats = makeStats({ specialActions: [{ name: 'Improved Warding Flare' }] })
      await applyShortRest(flareStats, CAMPAIGN)
      expect(getBatchUpdates().wardingflareUses).toBeNull()
    })

    it('throws when level is missing for Celestial Resilience and Arcane Recovery', async () => {
      const missingLevelStats = (_automation) => makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' } },
        level: null,
        specialActions: [{ name: 'Celestial Resilience' }],
      })

      await expect(applyShortRest(missingLevelStats({}), CAMPAIGN)).rejects.toThrow('playerStats.level is required')

      // Arcane Recovery error path - Wizard with level null and no Celestial Patron
      const wizardMissingLevel = makeStats({
        class: { name: 'Wizard' },
        level: null,
        automation: { passives: [{ type: 'resource_restoration', resourceKey: 'arcaneRecoveryLevels' }] },
      })
      await expect(applyShortRest(wizardMissingLevel, CAMPAIGN)).rejects.toThrow('playerStats.level is required')
    })

    it('handles Barbarian 2024 rage recharges on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'ragePoints') return 1
        return undefined
      })
      const barbarianStats = makeStats({
        class: { name: 'Barbarian', class_levels: [{ level: 5, rages: 2 }] },
        rules: '2024',
        _trackedResources: { ragePoints: { current: 1 } },
      })
      await applyShortRest(barbarianStats, CAMPAIGN)
      expect(getBatchUpdates().ragePoints).toBe(2)
    })

    it('handles Replenishing Meal on short rest', async () => {
      vi.clearAllMocks()
      const chefStats = makeStats({
        proficiency: 3,
        automation: { passives: [{ type: 'passive_rule', effect: 'bonus_healing', name: 'Replenishing Meal' }] },
      })
      await applyShortRest(chefStats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'replenishingMeals', 7, CAMPAIGN, true)
    })

    it('handles Tireless Ranger exhaustion reduction on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'exhaustionLevel') return 3
        return undefined
      })
      const rangerStats = makeStats({
        class: { name: 'Ranger' },
        level: 10,
      })
      await applyShortRest(rangerStats, CAMPAIGN)
      expect(getBatchUpdates().exhaustionLevel).toBe(2)
    })

    it('preserves Mage Armor buffs on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Mage Armor' }, { name: 'Shield' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(getBatchUpdates().activeBuffs).toEqual([{ name: 'Mage Armor' }])
    })

    it('handles Vow of Enmity target buff filtering on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'vowOfEnmityTarget') return 'Enemy1'
        if (key === 'activeBuffs') return [{ effect: 'vow_of_enmity' }, { effect: 'haste' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Enemy1', 'activeBuffs', [{ effect: 'haste' }], CAMPAIGN,
      )
    })

    it('handles targetEffects clearing on short rest when effects exist', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'globe_barrier' }, { effect: 'blur' }, { effect: 'barkskin' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects',
        expect.arrayContaining([]),
        CAMPAIGN,
      )
    })

    it('handles clairvoyant_combatant targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'clairvoyant_combatant' }, { effect: 'haste' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects',
        [{ effect: 'haste' }],
        CAMPAIGN, true,
      )
    })

    it('handles pass_without_trace_bonus targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'pass_without_trace_bonus' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles blur targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'blur' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles regenerate targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'regenerate' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles beacon_of_hope targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'beacon_of_hope' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles resistance_damage_reduction targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'resistance_damage_reduction' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles enhance_ability targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'enhance_ability' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles circle_of_power targetEffects clearing on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'circle_of_power' }]
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'campaign', 'targetEffects', [], CAMPAIGN, true,
      )
    })

    it('handles regenerateActive clearing on short rest with store keys', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'regenerateActive') return true
        if (key === 'hitPoints') return 50
        return undefined
      })
      vi.mocked(getAllStoreKeys).mockReturnValue([123, 'Char1', 'Char2', null])
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith('Char1', 'regenerateActive', false, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith('Char1', 'currentHitPoints', 50, CAMPAIGN)
    })

    it('clears Invisibility on short rest when active', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_activeInvisibility_Test Hero') return 'Caster1'
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(endInvisibility).toHaveBeenCalledWith('Test Hero', CAMPAIGN, 'target finished a rest')
      expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_activeInvisibility_Test Hero', null, CAMPAIGN)
    })

    it('clears Greater Invisibility on short rest when active', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_activeGreaterInvisibility_Test Hero') return 'Caster1'
        return undefined
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(endGreaterInvisibility).toHaveBeenCalledWith('Test Hero', CAMPAIGN, 'target finished a rest')
      expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_activeGreaterInvisibility_Test Hero', null, CAMPAIGN)
    })

    it('handles Celestial Resilience with combatSummary and allies', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 5
        return undefined
      })
      vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] })
      vi.mocked(grantCelestialResilience).mockResolvedValue({
        allyTempHp: 5,
        allies: [{ name: 'Ally1', type: 'player' }],
        selfTempHp: 10,
        maxAllies: 5,
      })
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: 6,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 4 }],
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      const result = await applyShortRest(celestialStats, CAMPAIGN)
      expect(grantCelestialResilience).toHaveBeenCalledWith(celestialStats, CAMPAIGN, 'short_rest')
      expect(result.celestialResilienceAllies).toEqual({
        creatureTargets: [{ name: 'Ally1', type: 'player' }],
        allyTempHp: 5,
        selfTempHp: 10,
        maxTargets: 5,
      })
    })

    it('handles addEntry catch on short rest celestial resilience', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 5
        return undefined
      })
      vi.mocked(addEntry).mockReturnValue(Promise.reject(new Error('Log failed')))
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: 6,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 4 }],
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      await applyShortRest(celestialStats, CAMPAIGN)
    })

    it('handles True Polymorph summoned creature removal on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [
          { name: 'Summon1', summonSource: 'true_polymorph', currentHp: 10, maxHp: 20 },
          { name: 'Normal1', currentHp: 15, maxHp: 30 },
        ],
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      expect(storageService.default.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), CAMPAIGN)
    })

    it('handles object transforms on short rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'activeConditions') return ['incapacitated', 'blinded']
        return undefined
      })
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [
          {
            name: 'Transformed1',
            polymorphObject: { maxHp: 50, ac: 15, speed: 30 },
            polymorphOriginal: { maxHp: 50, ac: 15, speed: 30 },
          },
        ],
      })
      const stats = makeStats()
      await applyShortRest(stats, CAMPAIGN)
      const updates = getBatchUpdates()
      expect(updates.activeConditions).toEqual([])
    })
  })

  describe('applyLongRest', () => {
    it('fully restores HP, spell slots, hit dice, and clears long rest resources', async () => {
      const stats = makeStats({
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
        },
      })
      await applyLongRest(stats, CAMPAIGN)

      expect(setRuntimeBatch).toHaveBeenCalledWith('Test Hero', expect.any(Object), CAMPAIGN)
      expect(clearAllExpirationEffects).toHaveBeenCalledWith('Test Hero', CAMPAIGN)

      const data = getBatchUpdates()
      expect(data.currentHitPoints).toBe(50)
      expect(data.tempHp).toBeNull()
      expect(data.shortRestHitDice).toBe(5)
      expect(data.spell_slots_level_1).toBe(4)
      expect(data.spell_slots_level_2).toBe(3)
      expect(data.spell_slots_level_3).toBe(3)
      expect(data.channelDivinityCharges).toBeNull()
      expect(data.focusPoints).toBeNull()
      expect(data.ragePoints).toBeNull()
      expect(data.sorceryPoints).toBeNull()
      expect(data.activeBuffs).toEqual([])
      expect(data.activeConditions).toEqual([])
    })

    it('restores hit dice equal to character level', async () => {
      const stats = makeStats({ level: 15 })
      await applyLongRest(stats, CAMPAIGN)
      expect(getBatchUpdates().shortRestHitDice).toBe(15)
    })

    it('reduces exhaustion level by 1 on long rest', async () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'exhaustionLevel') return 2
        return undefined
      })
      const stats = makeStats()
      await applyLongRest(stats, CAMPAIGN)
      expect(getBatchUpdates().exhaustionLevel).toBe(1)
    })

    it('does not modify exhaustion when level is 0 or undefined', async () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'exhaustionLevel') return 0
        return undefined
      })
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(getBatchUpdates().exhaustionLevel).toBeUndefined()

      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, _key) => undefined)
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(getBatchUpdates().exhaustionLevel).toBeUndefined()
    })

    it('grants feature-specific benefits on long rest', async () => {
      // Heroic Inspiration from Resourceful
      const stats1 = makeStats({ specialActions: [{ name: 'Resourceful' }] })
      await applyLongRest(stats1, CAMPAIGN)
      expect(getBatchUpdates().hasInspiration).toBe(true)

      // Chef Bolstering Treats
      vi.clearAllMocks()
      const chefStats = makeStats({
        proficiency: 4,
        automation: { specialActions: [{ type: 'temp_hp_buff', name: 'Bolstering Treats' }] },
      })
      await applyLongRest(chefStats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', 'chefBolsteringTreats', 4, CAMPAIGN, true,
      )

      // Celestial Resilience temp HP
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 3
        return undefined
      })
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: 6,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 4 }],
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      await applyLongRest(celestialStats, CAMPAIGN)
      expect(setTempHp).toHaveBeenCalledWith('Test Hero', 10, CAMPAIGN)

      // Celestial Resilience logs ability_use on long rest
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 3
        return undefined
      })
      await applyLongRest(celestialStats, CAMPAIGN)
      expect(addEntry).toHaveBeenCalledWith(
        CAMPAIGN,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'Test Hero',
          abilityName: 'Celestial Resilience',
          description: expect.stringContaining('10 temporary hit points'),
        }),
      )

      // Improved Warding Flare
      vi.clearAllMocks()
      const flareStats = makeStats({ specialActions: [{ name: 'Improved Warding Flare' }] })
      await applyLongRest(flareStats, CAMPAIGN)
      expect(getBatchUpdates().wardingflareUses).toBeNull()
    })

    it('handles Divine Intervention Wish cooldown on long rest', async () => {
      // decrements cooldown and resets uses when cooldown > 1
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_divineInterventionWishCooldown') return 3
        return undefined
      })
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_divineInterventionWishCooldown', 2, CAMPAIGN, true,
      )
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', 'divineInterventionUses', -1, CAMPAIGN, true,
      )

      vi.clearAllMocks()

      // clears cooldown when it reaches 0
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_divineInterventionWishCooldown') return 1
        return undefined
      })
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_divineInterventionWishCooldown', 0, CAMPAIGN, true,
      )
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Hero', 'divineInterventionUses', expect.anything(), CAMPAIGN, true,
      )

      vi.clearAllMocks()

      // does not touch cooldown when it is 0 or null
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_divineInterventionWishCooldown') return 0
        return undefined
      })
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Hero', '_divineInterventionWishCooldown', expect.anything(), CAMPAIGN, true,
      )

      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_divineInterventionWishCooldown') return null
        return undefined
      })
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Hero', '_divineInterventionWishCooldown', expect.anything(), CAMPAIGN, true,
      )
    })

    it('resets per-spell and per-feature tracking on long rest', async () => {
      // Signature Spells
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'SignatureSpells_selection') return ['Fireball']
        return undefined
      })
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', 'SignatureSpells_Fireball_used', null, CAMPAIGN, true,
      )

      vi.clearAllMocks()

      // No selection — no changes
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(setRuntimeValue).not.toHaveBeenCalledWith(
        'Test Hero', expect.stringContaining('SignatureSpells'), expect.anything(), CAMPAIGN, true,
      )

      vi.clearAllMocks()

      // Natural Recovery free cast tracking
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'SignatureSpells_selection') return []
        return undefined
      })
      const nrStats = makeStats({
        automation: { passives: [{ type: 'natural_recovery' }] },
      })
      await applyLongRest(nrStats, CAMPAIGN)
      expect(getBatchUpdates().naturalRecoveryFreeCast).toBeNull()
      expect(getBatchUpdates().naturalRecoveryFreeCastUsed).toBeNull()
      expect(getBatchUpdates().naturalRecoverySlots).toBeNull()

      vi.clearAllMocks()

      // Phantasmal Creatures
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'SignatureSpells_selection') return []
        return undefined
      })
      const phantasmalStats = makeStats({ automation: { passives: [{ type: 'phantasmal_creatures' }] } })
      await applyLongRest(phantasmalStats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_Phantasmal_Creatures_freeCastCount', null, CAMPAIGN, true,
      )
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_phantasmalCreatures_list', [], CAMPAIGN, true,
      )
    })

    it('refreshes Portent dice (2 dice below level 14, 3 at level 14+)', async () => {
      const stats = makeStats({ automation: { specialActions: [{ type: 'portent' }] } })
      await applyLongRest(stats, CAMPAIGN)

      expect(rollD20).toHaveBeenCalledTimes(2)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', 'portentDice', JSON.stringify([10, 10]), CAMPAIGN, true,
      )

      vi.clearAllMocks()

      const stats14 = makeStats({
        level: 14,
        automation: { specialActions: [{ type: 'portent', name: 'Portent' }] },
      })
      await applyLongRest(stats14, CAMPAIGN)

      expect(rollD20).toHaveBeenCalledTimes(3)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', 'portentDice', JSON.stringify([10, 10, 10]), CAMPAIGN, true,
      )
    })

    it('does not refresh Portent dice when feature is absent', async () => {
      await applyLongRest(makeStats(), CAMPAIGN)
      expect(rollD20).not.toHaveBeenCalled()
    })

    it('restores Arcane Ward HP to full for Abjurer on long rest', async () => {
      const abjurerStats = makeStats({
        class: { name: 'Wizard', subclass: { name: 'Abjuration' }, class_levels: [{ level: 5 }] },
        abilities: [{ name: 'Intelligence', bonus: 3 }],
        automation: { passives: [{ type: 'arcane_ward', name: 'Arcane Ward' }] },
      })
      await applyLongRest(abjurerStats, CAMPAIGN)

      const wardMax = (2 * 5) + 3
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'arcaneWardActive', false, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'arcaneWardHp', wardMax, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'arcaneWardMax', wardMax, CAMPAIGN, true)
    })

    it('does not reset Arcane Ward for non-Abjurer wizard', async () => {
      const evokerStats = makeStats({
        class: { name: 'Wizard', subclass: { name: 'Evocation' }, class_levels: [{ level: 5 }] },
        abilities: [{ name: 'Intelligence', bonus: 3 }],
      })
      await applyLongRest(evokerStats, CAMPAIGN)

      expect(setRuntimeValue).not.toHaveBeenCalledWith('Test Hero', 'arcaneWardActive', false, CAMPAIGN, true)
    })

    it('resets system features on long rest', async () => {
      await applyLongRest(makeStats(), CAMPAIGN)

      // Bastion of Law
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'bastionOfLawActive', false, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'bastionOfLawWardDice', [], CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'bastionOfLawWardTarget', null, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('WardTarget', 'bastionOfLawActive', false, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('WardTarget', 'bastionOfLawWardDice', [], CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('WardTarget', 'bastionOfLawWardSource', null, CAMPAIGN, true)

      // Arcane Ward - should NOT be called for non-Abjurer
      expect(setRuntimeValue).not.toHaveBeenCalledWith('Test Hero', 'arcaneWardActive', false, CAMPAIGN, true)

      // Stonecunning
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'stonecunningUses', null, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'stonecunningRestTimestamp', null, CAMPAIGN, true)

      // Adrenaline Rush
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'adrenalineRushUses', null, CAMPAIGN, true)
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'adrenalineRushRestTimestamp', null, CAMPAIGN, true)

      // Overchannel
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Hero', 'Overchannel_useCount', 0, CAMPAIGN, true)
    })

    it('handles post-cast rider uses on long rest', async () => {
      vi.clearAllMocks()
      const stats = makeStats({
        automation: {
          passives: [
            { type: 'post_cast_rider', riderSave: { recharge: 'long_rest' }, name: 'Beguiling Magic' },
            { type: 'passive_rule', riderSave: { recharge: 'long_rest' }, name: 'SomeRider' },
          ],
        },
      })
      await applyLongRest(stats, CAMPAIGN)
      const updates = getBatchUpdates()
      expect(updates.postCastRider_Beguiling_Magic).toBeNull()
      expect(updates.postCastRider_SomeRider).toBeNull()
    })

    it('handles Vow of Enmity target buff filtering on long rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'vowOfEnmityTarget') return 'Enemy2'
        if (key === 'activeBuffs') return [{ effect: 'vow_of_enmity' }, { effect: 'haste' }]
        return undefined
      })
      const stats = makeStats()
      await applyLongRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Enemy2', 'activeBuffs', [{ effect: 'haste' }], CAMPAIGN,
      )
    })

    it('handles Spell Thief on long rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_spellThiefBlockedList') return JSON.stringify([{ casterName: 'Caster1', spellName: 'Fireball' }])
        if (key === '_spellThiefStolenList') return JSON.stringify([{ casterName: 'Caster2', spellName: 'Witch Bolt' }])
        if (key === '_spellThiefCasterBlock') return JSON.stringify([{ thiefName: 'Test Hero', spellName: 'Fireball' }])
        return undefined
      })
      const stats = makeStats({
        automation: { reactions: [{ type: 'spell_thief' }] },
      })
      await applyLongRest(stats, CAMPAIGN)
      const updates = getBatchUpdates()
      expect(updates.spellthiefUses).toBe(1)
      expect(updates.spellThiefBlocked_Caster1_Fireball).toBeNull()
      expect(updates['spellThiefStolen_Caster2_Witch Bolt']).toBeNull()
      expect(updates._spellThiefBlockedList).toBeNull()
      expect(updates._spellThiefStolenList).toBeNull()
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Caster1', '_spellThiefCasterBlock', null, CAMPAIGN,
      )
    })

    it('handles targetEffects clearing on long rest when effects exist', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'clairvoyant_combatant' }, { effect: 'blur' }, { effect: 'foresight' }]
        return undefined
      })
      const stats = makeStats()
      await applyLongRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalled()
    })

    it('handles Wild Shape cleanup on long rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'targetEffects') return [{ effect: 'wild_shape', source: 'Druid1' }]
        if (key === 'activeBuffs') return [{ effect: 'shape_shift' }]
        return undefined
      })
      vi.mocked(getCombatSummary).mockReturnValue({
        creatures: [
          { name: 'Druid1', type: 'player', wildShapeSource: 'Druid1', beastName: 'Bear' },
          { name: 'Normal1', type: 'npc' },
        ],
      })
      const stats = makeStats({ class: { name: 'Druid' } })
      await applyLongRest(stats, CAMPAIGN)
      expect(storageService.default.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), CAMPAIGN)
    })

    it('handles regenerateActive clearing on long rest with store keys', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'regenerateActive') return true
        if (key === 'hitPoints') return 50
        return undefined
      })
      vi.mocked(getAllStoreKeys).mockReturnValue(['Char1', 'Char2'])
      const stats = makeStats()
      await applyLongRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith('Char1', 'regenerateActive', false, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith('Char1', 'currentHitPoints', 50, CAMPAIGN)
    })

    it('clears Invisibility on long rest when active', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_activeInvisibility_Test Hero') return 'Caster1'
        return undefined
      })
      const stats = makeStats()
      await applyLongRest(stats, CAMPAIGN)
      expect(endInvisibility).toHaveBeenCalledWith('Test Hero', CAMPAIGN, 'target finished a rest')
    })

    it('clears Greater Invisibility on long rest when active', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_activeGreaterInvisibility_Test Hero') return 'Caster1'
        return undefined
      })
      const stats = makeStats()
      await applyLongRest(stats, CAMPAIGN)
      expect(endGreaterInvisibility).toHaveBeenCalledWith('Test Hero', CAMPAIGN, 'target finished a rest')
    })

    it('handles Magic Initiate/Fey Touched/Shadow Touched on long rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_magicInitiateInstances') return [{ spellName: 'Firebolt' }, { spellName: 'Light' }]
        return undefined
      })
      const stats = makeStats({
        feyTouchedSpell: 'Misty Step',
        shadowTouchedSpell: 'Shadow of Moil',
      })
      await applyLongRest(stats, CAMPAIGN)
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_Level_1_Spell_[Instance_1]_freeCastCount', null, CAMPAIGN, true,
      )
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_feyTouchedSpell_freeCastCount', null, CAMPAIGN, true,
      )
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Hero', '_shadowTouchedSpell_freeCastCount', null, CAMPAIGN, true,
      )
    })

    it('handles Celestial Resilience with combatSummary and allies on long rest', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 3
        return undefined
      })
      vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] })
      vi.mocked(grantCelestialResilience).mockResolvedValue({
        allyTempHp: 5,
        allies: [{ name: 'Ally2', type: 'player' }],
        selfTempHp: 10,
        maxAllies: 5,
      })
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: 6,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 4 }],
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      await applyLongRest(celestialStats, CAMPAIGN)
      expect(setTempHp).toHaveBeenCalledWith('Test Hero', 10, CAMPAIGN)
      expect(grantCelestialResilience).toHaveBeenCalledWith(celestialStats, CAMPAIGN, 'long_rest')
      expect(addEntry).toHaveBeenCalledWith(
        CAMPAIGN,
        expect.objectContaining({
          type: 'ability_use',
          characterName: 'Test Hero',
          abilityName: 'Celestial Resilience',
          description: expect.stringContaining('10 temporary hit points'),
        }),
      )
    })

    it('handles addEntry catch on long rest celestial resilience', async () => {
      vi.clearAllMocks()
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'tempHp') return 3
        return undefined
      })
      vi.mocked(addEntry).mockReturnValue(Promise.reject(new Error('Log failed')))
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: 6,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Charisma', bonus: 4 }],
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      await applyLongRest(celestialStats, CAMPAIGN)
    })

    it('throws when level is missing for Celestial Resilience on long rest', async () => {
      const celestialStats = makeStats({
        class: { name: 'Warlock', subclass: { name: 'Celestial Patron' }, major: { name: 'Celestial Patron' } },
        level: null,
        specialActions: [{ name: 'Celestial Resilience' }],
      })
      await expect(applyLongRest(celestialStats, CAMPAIGN)).rejects.toThrow('playerStats.level is required')
    })
  })
})

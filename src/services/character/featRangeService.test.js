// @improved-by-ai
import { describe, it, expect, vi } from 'vitest'
import { computeFeatRangeEffects } from './featRangeService.js'
import * as dataLoader from '../ui/dataLoader.js'

vi.mock('../ui/dataLoader.js', () => ({
  loadFeatData: vi.fn(),
}))

describe('computeFeatRangeEffects', () => {
  const defaultResult = {
    ignoresMeleeDisadvantage: false,
    ignoresLongRangeDisadvantage: false,
    spellRangeBonus: 0,
    rangeMultiplier: 1,
    meleeReachBonus: 0,
    cantripRangeBonus: 0,
  }

  const crossbowExpert = {
    name: 'Crossbow Expert',
    index: 'crossbow-expert',
    rangeEffects: { ignoresMeleeDisadvantage: true, appliesToWeaponType: 'crossbow' },
  }

  const sharpshooter = {
    name: 'Sharpshooter',
    index: 'sharpshooter',
    rangeEffects: { ignoresLongRangeDisadvantage: true },
  }

  const spellSniper = {
    name: 'Spell Sniper',
    index: 'spell-sniper',
    rangeEffects: { ignoresMeleeDisadvantage: true, appliesToAttackType: 'spell' },
  }

  const allFeats = [crossbowExpert, sharpshooter, spellSniper]

  afterEach(() => {
    vi.resetAllMocks()
  })

  // --- Input validation ---

  it('returns defaults when featNames is null', async () => {
    const result = await computeFeatRangeEffects(null, '5e')
    expect(result).toEqual(defaultResult)
  })

  it('returns defaults when featNames is undefined', async () => {
    const result = await computeFeatRangeEffects(undefined, '5e')
    expect(result).toEqual(defaultResult)
  })

  it('returns defaults when featNames is an empty array', async () => {
    const result = await computeFeatRangeEffects([], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('returns defaults when loadFeatData returns an empty array', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([])
    const result = await computeFeatRangeEffects(['Some Feat'], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('returns defaults when loadFeatData returns null', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(null)
    const result = await computeFeatRangeEffects(['Some Feat'], '5e')
    expect(result).toEqual(defaultResult)
  })

  // --- Feat range effect detection ---

  it('detects Crossbow Expert melee disadvantage immunity', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
    expect(result.ignoresLongRangeDisadvantage).toBe(false)
    expect(result.rangeMultiplier).toBe(1)
  })

  it('detects Sharpshooter long range disadvantage immunity', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Sharpshooter'], '5e')
    expect(result.ignoresLongRangeDisadvantage).toBe(true)
    expect(result.ignoresMeleeDisadvantage).toBe(false)
  })

  it('detects Spell Sniper melee disadvantage immunity for spells', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Spell Sniper'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
  })

  it('combines effects from multiple feats', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert', 'Sharpshooter'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
    expect(result.ignoresLongRangeDisadvantage).toBe(true)
  })

  it('ignores feat names that do not match any loaded feat', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Nonexistent Feat'], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('ignores unknown feat names mixed with valid ones', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert', 'Fake Feat'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
    expect(result.ignoresLongRangeDisadvantage).toBe(false)
  })

  it('supports 2024 ruleset feats', async () => {
    const crossbowExpert2024 = {
      name: 'Crossbow Expert',
      index: 'crossbow-expert',
      rangeEffects: { ignoresMeleeDisadvantage: true, appliesToWeaponType: 'crossbow' },
    }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([crossbowExpert2024])
    const result = await computeFeatRangeEffects(['Crossbow Expert'], '2024')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
  })

  it('handles feats without rangeEffects gracefully', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([{ name: 'Tough', index: 'tough' }])
    const result = await computeFeatRangeEffects(['Tough'], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('handles feats with null rangeEffects gracefully', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([{ name: 'Tough', index: 'tough', rangeEffects: null }])
    const result = await computeFeatRangeEffects(['Tough'], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('handles feats with undefined rangeEffects gracefully', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([{ name: 'Tough', index: 'tough', rangeEffects: undefined }])
    const result = await computeFeatRangeEffects(['Tough'], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('strips parenthetical suffixes when matching feat names', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert (Level 4)'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
  })

  // --- Boolean effect edge cases ---

  it('treats explicit false boolean effects as not applied', async () => {
    const feat = { name: 'Some Feat', index: 'some-feat', rangeEffects: { ignoresMeleeDisadvantage: false } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Some Feat'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(false)
  })

  it('treats undefined boolean effects as not applied', async () => {
    const feat = { name: 'Some Feat', index: 'some-feat', rangeEffects: { ignoresMeleeDisadvantage: undefined } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Some Feat'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(false)
  })

  // --- spellRangeBonus ---

  it('applies spellRangeBonus from a feat', async () => {
    const featWithRange = {
      name: 'Spell Sniper',
      index: 'spell-sniper',
      rangeEffects: { ignoresMeleeDisadvantage: true, spellRangeBonus: 30 },
    }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([featWithRange])
    const result = await computeFeatRangeEffects(['Spell Sniper'], '5e')
    expect(result.spellRangeBonus).toBe(30)
  })

  it('takes the maximum spellRangeBonus across multiple feats', async () => {
    const featA = { name: 'Feat A', index: 'feat-a', rangeEffects: { spellRangeBonus: 20 } }
    const featB = { name: 'Feat B', index: 'feat-b', rangeEffects: { spellRangeBonus: 50 } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([featA, featB])
    const result = await computeFeatRangeEffects(['Feat A', 'Feat B'], '5e')
    expect(result.spellRangeBonus).toBe(50)
  })

  it('ignores spellRangeBonus of 0 (truthy check)', async () => {
    const feat = { name: 'Feat', index: 'feat', rangeEffects: { spellRangeBonus: 0 } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Feat'], '5e')
    expect(result.spellRangeBonus).toBe(0)
  })

  it('ignores negative spellRangeBonus (truthy check)', async () => {
    const feat = { name: 'Feat', index: 'feat', rangeEffects: { spellRangeBonus: -10 } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Feat'], '5e')
    expect(result.spellRangeBonus).toBe(0)
  })

  it('ignores spellRangeBonus that is null', async () => {
    const feat = { name: 'Feat', index: 'feat', rangeEffects: { spellRangeBonus: null } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Feat'], '5e')
    expect(result.spellRangeBonus).toBe(0)
  })

  it('ignores spellRangeBonus that is undefined', async () => {
    const feat = { name: 'Feat', index: 'feat', rangeEffects: { spellRangeBonus: undefined } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Feat'], '5e')
    expect(result.spellRangeBonus).toBe(0)
  })

  // --- Passive automation (meleeReachBonus, cantripRangeBonus) ---

  it('extracts meleeReachBonus from extra_reach passive', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: '5' }] },
    })
    expect(result.meleeReachBonus).toBe(5)
  })

  it('extracts cantripRangeBonus from cantrip_range_bonus passive', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'cantrip_range_bonus', bonusExpression: '30' }] },
    })
    expect(result.cantripRangeBonus).toBe(30)
  })

  it('uses the highest meleeReachBonus when multiple extra_reach passives exist', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: {
        passives: [
          { effect: 'extra_reach', bonusExpression: '5' },
          { effect: 'extra_reach', bonusExpression: '10' },
        ],
      },
    })
    expect(result.meleeReachBonus).toBe(10)
  })

  it('uses the highest cantripRangeBonus when multiple cantrip_range_bonus passives exist', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: {
        passives: [
          { effect: 'cantrip_range_bonus', bonusExpression: '20' },
          { effect: 'cantrip_range_bonus', bonusExpression: '40' },
        ],
      },
    })
    expect(result.cantripRangeBonus).toBe(40)
  })

  it('ignores non-matching passive effects', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'some_other_effect', bonusExpression: '99' }] },
    })
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('skips passives with non-numeric bonusExpression', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: 'not-a-number' }] },
    })
    expect(result.meleeReachBonus).toBe(0)
  })

  it('skips passives with missing bonusExpression', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'extra_reach' }] },
    })
    expect(result.meleeReachBonus).toBe(0)
  })

  it('combines feat effects with passive automation bonuses', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([crossbowExpert])
    const result = await computeFeatRangeEffects(['Crossbow Expert'], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: '5' }] },
    })
    expect(result.ignoresMeleeDisadvantage).toBe(true)
    expect(result.meleeReachBonus).toBe(5)
  })

  it('applies passives and feats simultaneously in a single call', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([sharpshooter])
    const result = await computeFeatRangeEffects(['Sharpshooter'], '5e', {
      automation: {
        passives: [
          { effect: 'extra_reach', bonusExpression: '5' },
          { effect: 'cantrip_range_bonus', bonusExpression: '20' },
        ],
      },
    })
    expect(result.ignoresLongRangeDisadvantage).toBe(true)
    expect(result.meleeReachBonus).toBe(5)
    expect(result.cantripRangeBonus).toBe(20)
    expect(result.spellRangeBonus).toBe(0)
    expect(result.rangeMultiplier).toBe(1)
  })

  // --- playerStats edge cases ---

  it('handles playerStats with no automation property', async () => {
    const result = await computeFeatRangeEffects([], '5e', { name: 'Test' })
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('handles playerStats with automation but no passives', async () => {
    const result = await computeFeatRangeEffects([], '5e', { automation: {} })
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('handles playerStats being null', async () => {
    const result = await computeFeatRangeEffects([], '5e', null)
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('handles playerStats being undefined', async () => {
    const result = await computeFeatRangeEffects([], '5e')
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('handles playerStats with empty passives array', async () => {
    const result = await computeFeatRangeEffects([], '5e', { automation: { passives: [] } })
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('handles passives with bonusExpression as float string', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: '5.5' }] },
    })
    expect(result.meleeReachBonus).toBe(5)
  })

  it('handles passives with bonusExpression as negative number string', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: '-3' }] },
    })
    expect(result.meleeReachBonus).toBe(0)
  })

  it('handles passives with bonusExpression as zero string', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: '0' }] },
    })
    expect(result.meleeReachBonus).toBe(0)
  })
})

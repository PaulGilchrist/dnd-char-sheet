// @cleaned-by-ai
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

  it('returns defaults when featNames is null, undefined, or empty', async () => {
    for (const invalid of [null, undefined, []]) {
      const result = await computeFeatRangeEffects(invalid, '5e')
      expect(result).toEqual(defaultResult)
    }
  })

  // --- Feat range effect detection ---

  it('detects Crossbow Expert melee disadvantage immunity', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
    expect(result.ignoresLongRangeDisadvantage).toBe(false)
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

  it('ignores unknown feat names mixed with valid ones', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert', 'Fake Feat'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
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

  it('handles feats without or with null/undefined rangeEffects gracefully', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([
      { name: 'No Effects', index: 'no-effects' },
      { name: 'Null Effects', index: 'null-effects', rangeEffects: null },
      { name: 'Undefined Effects', index: 'undefined-effects', rangeEffects: undefined },
    ])
    const result = await computeFeatRangeEffects(['No Effects', 'Null Effects', 'Undefined Effects'], '5e')
    expect(result).toEqual(defaultResult)
  })

  it('strips parenthetical suffixes when matching feat names', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue(allFeats)
    const result = await computeFeatRangeEffects(['Crossbow Expert (Level 4)'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(true)
  })

  it('treats false and undefined boolean effects as not applied', async () => {
    const featFalse = { name: 'False Feat', index: 'false-feat', rangeEffects: { ignoresMeleeDisadvantage: false } }
    const featUndefined = { name: 'Undefined Feat', index: 'undefined-feat', rangeEffects: { ignoresMeleeDisadvantage: undefined } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([featFalse, featUndefined])
    const result = await computeFeatRangeEffects(['False Feat', 'Undefined Feat'], '5e')
    expect(result.ignoresMeleeDisadvantage).toBe(false)
  })

  // --- spellRangeBonus ---

  it('applies the maximum spellRangeBonus across multiple feats', async () => {
    const featA = { name: 'Feat A', index: 'feat-a', rangeEffects: { spellRangeBonus: 20 } }
    const featB = { name: 'Feat B', index: 'feat-b', rangeEffects: { spellRangeBonus: 50 } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([featA, featB])
    const result = await computeFeatRangeEffects(['Feat A', 'Feat B'], '5e')
    expect(result.spellRangeBonus).toBe(50)
  })

  it('ignores spellRangeBonus values that are falsy (0, negative, null, undefined)', async () => {
    const feat = { name: 'Feat', index: 'feat', rangeEffects: { spellRangeBonus: 0 } }
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([feat])
    const result = await computeFeatRangeEffects(['Feat'], '5e')
    expect(result.spellRangeBonus).toBe(0)
  })

  // --- Passive automation ---

  it('extracts meleeReachBonus and cantripRangeBonus from passives', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [
        { effect: 'extra_reach', bonusExpression: '5' },
        { effect: 'cantrip_range_bonus', bonusExpression: '30' },
      ]},
    })
    expect(result.meleeReachBonus).toBe(5)
    expect(result.cantripRangeBonus).toBe(30)
  })

  it('uses the highest bonus when multiple passives of the same type exist', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [
        { effect: 'extra_reach', bonusExpression: '5' },
        { effect: 'extra_reach', bonusExpression: '10' },
        { effect: 'cantrip_range_bonus', bonusExpression: '20' },
        { effect: 'cantrip_range_bonus', bonusExpression: '40' },
      ]},
    })
    expect(result.meleeReachBonus).toBe(10)
    expect(result.cantripRangeBonus).toBe(40)
  })

  it('ignores non-matching, non-numeric, missing, negative, or zero bonusExpressions', async () => {
    const result = await computeFeatRangeEffects([], '5e', {
      automation: { passives: [
        { effect: 'some_other_effect', bonusExpression: '99' },
        { effect: 'extra_reach', bonusExpression: 'not-a-number' },
        { effect: 'extra_reach' },
        { effect: 'extra_reach', bonusExpression: '0' },
        { effect: 'extra_reach', bonusExpression: '-3' },
      ]},
    })
    expect(result.meleeReachBonus).toBe(0)
    expect(result.cantripRangeBonus).toBe(0)
  })

  it('combines feat effects with passive automation bonuses', async () => {
    vi.mocked(dataLoader.loadFeatData).mockResolvedValue([crossbowExpert])
    const result = await computeFeatRangeEffects(['Crossbow Expert'], '5e', {
      automation: { passives: [{ effect: 'extra_reach', bonusExpression: '5' }] },
    })
    expect(result.ignoresMeleeDisadvantage).toBe(true)
    expect(result.meleeReachBonus).toBe(5)
  })

  // --- playerStats edge cases ---

  it('handles null, undefined, or partial playerStats gracefully', async () => {
    const results = [
      await computeFeatRangeEffects([], '5e', null),
      await computeFeatRangeEffects([], '5e', undefined),
      await computeFeatRangeEffects([], '5e', { name: 'Test' }),
      await computeFeatRangeEffects([], '5e', { automation: {} }),
      await computeFeatRangeEffects([], '5e', { automation: { passives: [] } }),
    ]
    for (const result of results) {
      expect(result.meleeReachBonus).toBe(0)
      expect(result.cantripRangeBonus).toBe(0)
    }
  })
})

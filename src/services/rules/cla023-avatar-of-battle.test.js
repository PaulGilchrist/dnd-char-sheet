import { describe, it, expect } from 'vitest'
import { computeDamageAfterResistances } from './combat/applyDamage.js'

describe('CLA-023 Avatar of Battle - Damage Resistance', () => {
  const resistances = ['Bludgeoning', 'Piercing', 'Slashing']

  it('halves Bludgeoning damage when resistant', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Bludgeoning'], resistances, [])
    expect(result).toBe(10)
  })

  it('halves Piercing damage when resistant', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Piercing'], resistances, [])
    expect(result).toBe(10)
  })

  it('halves Slashing damage when resistant', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Slashing'], resistances, [])
    expect(result).toBe(10)
  })

  it('does not halve Fire damage (not in resistance list)', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Fire'], resistances, [])
    expect(result).toBe(20)
  })

  it('does not halve Force damage (not in resistance list)', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Force'], resistances, [])
    expect(result).toBe(20)
  })

  it('does not halve Radiant damage (not in resistance list)', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Radiant'], resistances, [])
    expect(result).toBe(20)
  })

  it('halves odd damage correctly (floor division)', () => {
    const rawDamage = 21
    const result = computeDamageAfterResistances(rawDamage, ['Bludgeoning'], resistances, [])
    expect(result).toBe(10)
  })

  it('handles mixed damage types - halves if any match resistance', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Bludgeoning', 'Fire'], resistances, [])
    expect(result).toBe(10)
  })

  it('does not halve when no damage types match', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['Fire', 'Cold'], resistances, [])
    expect(result).toBe(20)
  })

  it('is case-insensitive for damage types', () => {
    const rawDamage = 20
    const result = computeDamageAfterResistances(rawDamage, ['bludgeoning'], resistances, [])
    expect(result).toBe(10)
  })
})

import { describe, it, expect } from 'vitest';

import { resolveMonsterIRV } from './monsterIrvUtils.js';

// Legacy 2014-schema Shadow statblock shape: capitalized resistances/immunities/
// vulnerabilities, with condition names mixed into `immunities`.
const LEGACY_SHADOW = {
  name: 'Shadow',
  resistances: ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'],
  immunities: ['Necrotic', 'Poison', 'Exhaustion', 'Frightened', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious'],
  vulnerabilities: ['Radiant'],
  damage_resistances: null,
  damage_immunities: null,
  damage_vulnerabilities: null,
  condition_immunities: null,
};

const LEGACY_SKELETON = {
  name: 'Skeleton',
  resistances: [],
  immunities: ['Poison', 'Exhaustion', 'Poisoned'],
  vulnerabilities: ['Bludgeoning'],
};

describe('resolveMonsterIRV', () => {
  it('resolves legacy capitalized schema, splitting condition names out of immunities', () => {
    const irv = resolveMonsterIRV(LEGACY_SHADOW);
    expect(irv.resistances).toEqual(['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder']);
    expect(irv.immunities).toEqual(['Necrotic', 'Poison']);
    expect(irv.vulnerabilities).toEqual(['Radiant']);
    expect(irv.conditionImmunities).toEqual(['Exhaustion', 'Frightened', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious']);
  });

  it('resolves legacy monster with empty resistances and Bludgeoning vulnerability', () => {
    const irv = resolveMonsterIRV(LEGACY_SKELETON);
    expect(irv.resistances).toEqual([]);
    expect(irv.immunities).toEqual(['Poison']);
    expect(irv.vulnerabilities).toEqual(['Bludgeoning']);
    expect(irv.conditionImmunities).toEqual(['Exhaustion', 'Poisoned']);
  });

  it('prefers populated damage_* keys for 2024-schema monsters', () => {
    const monster = {
      name: 'Custom 2024',
      damage_resistances: ['Bludgeoning'],
      damage_immunities: ['Poison'],
      damage_vulnerabilities: ['Radiant'],
      condition_immunities: ['Frightened'],
      resistances: ['Cold'],
      immunities: ['Necrotic'],
      vulnerabilities: ['Psychic'],
    };
    const irv = resolveMonsterIRV(monster);
    expect(irv.resistances).toEqual(['Bludgeoning']);
    expect(irv.immunities).toEqual(['Poison']);
    expect(irv.vulnerabilities).toEqual(['Radiant']);
    expect(irv.conditionImmunities).toEqual(['Frightened']);
  });

  it('falls back to legacy immunities when damage_immunities is present-but-empty (CLA-207 shape)', () => {
    const monster = {
      name: 'Spirit-like',
      damage_immunities: [],
      damage_resistances: [],
      damage_vulnerabilities: [],
      immunities: ['Poison', 'Exhaustion'],
      resistances: ['Cold'],
      vulnerabilities: ['Radiant'],
    };
    const irv = resolveMonsterIRV(monster);
    expect(irv.immunities).toEqual(['Poison']);
    expect(irv.conditionImmunities).toEqual(['Exhaustion']);
    expect(irv.resistances).toEqual(['Cold']);
    expect(irv.vulnerabilities).toEqual(['Radiant']);
  });

  it('returns empty lists for a monster with no IRV data', () => {
    const irv = resolveMonsterIRV({ name: 'Beast' });
    expect(irv).toEqual({ immunities: [], resistances: [], vulnerabilities: [], conditionImmunities: [] });
  });
});

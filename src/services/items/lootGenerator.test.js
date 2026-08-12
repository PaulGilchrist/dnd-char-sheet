import { describe, it, expect } from 'vitest';

import {
  normalizeCurrency,
  formatCurrencyString,
  calculateEncounterXp,
} from './lootGenerator.js';

describe('normalizeCurrency', () => {
  it('returns all zero for totalGP of 0', () => {
    const result = normalizeCurrency(0);
    expect(result).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0 });
  });

  it('converts fractional GP correctly', () => {
    const result = normalizeCurrency(2.55);
    expect(result).toEqual({ pp: 0, gp: 2, sp: 5, cp: 5 });
  });

  it('produces pp for large GP amounts', () => {
    const result = normalizeCurrency(1234.56);
    expect(result).toEqual({ pp: 123, gp: 4, sp: 5, cp: 6 });
  });

  it('handles odd CP remainders', () => {
    const result = normalizeCurrency(0.07);
    expect(result).toEqual({ pp: 0, gp: 0, sp: 0, cp: 7 });
  });
});

describe('formatCurrencyString', () => {
  it('returns "0 platinum pieces" for all-zero currency', () => {
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 0, cp: 0 })).toBe('0 platinum pieces');
  });

  it('uses singular/plural correctly per denomination', () => {
    expect(formatCurrencyString({ pp: 1, gp: 0, sp: 0, cp: 0 })).toBe('1 platinum piece');
    expect(formatCurrencyString({ pp: 5, gp: 0, sp: 0, cp: 0 })).toBe('5 platinum pieces');
    expect(formatCurrencyString({ pp: 0, gp: 1, sp: 0, cp: 0 })).toBe('1 gold piece');
    expect(formatCurrencyString({ pp: 0, gp: 3, sp: 0, cp: 0 })).toBe('3 gold pieces');
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 1, cp: 0 })).toBe('1 silver coin');
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 2, cp: 0 })).toBe('2 silver coins');
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 0, cp: 1 })).toBe('1 copper coin');
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 0, cp: 4 })).toBe('4 copper coins');
  });

  it('joins multiple denominations with ", "', () => {
    const result = formatCurrencyString({ pp: 1, gp: 3, sp: 2, cp: 5 });
    expect(result).toBe('1 platinum piece, 3 gold pieces, 2 silver coins, 5 copper coins');
  });

  it('omits zero-valued denominations', () => {
    const result = formatCurrencyString({ pp: 0, gp: 5, sp: 0, cp: 3 });
    expect(result).toBe('5 gold pieces, 3 copper coins');
  });

  it('handles mixed negative and positive values', () => {
    expect(formatCurrencyString({ pp: -1, gp: 2, sp: -3, cp: 4 })).toBe('-1 platinum pieces, 2 gold pieces, -3 silver coins, 4 copper coins');
  });
});

describe('calculateEncounterXp', () => {
  it('returns 0 for null, undefined, and empty array', () => {
    expect(calculateEncounterXp(null)).toBe(0);
    expect(calculateEncounterXp(undefined)).toBe(0);
    expect(calculateEncounterXp([])).toBe(0);
  });

  it('sums xp for a single monster without qty', () => {
    const monsters = [{ name: 'Goblin', xp: 50 }];
    expect(calculateEncounterXp(monsters)).toBe(50);
  });

  it('multiplies xp by qty when present', () => {
    const monsters = [{ name: 'Orc', xp: 200, qty: 3 }];
    expect(calculateEncounterXp(monsters)).toBe(600);
  });

  it('defaults missing xp to 0', () => {
    const monsters = [{ name: 'Unknown' }];
    expect(calculateEncounterXp(monsters)).toBe(0);
  });

  it('treats qty of 0 as 1', () => {
    const monsters = [{ name: 'Gnome', xp: 50, qty: 0 }];
    expect(calculateEncounterXp(monsters)).toBe(50);
  });

  it('handles mixed monsters with and without xp and qty', () => {
    const monsters = [
      { name: 'Goblin', xp: 50, qty: 2 },
      { name: 'Skeleton' },
      { name: 'Orc', xp: 200 },
    ];
    expect(calculateEncounterXp(monsters)).toBe(300);
  });
});

// @improved-by-ai
import { describe, it, expect } from 'vitest';

import { normalizeCurrency, formatCurrencyString } from './lootGenerator.js';

// ── normalizeCurrency ──────────────────────────────────────────────
// These tests cover rounding edge cases not tested in lootGenerator.test.js.
// The other file tests basic conversion; this file tests boundary rounding.

describe('normalizeCurrency rounding edge cases', () => {
  it('rounds 0.005 gp up to 1 cp', () => {
    expect(normalizeCurrency(0.005)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 1 });
  });

  it('rounds 0.015 gp up to 2 cp', () => {
    expect(normalizeCurrency(0.015)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 2 });
  });

  it('rounds 0.095 gp up to 10 cp then normalizes to 1 sp', () => {
    expect(normalizeCurrency(0.095)).toEqual({ pp: 0, gp: 0, sp: 1, cp: 0 });
  });

  it('rounds 0.099 gp up to 10 cp then normalizes to 1 sp', () => {
    expect(normalizeCurrency(0.099)).toEqual({ pp: 0, gp: 0, sp: 1, cp: 0 });
  });

  it('rounds 9.99 gp correctly with carry', () => {
    expect(normalizeCurrency(9.99)).toEqual({ pp: 0, gp: 9, sp: 9, cp: 9 });
  });

  it('rounds 19.99 gp correctly', () => {
    expect(normalizeCurrency(19.99)).toEqual({ pp: 1, gp: 9, sp: 9, cp: 9 });
  });

  it('rounds 99.99 gp correctly', () => {
    expect(normalizeCurrency(99.99)).toEqual({ pp: 9, gp: 9, sp: 9, cp: 9 });
  });

  it('rounds 100.005 gp to nearest cp', () => {
    expect(normalizeCurrency(100.005)).toEqual({ pp: 10, gp: 0, sp: 0, cp: 1 });
  });

  it('rounds 0.004 gp down to 0 cp', () => {
    expect(normalizeCurrency(0.004)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0 });
  });

  it('handles 0.045 gp rounding', () => {
    expect(normalizeCurrency(0.045)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 5 });
  });

  it('handles 0.055 gp rounding', () => {
    expect(normalizeCurrency(0.055)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 6 });
  });
});

// ── formatCurrencyString ───────────────────────────────────────────
// Tests for singular/plural and zero-value formatting not in lootGenerator.test.js.

describe('formatCurrencyString formatting', () => {
  it('returns "0 platinum pieces" for empty object', () => {
    expect(formatCurrencyString({})).toBe('0 platinum pieces');
  });

  it('uses singular for 1 pp', () => {
    expect(formatCurrencyString({ pp: 1, gp: 0, sp: 0, cp: 0 })).toBe('1 platinum piece');
  });

  it('uses plural for 2 pp', () => {
    expect(formatCurrencyString({ pp: 2, gp: 0, sp: 0, cp: 0 })).toBe('2 platinum pieces');
  });

  it('uses singular for 1 gp', () => {
    expect(formatCurrencyString({ pp: 0, gp: 1, sp: 0, cp: 0 })).toBe('1 gold piece');
  });

  it('uses singular for 1 sp', () => {
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 1, cp: 0 })).toBe('1 silver coin');
  });

  it('uses singular for 1 cp', () => {
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 0, cp: 1 })).toBe('1 copper coin');
  });

  it('omits all zero denominations except default', () => {
    expect(formatCurrencyString({ pp: 0, gp: 0, sp: 0, cp: 0 })).toBe('0 platinum pieces');
  });

  it('handles large values across all denominations', () => {
    expect(formatCurrencyString({ pp: 99, gp: 9, sp: 9, cp: 9 })).toBe(
      '99 platinum pieces, 9 gold pieces, 9 silver coins, 9 copper coins'
    );
  });

  it('handles missing properties as zeros', () => {
    expect(formatCurrencyString({ gp: 5 })).toBe('5 gold pieces');
  });
});

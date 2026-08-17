// @improved-by-ai
import { describe, it, expect } from 'vitest';

import { normalizeCurrency, formatCurrencyString } from './lootGenerator.js';

// ── normalizeCurrency ──────────────────────────────────────────────
// Edge-case rounding tests not in lootGenerator.test.js.
// Duplicates removed: 0.005→1cp, 0.004→0cp, 9.99→9gp9sp9cp (all in main file).

describe('normalizeCurrency rounding edge cases', () => {
  it('rounds 0.015 gp up to 2 cp', () => {
    expect(normalizeCurrency(0.015)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 2 });
  });

  it('rounds 0.095 gp up to 10 cp then normalizes to 1 sp', () => {
    expect(normalizeCurrency(0.095)).toEqual({ pp: 0, gp: 0, sp: 1, cp: 0 });
  });

  it('rounds 0.099 gp up to 10 cp then normalizes to 1 sp', () => {
    expect(normalizeCurrency(0.099)).toEqual({ pp: 0, gp: 0, sp: 1, cp: 0 });
  });

  it('rounds 19.99 gp correctly with carry', () => {
    expect(normalizeCurrency(19.99)).toEqual({ pp: 1, gp: 9, sp: 9, cp: 9 });
  });

  it('rounds 99.99 gp correctly with carry', () => {
    expect(normalizeCurrency(99.99)).toEqual({ pp: 9, gp: 9, sp: 9, cp: 9 });
  });

  it('rounds 100.005 gp to nearest cp', () => {
    expect(normalizeCurrency(100.005)).toEqual({ pp: 10, gp: 0, sp: 0, cp: 1 });
  });

  it('handles 0.045 gp rounding', () => {
    expect(normalizeCurrency(0.045)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 5 });
  });

  it('handles 0.055 gp rounding', () => {
    expect(normalizeCurrency(0.055)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 6 });
  });

  it('produces negative values for negative input', () => {
    expect(normalizeCurrency(-5.25)).toEqual({ pp: -1, gp: -6, sp: -3, cp: -5 });
  });
});

// ── formatCurrencyString formatting ─────────────────────────────────
// Tests for edge cases not in lootGenerator.test.js.
// Duplicates removed: empty object, all-zero, singular pp/gp/sp/cp (all in main file).

describe('formatCurrencyString formatting', () => {
  it('uses singular for 2 pp (plural)', () => {
    expect(formatCurrencyString({ pp: 2, gp: 0, sp: 0, cp: 0 })).toBe('2 platinum pieces');
  });

  it('handles missing properties as zeros', () => {
    expect(formatCurrencyString({ gp: 5 })).toBe('5 gold pieces');
  });

  it('handles large values across all denominations', () => {
    expect(formatCurrencyString({ pp: 99, gp: 9, sp: 9, cp: 9 })).toBe(
      '99 platinum pieces, 9 gold pieces, 9 silver coins, 9 copper coins'
    );
  });
});

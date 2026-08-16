// @improved-by-ai
import { describe, it, expect } from 'vitest';
import {
  rollD20,
  rollDie,
  rollDice,
  rollAdvantage,
  rollDisadvantage,
  parseExpression,
  rollExpression,
  rollExpressionDoubled,
  rollExpressionMaximized,
  formatDamageFormula,
  applyHealingRerollOnes,
} from './diceRoller.js';

// ── Helpers ──────────────────────────────────────────────────────────

function seededRandom(values) {
  const original = Math.random;
  let i = 0;
  Math.random = () => values[i++] ?? 0.5;
  return {
    restore: () => { Math.random = original; },
  };
}

// ── rollD20 ──────────────────────────────────────────────────────────

describe('rollD20', () => {
  it('returns an integer between 1 and 20 inclusive', () => {
    const { restore } = seededRandom([0]);
    try {
      const result = rollD20();
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    } finally {
      restore();
    }
  });

  it('can produce boundary values with controlled randomness', () => {
    const { restore } = seededRandom([0, 0.999999]);
    try {
      expect(rollD20()).toBe(1);
      expect(rollD20()).toBe(20);
    } finally {
      restore();
    }
  });
});

// ── rollDie ──────────────────────────────────────────────────────────

describe('rollDie', () => {
  it('returns an integer between 1 and sides for standard dice', () => {
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      const result = rollDie(sides);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(sides);
    }
  });

  it('returns 1 when sides is 0 due to Math.random bounds', () => {
    const { restore } = seededRandom([0]);
    try {
      expect(rollDie(0)).toBe(1);
    } finally {
      restore();
    }
  });
});

// ── rollDice ─────────────────────────────────────────────────────────

describe('rollDice', () => {
  it('returns correct number of rolls and sum for valid input', () => {
    const { restore } = seededRandom([0.1, 0.9]);
    try {
      const result = rollDice(2, 6);
      expect(result.rolls).toHaveLength(2);
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(result.rolls[0]).toBeLessThanOrEqual(6);
      expect(result.rolls[1]).toBeGreaterThanOrEqual(1);
      expect(result.rolls[1]).toBeLessThanOrEqual(6);
      expect(result.total).toBe(result.rolls[0] + result.rolls[1]);
    } finally {
      restore();
    }
  });

  it('returns empty rolls and zero total when count is 0', () => {
    const result = rollDice(0, 6);
    expect(result.rolls).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns empty rolls and zero total when count is negative', () => {
    const result = rollDice(-1, 6);
    expect(result.rolls).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ── rollAdvantage ────────────────────────────────────────────────────

describe('rollAdvantage', () => {
  it('returns max of two d20 rolls with label "advantage"', () => {
    // rollD20 = Math.floor(Math.random() * 20) + 1
    // To get 3: random = (3-1)/20 = 0.1; To get 17: random = (17-1)/20 = 0.8
    const { restore } = seededRandom([0.1, 0.8]);
    try {
      const result = rollAdvantage();
      expect(result.rolls).toEqual([3, 17]);
      expect(result.total).toBe(17);
      expect(result.label).toBe('advantage');
    } finally {
      restore();
    }
  });

  it('handles equal rolls', () => {
    // To get 12: random = (12-1)/20 = 0.55
    const { restore } = seededRandom([0.55, 0.55]);
    try {
      const result = rollAdvantage();
      expect(result.total).toBe(12);
    } finally {
      restore();
    }
  });
});

// ── rollDisadvantage ─────────────────────────────────────────────────

describe('rollDisadvantage', () => {
  it('returns min of two d20 rolls with label "disadvantage"', () => {
    // rollD20 = Math.floor(Math.random() * 20) + 1
    // To get 17: random = 0.8; To get 3: random = 0.1
    const { restore } = seededRandom([0.8, 0.1]);
    try {
      const result = rollDisadvantage();
      expect(result.rolls).toEqual([17, 3]);
      expect(result.total).toBe(3);
      expect(result.label).toBe('disadvantage');
    } finally {
      restore();
    }
  });

  it('handles equal rolls', () => {
    // To get 15: random = (15-1)/20 = 0.7
    const { restore } = seededRandom([0.7, 0.7]);
    try {
      const result = rollDisadvantage();
      expect(result.total).toBe(15);
    } finally {
      restore();
    }
  });
});

// ── parseExpression ──────────────────────────────────────────────────

describe('parseExpression', () => {
  it('parses minimal d20 without count', () => {
    expect(parseExpression('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
  });

  it('parses count and sides without modifier', () => {
    expect(parseExpression('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
  });

  it('parses positive and negative modifiers', () => {
    expect(parseExpression('1d8+3')).toEqual({ count: 1, sides: 8, modifier: 3 });
    expect(parseExpression('1d10-2')).toEqual({ count: 1, sides: 10, modifier: -2 });
  });

  it('parses multiple modifier segments', () => {
    expect(parseExpression('1d8+4+2')).toEqual({ count: 1, sides: 8, modifier: 6 });
    expect(parseExpression('1d10+5-3')).toEqual({ count: 1, sides: 10, modifier: 2 });
  });

  it('strips square-bracket tags before parsing', () => {
    expect(parseExpression('2d6[Fire]')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseExpression('[Damage] 1d8+3')).toEqual({ count: 1, sides: 8, modifier: 3 });
    expect(parseExpression('1d8 [tag] +3')).toEqual({ count: 1, sides: 8, modifier: 3 });
  });

  it('returns null for empty, whitespace-only, or tag-only input', () => {
    expect(parseExpression('')).toBeNull();
    expect(parseExpression('   ')).toBeNull();
    expect(parseExpression('[tag]')).toBeNull();
    expect(parseExpression('[a] [b]')).toBeNull();
  });

  it('returns null for unrecognised strings', () => {
    expect(parseExpression('not a formula')).toBeNull();
    expect(parseExpression('abc')).toBeNull();
    expect(parseExpression('2d')).toBeNull();
    expect(parseExpression('d')).toBeNull();
  });

  it('selects the first valid " or " option', () => {
    expect(parseExpression('1d8 + 3 or 2d6')).toEqual({ count: 1, sides: 8, modifier: 3 });
    expect(parseExpression('invalid or 2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseExpression('invalid or nonsense')).toBeNull();
  });

  it('handles multi-digit counts and sides', () => {
    expect(parseExpression('10d100')).toEqual({ count: 10, sides: 100, modifier: 0 });
  });

  it('handles uppercase dice notation', () => {
    expect(parseExpression('2D6')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseExpression('1D8+3')).toEqual({ count: 1, sides: 8, modifier: 3 });
  });
});

// ── rollExpression ───────────────────────────────────────────────────

describe('rollExpression', () => {
  it('rolls a plain d20 expression', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpression('d20');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeLessThanOrEqual(20);
      expect(result.formula).toBe('d20');
      expect(result.modifier).toBe(0);
    } finally {
      restore();
    }
  });

  it('applies positive and negative modifiers to the total', () => {
    const { restore } = seededRandom([0.5, 0.5]);
    try {
      const pos = rollExpression('1d8+3');
      expect(pos.total).toBe(pos.rolls[0] + 3);
      expect(pos.modifier).toBe(3);
      expect(pos.formula).toBe('1d8+3');

      const neg = rollExpression('1d6-2');
      expect(neg.total).toBe(neg.rolls[0] - 2);
      expect(neg.modifier).toBe(-2);
    } finally {
      restore();
    }
  });

  it('rolls multiple dice and sums them', () => {
    const { restore } = seededRandom([0.5, 0.5]);
    try {
      const result = rollExpression('2d6');
      expect(result.rolls).toHaveLength(2);
      expect(result.total).toBe(result.rolls[0] + result.rolls[1]);
    } finally {
      restore();
    }
  });

  it('returns null for invalid or empty expressions', () => {
    expect(rollExpression('xyz')).toBeNull();
    expect(rollExpression('')).toBeNull();
    expect(rollExpression('   ')).toBeNull();
    expect(rollExpression('[tag]')).toBeNull();
  });

  it('selects first valid " or " option', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpression('1d8 + 3 or 2d6');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.modifier).toBe(3);
      expect(result.formula).toBe('1d8 + 3');
    } finally {
      restore();
    }
  });

  it('selects second option when first " or " part is invalid', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpression('invalid or 2d6');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(0);
    } finally {
      restore();
    }
  });

  it('returns null when both " or " parts are invalid', () => {
    expect(rollExpression('invalid or nonsense')).toBeNull();
  });

  it('combines " plus " segments by summing dice and modifiers', () => {
    const { restore } = seededRandom([0.5, 0.5]);
    try {
      const result = rollExpression('1d8+3 plus 2d6');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(3);
      expect(result.modifier).toBe(3);
      expect(result.formula).toBe('1d8+3 plus 2d6');
    } finally {
      restore();
    }
  });

  it('skips invalid " plus " segments and sums valid ones', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpression('1d8+3 plus invalid');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.modifier).toBe(3);
      expect(result.formula).toBe('1d8+3 plus invalid');
    } finally {
      restore();
    }
  });

  it('combines modifiers from multiple " plus " segments', () => {
    const { restore } = seededRandom([0.5, 0.5]);
    try {
      const result = rollExpression('1d6+2 plus 1d4+1');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
    } finally {
      restore();
    }
  });

  it('returns an object with zero totals when all " plus " segments are invalid', () => {
    const result = rollExpression('invalid plus nonsense');
    expect(result).not.toBeNull();
    expect(result.total).toBe(0);
    expect(result.rolls).toEqual([]);
    expect(result.modifier).toBe(0);
  });

  it('strips brackets before evaluating', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpression('1d8+3[damage]');
      expect(result).not.toBeNull();
      expect(result.modifier).toBe(3);
    } finally {
      restore();
    }
  });

  it('respects rerollOnes option to reroll 1s', () => {
    const { restore } = seededRandom([0, 0.5, 0.5]);
    try {
      const result = rollExpression('3d6', { rerollOnes: true });
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(3);
      for (const r of result.rolls) {
        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(6);
      }
    } finally {
      restore();
    }
  });

  it('leaves non-1 values unchanged when rerollOnes is true', () => {
    const { restore } = seededRandom([0, 0.33, 0.66]);
    try {
      const result = rollExpression('3d6', { rerollOnes: true });
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(3);
      // First roll is rerolled (was 1), second and third are preserved
      expect(result.rolls[0]).toBeGreaterThanOrEqual(2);
      expect(result.rolls[0]).toBeLessThanOrEqual(6);
      expect(result.rolls[1]).toBeGreaterThanOrEqual(2);
      expect(result.rolls[1]).toBeLessThanOrEqual(6);
      expect(result.rolls[2]).toBeGreaterThanOrEqual(2);
      expect(result.rolls[2]).toBeLessThanOrEqual(6);
    } finally {
      restore();
    }
  });
});

// ── rollExpressionDoubled ────────────────────────────────────────────

describe('rollExpressionDoubled', () => {
  it('doubles dice rolls and keeps modifier', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpressionDoubled('1d8+3');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.doubledRolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
      expect(result.total).toBe(result.doubledRolls.reduce((s, r) => s + r, 0) + 3);
    } finally {
      restore();
    }
  });

  it('doubles combined damage dice from " plus " segments', () => {
    const { restore } = seededRandom([0.5, 0.5, 0.5]);
    try {
      const result = rollExpressionDoubled('1d8+3 plus 2d6');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(3);
      expect(result.doubledRolls).toHaveLength(6);
      expect(result.modifier).toBe(3);
    } finally {
      restore();
    }
  });

  it('returns null for invalid or empty expressions', () => {
    expect(rollExpressionDoubled('xyz')).toBeNull();
    expect(rollExpressionDoubled('')).toBeNull();
  });

  it('selects first valid " or " option and doubles it', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpressionDoubled('1d8+3 or 2d6');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.doubledRolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
    } finally {
      restore();
    }
  });

  it('returns null when formula after stripping brackets is empty', () => {
    expect(rollExpressionDoubled('[tag]')).toBeNull();
  });

  it('selects second " or " option when first is invalid', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpressionDoubled('invalid or 2d6');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(2);
      expect(result.doubledRolls).toHaveLength(4);
    } finally {
      restore();
    }
  });

  it('skips invalid " plus " segments but uses valid rolls for doubling', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpressionDoubled('1d8+3 plus invalid');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.doubledRolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
    } finally {
      restore();
    }
  });

  it('uses result.rolls fallback when " plus " first part is invalid', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = rollExpressionDoubled('invalid plus 1d8');
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(1);
      expect(result.doubledRolls).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it('returns an object with zero totals when all " plus " segments are invalid', () => {
    const result = rollExpressionDoubled('invalid plus nonsense');
    expect(result).not.toBeNull();
    expect(result.total).toBe(0);
    expect(result.rolls).toEqual([]);
    expect(result.doubledRolls).toEqual([]);
  });
});

// ── rollExpressionMaximized ──────────────────────────────────────────

describe('rollExpressionMaximized', () => {
  it('fills all dice with maximum value and adds modifier', () => {
    const basic = rollExpressionMaximized('2d6');
    expect(basic).not.toBeNull();
    expect(basic.rolls).toHaveLength(2);
    expect(basic.rolls[0]).toBe(6);
    expect(basic.rolls[1]).toBe(6);
    expect(basic.total).toBe(12);
    expect(basic.maximized).toBe(true);
  });

  it('applies positive modifiers to maximised total', () => {
    const withMod = rollExpressionMaximized('1d8+5');
    expect(withMod.total).toBe(8 + 5);
    expect(withMod.modifier).toBe(5);
  });

  it('applies negative modifiers to maximised total', () => {
    const negMod = rollExpressionMaximized('3d10-2');
    expect(negMod.total).toBe(30 - 2);
    expect(negMod.modifier).toBe(-2);
  });

  it('handles multi-digit counts and sides', () => {
    const result = rollExpressionMaximized('10d12+4');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(10);
    expect(result.rolls.every((r) => r === 12)).toBe(true);
    expect(result.total).toBe(120 + 4);
    expect(result.modifier).toBe(4);
  });

  it('returns null for invalid or empty expressions', () => {
    expect(rollExpressionMaximized('xyz')).toBeNull();
    expect(rollExpressionMaximized('')).toBeNull();
    expect(rollExpressionMaximized('[tag]')).toBeNull();
  });
});

// ── formatDamageFormula ──────────────────────────────────────────────

describe('formatDamageFormula', () => {
  it('returns input formula when formula is null', () => {
    expect(formatDamageFormula(null, [1, 2], false)).toBeNull();
  });

  it('returns input formula when formula is undefined', () => {
    expect(formatDamageFormula(undefined, [1, 2], false)).toBeUndefined();
  });

  it('returns empty string when formula is empty', () => {
    expect(formatDamageFormula('', [1, 2], false)).toBe('');
  });

  it('returns original formula when stripped formula is empty', () => {
    const result = formatDamageFormula('[tag]', [1, 2], false);
    expect(result).toBe('[tag]');
  });

  it('returns original formula when parsing fails', () => {
    const result = formatDamageFormula('not a formula', [1, 2], false);
    expect(result).toBe('not a formula');
  });

  it('formats a basic damage formula with rolls but no modifier or crit', () => {
    expect(formatDamageFormula('1d8', [5], false)).toBe('1d8 (5)');
  });

  it('formats with positive modifier', () => {
    expect(formatDamageFormula('1d8+3', [5], false)).toBe('1d8+3 (5)');
  });

  it('formats with negative modifier', () => {
    expect(formatDamageFormula('1d8-2', [5], false)).toBe('1d8-2 (5)');
  });

  it('omits roll suffix when rolls is null', () => {
    expect(formatDamageFormula('1d8+3', null, false)).toBe('1d8+3');
  });

  it('omits roll suffix when rolls is undefined', () => {
    expect(formatDamageFormula('1d8+3', undefined, false)).toBe('1d8+3');
  });

  it('omits roll suffix when rolls is empty', () => {
    expect(formatDamageFormula('1d8+3', [], false)).toBe('1d8+3');
  });

  it('includes crit suffix "*2" when isCrit is true', () => {
    expect(formatDamageFormula('1d8+3', [5, 6], true)).toBe('1d8*2+3 (5, 6)');
  });

  it('does not include crit suffix when isCrit is false', () => {
    expect(formatDamageFormula('1d8+3', [5, 6], false)).toBe('1d8+3 (5, 6)');
  });

  it('strips brackets before formatting', () => {
    expect(formatDamageFormula('1d8+3[Fire]', [5], false)).toBe('1d8+3 (5)');
  });

  it('formats multiple rolls separated by commas', () => {
    expect(formatDamageFormula('2d6', [3, 4], false)).toBe('2d6 (3, 4)');
  });
});

// ── applyHealingRerollOnes ───────────────────────────────────────────

describe('applyHealingRerollOnes', () => {
  it('returns displayRolls as-is when rolls is null', () => {
    const result = applyHealingRerollOnes(null, '1d8+3');
    expect(result).toEqual({ displayRolls: null, originalRolls: null });
  });

  it('returns displayRolls as-is when rolls is not an array', () => {
    const result = applyHealingRerollOnes('not an array', '1d8+3');
    expect(result).toEqual({ displayRolls: 'not an array', originalRolls: null });
  });

  it('returns displayRolls as-is when parsing expression fails', () => {
    const result = applyHealingRerollOnes([1, 2, 3], 'invalid');
    expect(result).toEqual({ displayRolls: [1, 2, 3], originalRolls: null });
  });

  it('returns displayRolls as-is when no 1s are present', () => {
    const result = applyHealingRerollOnes([3, 4, 5], '3d6');
    expect(result).toEqual({ displayRolls: [3, 4, 5], originalRolls: null });
  });

  it('rerolls 1s and preserves original rolls when rerolls occur', () => {
    const { restore } = seededRandom([0.5, 0.5, 0.5]);
    try {
      const result = applyHealingRerollOnes([1, 4, 1], '3d6');
      expect(result.displayRolls).toHaveLength(3);
      expect(result.displayRolls[0]).toBeGreaterThanOrEqual(2);
      expect(result.displayRolls[0]).toBeLessThanOrEqual(6);
      expect(result.displayRolls[1]).toBe(4);
      expect(result.displayRolls[2]).toBeGreaterThanOrEqual(2);
      expect(result.displayRolls[2]).toBeLessThanOrEqual(6);
      expect(result.originalRolls).toEqual([1, 4, 1]);
    } finally {
      restore();
    }
  });

  it('returns originalRolls as null when no rerolls happened', () => {
    const result = applyHealingRerollOnes([3, 5, 6], '3d6');
    expect(result.originalRolls).toBeNull();
    expect(result.displayRolls).toEqual([3, 5, 6]);
  });

  it('handles a single die roll that is a 1', () => {
    const { restore } = seededRandom([0.5]);
    try {
      const result = applyHealingRerollOnes([1], '1d6');
      expect(result.displayRolls).toEqual([Math.floor(0.5 * 6) + 1]);
      expect(result.originalRolls).toEqual([1]);
    } finally {
      restore();
    }
  });

  it('handles all 1s being rerolled', () => {
    const { restore } = seededRandom([0.5, 0.5, 0.5]);
    try {
      const result = applyHealingRerollOnes([1, 1, 1], '2d6');
      expect(result.displayRolls).toHaveLength(3);
      expect(result.originalRolls).toEqual([1, 1, 1]);
      for (const r of result.displayRolls) {
        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(6);
      }
    } finally {
      restore();
    }
  });
});

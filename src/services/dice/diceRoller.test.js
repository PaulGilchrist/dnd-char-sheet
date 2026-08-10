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

describe('rollD20', () => {
  it('returns an integer between 1 and 20', () => {
    const result = rollD20();
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(20);
  });
});

describe('rollDie', () => {
  it('returns an integer between 1 and sides for valid dice', () => {
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      const result = rollDie(sides);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(sides);
    }
  });
});

describe('rollDice', () => {
  it('returns correct number of rolls and sum', () => {
    const result = rollDice(2, 6);
    expect(result.rolls).toHaveLength(2);
    expect(result.total).toBe(result.rolls[0] + result.rolls[1]);
  });

  it('returns empty rolls and zero total when count is 0', () => {
    const result = rollDice(0, 6);
    expect(result.rolls).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('rollAdvantage', () => {
  it('returns max of two d20 rolls with correct label', () => {
    const result = rollAdvantage();
    expect(result.rolls).toHaveLength(2);
    expect(result.total).toBe(Math.max(...result.rolls));
    expect(result.label).toBe('advantage');
  });
});

describe('rollDisadvantage', () => {
  it('returns min of two d20 rolls with correct label', () => {
    const result = rollDisadvantage();
    expect(result.rolls).toHaveLength(2);
    expect(result.total).toBe(Math.min(...result.rolls));
    expect(result.label).toBe('disadvantage');
  });
});

describe('parseExpression', () => {
  it('parses valid formulas with optional count, sides, and modifier', () => {
    expect(parseExpression('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseExpression('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseExpression('1d8+3')).toEqual({ count: 1, sides: 8, modifier: 3 });
    expect(parseExpression('1d10-2')).toEqual({ count: 1, sides: 10, modifier: -2 });
  });

  it('strips square-bracket tags before parsing', () => {
    expect(parseExpression('2d6[Fire]')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseExpression('[Damage] 1d8+3')).toEqual({ count: 1, sides: 8, modifier: 3 });
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(parseExpression('')).toBeNull();
    expect(parseExpression('   ')).toBeNull();
    expect(parseExpression('[tag]')).toBeNull();
  });

  it('returns null for invalid formula', () => {
    expect(parseExpression('not a formula')).toBeNull();
  });

  it('handles " or " alternatives by selecting the first valid option', () => {
    expect(parseExpression('1d8 + 3 or 2d6')).toEqual({ count: 1, sides: 8, modifier: 3 });
    expect(parseExpression('invalid or 2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseExpression('invalid or nonsense')).toBeNull();
  });

  it('supports multi-digit counts/sides and multiple modifiers', () => {
    expect(parseExpression('10d100')).toEqual({ count: 10, sides: 100, modifier: 0 });
    expect(parseExpression('1d8+4+2')).toEqual({ count: 1, sides: 8, modifier: 6 });
    expect(parseExpression('1d10+5-3')).toEqual({ count: 1, sides: 10, modifier: 2 });
  });
});

describe('rollExpression', () => {
  it('rolls a d20 expression', () => {
    const result = rollExpression('d20');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeLessThanOrEqual(20);
    expect(result.formula).toBe('d20');
    expect(result.modifier).toBe(0);
  });

  it('rolls with modifiers and multiple dice', () => {
    const posResult = rollExpression('1d8+3');
    expect(posResult).not.toBeNull();
    expect(posResult.rolls).toHaveLength(1);
    expect(posResult.modifier).toBe(3);
    expect(posResult.total).toBe(posResult.rolls[0] + 3);
    expect(posResult.formula).toBe('1d8+3');

    const negResult = rollExpression('1d6-2');
    expect(negResult).not.toBeNull();
    expect(negResult.modifier).toBe(-2);
    expect(negResult.total).toBe(negResult.rolls[0] - 2);

    const multiResult = rollExpression('2d6');
    expect(multiResult).not.toBeNull();
    expect(multiResult.rolls).toHaveLength(2);
    expect(multiResult.total).toBe(multiResult.rolls[0] + multiResult.rolls[1]);
  });

  it('returns null for invalid expressions', () => {
    expect(rollExpression('xyz')).toBeNull();
    expect(rollExpression('')).toBeNull();
    expect(rollExpression('   ')).toBeNull();
    expect(rollExpression('[tag]')).toBeNull();
  });

  it('handles " or " and " plus " alternatives', () => {
    const orResult = rollExpression('1d8 + 3 or 2d6');
    expect(orResult).not.toBeNull();
    expect(orResult.rolls).toHaveLength(1);
    expect(orResult.modifier).toBe(3);
    expect(orResult.formula).toBe('1d8 + 3');

    const plusResult = rollExpression('1d8+3 plus 2d6');
    expect(plusResult).not.toBeNull();
    expect(plusResult.rolls).toHaveLength(3);
    expect(plusResult.modifier).toBe(3);
    expect(plusResult.formula).toBe('1d8+3 plus 2d6');

    const plusModResult = rollExpression('1d6+2 plus 1d4+1');
    expect(plusModResult).not.toBeNull();
    expect(plusModResult.rolls).toHaveLength(2);
    expect(plusModResult.modifier).toBe(3);
  });

  it('handles " or " where first part is invalid but second is valid', () => {
    const result = rollExpression('invalid or 2d6');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(2);
    expect(result.modifier).toBe(0);
  });

  it('handles " plus " where one part is invalid', () => {
    const result = rollExpression('1d8+3 plus invalid');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(1);
    expect(result.modifier).toBe(3);
    expect(result.formula).toBe('1d8+3 plus invalid');
  });

  it('strips brackets before evaluating', () => {
    const result = rollExpression('1d8+3[damage]');
    expect(result).not.toBeNull();
    expect(result.modifier).toBe(3);
  });
});

describe('rollExpressionDoubled', () => {
  it('doubles the dice total and rolls', () => {
    const result = rollExpressionDoubled('1d8+3');
    expect(result).not.toBeNull();
    expect(result.modifier).toBe(3);
    expect(result.rolls).toHaveLength(1);
    expect(result.doubledRolls).toHaveLength(2);
    expect(result.total).toBe(result.doubledRolls.reduce((s, r) => s + r, 0) + 3);
  });

  it('doubles combined damage dice', () => {
    const result = rollExpressionDoubled('1d8+3 plus 2d6');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(3);
    expect(result.doubledRolls).toHaveLength(6);
    expect(result.modifier).toBe(3);
  });

  it('returns null for invalid expressions', () => {
    expect(rollExpressionDoubled('xyz')).toBeNull();
    expect(rollExpressionDoubled('')).toBeNull();
  });

  it('selects first valid " or " option and doubles it', () => {
    const result = rollExpressionDoubled('1d8+3 or 2d6');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(1);
    expect(result.doubledRolls).toHaveLength(2);
    expect(result.modifier).toBe(3);
  });

  it('returns null when formula after stripping brackets is empty', () => {
    const result = rollExpressionDoubled('[tag]');
    expect(result).toBeNull();
  });

  it('handles " or " where first part is invalid', () => {
    const result = rollExpressionDoubled('invalid or 2d6');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(2);
    expect(result.doubledRolls).toHaveLength(4);
  });

  it('handles " plus " where one part is invalid', () => {
    const result = rollExpressionDoubled('1d8+3 plus invalid');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(1);
    expect(result.doubledRolls).toHaveLength(2);
    expect(result.modifier).toBe(3);
  });

  it('handles " plus " where second part is invalid and uses result.rolls fallback', () => {
    const result = rollExpressionDoubled('invalid plus 1d8');
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(1);
    expect(result.doubledRolls).toHaveLength(2);
  });
});

describe('rollExpressionMaximized', () => {
  it('fills all dice with maximum value and adds modifier', () => {
    const basic = rollExpressionMaximized('2d6');
    expect(basic).not.toBeNull();
    expect(basic.rolls).toHaveLength(2);
    expect(basic.rolls[0]).toBe(6);
    expect(basic.rolls[1]).toBe(6);
    expect(basic.total).toBe(12);
    expect(basic.maximized).toBe(true);

    const withMod = rollExpressionMaximized('1d8+5');
    expect(withMod).not.toBeNull();
    expect(withMod.total).toBe(8 + 5);
    expect(withMod.modifier).toBe(5);

    const negMod = rollExpressionMaximized('3d10-2');
    expect(negMod).not.toBeNull();
    expect(negMod.total).toBe(30 - 2);
    expect(negMod.modifier).toBe(-2);
  });

  it('returns null for invalid expressions', () => {
    expect(rollExpressionMaximized('xyz')).toBeNull();
    expect(rollExpressionMaximized('')).toBeNull();
  });
});

describe('rerollOnes option', () => {
  it('rerolls 1s to new values when rerollOnes is true', () => {
    const originalRandom = Math.random;
    const results = [0, 0, 0, 1 / 6, 1 / 6, 1 / 6];
    let callCount = 0;
    Math.random = () => {
      const val = results[callCount] ?? 0.5;
      callCount++;
      return val;
    };
    try {
      const result = rollExpression('3d6', { rerollOnes: true });
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(3);
      for (const r of result.rolls) {
        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(6);
      }
    } finally {
      Math.random = originalRandom;
    }
  });

  it('keeps non-1 values unchanged when rerollOnes is true', () => {
    const originalRandom = Math.random;
    const results = [0.5, 0.5, 0.5];
    let callCount = 0;
    Math.random = () => {
      const val = results[callCount] ?? 0.5;
      callCount++;
      return val;
    };
    try {
      const result = rollExpression('3d6', { rerollOnes: true });
      expect(result).not.toBeNull();
      expect(result.rolls).toHaveLength(3);
      for (const r of result.rolls) {
        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(6);
      }
    } finally {
      Math.random = originalRandom;
    }
  });
});

describe('formatDamageFormula', () => {
  it('returns the formula when formula is null/empty', () => {
    expect(formatDamageFormula(null, [1, 2], false)).toBeNull();
    expect(formatDamageFormula('', [1, 2], false)).toBe('');
    expect(formatDamageFormula(undefined, [1, 2], false)).toBeUndefined();
  });

  it('returns original formula when stripped formula is empty', () => {
    const result = formatDamageFormula('[tag]', [1, 2], false);
    expect(result).toBe('[tag]');
  });

  it('returns original formula when parsing fails', () => {
    const result = formatDamageFormula('not a formula', [1, 2], false);
    expect(result).toBe('not a formula');
  });

  it('formats a basic damage formula without modifier or crit', () => {
    const result = formatDamageFormula('1d8', [5], false);
    expect(result).toBe('1d8 (5)');
  });

  it('formats with positive modifier', () => {
    const result = formatDamageFormula('1d8+3', [5], false);
    expect(result).toBe('1d8+3 (5)');
  });

  it('formats with negative modifier', () => {
    const result = formatDamageFormula('1d8-2', [5], false);
    expect(result).toBe('1d8-2 (5)');
  });

  it('formats with no rolls array', () => {
    const result = formatDamageFormula('1d8+3', null, false);
    expect(result).toBe('1d8+3');
  });

  it('formats with empty rolls array', () => {
    const result = formatDamageFormula('1d8+3', [], false);
    expect(result).toBe('1d8+3');
  });

  it('formats with crit suffix', () => {
    const result = formatDamageFormula('1d8+3', [5, 6], true);
    expect(result).toBe('1d8*2+3 (5, 6)');
  });

  it('formats without crit when not a crit', () => {
    const result = formatDamageFormula('1d8+3', [5, 6], false);
    expect(result).toBe('1d8+3 (5, 6)');
  });

  it('strips brackets before formatting', () => {
    const result = formatDamageFormula('1d8+3[Fire]', [5], false);
    expect(result).toBe('1d8+3 (5)');
  });
});

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

  it('rerolls 1s and returns original rolls when rerolls occur', () => {
    const originalRandom = Math.random;
    const results = [0.5, 0.5, 0.5];
    let callCount = 0;
    Math.random = () => {
      const val = results[callCount] ?? 0.5;
      callCount++;
      return val;
    };
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
      Math.random = originalRandom;
    }
  });

  it('handles all 1s being rerolled', () => {
    const originalRandom = Math.random;
    const results = [0.5, 0.5, 0.5];
    let callCount = 0;
    Math.random = () => {
      const val = results[callCount] ?? 0.5;
      callCount++;
      return val;
    };
    try {
      const result = applyHealingRerollOnes([1, 1, 1], '2d6');
      expect(result.displayRolls).toHaveLength(3);
      expect(result.originalRolls).toEqual([1, 1, 1]);
      for (const r of result.displayRolls) {
        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(6);
      }
    } finally {
      Math.random = originalRandom;
    }
  });

  it('returns originalRolls as null when no rerolls happened', () => {
    const result = applyHealingRerollOnes([3, 5, 6], '3d6');
    expect(result.originalRolls).toBeNull();
    expect(result.displayRolls).toEqual([3, 5, 6]);
  });
});

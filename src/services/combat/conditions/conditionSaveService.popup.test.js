// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect } from 'vitest';

// ── Imports ──────────────────────────────────────────────────────

import { buildConditionPopup } from './conditionSaveService.js';

// ── Tests ────────────────────────────────────────────────────────

describe('buildConditionPopup', () => {
  it('returns a popup object with all expected fields', () => {
    const popup = buildConditionPopup(15, 5, '+3 aura from Paladin', 'Wisdom', 'Charmed', 18, true);

    expect(popup).toEqual({
      type: 'd20',
      rollType: 'condition-save',
      name: 'Wisdom',
      rolls: [15],
      bonus: 5,
      bonusDetail: '+3 aura from Paladin',
      targetName: null,
      targetAc: null,
      hit: undefined,
      condition: 'Charmed',
      dc: 18,
      success: true,
    });
  });

  it('handles failure, null/undefined bonusDetail, and negative bonus', () => {
    let popup = buildConditionPopup(5, 2, undefined, 'Strength', 'Grappled', 14, false);
    expect(popup.success).toBe(false);
    expect(popup.rollType).toBe('condition-save');
    expect(popup.hit).toBeUndefined();

    popup = buildConditionPopup(10, 0, null, 'Constitution', 'Paralyzed', 12, true);
    expect(popup.bonusDetail).toBeNull();

    popup = buildConditionPopup(8, 3, undefined, 'Dexterity', 'Blinded', 11, false);
    expect(popup.bonusDetail).toBeUndefined();

    popup = buildConditionPopup(1, -3, 'detail', 'Charisma', 'Frightened', 5, false);
    expect(popup.targetName).toBeNull();
    expect(popup.targetAc).toBeNull();
  });

  it('wraps the roll value in a rolls array', () => {
    const popup = buildConditionPopup(7, 0, undefined, 'Wisdom', 'Cursed', 10, false);
    expect(Array.isArray(popup.rolls)).toBe(true);
    expect(popup.rolls).toEqual([7]);
  });
});

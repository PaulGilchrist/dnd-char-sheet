// CLA-229 regression: Misty Wanderer declares automation
// [free_spell, misty_wanderer]. executeHandler's actionable scan must NOT
// let automation[0] (free_spell → handleSpellCast) shadow the companion-carry
// half — the Special Actions row dispatches mistyWandererHandler, which opens
// MistyWandererModal (free Misty Step + willing-companion picker).
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { executeHandler } from './index.js';

vi.mock('./handlers/spells/spellCastHandler.js', () => ({
  handle: vi.fn().mockResolvedValue({ result: 'free_spell_cast' }),
}));

vi.mock('./handlers/class-warlock/mistyWandererHandler.js', () => ({
  handle: vi.fn().mockResolvedValue({ type: 'modal', modalName: 'mistyWanderer', payload: { usesMax: 3 } }),
  confirmMistyWanderer: vi.fn(),
}));

const { handle: spellCastHandle } = await import('./handlers/spells/spellCastHandler.js');
const { handle: mistyWandererHandle } = await import('./handlers/class-warlock/mistyWandererHandler.js');

const playerStats = { name: 'FeyRanger', level: 15 };

describe('executeHandler — Misty Wanderer dispatch priority (CLA-229)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches misty_wanderer over the leading free_spell half', async () => {
    const action = {
      name: 'Misty Wanderer',
      automation: [
        { type: 'free_spell', spell: 'Misty Step', uses_expression: 'WIS modifier_min_1', recharge: 'long_rest', casting_time: 'passive', hasAutomation: true },
        { type: 'misty_wanderer', uses_expression: 'WIS modifier_min_1', recharge: 'long_rest', range: '5_ft', casting_time: 'passive', hasAutomation: true },
      ],
    };

    const result = await executeHandler(action, playerStats, 'test-campaign', null);

    expect(result).toEqual({ type: 'modal', modalName: 'mistyWanderer', payload: { usesMax: 3 } });
    expect(mistyWandererHandle).toHaveBeenCalledTimes(1);
    expect(spellCastHandle).not.toHaveBeenCalled();
  });

  it('still dispatches free_spell when no misty_wanderer sibling exists (control)', async () => {
    const action = {
      name: 'Fey Magic',
      automation: [
        { type: 'free_spell', spell: 'Misty Step', uses: 1, recharge: 'long_rest', casting_time: 'passive', hasAutomation: true },
      ],
    };

    const result = await executeHandler(action, playerStats, 'test-campaign', null);

    expect(result).toEqual({ result: 'free_spell_cast' });
    expect(spellCastHandle).toHaveBeenCalledTimes(1);
    expect(mistyWandererHandle).not.toHaveBeenCalled();
  });
});

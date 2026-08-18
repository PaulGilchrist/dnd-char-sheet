// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────

import { savageAttacker } from './savageAttacker.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCurrentCombatRound } from '../../../encounters/combatData.js';

// ── Helpers ───────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  return {
    campaignName: 'test-campaign',
    playerStats: { name: 'Fighter1' },
    attack: { damage: '2d6' },
    ...overrides,
  };
}

/**
 * Mock Math.floor to return a sequence of values, then restore.
 * The code does: Math.floor(Math.random() * ds) + 1
 * Since Math.random can't be mocked (non-writable), we mock Math.floor.
 * We need to account for the +1 that happens outside Math.floor.
 * So if we want roll=r with die size ds:
 *   Math.floor should return r-1 (since (r-1)+1 = r)
 */
function mockFloorValues(values) {
  let idx = 0;
  const spy = vi.spyOn(globalThis.Math, 'floor').mockImplementation((_) => {
    return values[idx++] ?? 0;
  });
  return spy;
}

// ── Tests ────────────────────────────────────────────────────────

describe('savageAttacker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('condition', () => {
    it('returns true when player has reroll_damage_once_per_turn passive and attack.damage exists', () => {
      const ctx = makeCtx({
        playerStats: {
          automation: {
            passives: [
              { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
            ],
          },
        },
      });

      expect(savageAttacker.condition(ctx)).toBe(true);
    });

    it('returns false when player has reroll_damage_once_per_turn but no attack.damage', () => {
      const ctx = makeCtx({
        attack: {},
        playerStats: {
          automation: {
            passives: [
              { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
            ],
          },
        },
      });

      expect(savageAttacker.condition(ctx)).toBe(false);
    });

    it('returns false when player has no passives', () => {
      const ctx = makeCtx({
        playerStats: {
          automation: {
            passives: [],
          },
        },
      });

      expect(savageAttacker.condition(ctx)).toBe(false);
    });

    it('returns false when player has no automation object', () => {
      const ctx = makeCtx({
        playerStats: {},
      });

      expect(savageAttacker.condition(ctx)).toBe(false);
    });

    it('returns false when player has a different passive effect', () => {
      const ctx = makeCtx({
        playerStats: {
          automation: {
            passives: [
              { type: 'passive_rule', effect: 'some_other_effect' },
            ],
          },
        },
      });

      expect(savageAttacker.condition(ctx)).toBe(false);
    });

    it('returns true when player has multiple passives including reroll_damage_once_per_turn', () => {
      const ctx = makeCtx({
        playerStats: {
          automation: {
            passives: [
              { type: 'passive_rule', effect: 'some_other_effect' },
              { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
            ],
          },
        },
      });

      expect(savageAttacker.condition(ctx)).toBe(true);
    });

    it('throws when playerStats is null', () => {
      const ctx = makeCtx({
        playerStats: null,
      });

      expect(() => savageAttacker.condition(ctx)).toThrow();
    });

    it('returns false when playerStats.automation is null', () => {
      const ctx = makeCtx({
        playerStats: { automation: null },
      });

      expect(savageAttacker.condition(ctx)).toBe(false);
    });
  });

  describe('handler', () => {
    describe('early returns — no passive found', () => {
      it('returns null when passive is not in passives array', async () => {
        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'some_other_effect' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6+3', total: 10, rolls: [4, 6] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toBeNull();
      });

      it('returns null when passives array is empty', async () => {
        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [],
            },
          },
        });

        const prevData = { formula: '2d6+3', total: 10, rolls: [4, 6] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toBeNull();
      });

      it('returns null when automation is missing', async () => {
        const ctx = makeCtx({
          playerStats: {},
        });

        const prevData = { formula: '2d6+3', total: 10, rolls: [4, 6] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toBeNull();
      });
    });

    describe('early returns — already used this round', () => {
      it('returns prevData when already used in current round', async () => {
        getCurrentCombatRound.mockReturnValue(3);
        getRuntimeValue.mockImplementation((_key, prop) => {
          if (prop === '_Savage_Attacker_usedRound') return 3;
          return null;
        });

        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn', name: 'Savage Attacker' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6+3', total: 10, rolls: [4, 6] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
        expect(setRuntimeValue).not.toHaveBeenCalled();
      });

      it('uses the passive name to build the runtime key', async () => {
        getCurrentCombatRound.mockReturnValue(5);
        getRuntimeValue.mockImplementation((_key, prop) => {
          if (prop === '_MyFeature_usedRound') return 5;
          return null;
        });

        const ctx = makeCtx({
          playerStats: {
            name: 'CustomChar',
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn', name: 'My Feature' },
              ],
            },
          },
        });

        const prevData = { formula: '1d12', total: 7, rolls: [7] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });
    });

    describe('early returns — invalid damage formula', () => {
      it('returns prevData when damage formula does not match NdS pattern', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '3d6+2' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '3d6+2', total: 15, rolls: [3, 5, 7] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });

      it('returns prevData when damage formula has no dice', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: 'flat' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: 'flat', total: 5, rolls: [] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });
    });

    describe('early returns — no rolls', () => {
      it('returns prevData when rolls array is empty', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6', total: 7, rolls: [] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });
    });

    describe('early returns — roll count mismatch', () => {
      it('returns prevData when number of rolls does not match dice count', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        // Formula is 2d6 but only 1 roll
        const prevData = { formula: '2d6', total: 5, rolls: [5] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });
    });

    describe('early returns — second roll not higher', () => {
      it('returns prevData when second total equals first total', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '2d6' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6', total: 7, rolls: [3, 4] };
        // first=3+4=7, need second=7: rolls 3+4=7
        // Math.floor returns r-1: for roll=3→2, for roll=4→3
        mockFloorValues([2, 3]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });

      it('returns prevData when second total is less than first total', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '2d6' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6', total: 7, rolls: [3, 4] };
        // first=7, need second<7: rolls 1+2=3
        // Math.floor returns r-1: for roll=1→0, for roll=2→1
        mockFloorValues([0, 1]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });
    });

    describe('successful reroll', () => {
      it('replaces rolls when second total is higher', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '2d6' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6', total: 5, rolls: [2, 3] };
        // first=2+3=5, need second>5: rolls 6+4=10
        // Math.floor returns r-1: for roll=6→5, for roll=4→3
        mockFloorValues([5, 3]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result.data.formula).toBe('2d6 [Savage Attacker]');
        expect(result.data.total).toBe(10); // 5 + 10 - 5 = 10
        expect(result.data.rolls).toEqual([6, 4]);
        expect(result.sideEffects).toBeDefined();
        expect(typeof result.sideEffects).toBe('function');
      });

      it('updates total correctly: newTotal = prevTotal + secondTotal - firstTotal', async () => {
        getCurrentCombatRound.mockReturnValue(2);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '3d6' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '3d6', total: 10, rolls: [1, 4, 5] };
        // first=1+4+5=10, need second=18: rolls 6+6+6=18, total=10+18-10=18
        // Math.floor returns r-1: for roll=6→5
        mockFloorValues([5, 5, 5]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result.data.total).toBe(18);
        expect(result.data.rolls).toEqual([6, 6, 6]);
        expect(result.data.formula).toBe('3d6 [Savage Attacker]');
      });

      it('marks the round as used via sideEffects', async () => {
        getCurrentCombatRound.mockReturnValue(4);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '1d8' },
          playerStats: {
            name: 'TestChar',
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '1d8', total: 3, rolls: [3] };
        // first=3, need second>3: roll=7
        // Math.floor returns r-1: for roll=7→6
        mockFloorValues([6]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(setRuntimeValue).not.toHaveBeenCalled();
        expect(result.sideEffects).toBeDefined();

        await result.sideEffects();

        expect(setRuntimeValue).toHaveBeenCalledWith(
          'TestChar',
          '_SavageAttacker_usedRound',
          4,
          'test-campaign',
        );
      });

      it('works with single die (1dS pattern)', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '1d20' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '1d20', total: 10, rolls: [10] };
        // first=10, need second>10: roll=18
        // Math.floor returns r-1: for roll=18→17
        mockFloorValues([17]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result.data.formula).toBe('1d20 [Savage Attacker]');
        expect(result.data.total).toBe(18);
        expect(result.data.rolls).toEqual([18]);
      });

      it('works with large number of dice', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '4d6' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '4d6', total: 10, rolls: [1, 2, 3, 4] };
        // first=1+2+3+4=10, need second=24: rolls 6+6+6+6=24, total=10+24-10=24
        // Math.floor returns r-1: for roll=6→5
        mockFloorValues([5, 5, 5, 5]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result.data.total).toBe(24);
        expect(result.data.rolls).toEqual([6, 6, 6, 6]);
      });
    });

    describe('edge cases', () => {
      it('handles non-standard die sizes', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          attack: { damage: '2d10' },
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '2d10', total: 6, rolls: [3, 3] };
        // first=3+3=6, need second>6: rolls 9+8=17, total=6+17-6=17
        // Math.floor returns r-1: for roll=9→8, for roll=8→7
        mockFloorValues([8, 7]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result.data.rolls).toEqual([9, 8]);
        expect(result.data.total).toBe(17);
      });

      it('returns prevData when rolls length exceeds dice count', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        // Formula is 2d6 but 3 rolls
        const prevData = { formula: '2d6', total: 10, rolls: [3, 4, 3] };
        const result = await savageAttacker.handler(ctx, prevData);

        expect(result).toEqual({ data: prevData });
      });

      it('uses default key when passive has no name', async () => {
        getCurrentCombatRound.mockReturnValue(1);
        getRuntimeValue.mockReturnValue(null);

        const ctx = makeCtx({
          playerStats: {
            automation: {
              passives: [
                { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
              ],
            },
          },
        });

        const prevData = { formula: '2d6', total: 5, rolls: [2, 3] };
        // first=5, need second>5: rolls 6+5=11
        // Math.floor returns r-1: for roll=6→5, for roll=5→4
        mockFloorValues([5, 4]);

        const result = await savageAttacker.handler(ctx, prevData);

        expect(result.data.formula).toBe('2d6 [Savage Attacker]');
      });
    });
  });
});

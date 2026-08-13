// @improved-by-ai
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import useDiceRoll from './useDiceRoll.js';
import { DiceRollContext } from './DiceRollContext.js';
import { rollD20 } from '../../services/dice/diceRoller.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}));

describe('useDiceRoll', () => {
  const UseDiceRollWrapper = ({ children }) => {
    const [popupHtml, setPopupHtml] = React.useState(null);
    return (
      <DiceRollContext.Provider value={{ popupHtml, setPopupHtml }}>
        {children}
      </DiceRollContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rollD20.mockReturnValue(15);
  });

  describe('initial state', () => {
    it('should return popupHtml as null, setPopupHtml as function, and all roll functions', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      const {
        popupHtml,
        setPopupHtml,
        rollAbilityCheck,
        rollSavingThrow,
        rollSkillCheck,
        rollInitiative,
        rollAttack,
        rollDamage,
      } = result.current;

      expect(popupHtml).toBeNull();
      expect(typeof setPopupHtml).toBe('function');
      expect(typeof rollAbilityCheck).toBe('function');
      expect(typeof rollSavingThrow).toBe('function');
      expect(typeof rollSkillCheck).toBe('function');
      expect(typeof rollInitiative).toBe('function');
      expect(typeof rollAttack).toBe('function');
      expect(typeof rollDamage).toBe('function');
    });
  });

  describe('d20 roll types', () => {
    const rollTypeTests = [
      ['rollAbilityCheck', 'check'],
      ['rollSavingThrow', 'save'],
      ['rollSkillCheck', 'skill'],
      ['rollAttack', 'attack'],
    ];

    for (const [fnName, expectedRollType] of rollTypeTests) {
      it(`should call rollD20 twice and set popupHtml with type d20 when calling ${fnName}`, () => {
        const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
        act(() => {
          result.current[fnName]('Test', 5);
        });

        expect(rollD20).toHaveBeenCalledTimes(2);
        expect(result.current.popupHtml).toEqual({
          type: 'd20',
          rollType: expectedRollType,
          name: 'Test',
          rolls: [15, 15],
          bonus: 5,
        });
      });
    }

    it('should set popupHtml with rollType initiative when calling rollInitiative', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollInitiative(4);
      });

      expect(rollD20).toHaveBeenCalledTimes(2);
      expect(result.current.popupHtml).toEqual({
        type: 'd20',
        rollType: 'initiative',
        name: 'Initiative',
        rolls: [15, 15],
        bonus: 4,
      });
    });

    it('should pass through positive, negative, and zero bonus values', () => {
      const { result: neg } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        neg.current.rollAbilityCheck('Test', -5);
      });
      expect(neg.current.popupHtml.bonus).toBe(-5);

      const { result: pos } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        pos.current.rollAttack('Test', 15);
      });
      expect(pos.current.popupHtml.bonus).toBe(15);

      const { result: zero } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        zero.current.rollSkillCheck('Test', 0);
      });
      expect(zero.current.popupHtml.bonus).toBe(0);
    });

    it('should use different d20 values when rollD20 returns different results', () => {
      rollD20.mockReturnValueOnce(3).mockReturnValueOnce(18);
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollAbilityCheck('Test', 2);
      });
      expect(result.current.popupHtml.rolls).toEqual([3, 18]);
      expect(result.current.popupHtml.bonus).toBe(2);
    });
  });

  describe('damage rolls', () => {
    it('should set popupHtml with type damage and all fields', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollDamage('Longsword', '1d8+3', 7, [4, 3], 3, undefined);
      });
      expect(result.current.popupHtml).toEqual({
        type: 'damage',
        name: 'Longsword',
        formula: '1d8+3',
        rolls: [4, 3],
        total: 7,
        bonus: 0,
        modifier: 3,
        critLabels: null,
      });
    });

    it('should pass through rolls array and modifier as provided', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollDamage('Test', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, undefined);
      });
      expect(result.current.popupHtml.rolls).toEqual([3, 4, 5, 2, 3, 3]);
      expect(result.current.popupHtml.modifier).toBe(0);
    });

    it('should pass critLabels from ctx object', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollDamage('Test', '1d8', 5, [5], 0, { critLabels: 'critical' });
      });
      expect(result.current.popupHtml.critLabels).toBe('critical');
    });

    it('should set critLabels to null when ctx is undefined', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollDamage('Test', '1d8', 5, [5], 0, undefined);
      });
      expect(result.current.popupHtml.critLabels).toBeNull();
    });
  });

  describe('setPopupHtml', () => {
    it('should allow direct setPopupHtml calls', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.setPopupHtml({ type: 'custom', value: 42 });
      });
      expect(result.current.popupHtml).toEqual({ type: 'custom', value: 42 });
    });

    it('should allow clearing popupHtml by setting null', () => {
      const { result } = renderHook(() => useDiceRoll(), { wrapper: UseDiceRollWrapper });
      act(() => {
        result.current.rollAbilityCheck('Test', 5);
      });
      expect(result.current.popupHtml).not.toBeNull();
      act(() => {
        result.current.setPopupHtml(null);
      });
      expect(result.current.popupHtml).toBeNull();
    });
  });
});

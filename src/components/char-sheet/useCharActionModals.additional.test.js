import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCharActionModals from './useCharActionModals.js';

vi.mock('./useAttackDamageResolution.js', () => ({
  default: vi.fn(),
}));

vi.mock('./useModalHandlers.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../hooks/combat/useCombatSuperiorityModal.js', () => ({
  useCombatSuperiorityModal: vi.fn(() => ({
    combatSuperiorityModal: null,
    setCombatSuperiorityModal: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(),
    handleCombatSuperiorityReopenSelection: vi.fn(),
  })),
}));

vi.mock('../../hooks/runtime/useSyncedState.js', () => {
  const sharedState = { pipelinePause: null };
  const pipelinePauseSetter = vi.fn((fn) => {
    if (typeof fn === 'function') {
      sharedState.pipelinePause = fn(sharedState.pipelinePause);
    } else {
      sharedState.pipelinePause = fn;
    }
  });

  return {
    useSyncedState: vi.fn((characterKey, key, defaultValue) => {
      if (key === 'pipeline-pause') {
        return [sharedState.pipelinePause, pipelinePauseSetter];
      }
      let value = defaultValue;
      const setter = vi.fn((fn) => {
        if (typeof fn === 'function') {
          value = fn(value);
        } else {
          value = fn;
        }
      });
      return [value, setter];
    }),
    __resetPendingDamage: () => {
      sharedState.pipelinePause = null;
      pipelinePauseSetter.mockClear();
    },
  };
});

const useAttackDamageResolution = (await import('./useAttackDamageResolution.js')).default;
const useModalHandlers = (await import('./useModalHandlers.js')).default;
const { useSyncedState } = await import('../../hooks/runtime/useSyncedState.js');
const { useCombatSuperiorityModal } = await import('../../hooks/combat/useCombatSuperiorityModal.js');
const { __resetPendingDamage } = await import('../../hooks/runtime/useSyncedState.js');

const mockResolveAttackDamageResult = {
  resolveAttackDamage: vi.fn(),
  proceedWithDamage: vi.fn(),
};

const mockModalHandlersResult = {
  handleMasteryClose: vi.fn(),
  handleWeaponMasteryChoice: vi.fn(),
  handleDivineFuryDamageType: vi.fn(),
  handleDivineFurySkip: vi.fn(),
  handleGenericDamageTypeChoice: vi.fn(),
  handleGenericDamageTypeSkip: vi.fn(),
  handleDamageTypeModifierChoice: vi.fn(),
  handleDamageTypeModifierSkip: vi.fn(),
  handleEnhancedUnarmedChoice: vi.fn(),
  handleEnhancedUnarmedSkip: vi.fn(),
  handleFeatureChoiceConfirm: vi.fn(),
  handleFeatureChoiceSkip: vi.fn(),
  handleConstellationSelect: vi.fn(),
  handleFlurryOfBlowsConfirm: vi.fn(),
  handleFlurryOfBlowsSkip: vi.fn(),
  handleOpenHandFromFlurryConfirm: vi.fn(),
  handleOpenHandFromFlurrySkip: vi.fn(),
};

const baseArgs = {
  playerStats: { name: 'TestCharacter', class: { name: 'Fighter' } },
  campaignName: 'test-campaign',
  mapName: null,
  popupHtml: null,
  setPopupHtml: vi.fn(),
  rollDamage: vi.fn(),
  rollAttack: vi.fn(),
  buildCtx: vi.fn(() => Promise.resolve({})),
  buildCtxSync: vi.fn(() => ({})),
};

describe('useCharActionModals — additional behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingDamage();
    useAttackDamageResolution.mockReturnValue(mockResolveAttackDamageResult);
    useModalHandlers.mockReturnValue(mockModalHandlersResult);
  });

  describe('setModalState callback updater pattern', () => {
    it('setModalState does not accept function updaters - treats them as plain objects', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      // The hook's setModalState uses spread merge: { ...prev, ...updates }
      // A function is an object, so it gets spread (no-op for function properties)
      act(() => {
        result.current.setModalState({ key: 'value' });
      });
      // Passing a function doesn't work as a state updater (not useState pattern)
      act(() => {
        result.current.setModalState(() => ({ updated: true }));
      });
      expect(result.current.modalState).toEqual({ key: 'value' });
    });
  });

  describe('setPendingDamage behavior', () => {
    it('setPendingDamage is a function', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(typeof result.current.setPendingDamage).toBe('function');
    });

    it('setPendingDamage is callable without error', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(() => result.current.setPendingDamage({ data: 'value' })).not.toThrow();
    });

    it('setPendingDamage mock setter is called', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      act(() => {
        result.current.setPendingDamage({ data: 'value' });
      });
      expect(result.current.setPendingDamage).toHaveBeenCalled();
    });
  });

  describe('setCombatSuperiorityModal behavior', () => {
    it('setCombatSuperiorityModal is callable', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(typeof result.current.setCombatSuperiorityModal).toBe('function');
    });

    it('setCombatSuperiorityModal is a vi.fn from mock', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      act(() => {
        result.current.setCombatSuperiorityModal({ type: 'test' });
      });
      expect(result.current.setCombatSuperiorityModal).toHaveBeenCalled();
    });
  });

  describe('combatSuperiorityModal with non-null value', () => {
    it('returns non-null combatSuperiorityModal when sub-hook provides it', () => {
      const mockSuperiorityModal = { type: 'superiority', options: ['Savage Attacker'] };
      useCombatSuperiorityModal.mockReturnValue({
        combatSuperiorityModal: mockSuperiorityModal,
        setCombatSuperiorityModal: vi.fn(),
        handleCombatSuperiorityConfirm: vi.fn(),
        handleCombatSuperiorityReopenSelection: vi.fn(),
      });
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.combatSuperiorityModal).toEqual(mockSuperiorityModal);
    });
  });

  describe('passThru references', () => {
    it('buildCtx is the exact same reference as passed in', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.buildCtx).toBe(baseArgs.buildCtx);
    });

    it('buildCtxSync is the exact same reference as passed in', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.buildCtxSync).toBe(baseArgs.buildCtxSync);
    });

    it('does NOT expose setPopupHtml in return object', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.setPopupHtml).toBeUndefined();
    });

    it('does NOT expose rollDamage in return object', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.rollDamage).toBeUndefined();
    });

    it('does NOT expose rollAttack in return object', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.rollAttack).toBeUndefined();
    });
  });

  describe('internal _setModalState not exposed', () => {
    it('does not expose _setModalState in return object', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current._setModalState).toBeUndefined();
    });
  });

  describe('setModalState clearing behavior edge cases', () => {
    it('setModalState with empty object preserves existing state', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      act(() => {
        result.current.setModalState({ key: 'value' });
      });
      act(() => {
        result.current.setModalState({});
      });
      expect(result.current.modalState).toEqual({ key: 'value' });
    });

    it('setModalState with falsy values clears (0, false, null, undefined)', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      act(() => {
        result.current.setModalState({ key: 'value' });
      });
      act(() => {
        result.current.setModalState(false);
      });
      expect(result.current.modalState).toEqual({});
    });
  });

  describe('multiple renderHook calls are independent', () => {
    it('two separate hooks have independent modalState', () => {
      const { result: r1 } = renderHook(() => useCharActionModals(baseArgs));
      const { result: r2 } = renderHook(() => useCharActionModals(baseArgs));
      act(() => {
        r1.current.setModalState({ hook: 1 });
      });
      expect(r1.current.modalState).toEqual({ hook: 1 });
      expect(r2.current.modalState).toEqual({});
    });

    it('two separate hooks have independent setModalState functions', () => {
      const { result: r1 } = renderHook(() => useCharActionModals(baseArgs));
      const { result: r2 } = renderHook(() => useCharActionModals(baseArgs));
      act(() => {
        r1.current.setModalState({ hook: 'r1' });
      });
      expect(r1.current.modalState).toEqual({ hook: 'r1' });
      expect(r2.current.modalState).toEqual({});
    });
  });

  describe('useCombatSuperiorityModal with custom rollAttack/rollDamage', () => {
    it('passes rollAttack to useCombatSuperiorityModal', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useCombatSuperiorityModal).toHaveBeenCalledWith(
        baseArgs.playerStats,
        'test-campaign',
        baseArgs.rollAttack,
        baseArgs.rollDamage,
        baseArgs.setPopupHtml,
      );
    });
  });

  describe('useModalHandlers receives proceedWithDamage', () => {
    it('passes proceedWithDamage from useAttackDamageResolution to useModalHandlers', () => {
      renderHook(() => useCharActionModals(baseArgs));
      const callArg = useModalHandlers.mock.calls[0][0];
      expect(callArg.proceedWithDamage).toBe(mockResolveAttackDamageResult.proceedWithDamage);
    });
  });

  describe('useModalHandlers receives modalState', () => {
    it('passes modalState object to useModalHandlers', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      const callArg = useModalHandlers.mock.calls[0][0];
      expect(callArg.modalState).toBe(result.current.modalState);
    });
  });

  describe('useAttackDamageResolution receives modalState setter', () => {
    it('passes setModalState to useAttackDamageResolution', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      const callArg = useAttackDamageResolution.mock.calls[0][0];
      expect(callArg.setModalState).toBe(result.current.setModalState);
    });

    it('passes modalState to useAttackDamageResolution', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      const callArg = useAttackDamageResolution.mock.calls[0][0];
      expect(callArg.modalState).toBe(result.current.modalState);
    });

    it('passes setPendingDamage to useAttackDamageResolution', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      const callArg = useAttackDamageResolution.mock.calls[0][0];
      expect(callArg.setPendingDamage).toBe(result.current.setPendingDamage);
    });
  });

  describe('different campaign names', () => {
    it('uses different campaignName in useSyncedState', () => {
      const args = { ...baseArgs, campaignName: 'different-campaign' };
      renderHook(() => useCharActionModals(args));
      expect(useSyncedState).toHaveBeenCalledWith('different-campaign', 'pipeline-pause', null, 'different-campaign');
    });
  });

  describe('different mapName', () => {
    it('passes mapName through to useAttackDamageResolution when non-null', () => {
      const args = { ...baseArgs, mapName: 'my-map' };
      renderHook(() => useCharActionModals(args));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ mapName: 'my-map' }),
      );
    });
  });
});

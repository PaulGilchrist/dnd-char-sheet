// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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

vi.mock('../../hooks/runtime/useSyncedState.js', () => ({
  useSyncedState: vi.fn((_, key, defaultValue) => {
    let currentValue = defaultValue;
    const setter = vi.fn((fn) => {
      if (typeof fn === 'function') {
        currentValue = fn(currentValue);
      } else {
        currentValue = fn;
      }
      return currentValue;
    });
    return [currentValue, setter];
  }),
}));

const useAttackDamageResolution = (await import('./useAttackDamageResolution.js')).default;
const useModalHandlers = (await import('./useModalHandlers.js')).default;
const { useSyncedState } = await import('../../hooks/runtime/useSyncedState.js');
const { useCombatSuperiorityModal } = await import('../../hooks/combat/useCombatSuperiorityModal.js');

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

describe('useCharActionModals — integration & prop passing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAttackDamageResolution.mockReturnValue(mockResolveAttackDamageResult);
    useModalHandlers.mockReturnValue(mockModalHandlersResult);
  });

  describe('useSyncedState invocation', () => {
    it('calls useSyncedState with campaignName as characterKey', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useSyncedState).toHaveBeenCalledWith('test-campaign', 'pipeline-pause', null, 'test-campaign');
    });

    it('pendingDamage defaults to null', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.pendingDamage).toBeNull();
    });

    it('setPendingDamage is a function', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(typeof result.current.setPendingDamage).toBe('function');
    });
  });

  describe('useAttackDamageResolution prop passing', () => {
    it('passes playerStats to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ playerStats: baseArgs.playerStats }),
      );
    });

    it('passes campaignName to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ campaignName: 'test-campaign' }),
      );
    });

    it('passes mapName to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ mapName: null }),
      );
    });

    it('passes popupHtml to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ popupHtml: null }),
      );
    });

    it('passes setPopupHtml to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ setPopupHtml: baseArgs.setPopupHtml }),
      );
    });

    it('passes rollDamage to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ rollDamage: baseArgs.rollDamage }),
      );
    });

    it('passes buildCtx to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ buildCtx: baseArgs.buildCtx }),
      );
    });

    it('passes buildCtxSync to useAttackDamageResolution', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ buildCtxSync: baseArgs.buildCtxSync }),
      );
    });

    it('passes setModalState to useAttackDamageResolution', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ setModalState: result.current.setModalState }),
      );
    });

    it('passes modalState to useAttackDamageResolution', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ modalState: result.current.modalState }),
      );
    });

    it('passes setPendingDamage to useAttackDamageResolution', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ setPendingDamage: result.current.setPendingDamage }),
      );
    });
  });

  describe('useCombatSuperiorityModal prop passing', () => {
    it('passes playerStats to useCombatSuperiorityModal', () => {
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

  describe('useModalHandlers prop passing', () => {
    it('passes playerStats to useModalHandlers', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ playerStats: baseArgs.playerStats }),
      );
    });

    it('passes campaignName to useModalHandlers', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ campaignName: 'test-campaign' }),
      );
    });

    it('passes rollDamage to useModalHandlers', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ rollDamage: baseArgs.rollDamage }),
      );
    });

    it('passes proceedWithDamage from useAttackDamageResolution to useModalHandlers', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ proceedWithDamage: expect.any(Function) }),
      );
    });

    it('passes pendingDamage to useModalHandlers', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ pendingDamage: result.current.pendingDamage }),
      );
    });

    it('passes setPendingDamage to useModalHandlers', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ setPendingDamage: result.current.setPendingDamage }),
      );
    });

    it('passes setModalState to useModalHandlers', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ setModalState: result.current.setModalState }),
      );
    });

    it('passes modalState to useModalHandlers', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ modalState: result.current.modalState }),
      );
    });

    it('passes setPopupHtml to useModalHandlers', () => {
      renderHook(() => useCharActionModals(baseArgs));
      expect(useModalHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ setPopupHtml: baseArgs.setPopupHtml }),
      );
    });
  });

  describe('buildCtx and buildCtxSync passthrough', () => {
    it('returns buildCtx from args', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.buildCtx).toBe(baseArgs.buildCtx);
    });

    it('returns buildCtxSync from args', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      expect(result.current.buildCtxSync).toBe(baseArgs.buildCtxSync);
    });
  });

  describe('custom mapName', () => {
    it('passes mapName through to useAttackDamageResolution when set', () => {
      const argsWithMap = { ...baseArgs, mapName: 'test-map' };
      renderHook(() => useCharActionModals(argsWithMap));
      expect(useAttackDamageResolution).toHaveBeenCalledWith(
        expect.objectContaining({ mapName: 'test-map' }),
      );
    });
  });

  describe('complete return object shape', () => {
    it('returns all 27 expected properties', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      const expectedKeys = [
        'modalState',
        'setModalState',
        'pendingDamage',
        'setPendingDamage',
        'buildCtx',
        'buildCtxSync',
        'combatSuperiorityModal',
        'setCombatSuperiorityModal',
        'handleCombatSuperiorityConfirm',
        'handleCombatSuperiorityReopenSelection',
        'resolveAttackDamage',
        'handleMasteryClose',
        'handleWeaponMasteryChoice',
        'handleDivineFuryDamageType',
        'handleDivineFurySkip',
        'handleGenericDamageTypeChoice',
        'handleGenericDamageTypeSkip',
        'handleDamageTypeModifierChoice',
        'handleDamageTypeModifierSkip',
        'handleEnhancedUnarmedChoice',
        'handleEnhancedUnarmedSkip',
        'handleFeatureChoiceConfirm',
        'handleFeatureChoiceSkip',
        'handleConstellationSelect',
        'handleFlurryOfBlowsConfirm',
        'handleFlurryOfBlowsSkip',
        'handleOpenHandFromFlurryConfirm',
        'handleOpenHandFromFlurrySkip',
      ];
      const actualKeys = Object.keys(result.current);
      for (const key of expectedKeys) {
        expect(actualKeys).toContain(key);
      }
    });

    it('returns exactly the expected properties (no extras)', () => {
      const { result } = renderHook(() => useCharActionModals(baseArgs));
      const expectedKeys = [
        'modalState',
        'setModalState',
        'pendingDamage',
        'setPendingDamage',
        'buildCtx',
        'buildCtxSync',
        'combatSuperiorityModal',
        'setCombatSuperiorityModal',
        'handleCombatSuperiorityConfirm',
        'handleCombatSuperiorityReopenSelection',
        'resolveAttackDamage',
        'handleMasteryClose',
        'handleWeaponMasteryChoice',
        'handleDivineFuryDamageType',
        'handleDivineFurySkip',
        'handleGenericDamageTypeChoice',
        'handleGenericDamageTypeSkip',
        'handleDamageTypeModifierChoice',
        'handleDamageTypeModifierSkip',
        'handleEnhancedUnarmedChoice',
        'handleEnhancedUnarmedSkip',
        'handleFeatureChoiceConfirm',
        'handleFeatureChoiceSkip',
        'handleConstellationSelect',
        'handleFlurryOfBlowsConfirm',
        'handleFlurryOfBlowsSkip',
        'handleOpenHandFromFlurryConfirm',
        'handleOpenHandFromFlurrySkip',
      ];
      const actualKeys = Object.keys(result.current).sort();
      const sortedExpected = [...expectedKeys].sort();
      expect(actualKeys).toEqual(sortedExpected);
    });
  });
});

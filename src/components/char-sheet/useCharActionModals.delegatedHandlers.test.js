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

describe('useCharActionModals — delegated handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAttackDamageResolution.mockReturnValue(mockResolveAttackDamageResult);
    useModalHandlers.mockReturnValue(mockModalHandlersResult);
  });

  it('returns resolveAttackDamage from useAttackDamageResolution', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.resolveAttackDamage).toBe(mockResolveAttackDamageResult.resolveAttackDamage);
  });

  it('uses proceedWithDamage internally but does not expose it in return object', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.proceedWithDamage).toBeUndefined();
  });

  it('returns handleMasteryClose from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleMasteryClose).toBe(mockModalHandlersResult.handleMasteryClose);
  });

  it('returns handleWeaponMasteryChoice from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleWeaponMasteryChoice).toBe(mockModalHandlersResult.handleWeaponMasteryChoice);
  });

  it('returns handleDivineFuryDamageType from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleDivineFuryDamageType).toBe(mockModalHandlersResult.handleDivineFuryDamageType);
  });

  it('returns handleDivineFurySkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleDivineFurySkip).toBe(mockModalHandlersResult.handleDivineFurySkip);
  });

  it('returns handleGenericDamageTypeChoice from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleGenericDamageTypeChoice).toBe(mockModalHandlersResult.handleGenericDamageTypeChoice);
  });

  it('returns handleGenericDamageTypeSkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleGenericDamageTypeSkip).toBe(mockModalHandlersResult.handleGenericDamageTypeSkip);
  });

  it('returns handleDamageTypeModifierChoice from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleDamageTypeModifierChoice).toBe(mockModalHandlersResult.handleDamageTypeModifierChoice);
  });

  it('returns handleDamageTypeModifierSkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleDamageTypeModifierSkip).toBe(mockModalHandlersResult.handleDamageTypeModifierSkip);
  });

  it('returns handleEnhancedUnarmedChoice from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleEnhancedUnarmedChoice).toBe(mockModalHandlersResult.handleEnhancedUnarmedChoice);
  });

  it('returns handleEnhancedUnarmedSkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleEnhancedUnarmedSkip).toBe(mockModalHandlersResult.handleEnhancedUnarmedSkip);
  });

  it('returns handleFeatureChoiceConfirm from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleFeatureChoiceConfirm).toBe(mockModalHandlersResult.handleFeatureChoiceConfirm);
  });

  it('returns handleFeatureChoiceSkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleFeatureChoiceSkip).toBe(mockModalHandlersResult.handleFeatureChoiceSkip);
  });

  it('returns handleConstellationSelect from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleConstellationSelect).toBe(mockModalHandlersResult.handleConstellationSelect);
  });

  it('returns handleFlurryOfBlowsConfirm from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleFlurryOfBlowsConfirm).toBe(mockModalHandlersResult.handleFlurryOfBlowsConfirm);
  });

  it('returns handleFlurryOfBlowsSkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleFlurryOfBlowsSkip).toBe(mockModalHandlersResult.handleFlurryOfBlowsSkip);
  });

  it('returns handleOpenHandFromFlurryConfirm from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleOpenHandFromFlurryConfirm).toBe(mockModalHandlersResult.handleOpenHandFromFlurryConfirm);
  });

  it('returns handleOpenHandFromFlurrySkip from useModalHandlers', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.handleOpenHandFromFlurrySkip).toBe(mockModalHandlersResult.handleOpenHandFromFlurrySkip);
  });

  it('returns combatSuperiorityModal from useCombatSuperiorityModal', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(result.current.combatSuperiorityModal).toBeNull();
  });

  it('returns setCombatSuperiorityModal from useCombatSuperiorityModal', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(typeof result.current.setCombatSuperiorityModal).toBe('function');
  });

  it('returns handleCombatSuperiorityConfirm from useCombatSuperiorityModal', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(typeof result.current.handleCombatSuperiorityConfirm).toBe('function');
  });

  it('returns handleCombatSuperiorityReopenSelection from useCombatSuperiorityModal', () => {
    const { result } = renderHook(() => useCharActionModals(baseArgs));
    expect(typeof result.current.handleCombatSuperiorityReopenSelection).toBe('function');
  });
});

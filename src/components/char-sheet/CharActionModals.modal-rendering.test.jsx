// @improved-by-ai
// Tests for modal rendering and close behavior in CharActionModals.jsx.
//
// Scope — only behaviors NOT covered elsewhere:
// - bendFateModal rendering and close
// - wildMagicSurgeModal rendering (spellModalState clearing is in modal-closes-3.test.jsx)
// - openHandFromFlurry modal rendering and handler invocation
//
// Already covered in other files:
// - starryForm/twinklingConstellationModal rendering → rendering.test.jsx + handlers.test.jsx
// - moonlightStepFallbackModal buttons/handlers → inline-modals.test.jsx
// - wildMagicSurgeModal close → modal-closes-3.test.jsx
// - clockworkCavalcadeRepairModal → inline-modals.test.jsx + inline-choice-modals.test.jsx
//
// NOTE: vi.mock() is hoisted to the top of the file by Vitest, so all mock
// factories must be defined inline (no references to top-level variables).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';
import { createBaseProps } from './CharActionModals.test-utils.jsx';

// ── Minimal mocks — only the modals actually rendered by these tests ──

vi.mock('./modals/BendFateModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return (
      <div data-testid="bend-fate-modal">
        <button data-testid="bend-fate-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/WildMagicSurgeModal.jsx', () => ({
  default: function TestModal({ onClose }) {
    return (
      <div data-testid="wild-magic-surge-modal">
        <button data-testid="wild-magic-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock('./modals/OpenHandTechniqueModal.jsx', () => ({
  default: function TestModal({ onClose, onConfirm }) {
    return (
      <div data-testid="open-hand-technique-modal">
        <button data-testid="open-hand-close" onClick={onClose}>Close</button>
        <button data-testid="open-hand-confirm" onClick={() => onConfirm('grappled')}>Grapple</button>
      </div>
    );
  },
}));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));
vi.mock('../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──

describe('CharActionModals — modal rendering tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── bendFateModal rendering and close ──
  // Covered in other files: none (unique to this file)

  describe('bendFateModal', () => {
    it('renders when modalState has a truthy bendFateModal', () => {
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{ bendFateModal: { action: { lastAttack: { d20: 15, bonus: 5 } } } }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.getByTestId('bend-fate-modal')).toBeInTheDocument();
    });

    it('clears modalState on close', () => {
      const setModalState = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ setModalState })}
          modalState={{ bendFateModal: { action: { lastAttack: { d20: 15, bonus: 5 } } } }}
          setModalState={setModalState}
        />
      );
      fireEvent.click(screen.getByTestId('bend-fate-close'));
      expect(setModalState).toHaveBeenCalledWith({ bendFateModal: null });
    });
  });

  // ── wildMagicSurgeModal rendering ──
  // Close behavior (setModalState + setSpellModalState) is in modal-closes-3.test.jsx

  describe('wildMagicSurgeModal rendering', () => {
    it('renders when spellModalState has wildMagicSurgeModal', () => {
      const setSpellModalState = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps()}
          spellModalState={{ wildMagicSurgeModal: { surgeTable: [], mode: 'roll' } }}
          setModalState={vi.fn()}
          setSpellModalState={setSpellModalState}
        />
      );
      expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
    });
  });

  // ── openHandFromFlurry modal rendering and handlers ──
  // Event dispatching is in modal-closes.test.jsx + modal-closes-2.test.jsx

  describe('openHandFromFlurry modal', () => {
    it('renders OpenHandTechniqueModal with target data', () => {
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{
            openHandFromFlurry: {
              targets: [{ action: {}, playerStats: {}, campaignName: 'test-campaign', targetName: 'Goblin' }],
              currentIndex: 0,
              saveDc: 15,
            },
          }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.getByTestId('open-hand-technique-modal')).toBeInTheDocument();
    });

    it('invokes handleOpenHandFromFlurrySkip on close', () => {
      const handler = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handleOpenHandFromFlurrySkip: handler })}
          modalState={{
            openHandFromFlurry: {
              targets: [{ action: {}, playerStats: {}, campaignName: 'test-campaign', targetName: 'Goblin' }],
              currentIndex: 0,
              saveDc: 15,
            },
          }}
          setModalState={vi.fn()}
        />
      );
      fireEvent.click(screen.getByTestId('open-hand-close'));
      expect(handler).toHaveBeenCalled();
    });

    it('invokes handleOpenHandFromFlurryConfirm with optionName on confirm', () => {
      const handler = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handleOpenHandFromFlurryConfirm: handler })}
          modalState={{
            openHandFromFlurry: {
              targets: [{ action: {}, playerStats: {}, campaignName: 'test-campaign', targetName: 'Goblin' }],
              currentIndex: 0,
              saveDc: 15,
            },
          }}
          setModalState={vi.fn()}
        />
      );
      fireEvent.click(screen.getByTestId('open-hand-confirm'));
      expect(handler).toHaveBeenCalledWith({ optionName: 'grappled' });
    });
  });
});

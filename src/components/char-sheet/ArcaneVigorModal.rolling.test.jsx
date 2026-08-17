// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ArcaneVigorModal from './ArcaneVigorModal.jsx';

const getRuntimeValueMock = vi.fn(() => null);
const setRuntimeValueMock = vi.fn();

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  useRuntimeValue: vi.fn(() => null),
  listeners: new Map(),
  getRuntimeValue: vi.fn((...args) => getRuntimeValueMock(...args)),
  setRuntimeValue: vi.fn((...args) => setRuntimeValueMock(...args)),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollDice: vi.fn((count, _die) => ({ total: count * 4, rolls: Array(count).fill(4) })),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(() => null),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

const mockCampaignName = 'test-campaign';

function createProps(overrides = {}) {
  return {
    hitDieSize: 8,
    spellcastingAbility: 'INT',
    spellcastingAbilityModifier: 3,
    diceCount: 2,
    slotLevel: 2,
    playerName: 'Elyra',
    campaignName: mockCampaignName,
    onClose: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  };
}

function renderModal(overrides = {}) {
  const props = createProps(overrides);
  const rendered = render(<ArcaneVigorModal {...props} />);
  return { ...rendered, onClose: props.onClose, onComplete: props.onComplete, props };
}

describe('ArcaneVigorModal - rolling dice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  describe('dice roll mechanics', () => {
    it('shows roll log after rolling one die', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total:/)).toBeInTheDocument();
    });

    it('displays roll result with correct values', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('d8 = 4')).toBeInTheDocument();
    });

    it('renders the correct die size for different hit die types', () => {
      renderModal({ hitDieSize: 10 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('d10 = 4')).toBeInTheDocument();
    });
  });

  describe('projected healing calculation', () => {
    it('calculates projected healing with positive, zero, and negative modifiers', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ 3 = 7 HP/)).toBeInTheDocument();
    });

    it('handles negative modifier reducing projected healing', () => {
      renderModal({ spellcastingAbilityModifier: -1 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ -1 = 3 HP/)).toBeInTheDocument();
    });

    it('handles large negative modifier resulting in zero', () => {
      renderModal({ spellcastingAbilityModifier: -4 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ -4 = 0 HP/)).toBeInTheDocument();
    });

    it('updates projected healing when rolling additional dice', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ 3 = 7 HP/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 8 \+ 3 = 11 HP/)).toBeInTheDocument();
    });

    it('shows projected healing for multiple dice with different modifiers', () => {
      renderModal({ spellcastingAbilityModifier: 5, diceCount: 5 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 12 \+ 5 = 17 HP/)).toBeInTheDocument();
    });
  });

  describe('roll count tracking', () => {
    it('shows each roll in separate table row', () => {
      renderModal({ diceCount: 5 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(4);
    });

    it('updates available hit dice count after rolling', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 3;
        return null;
      });
      renderModal();
      expect(screen.getByText(/3 of 3 remaining/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/2 of 3 remaining/)).toBeInTheDocument();
    });

    it('uses diceCount prop as fallback when shortRestHitDice is null', () => {
      getRuntimeValueMock.mockImplementation(() => null);
      renderModal({ diceCount: 4 });
      expect(screen.getByText(/up to 4 dice/)).toBeInTheDocument();
    });

    it('shows remaining count decreasing with each roll', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 4;
        return null;
      });
      renderModal();
      expect(screen.getByText(/4 of 4 remaining/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/3 of 4 remaining/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/2 of 4 remaining/)).toBeInTheDocument();
    });
  });

  describe('roll button state transitions', () => {
    it('enables roll button when hit dice are available', () => {
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeEnabled();
    });

    it('disables roll button when no hit dice remain', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 0;
        return null;
      });
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeDisabled();
    });

    it('disables roll button after rolling all available hit dice', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 1;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll One/)).toBeDisabled();
    });

    it('disables all buttons after healing is applied', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/Roll One/)).toBeDisabled();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });

    it('disables apply healing button when no dice have been rolled', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
    });
  });

  describe('negative path: applying without rolling', () => {
    it('does not show healing applied message when applying without rolling', async () => {
      renderModal();
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.queryByText(/HP healed/)).not.toBeInTheDocument();
      expect(setRuntimeValueMock).not.toHaveBeenCalled();
    });

    it('does not call setRuntimeValue when cancel is clicked after rolling', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText('Cancel'));
      expect(setRuntimeValueMock).not.toHaveBeenCalled();
    });
  });
});

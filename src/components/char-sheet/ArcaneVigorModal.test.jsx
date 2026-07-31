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

vi.mock('../../services/rules/effects/restRules.js', () => ({
  getHitDieSize: vi.fn(() => 8),
  computeHitDieRecovery: vi.fn((roll, conBonus) => roll + conBonus),
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

describe('ArcaneVigorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  describe('rendering', () => {
    it('renders the modal title', () => {
      renderModal();
      expect(screen.getByText('Arcane Vigor')).toBeInTheDocument();
    });

    it('displays hit dice information', () => {
      renderModal();
      expect(screen.getByText(/d8 — .* remaining/)).toBeInTheDocument();
    });

    it('renders the roll button', () => {
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderModal();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders apply healing button', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeInTheDocument();
    });
  });

  describe('rolling dice', () => {
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

    it('calculates projected healing correctly', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      const totalText = screen.getByText(/Roll Total:/).textContent;
      expect(totalText).toContain('7');
    });

    it('allows rolling multiple dice', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(2);
    });

    it('disables roll button when no hit dice remain', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 0;
        return null;
      });
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeDisabled();
    });
  });

  describe('healing', () => {
    it('applies healing when button is clicked', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/HP healed/)).toBeInTheDocument();
    });

    it('calls onComplete after applying healing', async () => {
      const onComplete = vi.fn();
      renderModal({ onComplete });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(onComplete).toHaveBeenCalled();
    });

    it('calls addEntry for spell log after applying healing', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(addEntry).toHaveBeenCalled();
    });

    it('disables buttons after healing is applied', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/Roll One/)).toBeDisabled();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
    });

    it('does not allow cancel after healing is applied', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('hit dice consumption', () => {
    it('decrements shortRestHitDice after applying healing', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 3, mockCampaignName);
    });
  });

  describe('cancellation', () => {
    it('calls onClose when cancel is clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onComplete when cancelled', () => {
      const onComplete = vi.fn();
      const onClose = vi.fn();
      renderModal({ onComplete, onClose });
      fireEvent.click(screen.getByText('Cancel'));
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('does not log to campaign when cancelled', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(addEntry).not.toHaveBeenCalled();
    });
  });

  describe('slot level display', () => {
    it('shows correct dice count for upcast level 2', () => {
      renderModal({ slotLevel: 2, diceCount: 2 });
      expect(screen.getByText(/up to 2 dice/)).toBeInTheDocument();
    });

    it('shows correct dice count for upcast level 5', () => {
      renderModal({ slotLevel: 5, diceCount: 5 });
      expect(screen.getByText(/up to 5 dice/)).toBeInTheDocument();
    });
  });

  describe('overlay close', () => {
    it('calls onClose when overlay background is clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      const overlay = document.querySelector('.arcane-vigor-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

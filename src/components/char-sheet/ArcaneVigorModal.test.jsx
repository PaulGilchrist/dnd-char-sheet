// @improved-by-ai
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
  rollDice: vi.fn((_count, _die) => ({ total: 4, rolls: [4] })),
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

  describe('core rendering', () => {
    it('renders the modal overlay and title', () => {
      renderModal();
      expect(document.querySelector('.arcane-vigor-overlay')).toBeTruthy();
      expect(document.querySelector('.arcane-vigor-modal')).toBeTruthy();
      expect(screen.getByText('Arcane Vigor')).toBeInTheDocument();
    });

    it('renders the description with ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: 3, spellcastingAbility: 'INT' });
      expect(screen.getByText(/roll total \+ 3 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('renders all action buttons', () => {
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeInTheDocument();
      expect(screen.getByText('Apply Healing')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders hit dice information', () => {
      renderModal();
      expect(screen.getByText(/d8 — .* remaining/)).toBeInTheDocument();
      expect(screen.getByText(/up to 2 dice/)).toBeInTheDocument();
    });
  });

  describe('core rolling behavior', () => {
    it('disables apply healing until dice are rolled', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
    });

    it('shows roll results and projected healing after rolling', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('d8 = 4')).toBeInTheDocument();
      expect(screen.getByText(/Roll Total: 4 \+ 3 = 7 HP/)).toBeInTheDocument();
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

  describe('core healing flow', () => {
    it('applies healing and calls onComplete', async () => {
      const onComplete = vi.fn();
      renderModal({ onComplete });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(onComplete).toHaveBeenCalled();
      expect(screen.getByText(/HP healed/)).toBeInTheDocument();
    });

    it('logs to campaign after applying healing', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(addEntry).toHaveBeenCalled();
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
  });

  describe('core cancellation', () => {
    it('calls onClose and not onComplete when cancelled', () => {
      const onClose = vi.fn();
      const onComplete = vi.fn();
      renderModal({ onClose, onComplete });
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('does not log when cancelled', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(addEntry).not.toHaveBeenCalled();
    });
  });

  describe('core hit dice consumption', () => {
    it('decrements shortRestHitDice by dice rolled count', async () => {
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

  describe('core overlay interaction', () => {
    it('calls onClose when overlay background is clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      const overlay = document.querySelector('.arcane-vigor-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

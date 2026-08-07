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

describe('ArcaneVigorModal - healing application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

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

  it('does not call onClose when apply healing is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onComplete when cancel is clicked', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();
    renderModal({ onComplete, onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not log to campaign when cancelled without rolling', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(setRuntimeValueMock).not.toHaveBeenCalled();
  });

  it('does not call setRuntimeValue when cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(setRuntimeValueMock).not.toHaveBeenCalled();
  });

  it('does not call setRuntimeValue when no dice rolled and cancel clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(setRuntimeValueMock).not.toHaveBeenCalled();
  });
});

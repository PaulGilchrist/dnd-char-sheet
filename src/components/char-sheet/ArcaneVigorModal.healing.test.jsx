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

  it('applies healing and shows HP healed message', async () => {
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

  it('disables all action buttons after healing is applied', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.getByText(/Roll One/)).toBeDisabled();
    expect(screen.getByText('Apply Healing')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('does not call onClose when applying healing', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not log when cancel is clicked without rolling', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does not call setRuntimeValue when cancel is clicked without rolling', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(setRuntimeValueMock).not.toHaveBeenCalled();
  });
});

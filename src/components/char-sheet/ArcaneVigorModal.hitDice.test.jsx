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

describe('ArcaneVigorModal - hit dice consumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('decrements shortRestHitDice by number of dice rolled after applying healing', async () => {
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

  it('consumes all hit dice when rolling max', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 2;
      return null;
    });
    renderModal({ diceCount: 2 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 0, mockCampaignName);
  });

  it('clamps remaining hit dice to zero when consumed exceeds available', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 1;
      return null;
    });
    renderModal({ diceCount: 5 });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 0, mockCampaignName);
  });

  it('does not call setRuntimeValue for shortRestHitDice when no dice rolled', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 5;
      return null;
    });
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).not.toHaveBeenCalledWith('Elyra', 'shortRestHitDice', expect.any(Number), mockCampaignName);
  });

  it('shows remaining hit dice in applied message', async () => {
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
    expect(screen.getByText(/2 hit dice consumed/)).toBeInTheDocument();
    expect(screen.getByText(/3 remaining/)).toBeInTheDocument();
  });

  it('uses diceCount as fallback when storedHitDice is null', async () => {
    getRuntimeValueMock.mockImplementation(() => null);
    renderModal({ diceCount: 3 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 1, mockCampaignName);
  });

  it('consumes exactly one die when only one is rolled', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 1;
      return null;
    });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 0, mockCampaignName);
  });

  it('handles partial consumption when storedHitDice is less than diceCount', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 2;
      return null;
    });
    renderModal({ diceCount: 5 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 0, mockCampaignName);
  });

  it('handles partial consumption when storedHitDice is greater than diceCount', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 10;
      return null;
    });
    renderModal({ diceCount: 3 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 8, mockCampaignName);
  });

  it('sets remaining hit dice to storedHitDice when diceCount is used as fallback and none rolled', async () => {
    getRuntimeValueMock.mockImplementation(() => null);
    renderModal({ diceCount: 4 });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 3, mockCampaignName);
  });
});

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

  it('disables roll button after healing is applied', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.getByText(/Roll One/)).toBeDisabled();
  });

  it('enables roll button when hit dice are available', () => {
    renderModal();
    expect(screen.getByText(/Roll One/)).toBeEnabled();
  });

  it('rolls with different die sizes', () => {
    renderModal({ hitDieSize: 10 });
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText('d10 = 4')).toBeInTheDocument();
  });

  it('rolls with d6 hit die', () => {
    renderModal({ hitDieSize: 6 });
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText('d6 = 4')).toBeInTheDocument();
  });

  it('rolls with d12 hit die', () => {
    renderModal({ hitDieSize: 12 });
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText('d12 = 4')).toBeInTheDocument();
  });

  it('shows each roll in separate table row', () => {
    renderModal({ diceCount: 5 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    const rows = screen.getAllByRole('row');
    // header row + 3 data rows = 4
    expect(rows.length).toBe(4);
  });

  it('shows projected healing with negative modifier', () => {
    renderModal({ spellcastingAbilityModifier: -1 });
    fireEvent.click(screen.getByText(/Roll One/));
    // roll total = 4, modifier = -1, projected = 3
    expect(screen.getByText(/Roll Total: 4 \+ -1 = 3 HP/)).toBeInTheDocument();
  });

  it('shows projected healing with zero modifier', () => {
    renderModal({ spellcastingAbilityModifier: 0 });
    fireEvent.click(screen.getByText(/Roll One/));
    // roll total = 4, modifier = 0, projected = 4
    expect(screen.getByText(/Roll Total: 4 \+ 0 = 4 HP/)).toBeInTheDocument();
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

  it('prevents rolling beyond stored hit dice count', () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 1;
      return null;
    });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText(/Roll One/)).toBeDisabled();
  });

  it('uses diceCount prop as fallback when shortRestHitDice is null', () => {
    getRuntimeValueMock.mockImplementation(() => null);
    renderModal({ diceCount: 4 });
    expect(screen.getByText(/up to 4 dice/)).toBeInTheDocument();
  });
});

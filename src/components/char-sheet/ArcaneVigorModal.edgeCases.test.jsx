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
  rollDice: vi.fn((count, _dieSize) => ({
    total: count * 4,
    rolls: Array(count).fill(4),
  })),
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

describe('ArcaneVigorModal - overlay and modal interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('closes modal when overlay background is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const overlay = document.querySelector('.arcane-vigor-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close modal when modal content is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const modal = document.querySelector('.arcane-vigor-modal');
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close modal when roll button inside modal is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const rollButton = screen.getByText(/Roll One/);
    fireEvent.click(rollButton);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close modal when apply healing is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes modal when cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Apply Healing button is disabled when no dice have been rolled', () => {
    renderModal();
    expect(screen.getByText('Apply Healing')).toBeDisabled();
  });

  it('Apply Healing button is enabled after rolling at least one die', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText('Apply Healing')).toBeEnabled();
  });

  it('Cancel button is enabled when healing has not been applied', () => {
    renderModal();
    expect(screen.getByText('Cancel')).toBeEnabled();
  });

  it('Cancel button remains enabled even after rolling dice (before applying)', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText('Cancel')).toBeEnabled();
  });

  it('cancel button calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onComplete when cancel is clicked', () => {
    const onComplete = vi.fn();
    renderModal({ onComplete });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('ArcaneVigorModal - roll log detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('shows roll entries with correct roll values for multiple dice', () => {
    renderModal({ diceCount: 5 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    // each roll should show d8 = 4 in the table body
    const tableBody = document.querySelector('.arcane-vigor-roll-log tbody');
    const rows = tableBody.querySelectorAll('tr');
    expect(rows.length).toBe(3);
    rows.forEach(row => {
      expect(row.textContent).toContain('d8 = 4');
    });
  });

  it('shows roll total and projected healing after rolling', () => {
    renderModal({ spellcastingAbilityModifier: 3 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    // roll total = 4 + 4 = 8, projected = 8 + 3 = 11
    expect(screen.getByText(/Roll Total: 8 \+ 3 = 11 HP/)).toBeInTheDocument();
  });

  it('shows roll total with single die', () => {
    renderModal({ spellcastingAbilityModifier: 0 });
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText(/Roll Total: 4 \+ 0 = 4 HP/)).toBeInTheDocument();
  });

  it('roll log entries display in correct order', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    const rows = screen.getAllByRole('row');
    // second data row (index 2) should be the second roll
    expect(rows[2].textContent).toContain('d8 = 4');
  });
});

describe('ArcaneVigorModal - healing applied display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('shows healing applied message with 0 HP when no combat context', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.getByText(/0 HP healed/)).toBeInTheDocument();
  });

  it('shows hit dice consumed count in applied message', async () => {
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
  });

  it('shows remaining hit dice count in applied message', async () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 5;
      return null;
    });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.getByText(/4 remaining/)).toBeInTheDocument();
  });

  it('shows checkmark icon in applied message', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const appliedDiv = document.querySelector('.arcane-vigor-applied');
    expect(appliedDiv.querySelector('i.fa-solid.fa-check')).toBeTruthy();
  });

  it('does not show healing applied message before applying', () => {
    renderModal();
    expect(document.querySelector('.arcane-vigor-applied')).toBeNull();
  });

  it('does not show healing applied message before rolling', () => {
    renderModal();
    expect(document.querySelector('.arcane-vigor-applied')).toBeNull();
  });
});

describe('ArcaneVigorModal - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('handles storedHitDice lower than diceCount', () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 1;
      return null;
    });
    renderModal({ diceCount: 5 });
    expect(screen.getByText(/1 of 1 remaining/)).toBeInTheDocument();
    expect(screen.getByText(/up to 5 dice/)).toBeInTheDocument();
    expect(screen.getByText(/Roll One/)).toBeEnabled();
  });

  it('disables roll button when stored equals diceCount and all rolled', () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 2;
      return null;
    });
    renderModal({ diceCount: 2 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText(/Roll One/)).toBeDisabled();
  });

  it('handles zero ability modifier correctly in description', () => {
    renderModal({ spellcastingAbilityModifier: 0 });
    expect(screen.getByText(/roll total \+ 0 \(INT modifier\)/)).toBeInTheDocument();
  });

  it('handles large ability modifier', () => {
    renderModal({ spellcastingAbilityModifier: 8 });
    expect(screen.getByText(/roll total \+ 8 \(INT modifier\)/)).toBeInTheDocument();
  });

  it('handles different spellcasting abilities in description', () => {
    renderModal({ spellcastingAbility: 'WIS', spellcastingAbilityModifier: 5 });
    expect(screen.getByText(/WIS modifier/)).toBeInTheDocument();
  });

  it('handles d4 hit die size', () => {
    renderModal({ hitDieSize: 4 });
    expect(screen.getByText(/Roll One \(d4\)/)).toBeInTheDocument();
  });

  it('handles d10 hit die size', () => {
    renderModal({ hitDieSize: 10 });
    expect(screen.getByText(/Roll One \(d10\)/)).toBeInTheDocument();
  });

  it('shows available hit dice as zero when none remain', () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 1;
      return null;
    });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText(/0 of 1 remaining/)).toBeInTheDocument();
  });

  it('prevents applying healing when no dice rolled', async () => {
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.queryByText(/HP healed/)).not.toBeInTheDocument();
    expect(setRuntimeValueMock).not.toHaveBeenCalled();
  });

  it('does not call onComplete when closing via overlay click', () => {
    const onComplete = vi.fn();
    renderModal({ onComplete });
    const overlay = document.querySelector('.arcane-vigor-overlay');
    fireEvent.click(overlay);
    expect(onComplete).not.toHaveBeenCalled();
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

  it('uses storedHitDice value for remaining calculation, not diceCount', () => {
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 3;
      return null;
    });
    renderModal({ diceCount: 6 });
    expect(screen.getByText(/3 of 3 remaining/)).toBeInTheDocument();
    expect(screen.getByText(/up to 6 dice/)).toBeInTheDocument();
  });
});

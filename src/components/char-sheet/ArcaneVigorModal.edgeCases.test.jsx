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

describe('ArcaneVigorModal - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  describe('hit dice boundary conditions', () => {
    it('shows storedHitDice lower than diceCount with correct messages', () => {
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

    it('uses storedHitDice value for remaining calculation, not diceCount', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 3;
        return null;
      });
      renderModal({ diceCount: 6 });
      expect(screen.getByText(/3 of 3 remaining/)).toBeInTheDocument();
      expect(screen.getByText(/up to 6 dice/)).toBeInTheDocument();
    });

    it('shows 0 remaining when one die is rolled from storedHitDice equal to diceCount', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 1;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/0 of 1 remaining/)).toBeInTheDocument();
    });
  });

  describe('ability modifier edge cases', () => {
    it('displays zero ability modifier in description', () => {
      renderModal({ spellcastingAbilityModifier: 0 });
      expect(screen.getByText(/roll total \+ 0 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('displays large positive ability modifier in description', () => {
      renderModal({ spellcastingAbilityModifier: 8 });
      expect(screen.getByText(/roll total \+ 8 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('displays negative ability modifier in description', () => {
      renderModal({ spellcastingAbilityModifier: -2 });
      expect(screen.getByText(/roll total \+ -2 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('shows projected healing with negative modifier after rolling', () => {
      renderModal({ spellcastingAbilityModifier: -3 });
      fireEvent.click(screen.getByText(/Roll One/));
      // roll total = 4, modifier = -3, projected = 1
      expect(screen.getByText(/Roll Total: 4 \+ -3 = 1 HP/)).toBeInTheDocument();
    });

    it('shows projected healing of zero when roll total cancels with negative modifier', () => {
      renderModal({ spellcastingAbilityModifier: -4 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ -4 = 0 HP/)).toBeInTheDocument();
    });

    it('shows projected healing with different spellcasting abilities', () => {
      renderModal({ spellcastingAbility: 'WIS', spellcastingAbilityModifier: 5 });
      expect(screen.getByText(/WIS modifier/)).toBeInTheDocument();
    });
  });

  describe('hit die size variations', () => {
    it('displays d4 hit die size in roll button', () => {
      renderModal({ hitDieSize: 4 });
      expect(screen.getByText(/Roll One \(d4\)/)).toBeInTheDocument();
    });

    it('displays d10 hit die size in roll button', () => {
      renderModal({ hitDieSize: 10 });
      expect(screen.getByText(/Roll One \(d10\)/)).toBeInTheDocument();
    });

    it('displays d12 hit die size in roll button', () => {
      renderModal({ hitDieSize: 12 });
      expect(screen.getByText(/Roll One \(d12\)/)).toBeInTheDocument();
    });

    it('shows correct die size in roll log entries', () => {
      renderModal({ hitDieSize: 10 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('d10 = 4')).toBeInTheDocument();
    });
  });

  describe('healing applied display edge cases', () => {
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

    it('shows applied message with 0 remaining when all hit dice consumed', async () => {
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
      expect(screen.getByText(/2 hit dice consumed, 0 remaining/)).toBeInTheDocument();
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

  describe('roll log with multiple dice edge cases', () => {
    it('shows roll entries with correct roll values for multiple dice', () => {
      renderModal({ diceCount: 5 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      const tableBody = document.querySelector('.arcane-vigor-roll-log tbody');
      const rows = tableBody.querySelectorAll('tr');
      expect(rows.length).toBe(3);
      rows.forEach(row => {
        expect(row.textContent).toContain('d8 = 4');
      });
    });

    it('shows roll total with single die and zero modifier', () => {
      renderModal({ spellcastingAbilityModifier: 0 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ 0 = 4 HP/)).toBeInTheDocument();
    });

    it('shows roll total with multiple dice and ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      // roll total = 4 + 4 = 8, projected = 8 + 3 = 11
      expect(screen.getByText(/Roll Total: 8 \+ 3 = 11 HP/)).toBeInTheDocument();
    });
  });
});

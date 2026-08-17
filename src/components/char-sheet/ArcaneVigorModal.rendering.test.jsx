// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

describe('ArcaneVigorModal - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  describe('ability modifier display', () => {
    it('renders description with negative ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: -2 });
      expect(screen.getByText(/roll total \+ -2 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('renders description with zero ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: 0 });
      expect(screen.getByText(/roll total \+ 0 \(INT modifier\)/)).toBeInTheDocument();
    });
  });

  describe('hit dice section', () => {
    it('renders hit dice info with stored value when shortRestHitDice is provided', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal({ diceCount: 6 });
      expect(screen.getByText(/5 of 5 remaining/)).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('disables apply healing button when no dice have been rolled', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
    });
  });

  describe('roll log table', () => {
    it('does not show roll log table initially', () => {
      renderModal();
      expect(screen.queryByText(/Roll Total:/)).not.toBeInTheDocument();
    });

    it('renders projected healing with negative modifier after rolling', () => {
      renderModal({ spellcastingAbilityModifier: -2 });
      fireEvent.click(screen.getByText(/Roll One/));
      const totalEl = document.querySelector('.arcane-vigor-total b');
      expect(totalEl.textContent).toContain('2 HP');
    });

    it('renders projected healing of zero when roll cancels with modifier', () => {
      renderModal({ spellcastingAbilityModifier: -4 });
      fireEvent.click(screen.getByText(/Roll One/));
      const totalEl = document.querySelector('.arcane-vigor-total b');
      expect(totalEl.textContent).toContain('0 HP');
    });

    it('renders multiple roll entries in separate rows', () => {
      renderModal({ diceCount: 5 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      const rows = document.querySelectorAll('.arcane-vigor-roll-log tbody tr');
      expect(rows.length).toBe(3);
    });
  });

  describe('healing applied state', () => {
    it('does not show healing applied message initially', () => {
      renderModal();
      expect(screen.queryByText(/HP healed/)).not.toBeInTheDocument();
    });

    it('renders applied message with checkmark icon after applying', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      await waitFor(() => {
        const appliedDiv = document.querySelector('.arcane-vigor-applied');
        expect(appliedDiv).toBeTruthy();
        expect(appliedDiv.querySelector('i.fa-solid.fa-check')).toBeTruthy();
      });
    });

    it('renders applied message with consumed dice count and remaining', async () => {
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
      await waitFor(() => {
        const appliedDiv = document.querySelector('.arcane-vigor-applied');
        expect(appliedDiv.textContent).toContain('2 hit dice consumed');
      });
    });
  });
});

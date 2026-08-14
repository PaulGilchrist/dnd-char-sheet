// @improved-by-ai
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

  describe('modal structure and overlay', () => {
    it('renders the overlay container', () => {
      renderModal();
      expect(document.querySelector('.arcane-vigor-overlay')).toBeTruthy();
    });

    it('renders the modal container', () => {
      renderModal();
      expect(document.querySelector('.arcane-vigor-modal')).toBeTruthy();
    });

    it('renders the modal title with wand icon', () => {
      renderModal();
      expect(screen.getByText('Arcane Vigor')).toBeInTheDocument();
      expect(document.querySelector('.arcane-vigor-modal h3 .fa-solid.fa-wand-sparkles')).toBeTruthy();
    });

    it('renders the description text with ability modifier', () => {
      renderModal({ spellcastingAbility: 'WIS', spellcastingAbilityModifier: 2 });
      expect(screen.getByText(/regain HP equal to the roll total \+ 2 \(WIS modifier\)/)).toBeInTheDocument();
    });

    it('renders the description with negative ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: -2 });
      expect(screen.getByText(/roll total \+ -2 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('renders the description with zero ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: 0 });
      expect(screen.getByText(/roll total \+ 0 \(INT modifier\)/)).toBeInTheDocument();
    });
  });

  describe('hit dice section', () => {
    it('renders hit dice section heading as h4', () => {
      renderModal();
      const headings = document.querySelectorAll('.arcane-vigor-modal h4');
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].textContent).toBe('Hit Dice');
    });

    it('renders hit dice information with die size and counts', () => {
      renderModal();
      expect(screen.getByText(/d8 — .* remaining/)).toBeInTheDocument();
    });

    it('renders hit dice info with stored value when shortRestHitDice is provided', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal({ diceCount: 6 });
      expect(screen.getByText(/5 of 5 remaining/)).toBeInTheDocument();
    });

    it('renders dice count limit text', () => {
      renderModal();
      expect(screen.getByText(/up to 2 dice/)).toBeInTheDocument();
    });

    it('renders roll button with die size and dice icon', () => {
      renderModal();
      expect(screen.getByText(/Roll One \(d8\)/)).toBeInTheDocument();
      const rollBtn = document.querySelector('.arcane-vigor-dice-row button');
      expect(rollBtn.querySelector('i.fa-solid.fa-dice')).toBeTruthy();
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

  describe('action buttons', () => {
    it('renders apply healing button with heart icon', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeInTheDocument();
      const applyBtn = document.querySelectorAll('.arcane-vigor-actions button')[0];
      expect(applyBtn.querySelector('i.fa-solid.fa-heart')).toBeTruthy();
    });

    it('renders cancel button with times icon', () => {
      renderModal();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      const cancelBtn = document.querySelectorAll('.arcane-vigor-actions button')[1];
      expect(cancelBtn.querySelector('i.fa-solid.fa-times')).toBeTruthy();
    });

    it('disables apply healing button when no dice have been rolled', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
    });
  });

  describe('roll log table', () => {
    it('renders roll log table headers', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('Roll')).toBeInTheDocument();
      expect(screen.getByText('Result')).toBeInTheDocument();
    });

    it('does not show roll log table initially', () => {
      renderModal();
      expect(screen.queryByText(/Roll Total:/)).not.toBeInTheDocument();
    });

    it('renders roll log table body after rolling', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(document.querySelector('.arcane-vigor-roll-log tbody')).toBeTruthy();
    });

    it('renders roll entries with die type and value in table cells', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      const rows = document.querySelectorAll('.arcane-vigor-roll-log tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].querySelectorAll('td').length).toBe(2);
    });

    it('renders projected healing total after rolling', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      const totalEl = document.querySelector('.arcane-vigor-total b');
      expect(totalEl.textContent).toContain('7 HP');
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

    it('renders applied message with zero remaining when all dice consumed', async () => {
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
      await waitFor(() => {
        const appliedDiv = document.querySelector('.arcane-vigor-applied');
        expect(appliedDiv.textContent).toContain('0 remaining');
      });
    });
  });

  describe('ability name display', () => {
    it('renders the spellcasting ability name in the description', () => {
      renderModal({ spellcastingAbility: 'WIS' });
      expect(screen.getByText(/WIS modifier/)).toBeInTheDocument();
    });

    it('renders the projected healing total with correct math', () => {
      renderModal({ spellcastingAbility: 'CHA', spellcastingAbilityModifier: 1 });
      fireEvent.click(screen.getByText(/Roll One/));
      const totalEl = document.querySelector('.arcane-vigor-total b');
      expect(totalEl.textContent).toContain('5 HP');
    });
  });

  describe('different die sizes', () => {
    it('renders d4 hit die size in roll button', () => {
      renderModal({ hitDieSize: 4 });
      expect(screen.getByText(/Roll One \(d4\)/)).toBeInTheDocument();
    });

    it('renders d6 hit die size in roll button', () => {
      renderModal({ hitDieSize: 6 });
      expect(screen.getByText(/Roll One \(d6\)/)).toBeInTheDocument();
    });

    it('renders d10 hit die size in roll button', () => {
      renderModal({ hitDieSize: 10 });
      expect(screen.getByText(/Roll One \(d10\)/)).toBeInTheDocument();
    });

    it('renders d12 hit die size in roll button', () => {
      renderModal({ hitDieSize: 12 });
      expect(screen.getByText(/Roll One \(d12\)/)).toBeInTheDocument();
    });

    it('renders the correct die size in roll log entries', () => {
      renderModal({ hitDieSize: 10 });
      fireEvent.click(screen.getByText(/Roll One/));
      const rows = document.querySelectorAll('.arcane-vigor-roll-log tbody tr');
      expect(rows[0].textContent).toContain('d10 = 4');
    });
  });

  describe('upcast dice count display', () => {
    it('shows correct dice count for upcast level 2', () => {
      renderModal({ slotLevel: 2, diceCount: 2 });
      expect(screen.getByText(/up to 2 dice/)).toBeInTheDocument();
    });

    it('shows correct dice count for upcast level 5', () => {
      renderModal({ slotLevel: 5, diceCount: 5 });
      expect(screen.getByText(/up to 5 dice/)).toBeInTheDocument();
    });

    it('shows correct dice count for upcast level 9', () => {
      renderModal({ slotLevel: 9, diceCount: 9 });
      expect(screen.getByText(/up to 9 dice/)).toBeInTheDocument();
    });

    it('shows correct dice count when storedHitDice is less than diceCount', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 1;
        return null;
      });
      renderModal({ diceCount: 5 });
      expect(screen.getByText(/up to 5 dice/)).toBeInTheDocument();
    });
  });
});

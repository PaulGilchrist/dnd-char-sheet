// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BastionOfLawSpendModal from './BastionOfLawSpendModal.jsx';

// ── Mocked modules ──

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

// ── Re-import mocked modules ──

import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as diceRoller from '../../../../services/dice/diceRoller.js';

// ── Test fixtures ──

const baseProps = {
  featureName: 'Bastion of Law',
  playerName: 'AllyWarrior',
  campaignName: 'test-campaign',
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

function renderModal(propsOverrides) {
  return render(<BastionOfLawSpendModal {...makeProps(propsOverrides)} />);
}

// ── Tests ──

describe('BastionOfLawSpendModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
      if (key === 'bastionOfLawWardDice') return ['1d8', '1d8', '1d8'];
      if (key === 'bastionOfLawLastAttackDamage') return 20;
      if (key === 'bastionOfLawWardUsed') return 5;
      return undefined;
    });
    diceRoller.rollExpression.mockReturnValue({ total: 15, rolls: [8, 7], modifier: 0, formula: '1d8' });
  });

  // ── Initial render / display ──

  describe('initial render', () => {
    it('renders the overlay, modal, feature name, and ward info', () => {
      renderModal();
      expect(screen.getByText('Bastion of Law')).toBeInTheDocument();
      expect(screen.getByText(/Your magical ward is active/)).toBeInTheDocument();
    });

    it('renders the shield icon in the header', () => {
      renderModal();
      expect(document.querySelector('.fa-shield-halved')).toBeInTheDocument();
    });

    it('renders CSS structural classes on overlay, modal, header, body, and actions', () => {
      renderModal();
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
      expect(document.querySelector('.sp-header')).toBeInTheDocument();
      expect(document.querySelector('.sp-body')).toBeInTheDocument();
      expect(document.querySelector('.sp-actions')).toBeInTheDocument();
    });

    it('renders the ward dice count display', () => {
      renderModal();
      expect(screen.getByText('3d8')).toBeInTheDocument();
      expect(screen.getByText(/dice remaining/)).toBeInTheDocument();
    });

    it('renders the roll button when ward dice are available', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /Roll & Reduce Damage/ })).toBeInTheDocument();
    });

    it('renders the Done button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /Done/ })).toBeInTheDocument();
    });

    it('renders damage info section with last attack damage, ward used, and remaining damage', () => {
      renderModal();
      expect(screen.getByText(/Total damage from last attack: 20/)).toBeInTheDocument();
      expect(screen.getByText(/Ward already used: 5/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining damage to ward: 15/)).toBeInTheDocument();
    });
  });

  // ── Roll result display ──

  describe('roll result display', () => {
    it('displays the roll result section with formula, rolls, total, and remaining dice', async () => {
      renderModal();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Roll & Reduce Damage/ }));
      });
      await waitFor(() => {
        const body = document.querySelector('.bastion-roll-result');
        expect(body).toBeInTheDocument();
        expect(body.textContent).toContain('15');
        expect(body.textContent).toContain('8, 7');
        expect(screen.getByText(/Remaining: 2d8/)).toBeInTheDocument();
      });
    });

    it('calls rollExpression with 1d8 when rolling', async () => {
      renderModal();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Roll & Reduce Damage/ }));
      });
      expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d8');
    });

    it('hides the roll result section before rolling', () => {
      renderModal();
      expect(document.querySelector('.bastion-roll-result')).not.toBeInTheDocument();
    });

    it('clears the roll result after 3 seconds', async () => {
      vi.useFakeTimers();
      renderModal();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Roll & Reduce Damage/ }));
      });

      expect(document.querySelector('.bastion-roll-result')).toBeInTheDocument();

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      expect(document.querySelector('.bastion-roll-result')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  // ── Spend dice flow ──

  describe('spend dice flow', () => {
    it('calls onConfirm with 1 die and rollResultData when Roll & Reduce is clicked', async () => {
      const onConfirm = vi.fn().mockResolvedValue({ type: 'popup', payload: { description: 'Ward used' } });
      render(<BastionOfLawSpendModal {...makeProps({ onConfirm })} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Roll & Reduce Damage/ }));
      });

      expect(onConfirm).toHaveBeenCalledWith(1, expect.objectContaining({ total: 15, rolls: [8, 7] }));
    });

    it('does not call onConfirm when it is not provided', async () => {
      renderModal({ onConfirm: undefined });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Roll & Reduce Damage/ }));
      });
    });
  });

  // ── Ward empty state ──

  describe('ward empty state', () => {
    it('shows 0d8 when ward dice are empty', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'bastionOfLawWardDice') return [];
        if (key === 'bastionOfLawLastAttackDamage') return 20;
        if (key === 'bastionOfLawWardUsed') return 5;
        return undefined;
      });
      renderModal();
      expect(screen.getByText('0d8')).toBeInTheDocument();
    });

    it('hides the roll button when ward dice count is 0', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'bastionOfLawWardDice') return [];
        if (key === 'bastionOfLawLastAttackDamage') return 20;
        if (key === 'bastionOfLawWardUsed') return 5;
        return undefined;
      });
      renderModal();
      expect(screen.queryByRole('button', { name: /Roll & Reduce Damage/ })).not.toBeInTheDocument();
    });

    it('shows 0d8 when ward dice are null', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'bastionOfLawWardDice') return null;
        if (key === 'bastionOfLawLastAttackDamage') return 20;
        if (key === 'bastionOfLawWardUsed') return 5;
        return undefined;
      });
      renderModal();
      expect(screen.getByText('0d8')).toBeInTheDocument();
    });

    it('shows 0d8 when ward dice are undefined', () => {
      renderModal();
      // Reset to return undefined for all keys
      runtimeState.useRuntimeValue.mockImplementation(() => undefined);
      renderModal();
      expect(screen.getByText('0d8')).toBeInTheDocument();
    });
  });

  // ── Close flows ──

  describe('close flows', () => {
    it('calls onClose when Done button is clicked', async () => {
      const onClose = vi.fn();
      render(<BastionOfLawSpendModal {...makeProps({ onClose })} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Done/ }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
      const onClose = vi.fn();
      render(<BastionOfLawSpendModal {...makeProps({ onClose })} />);

      await act(async () => {
        fireEvent.click(document.querySelector('.sp-overlay'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Runtime value usage ──

  describe('runtime value usage', () => {
    it('calls useRuntimeValue for bastionOfLawWardDice, bastionOfLawLastAttackDamage, and bastionOfLawWardUsed', () => {
      renderModal();
      const calls = runtimeState.useRuntimeValue.mock.calls;
      const keys = calls.map((c) => c[1]);
      expect(keys).toContain('bastionOfLawWardDice');
      expect(keys).toContain('bastionOfLawLastAttackDamage');
      expect(keys).toContain('bastionOfLawWardUsed');
    });

    it('passes playerName and campaignName as first and third arguments to useRuntimeValue', () => {
      renderModal();
      const calls = runtimeState.useRuntimeValue.mock.calls;
      const charKeys = calls.map((c) => c[0]);
      const campaigns = calls.map((c) => c[2]);
      expect(charKeys.every((k) => k === 'AllyWarrior')).toBe(true);
      expect(campaigns.every((c) => c === 'test-campaign')).toBe(true);
    });
  });

  // ── Damage info fallbacks ──

  describe('damage info fallbacks', () => {
    it('shows 0 when lastAttackDamage is null', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'bastionOfLawWardDice') return ['1d8'];
        if (key === 'bastionOfLawLastAttackDamage') return null;
        if (key === 'bastionOfLawWardUsed') return 0;
        return undefined;
      });
      renderModal();
      expect(screen.getByText(/Total damage from last attack: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining damage to ward: 0/)).toBeInTheDocument();
    });

    it('shows 0 when wardUsed is null', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'bastionOfLawWardDice') return ['1d8'];
        if (key === 'bastionOfLawLastAttackDamage') return 25;
        if (key === 'bastionOfLawWardUsed') return null;
        return undefined;
      });
      renderModal();
      expect(screen.getByText(/Ward already used: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining damage to ward: 25/)).toBeInTheDocument();
    });

    it('clamps remaining damage to 0 when wardUsed exceeds lastAttackDamage', () => {
      runtimeState.useRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'bastionOfLawWardDice') return ['1d8'];
        if (key === 'bastionOfLawLastAttackDamage') return 5;
        if (key === 'bastionOfLawWardUsed') return 10;
        return undefined;
      });
      renderModal();
      expect(screen.getByText(/Remaining damage to ward: 0/)).toBeInTheDocument();
    });
  });
});

// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AttackRiderModal from './AttackRiderModal.jsx';

vi.mock('../../../../services/automation/handlers/combat/attackRiderHandler.js', () => ({
  applyRiderOption: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/automation/handlers/class-fighter-rogue/versatileTricksterHandler.js', () => ({
  applyVersatileTrickster: vi.fn(),
}));

import { applyRiderOption } from '../../../../services/automation/handlers/combat/attackRiderHandler.js';
import { applyVersatileTrickster } from '../../../../services/automation/handlers/class-fighter-rogue/versatileTricksterHandler.js';
import {
  makeProps,
  selectSingleOption,
  clickApplySingle,
  defaultResult,
} from './AttackRiderModal.fixtures.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

const mockSecondaryTargets = [
  { name: 'Orc A', size: 'Medium' },
  { name: 'Orc B', size: 'Medium' },
];

const mockVtAction = { name: 'Trip' };

// ── Helpers ──

function selectSecondaryTarget(labelText) {
  const labels = document.querySelectorAll('label.secondary-target-row');
  const targetLabel = Array.from(labels).find(l => l.textContent.includes(labelText));
  fireEvent.click(targetLabel);
  return targetLabel;
}

// ── Tests ──

describe('AttackRiderModal - Versatile Trickster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(null);
    applyRiderOption.mockResolvedValue(defaultResult);
  });

  describe('versatile trickster flow', () => {
    beforeEach(() => {
      getRuntimeValue.mockImplementation((charName, key) => {
        if (key === 'versatileTricksterSecondaryTargets') return mockSecondaryTargets;
        if (key === 'versatileTricksterAction') return mockVtAction;
        return null;
      });
    });

    it('shows Versatile Trickster target selection after apply when secondary targets exist', async () => {
      const onClose = vi.fn();
      render(<AttackRiderModal {...makeProps({ onClose })} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        expect(screen.getByText('Versatile Trickster')).toBeInTheDocument();
        expect(screen.getByText('Orc A')).toBeInTheDocument();
        expect(screen.getByText('Orc B')).toBeInTheDocument();
      });
    });

    it('calls applyRiderOption with the selected option before showing target selection', async () => {
      const onClose = vi.fn();
      render(<AttackRiderModal {...makeProps({ onClose })} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        expect(applyRiderOption).toHaveBeenCalledWith(
          expect.objectContaining({ automation: expect.objectContaining({ options: expect.any(Array) }) }),
          expect.any(Object),
          'test-campaign',
          'Goblin A',
          ['Burning Hands']
        );
      });
    });

    it('selects a Versatile Trickster target and enables the confirm button', async () => {
      render(<AttackRiderModal {...makeProps()} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        selectSecondaryTarget('Orc A');
      });

      await waitFor(() => {
        const tripBtn = screen.getByRole('button', { name: /Trip Secondary Target/ });
        expect(tripBtn).not.toBeDisabled();
      });
    });

    it('calls applyVersatileTrickster with the correct action and target when confirmed', async () => {
      const onClose = vi.fn();
      applyVersatileTrickster.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Trip', description: 'Secondary target tripped.' },
      });

      render(<AttackRiderModal {...makeProps({ onClose })} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        selectSecondaryTarget('Orc A');
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Trip Secondary Target/ }));
      });

      await waitFor(() => {
        expect(applyVersatileTrickster).toHaveBeenCalledWith(
          mockVtAction,
          expect.any(Object),
          'test-campaign',
          'Orc A'
        );
      });
    });

    it('shows result screen and Done button after applying versatile trickster', async () => {
      const onClose = vi.fn();
      applyVersatileTrickster.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Trip', description: 'Secondary target tripped.' },
      });

      render(<AttackRiderModal {...makeProps({ onClose })} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        selectSecondaryTarget('Orc A');
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Trip Secondary Target/ }));
      });

      await waitFor(() => {
        expect(screen.getByText('Versatile Trickster')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
    });

    it('calls onClose when Done is clicked after versatile trickster', async () => {
      const onClose = vi.fn();
      applyVersatileTrickster.mockResolvedValue({
        type: 'popup',
        payload: { type: 'automation_info', name: 'Trip', description: 'Secondary target tripped.' },
      });

      render(<AttackRiderModal {...makeProps({ onClose })} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        selectSecondaryTarget('Orc A');
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Trip Secondary Target/ }));
      });

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('skips Versatile Trickster when Skip is clicked without calling applyVersatileTrickster', async () => {
      const onClose = vi.fn();
      render(<AttackRiderModal {...makeProps({ onClose })} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        expect(screen.getByText('Skip')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(applyVersatileTrickster).not.toHaveBeenCalled();
    });

    it('does NOT show Versatile Trickster when no secondary targets exist', async () => {
      getRuntimeValue.mockReturnValue(null);
      applyRiderOption.mockResolvedValue(defaultResult);

      render(<AttackRiderModal {...makeProps()} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        expect(screen.getByText('Effect applied successfully.')).toBeInTheDocument();
        expect(screen.queryByText('Versatile Trickster')).not.toBeInTheDocument();
      });
    });

    it('does NOT show Versatile Trickster when secondary targets array is empty', async () => {
      getRuntimeValue.mockReturnValue([]);

      render(<AttackRiderModal {...makeProps()} />);
      selectSingleOption('Burning Hands');
      clickApplySingle();

      await waitFor(() => {
        expect(screen.getByText('Effect applied successfully.')).toBeInTheDocument();
        expect(screen.queryByText('Versatile Trickster')).not.toBeInTheDocument();
      });
    });
  });
});

// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PowerWordFortifyModal from './PowerWordFortifyModal.jsx';

// ── Test helpers ──

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const defaultTargets = [
  { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
  { name: 'Ally2', type: 'player', currentHp: 30, maxHp: 30 },
  { name: 'Ally3', type: 'player', currentHp: 5, maxHp: 25 },
  { name: 'Ally4', type: 'npc', currentHp: 20, maxHp: 40 },
];

function makeProps(overrides) {
  return {
    creatureTargets: defaultTargets,
    totalTempHp: 10,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    ...(overrides || {}),
  };
}

// ── Tests ──

describe('PowerWordFortifyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  describe('rendering', () => {
    it('renders modal title', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.getByText('Power Word Fortify')).toBeInTheDocument();
    });

    it('displays the total temp HP in the description', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 25 })} />);
      expect(screen.getByText(/25 Temporary Hit Points/)).toBeInTheDocument();
    });

    it('displays the pool bar with total HP', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 15 })} />);
      expect(screen.getByText('Pool: 15 HP')).toBeInTheDocument();
    });

    it('displays allocated count as "Allocated: 0 / {total}" when nothing allocated', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      expect(screen.getByText('Allocated: 0 / 10')).toBeInTheDocument();
    });

    it('renders all creature targets in the list', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
      expect(screen.getByText('Ally4')).toBeInTheDocument();
    });

    it('renders each target as a checkbox row', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const checkboxes = document.querySelectorAll('.secondary-target-row input[type="checkbox"]');
      expect(checkboxes).toHaveLength(4);
    });

    it('renders Skip button', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders confirm button with label showing selection count', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Fortify \(0\)/ })).toBeInTheDocument();
    });

    it('disables confirm button when no targets selected', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Fortify \(0\)/ })).toBeDisabled();
    });

    it('renders "No targets available." when no creature targets', () => {
      render(<PowerWordFortifyModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('does not render target list when no targets', () => {
      render(<PowerWordFortifyModal {...makeProps({ creatureTargets: [] })} />);
      const checkboxes = document.querySelectorAll('.secondary-target-row input[type="checkbox"]');
      expect(checkboxes).toHaveLength(0);
    });
  });

  // ── Pool bar behavior ──

  describe('pool bar', () => {
    it('shows remaining count equal to total when nothing allocated', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      expect(screen.getByText('Remaining: 10')).toBeInTheDocument();
    });

    it('hides remaining span when all HP allocated', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 10 } });
      expect(screen.queryByText(/Remaining:/)).not.toBeInTheDocument();
    });

    it('updates allocated count when allocation is made', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 5 } });
      expect(screen.getByText('Allocated: 5 / 10')).toBeInTheDocument();
    });

    it('updates remaining count after allocation', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 3 } });
      expect(screen.getByText('Remaining: 7')).toBeInTheDocument();
    });
  });

  // ── Target selection ──

  describe('target selection', () => {
    it('selects a target when its checkbox is clicked', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const row = document.querySelector('.secondary-target-row.secondary-target-selected');
      expect(row).toBeInTheDocument();
    });

    it('deselects a target when its checkbox is clicked again', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const checkbox = document.querySelectorAll('.secondary-target-row input[type="checkbox"]')[0];
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      const rows = document.querySelectorAll('.secondary-target-row.secondary-target-selected');
      expect(rows).toHaveLength(0);
    });

    it('shows allocation controls when target is selected', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      expect(document.querySelector('.pwfm-allocation')).toBeInTheDocument();
    });

    it('hides allocation controls when target is deselected', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const checkbox = document.querySelectorAll('.secondary-target-row input[type="checkbox"]')[0];
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      expect(document.querySelector('.pwfm-allocation')).not.toBeInTheDocument();
    });

    it('resets allocation to 0 when re-selecting a previously selected target', async () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const checkbox = document.querySelectorAll('.secondary-target-row input[type="checkbox"]')[0];
      // Select and allocate
      fireEvent.click(checkbox);
      let input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 7 } });
      // Deselect and reselect
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      // Allocation should be reset to 0
      await vi.waitFor(() => {
        input = document.querySelector('.pwfm-amount-input');
        expect(input.value).toBe('0');
      });
    });

    it('enables confirm button after selecting at least one target', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      expect(screen.getByRole('button', { name: /Fortify \(1\)/ })).toBeEnabled();
    });

    it('updates selection count in confirm button when multiple targets selected', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally2'));
      expect(screen.getByRole('button', { name: /Fortify \(2\)/ })).toBeInTheDocument();
    });

    it('disables confirm button after deselecting all targets', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally2'));
      const checkboxes = document.querySelectorAll('.secondary-target-row input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      expect(screen.getByRole('button', { name: /Fortify \(0\)/ })).toBeDisabled();
    });
  });

  // ── Allocation controls ──

  describe('allocation controls', () => {
    it('shows allocation input initialized to 0 for selected target', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      expect(input).toHaveValue(0);
    });

    it('allows entering a numeric value in the allocation input', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 4 } });
      expect(input).toHaveValue(4);
    });

    it('clamps allocation input to max of totalTempHp', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 999 } });
      expect(input).toHaveValue(10);
    });

    it('clamps allocation input to min of 0', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: -5 } });
      expect(input).toHaveValue(0);
    });

    it('treats empty input as 0', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(0);
    });

    it('treats non-numeric input as 0', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(input).toHaveValue(0);
    });

    it('treats whitespace input as 0', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: '   ' } });
      expect(input).toHaveValue(0);
    });

    it('increments allocation when plus button is clicked', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const plusBtn = document.querySelectorAll('.pwfm-adjust-btn')[1];
      fireEvent.click(plusBtn);
      const input = document.querySelector('.pwfm-amount-input');
      expect(input).toHaveValue(1);
    });

    it('decrements allocation when minus button is clicked', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 5 } });
      const minusBtn = document.querySelector('.pwfm-adjust-btn');
      fireEvent.click(minusBtn);
      expect(input).toHaveValue(4);
    });

    it('does not decrement below 0', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const minusBtn = document.querySelector('.pwfm-adjust-btn');
      fireEvent.click(minusBtn);
      const input = document.querySelector('.pwfm-amount-input');
      expect(input).toHaveValue(0);
    });

    it('does not increment above totalTempHp with plus button', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 3 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const plusBtn = document.querySelectorAll('.pwfm-adjust-btn')[1];
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const input = document.querySelector('.pwfm-amount-input');
      expect(input).toHaveValue(3);
    });

    it('allocates independently to multiple selected targets', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally2'));
      const inputs = document.querySelectorAll('.pwfm-amount-input');
      fireEvent.change(inputs[0], { target: { value: 3 } });
      fireEvent.change(inputs[1], { target: { value: 4 } });
      expect(screen.getByText('Allocated: 7 / 10')).toBeInTheDocument();
    });

    it('shows "HP" label next to allocation input', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      expect(screen.getByText('HP')).toBeInTheDocument();
    });
  });

  // ── Unallocated warning ──

  describe('unallocated warning', () => {
    it('does not show unallocated warning when nothing allocated', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.queryByText(/HP unallocated/)).not.toBeInTheDocument();
    });

    it('does not show unallocated warning when all HP allocated', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 10 } });
      expect(screen.queryByText(/HP unallocated/)).not.toBeInTheDocument();
    });

    it('shows unallocated warning when some HP allocated but not all', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 5 } });
      expect(screen.getByText(/5 HP unallocated/)).toBeInTheDocument();
    });

    it('includes "you may leave HP unused" in warning text', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 3 } });
      expect(screen.getByText(/7 HP unallocated — you may leave HP unused/)).toBeInTheDocument();
    });

    it('updates unallocated warning text when allocation changes', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 3 } });
      expect(screen.getByText(/7 HP unallocated/)).toBeInTheDocument();
    });
  });

  // ── Confirm behavior ──

  describe('confirm behavior', () => {
    it('does not call onConfirm when confirm button is clicked with no selection', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(0\)/ }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when confirm button is clicked with selections but no allocation', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(1\)/ }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with distribution object when confirmed with allocations', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally2'));
      const inputs = document.querySelectorAll('.pwfm-amount-input');
      fireEvent.change(inputs[0], { target: { value: 3 } });
      fireEvent.change(inputs[1], { target: { value: 4 } });
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(2\)/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith({ Ally1: 3, Ally2: 4 });
    });

    it('excludes targets with 0 allocation from distribution', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally2'));
      const inputs = document.querySelectorAll('.pwfm-amount-input');
      fireEvent.change(inputs[0], { target: { value: 5 } });
      // Ally2 stays at 0
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(2\)/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith({ Ally1: 5 });
    });

    it('only includes selected targets in distribution', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally3'));
      const inputs = document.querySelectorAll('.pwfm-amount-input');
      fireEvent.change(inputs[0], { target: { value: 2 } });
      fireEvent.change(inputs[1], { target: { value: 8 } });
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(2\)/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith({ Ally1: 2, Ally3: 8 });
    });

    it('calls onConfirm with correct distribution when all HP allocated', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 10 })} />);
      fireEvent.click(screen.getByLabelText('Ally1'));
      fireEvent.click(screen.getByLabelText('Ally2'));
      const inputs = document.querySelectorAll('.pwfm-amount-input');
      fireEvent.change(inputs[0], { target: { value: 10 } });
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(2\)/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith({ Ally1: 10 });
    });
  });

  // ── Skip behavior ──

  describe('skip behavior', () => {
    it('calls onSkip when Skip button is clicked', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when overlay is clicked', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onSkip when modal content is clicked', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(mockOnSkip).not.toHaveBeenCalled();
    });

    it('always enables the Skip button', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles zero totalTempHp', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 0 })} />);
      expect(screen.getByText('Pool: 0 HP')).toBeInTheDocument();
      expect(screen.getByText('Allocated: 0 / 0')).toBeInTheDocument();
    });

    it('does not show remaining when totalTempHp is 0', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 0 })} />);
      expect(screen.queryByText(/Remaining:/)).not.toBeInTheDocument();
    });

    it('handles negative totalTempHp by treating as 0 remaining', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: -5 })} />);
      expect(screen.getByText('Pool: -5 HP')).toBeInTheDocument();
      // remaining = Math.max(0, -5 - 0) = 0, so no remaining span
      expect(screen.queryByText(/Remaining:/)).not.toBeInTheDocument();
    });

    it('handles object targets with only name property', () => {
      render(<PowerWordFortifyModal {...makeProps({ creatureTargets: [{ name: 'AllyA' }, { name: 'AllyB' }] })} />);
      expect(screen.getByText('AllyA')).toBeInTheDocument();
      expect(screen.getByText('AllyB')).toBeInTheDocument();
    });

    it('allocates to named targets correctly', () => {
      render(<PowerWordFortifyModal {...makeProps({ creatureTargets: [{ name: 'AllyA' }, { name: 'AllyB' }] })} />);
      fireEvent.click(screen.getByLabelText('AllyA'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 6 } });
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(1\)/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith({ AllyA: 6 });
    });

    it('handles large totalTempHp values', () => {
      render(<PowerWordFortifyModal {...makeProps({ totalTempHp: 9999 })} />);
      expect(screen.getByText('Pool: 9999 HP')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Ally1'));
      const input = document.querySelector('.pwfm-amount-input');
      fireEvent.change(input, { target: { value: 5000 } });
      expect(input).toHaveValue(5000);
    });

    it('allocates across all targets', () => {
      render(<PowerWordFortifyModal {...makeProps()} />);
      const checkboxes = document.querySelectorAll('.secondary-target-row input[type="checkbox"]');
      checkboxes.forEach((cb) => fireEvent.click(cb));
      const inputs = document.querySelectorAll('.pwfm-amount-input');
      fireEvent.change(inputs[0], { target: { value: 2 } });
      fireEvent.change(inputs[1], { target: { value: 3 } });
      fireEvent.change(inputs[2], { target: { value: 1 } });
      fireEvent.change(inputs[3], { target: { value: 4 } });
      fireEvent.click(screen.getByRole('button', { name: /Fortify \(4\)/ }));
      expect(mockOnConfirm).toHaveBeenCalledWith({ Ally1: 2, Ally2: 3, Ally3: 1, Ally4: 4 });
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateUndeadModal from './CreateUndeadModal.jsx';

// ── Test fixtures ──

const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

function makeProps(overrides) {
  return {
    maxTargets: 3,
    onConfirm: mockOnConfirm,
    onClose: mockOnClose,
    ...(overrides || {}),
  };
}

/**
 * Find the total display div by searching for the one with "Total creatures:" text.
 */
function getTotalDisplay() {
  const allDivs = document.querySelectorAll('div');
  for (const div of allDivs) {
    const tc = div.textContent;
    if (tc.includes('Total creatures:')) {
      return div;
    }
  }
  return null;
}

// ── Tests ──

describe('CreateUndeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Rendering ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with skull icon and "Create Undead" title', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByText('Create Undead')).toBeInTheDocument();
    });

    it('renders the skull icon in the header', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      const header = document.querySelector('.sp-header');
      expect(header.querySelector('i.fa-solid.fa-skull')).toBeInTheDocument();
    });

    it('renders the instruction text with maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/5 ghoul/);
    });

    it('renders the ghoul count display with +/- buttons', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByText('Ghoul(s)')).toBeInTheDocument();
    });

    it('renders the total display showing ghoulCount / maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 3 })} />);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 3/);
    });

    it('renders Confirm and Cancel buttons', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Undead \(1\)/ })).toBeInTheDocument();
    });

    it('shows the confirm button with skull icon and ghoul count', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 3 })} />);
      expect(screen.getByRole('button', { name: /Create Undead \(1\)/ })).toBeInTheDocument();
    });
  });

  // ── Ghoul count adjustment ──

  describe('ghoul count adjustment', () => {
    it('starts at 1', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 5/);
    });

    it('increments with plus button', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 5/);
    });

    it('does not go below 1 when at minimum', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const minusBtn = document.querySelector('.sp-dismiss-btn i.fa-solid.fa-minus')?.closest('button');
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 5/);
    });

    it('does not exceed maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 2 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 2/);
    });

    it('updates total display when count changes', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 5/);
    });

    it('updates confirm button label when count changes', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      expect(screen.getByRole('button', { name: /Create Undead \(2\)/ })).toBeInTheDocument();
    });
  });

  // ── Confirm action ──

  describe('confirm action', () => {
    it('calls onConfirm with ghoulCount when confirm is clicked', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 3 })} />);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith({ ghoulCount: 1 });
    });

    it('calls onConfirm with correct ghoulCount after adjustments', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith({ ghoulCount: 3 });
    });

    it('calls onConfirm with ghoulCount at maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 4 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith({ ghoulCount: 4 });
    });
  });

  // ── Cancel / Close ──

  describe('cancel / close', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the overlay', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles maxTargets of 1', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 1 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/1 ghoul/);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 1/);
      // Plus button should not increase past 1
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      fireEvent.click(plusBtn);
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 1/);
    });

    it('handles maxTargets of 0 (count clamped to 1 but display shows 1/0)', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 0 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/0 ghoul/);
      const totalDisplay = getTotalDisplay();
      // useState starts at 1, and adjustGhoul clamps: Math.max(1, Math.min(0, 1)) = Math.max(1, 0) = 1
      // So count stays at 1 even though maxTargets is 0
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 0/);
    });

    it('handles large maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 13 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/13 ghoul/);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 13/);
    });

    it('handles multiple increments up to max', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const plusBtn = document.querySelector('.sp-roll-btn i.fa-solid.fa-plus')?.closest('button');
      for (let i = 0; i < 4; i++) {
        fireEvent.click(plusBtn);
      }
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 5 \/ 5/);
    });
  });
});

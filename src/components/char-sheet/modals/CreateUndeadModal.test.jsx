// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateUndeadModal from './CreateUndeadModal.jsx';

// ── Test fixtures ──

function makeProps(overrides) {
  return {
    maxTargets: 3,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

// ── Helpers ──

function findTotalDisplay() {
  const all = document.querySelectorAll('div');
  for (const el of all) {
    if (el.textContent.includes('Total creatures:')) {
      return el;
    }
  }
  return null;
}

// ── Tests ──

describe('CreateUndeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with skull icon and title', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByText('Create Undead')).toBeInTheDocument();
      expect(document.querySelector('.sp-header i.fa-solid.fa-skull')).toBeInTheDocument();
    });

    it('renders the instruction text with maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/5 ghoul/);
    });

    it('renders the ghoul label and count controls', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByText('Ghoul(s)')).toBeInTheDocument();
    });

    it('renders the total display showing ghoulCount / maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 3 })} />);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 3/);
    });

    it('renders Confirm and Cancel buttons', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Undead \(1\)/ })).toBeInTheDocument();
    });
  });

  // ── Ghoul count adjustment ──

  describe('ghoul count adjustment', () => {
    it('starts at 1', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 5/);
    });

    it('increments with plus button', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      fireEvent.click(plusBtn);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 5/);
    });

    it('does not go below 1 when at minimum', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = document.querySelectorAll('.sp-dismiss-btn');
      const minusBtn = buttons[1];
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 5/);
    });

    it('does not exceed maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 2 })} />);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 2/);
    });

    it('updates confirm button label when count changes', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      fireEvent.click(plusBtn);
      expect(screen.getByRole('button', { name: /Create Undead \(2\)/ })).toBeInTheDocument();
    });
  });

  // ── Confirm action ──

  describe('confirm action', () => {
    it('calls onConfirm with ghoulCount when confirm is clicked at default', () => {
      const props = makeProps({ maxTargets: 3 });
      render(<CreateUndeadModal {...props} />);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(props.onConfirm).toHaveBeenCalledWith({ ghoulCount: 1 });
    });

    it('calls onConfirm with correct ghoulCount after adjustments', () => {
      const props = makeProps({ maxTargets: 5 });
      render(<CreateUndeadModal {...props} />);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(props.onConfirm).toHaveBeenCalledWith({ ghoulCount: 3 });
    });

    it('calls onConfirm with ghoulCount at maxTargets', () => {
      const props = makeProps({ maxTargets: 4 });
      render(<CreateUndeadModal {...props} />);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(props.onConfirm).toHaveBeenCalledWith({ ghoulCount: 4 });
    });
  });

  // ── Cancel / Close ──

  describe('cancel / close', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const props = makeProps();
      render(<CreateUndeadModal {...props} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the overlay', () => {
      const props = makeProps();
      render(<CreateUndeadModal {...props} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
      const props = makeProps();
      render(<CreateUndeadModal {...props} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles maxTargets of 1 (plus button is ineffective)', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 1 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/1 ghoul/);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 1/);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      fireEvent.click(plusBtn);
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 1/);
    });

    it('handles maxTargets of 0 (count clamped to 1 but display shows 1/0)', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 0 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/0 ghoul/);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 0/);
    });

    it('handles large maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 13 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/13 ghoul/);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 13/);
    });

    it('handles multiple increments up to max', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = document.querySelectorAll('.sp-roll-btn');
      const plusBtn = buttons[0];
      for (let i = 0; i < 4; i++) {
        fireEvent.click(plusBtn);
      }
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 5 \/ 5/);
    });

    it('handles negative maxTargets (count stays at 1)', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: -1 })} />);
      const totalDisplay = findTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ -1/);
    });
  });
});

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

function getGhoulCountDisplay() {
  return screen.getByText((content) =>
    typeof content === 'string' && content.includes('Total creatures:')
  );
}

function getGhoulCountValue() {
  const inlineCount = document.querySelector('.sp-body > div[style] > div > span[style]');
  return inlineCount ? parseInt(inlineCount.textContent, 10) : null;
}

function getAdjustButtons() {
  const adjustSection = document.querySelector('.sp-body > div[style]');
  return adjustSection ? adjustSection.querySelectorAll('button') : [];
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
      const skullIcon = document.querySelector('.sp-header i.fa-solid.fa-skull');
      expect(skullIcon).toBeInTheDocument();
    });

    it('renders the instruction text with maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/5 ghoul/);
    });

    it('renders the ghoul label and count controls', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByText('Ghoul(s)')).toBeInTheDocument();
    });

    it('renders the total display showing initial ghoulCount of 1', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 3 })} />);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 1 \/ 3/);
    });

    it('renders Confirm and Cancel buttons', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Undead \(1\)/ })).toBeInTheDocument();
    });

    it('renders all buttons with type="button"', () => {
      render(<CreateUndeadModal {...makeProps()} />);
      const buttons = document.querySelectorAll('button[type="button"]');
      expect(buttons.length).toBe(4);
    });
  });

  // ── Ghoul count adjustment ──

  describe('ghoul count adjustment', () => {
    it('increments with plus button', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
      fireEvent.click(plusBtn);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 2 \/ 5/);
    });

    it('does not go below 1 when at minimum', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = getAdjustButtons();
      const minusBtn = buttons[0];
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 1 \/ 5/);
    });

    it('does not exceed maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 2 })} />);
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 2 \/ 2/);
    });

    it('updates confirm button label when count changes', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
      fireEvent.click(plusBtn);
      expect(screen.getByRole('button', { name: /Create Undead \(2\)/ })).toBeInTheDocument();
    });

    it('updates the inline ghoul count display when adjusted up', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
      fireEvent.click(plusBtn);
      expect(getGhoulCountValue()).toBe(2);
    });

    it('updates the inline ghoul count display when adjusted down', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 5 })} />);
      const buttons = getAdjustButtons();
      const minusBtn = buttons[0];
      fireEvent.click(minusBtn);
      expect(getGhoulCountValue()).toBe(1);
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
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
      fireEvent.click(plusBtn);
      fireEvent.click(plusBtn);
      const confirmBtn = screen.getByRole('button', { name: /Create Undead/ });
      fireEvent.click(confirmBtn);
      expect(props.onConfirm).toHaveBeenCalledWith({ ghoulCount: 3 });
    });

    it('calls onConfirm with ghoulCount at maxTargets', () => {
      const props = makeProps({ maxTargets: 4 });
      render(<CreateUndeadModal {...props} />);
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
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
    it('handles maxTargets of 0 (count clamped to 1 but display shows 1/0)', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 0 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/0 ghoul/);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 1 \/ 0/);
    });

    it('handles negative maxTargets (count stays at 1)', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: -1 })} />);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 1 \/ -1/);
    });

    it('does not increment when already at maxTargets of 1', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 1 })} />);
      const buttons = getAdjustButtons();
      const plusBtn = buttons[1];
      fireEvent.click(plusBtn);
      expect(getGhoulCountDisplay()).toHaveTextContent(/Total creatures: 1 \/ 1/);
    });

    it('shows ghoul label with correct singular/plural based on maxTargets', () => {
      render(<CreateUndeadModal {...makeProps({ maxTargets: 1 })} />);
      expect(screen.getByText('Ghoul(s)')).toBeInTheDocument();
    });
  });
});

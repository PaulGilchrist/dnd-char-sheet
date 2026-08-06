// @cleaned-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnimateDeadModal from './AnimateDeadModal.jsx';

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

// ── Helpers ──

/**
 * Find the total display div by searching for the one with the background style
 * that contains "Total creatures" text.
 */
function getTotalDisplay() {
  const allDivs = document.querySelectorAll('div[style*="background: rgba"]');
  for (const div of allDivs) {
    if (div.textContent.includes('Total creatures:')) {
      return div;
    }
  }
  // Fallback: find any div with "Total creatures:" that doesn't also contain "Animate Dead"
  const allDivs2 = document.querySelectorAll('div');
  for (const div of allDivs2) {
    const tc = div.textContent;
    if (tc.includes('Total creatures:') && !tc.includes('Animate Dead')) {
      return div;
    }
  }
  return null;
}

/**
 * Find the flex container that contains a specific label text.
 * We look for divs with display:flex that contain the label but have no nested flex divs.
 */
function findFlexContainer(labelText) {
  const allDivs = document.querySelectorAll('div[style*="display: flex"]');
  for (const div of allDivs) {
    // Skip if this div has nested flex children (it's the sp-body container)
    const nestedFlex = div.querySelectorAll(':scope > div[style*="display: flex"]');
    if (nestedFlex.length > 0) continue;
    if (div.textContent.includes(labelText)) {
      return div;
    }
  }
  // Fallback: search all flex divs regardless of nesting
  for (const div of allDivs) {
    if (div.textContent.includes(labelText)) {
      return div;
    }
  }
  return null;
}

function getZombieButtons() {
  const container = findFlexContainer('Zombie(s)');
  if (!container) return { minus: null, plus: null };
  const btns = Array.from(container.querySelectorAll('button'));
  return { minus: btns[0], plus: btns[1] };
}

function getSkeletonButtons() {
  const container = findFlexContainer('Skeleton(s)');
  if (!container) return { minus: null, plus: null };
  const btns = Array.from(container.querySelectorAll('button'));
  return { minus: btns[0], plus: btns[1] };
}

// ── Tests ──

describe('AnimateDeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Rendering ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with bone icon and "Animate Dead" title', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      expect(screen.getByText('Animate Dead')).toBeInTheDocument();
    });

    it('renders the instruction text with maxTargets', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 5 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/5 undead creature/);
    });

    it('renders Zombie and Skeleton count rows', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      expect(screen.getByText('Zombie(s)')).toBeInTheDocument();
      expect(screen.getByText('Skeleton(s)')).toBeInTheDocument();
    });

    it('renders the total display showing maxTargets / maxTargets (skeleton starts at max)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('renders Confirm and Cancel buttons', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows the confirm button with bone icon and total count', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Animate Dead/ })).toBeInTheDocument();
    });

    it('initially sets skeleton count to maxTargets and zombie count to 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });
  });

  // ── Zombie count adjustment ──

  describe('zombie count adjustment', () => {
    it('starts at 0 and increments with plus button (skeleton adjusts down)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      // Zombie becomes 1, skeleton reduces from 3 to 2, total stays 3
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('does not go below 0 (skeleton adjusts up)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.minus);
      // Zombie stays at 0, skeleton increases to 3, total stays 3
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('does not exceed maxTargets (skeleton stays at 0)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 2 })} />);
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      // Zombie caps at 2, skeleton at 0, total stays 2
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 2/);
    });

    it('decrements with minus button (skeleton adjusts up)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      // First set skeleton to 0 by decrementing it
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      // Now increment zombie
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 3/);
    });

    it('adjusts skeleton count down when zombie goes over max', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      // Click plus twice to set zombie to 2
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      // Skeleton should have been reduced to 1, total stays 3
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });
  });

  // ── Skeleton count adjustment ──

  describe('skeleton count adjustment', () => {
    it('starts at maxTargets and decrements with minus button (total decreases)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      // Skeleton becomes 2, zombie stays at 0, total=2
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });

    it('starts at maxTargets and plus button does not exceed max', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.plus);
      // Skeleton stays at 3, zombie at 0, total stays 3
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('does not go below 0 (total stays at 0)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      // Skeleton stays at 0, zombie at 0, total=0
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 0 \/ 3/);
    });

    it('does not exceed maxTargets (zombie stays at 0)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 2 })} />);
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.plus);
      fireEvent.click(skelBtns.plus);
      // Skeleton stays at 2, zombie at 0, total stays 2
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 2/);
    });

    it('adjusts zombie count down when skeleton goes over max', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      // Set zombie to 2 (skeleton goes from 3 to 1)
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      // Now skeleton=1, zombie=2, total=3
      // Decrement skeleton: newCount=0, 2+0=2 ≤ 3, zombie stays 2
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      // Total should be 2 (zombie=2, skeleton=0)
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });
  });

  // ── Interactive adjustment scenarios ──

  describe('interactive adjustment scenarios', () => {
    it('allows distributing between zombie and skeleton', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 4 })} />);
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      // Start: zombie=0, skeleton=4, total=4
      // Click zombie plus: zombie=1, skeleton reduces to 3, total=4
      fireEvent.click(zBtns.plus);
      // Click skeleton minus: skeleton=2, 1+2=3 ≤ 4, zombie stays 1, total=3
      fireEvent.click(skelBtns.minus);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 4/);
    });

    it('allows creating only zombies', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      // Start: zombie=0, skeleton=3, total=3
      // Decrement skeleton 3 times: skeleton=0, total=0
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      // Click zombie plus 2 times: zombie=2, total=2
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });

    it('allows creating only skeletons', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      // Skeleton starts at 3, which is all skeletons
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('allows creating zero creatures', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const skelBtns = getSkeletonButtons();
      // Start: zombie=0, skeleton=3, total=3
      // Decrement skeleton 3 times: skeleton=0, total=0
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 0 \/ 3/);
    });
  });

  // ── Confirm button state ──

  describe('confirm button state', () => {
    it('is disabled when total is 0 (both counts at 0)', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      // Start: zombie=0, skeleton=3, total=3
      // Decrement skeleton to 0: total=0
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      expect(confirmBtn).toBeDisabled();
    });

    it('is enabled when total > 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('shows total count in button label when enabled', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      // Start: zombie=0, skeleton=3, total=3
      // Click zombie plus: zombie=1, skeleton=2, total=3
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      expect(screen.getByRole('button', { name: /Animate Dead \(3\)/ })).toBeInTheDocument();
    });

    it('updates button label as total changes', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();

      // Start: zombie=0, skeleton=3, total=3
      expect(screen.getByRole('button', { name: /Animate Dead \(3\)/ })).toBeInTheDocument();

      // Increment zombie: zombie=1, skeleton=2, total=3
      fireEvent.click(zBtns.plus);
      expect(screen.getByRole('button', { name: /Animate Dead \(3\)/ })).toBeInTheDocument();

      // Decrement skeleton to 0: total goes 3→2→1→0
      fireEvent.click(skelBtns.minus);
      // skeleton=1, zombie=1, total=2
      expect(screen.getByRole('button', { name: /Animate Dead \(2\)/ })).toBeInTheDocument();

      fireEvent.click(skelBtns.minus);
      // skeleton=0, zombie=1, total=1
      expect(screen.getByRole('button', { name: /Animate Dead \(1\)/ })).toBeInTheDocument();
    });
  });

  // ── Confirm action ──

  describe('confirm action', () => {
    it('calls onConfirm with zombieCount and skeletonCount when total > 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith({ zombieCount: 1, skeletonCount: 2 });
    });

    it('calls onConfirm with all zombies when skeleton is 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      // Set zombie to 2, skeleton to 0
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith({ zombieCount: 2, skeletonCount: 0 });
    });

    it('calls onConfirm with all skeletons when zombie is 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith({ zombieCount: 0, skeletonCount: 3 });
    });

    it('does not call onConfirm when total is 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 3 })} />);
      const skelBtns = getSkeletonButtons();
      // Set skeleton to 0
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Cancel / Close ──

  describe('cancel / close', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the overlay', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
      render(<AnimateDeadModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles maxTargets of 1', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 1 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/1 undead creature/);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 1 \/ 1/);
    });

    it('handles maxTargets of 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 0 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/0 undead creature/);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 0 \/ 0/);
      const confirmBtn = screen.getByRole('button', { name: /Animate Dead/ });
      expect(confirmBtn).toBeDisabled();
    });

    it('handles large maxTargets', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 13 })} />);
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/13 undead creature/);
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 13 \/ 13/);
    });

    it('prevents zombie from exceeding maxTargets when skeleton is 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 5 })} />);
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      // Set skeleton to 0
      for (let i = 0; i < 5; i++) {
        fireEvent.click(skelBtns.minus);
      }
      // Now increment zombie past max
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zBtns.plus);
      }
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 5 \/ 5/);
    });

    it('prevents skeleton from exceeding maxTargets when zombie is 0', () => {
      render(<AnimateDeadModal {...makeProps({ maxTargets: 5 })} />);
      const skelBtns = getSkeletonButtons();
      // Skeleton starts at 5, try to increment
      for (let i = 0; i < 10; i++) {
        fireEvent.click(skelBtns.plus);
      }
      const totalDisplay = getTotalDisplay();
      expect(totalDisplay).toHaveTextContent(/Total creatures: 5 \/ 5/);
    });
  });
});

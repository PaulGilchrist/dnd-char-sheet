// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnimateDeadModal from './AnimateDeadModal.jsx';

// ── Test fixtures ──

function makeProps(overrides) {
  return {
    maxTargets: 3,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

function renderModal(overrides) {
  const props = makeProps(overrides);
  render(<AnimateDeadModal {...props} />);
  return props;
}

// ── Helpers ──

function getCreatureCounters() {
  const allSpans = document.querySelectorAll('span');
  const countSpans = Array.from(allSpans).filter(
    (el) => el.style.width === '40px' && el.style.textAlign === 'center'
  );
  return {
    zombieCount: countSpans[0] ? parseInt(countSpans[0].textContent, 10) : null,
    skeletonCount: countSpans[1] ? parseInt(countSpans[1].textContent, 10) : null,
  };
}

function getTotalDisplay() {
  return screen.getByText(/Total creatures:/);
}

function getConfirmButton() {
  return screen.getByRole('button', { name: /Animate Dead/ });
}

function getCancelButton() {
  return screen.getByRole('button', { name: 'Cancel' });
}

function getZombieButtons() {
  const zombieLabel = screen.getByText('Zombie(s)');
  const row = zombieLabel.closest('[style*="gap: 12px"]');
  if (!row) return { minus: null, plus: null };
  const buttons = Array.from(row.querySelectorAll('button'));
  return { minus: buttons[0], plus: buttons[1] };
}

function getSkeletonButtons() {
  const skeletonLabel = screen.getByText('Skeleton(s)');
  const row = skeletonLabel.closest('[style*="gap: 12px"]');
  if (!row) return { minus: null, plus: null };
  const buttons = Array.from(row.querySelectorAll('button'));
  return { minus: buttons[0], plus: buttons[1] };
}

// ── Tests ──

describe('AnimateDeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  describe('initial render', () => {
    it('renders the modal overlay and container', () => {
      renderModal();
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the header with bone icon and "Animate Dead" title', () => {
      renderModal();
      expect(screen.getByText('Animate Dead')).toBeInTheDocument();
    });

    it('renders the instruction text with maxTargets', () => {
      renderModal({ maxTargets: 5 });
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/5/);
    });

    it('renders Zombie and Skeleton count rows', () => {
      renderModal();
      expect(screen.getByText('Zombie(s)')).toBeInTheDocument();
      expect(screen.getByText('Skeleton(s)')).toBeInTheDocument();
    });

    it('renders the total display showing maxTargets / maxTargets when skeleton starts at max', () => {
      renderModal({ maxTargets: 3 });
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('renders Confirm and Cancel buttons', () => {
      renderModal();
      expect(getCancelButton()).toBeInTheDocument();
      expect(getConfirmButton()).toBeInTheDocument();
    });

    it('initially sets skeleton count to maxTargets and zombie count to 0', () => {
      renderModal({ maxTargets: 3 });
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(0);
      expect(skeletonCount).toBe(3);
    });
  });

  // ── Zombie count adjustment ──

  describe('zombie count adjustment', () => {
    it('increments zombie and decrements skeleton to keep total constant', () => {
      renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(1);
      expect(skeletonCount).toBe(2);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 3 \/ 3/);
    });

    it('does not go below 0 for zombie (skeleton adjusts up)', () => {
      renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.minus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(0);
      expect(skeletonCount).toBe(3);
    });

    it('does not exceed maxTargets for zombie (skeleton stays at 0)', () => {
      renderModal({ maxTargets: 2 });
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(2);
      expect(skeletonCount).toBe(0);
    });

    it('decrements zombie and increments skeleton', () => {
      renderModal({ maxTargets: 3 });
      // Set skeleton to 0 first
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      // Now increment zombie
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(1);
      expect(skeletonCount).toBe(0);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 1 \/ 3/);
    });
  });

  // ── Skeleton count adjustment ──

  describe('skeleton count adjustment', () => {
    it('decrements skeleton and keeps total decreasing', () => {
      renderModal({ maxTargets: 3 });
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(skeletonCount).toBe(2);
      expect(zombieCount).toBe(0);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });

    it('does not exceed maxTargets for skeleton', () => {
      renderModal({ maxTargets: 3 });
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.plus);
      const { skeletonCount } = getCreatureCounters();
      expect(skeletonCount).toBe(3);
    });

    it('does not go below 0 for skeleton (total stays at 0)', () => {
      renderModal({ maxTargets: 3 });
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(skeletonCount).toBe(0);
      expect(zombieCount).toBe(0);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 0 \/ 3/);
    });

    it('adjusts zombie down when skeleton decrement would exceed max', () => {
      renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      // Set zombie to 2 (skeleton goes from 3 to 1)
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      // Now skeleton=1, zombie=2, total=3
      // Decrement skeleton: newCount=0, 2+0=2 ≤ 3, zombie stays 2
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(2);
      expect(skeletonCount).toBe(0);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });
  });

  // ── Interactive adjustment scenarios ──

  describe('interactive adjustment scenarios', () => {
    it('allows distributing between zombie and skeleton', () => {
      renderModal({ maxTargets: 4 });
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      // Start: zombie=0, skeleton=4, total=4
      fireEvent.click(zBtns.plus);
      // zombie=1, skeleton=3, total=4
      fireEvent.click(skelBtns.minus);
      // zombie=1, skeleton=2, total=3
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(1);
      expect(skeletonCount).toBe(2);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 3 \/ 4/);
    });

    it('allows creating only zombies', () => {
      renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      // Decrement skeleton to 0
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      // Increment zombie
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(2);
      expect(skeletonCount).toBe(0);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 2 \/ 3/);
    });

    it('allows creating zero creatures', () => {
      renderModal({ maxTargets: 3 });
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const { zombieCount, skeletonCount } = getCreatureCounters();
      expect(zombieCount).toBe(0);
      expect(skeletonCount).toBe(0);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 0 \/ 3/);
    });
  });

  // ── Confirm button state ──

  describe('confirm button state', () => {
    it('is disabled when total is 0', () => {
      renderModal({ maxTargets: 3 });
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      expect(getConfirmButton()).toBeDisabled();
    });

    it('is enabled when total > 0', () => {
      renderModal({ maxTargets: 3 });
      expect(getConfirmButton()).not.toBeDisabled();
    });

    it('shows total count in button label', () => {
      renderModal({ maxTargets: 3 });
      expect(getConfirmButton()).toHaveTextContent(/Animate Dead \(3\)/);
    });

    it('updates button label as total changes', () => {
      renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();

      expect(getConfirmButton()).toHaveTextContent(/Animate Dead \(3\)/);

      fireEvent.click(zBtns.plus);
      expect(getConfirmButton()).toHaveTextContent(/Animate Dead \(3\)/);

      fireEvent.click(skelBtns.minus);
      expect(getConfirmButton()).toHaveTextContent(/Animate Dead \(2\)/);

      fireEvent.click(skelBtns.minus);
      expect(getConfirmButton()).toHaveTextContent(/Animate Dead \(1\)/);
    });
  });

  // ── Confirm action ──

  describe('confirm action', () => {
    it('calls onConfirm with zombieCount and skeletonCount when total > 0', () => {
      const { onConfirm } = renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      fireEvent.click(zBtns.plus);
      fireEvent.click(getConfirmButton());
      expect(onConfirm).toHaveBeenCalledWith({ zombieCount: 1, skeletonCount: 2 });
    });

    it('calls onConfirm with all zombies when skeleton is 0', () => {
      const { onConfirm } = renderModal({ maxTargets: 3 });
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      fireEvent.click(zBtns.plus);
      fireEvent.click(zBtns.plus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(getConfirmButton());
      expect(onConfirm).toHaveBeenCalledWith({ zombieCount: 2, skeletonCount: 0 });
    });

    it('calls onConfirm with all skeletons when zombie is 0', () => {
      const { onConfirm } = renderModal({ maxTargets: 3 });
      fireEvent.click(getConfirmButton());
      expect(onConfirm).toHaveBeenCalledWith({ zombieCount: 0, skeletonCount: 3 });
    });

    it('does not call onConfirm when total is 0', () => {
      const { onConfirm } = renderModal({ maxTargets: 3 });
      const skelBtns = getSkeletonButtons();
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      fireEvent.click(skelBtns.minus);
      const confirmBtn = getConfirmButton();
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Cancel / Close ──

  describe('cancel / close', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const { onClose } = renderModal();
      fireEvent.click(getCancelButton());
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the overlay', () => {
      const { onClose } = renderModal();
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking the modal content', () => {
      const { onClose } = renderModal();
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles maxTargets of 1', () => {
      renderModal({ maxTargets: 1 });
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/1/);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 1 \/ 1/);
    });

    it('handles maxTargets of 0 (all buttons disabled, confirm disabled)', () => {
      renderModal({ maxTargets: 0 });
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/0/);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 0 \/ 0/);
      expect(getConfirmButton()).toBeDisabled();
    });

    it('handles large maxTargets', () => {
      renderModal({ maxTargets: 13 });
      expect(screen.getByText(/You can create up to/)).toHaveTextContent(/13/);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 13 \/ 13/);
    });

    it('prevents zombie from exceeding maxTargets when skeleton is 0', () => {
      renderModal({ maxTargets: 5 });
      const zBtns = getZombieButtons();
      const skelBtns = getSkeletonButtons();
      for (let i = 0; i < 5; i++) {
        fireEvent.click(skelBtns.minus);
      }
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zBtns.plus);
      }
      const { zombieCount } = getCreatureCounters();
      expect(zombieCount).toBe(5);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 5 \/ 5/);
    });

    it('prevents skeleton from exceeding maxTargets when zombie is 0', () => {
      renderModal({ maxTargets: 5 });
      const skelBtns = getSkeletonButtons();
      for (let i = 0; i < 10; i++) {
        fireEvent.click(skelBtns.plus);
      }
      const { skeletonCount } = getCreatureCounters();
      expect(skeletonCount).toBe(5);
      expect(getTotalDisplay()).toHaveTextContent(/Total creatures: 5 \/ 5/);
    });
  });
});

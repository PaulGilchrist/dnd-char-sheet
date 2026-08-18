// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TruePolymorphPathModal from './TruePolymorphPathModal.jsx';

const mockOnConfirm = vi.fn();
const mockOnCancel = vi.fn();

function renderModal(overrides) {
  return render(<TruePolymorphPathModal onConfirm={mockOnConfirm} onCancel={mockOnCancel} {...overrides} />);
}

// ── Path selection data ──

const paths = [
  { label: 'Creature into Creature', value: 'creature_to_creature', iconClass: 'fa-users' },
  { label: 'Object into Creature', value: 'object_into_creature', iconClass: 'fa-cube' },
  { label: 'Creature into Object', value: 'creature_to_object', iconClass: 'fa-gem' },
];

// ── Initial render ──

describe('TruePolymorphPathModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders the modal with title, instruction, and three transformation paths', () => {
      renderModal();
      expect(screen.getByText('True Polymorph')).toBeInTheDocument();
      expect(screen.getByText('Choose the type of transformation:')).toBeInTheDocument();
      for (const { label } of paths) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });

    it('renders descriptions for all three paths', () => {
      renderModal();
      expect(
        screen.getByText(/Transform a creature into another creature/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Transform a nonmagical object into a creature/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Transform a creature into a nonmagical object/)
      ).toBeInTheDocument();
    });

    it('renders a paw icon in the header', () => {
      renderModal();
      const header = screen.getByText('True Polymorph').closest('.sp-header');
      expect(header.querySelector('i.fa-solid.fa-paw')).toBeInTheDocument();
    });

    it('renders a Cancel button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders exactly three transformation buttons', () => {
      renderModal();
      expect(screen.getAllByRole('button', { name: /into/ })).toHaveLength(3);
    });
  });

  // ── Path selection ──

  describe('path selection', () => {
    for (const { label, value } of paths) {
      it(`calls onConfirm with "${value}" when "${label}" is clicked`, () => {
        renderModal();
        fireEvent.click(screen.getByText(label));
        expect(mockOnConfirm).toHaveBeenCalledWith(value);
      });

      it(`does not call onCancel when "${label}" is clicked`, () => {
        renderModal();
        fireEvent.click(screen.getByText(label));
        expect(mockOnCancel).not.toHaveBeenCalled();
      });
    }
  });

  // ── Cancel / close behavior ──

  describe('close behavior', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when clicking the overlay background', () => {
      renderModal();
      const modal = screen.getByText('Choose the type of transformation:').closest('.sp-modal');
      const overlayEl = modal.parentElement;
      fireEvent.click(overlayEl);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when clicking the modal content', () => {
      renderModal();
      const modal = screen.getByText('Choose the type of transformation:').closest('.sp-modal');
      fireEvent.click(modal);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel when clicking the header', () => {
      renderModal();
      const header = screen.getByText('True Polymorph').closest('.sp-header');
      fireEvent.click(header);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel when clicking the body', () => {
      renderModal();
      const body = screen.getByText('Choose the type of transformation:').closest('.sp-body');
      fireEvent.click(body);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel when clicking the actions area', () => {
      renderModal();
      const actions = screen.getByRole('button', { name: 'Cancel' }).closest('.sp-actions');
      fireEvent.click(actions);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  // ── Escape key behavior ──

  describe('escape key', () => {
    it('calls onCancel when Escape key is pressed', () => {
      renderModal();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel for non-Escape keys', () => {
      renderModal();
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnCancel).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: ' ' });
      expect(mockOnCancel).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: 'a' });
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel on every Escape press while the listener is active', () => {
      renderModal();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalledTimes(2);
    });

    it('removes the event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderModal();
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles missing onCancel gracefully (no-op)', () => {
      render(<TruePolymorphPathModal onConfirm={mockOnConfirm} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });
});

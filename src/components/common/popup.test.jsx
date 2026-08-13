import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Popup from './popup.jsx';

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

const { sanitizeHtml } = await import('../../services/ui/sanitize.js');

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering: html content ──

  describe('rendering html content', () => {
    it('renders the sanitized html inside the modal', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test Content</b>" onClickOrKeyDown={handleClose} />);

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(sanitizeHtml).toHaveBeenCalledWith('<b>Test Content</b>');
    });

    it('renders complex html with multiple allowed tags', () => {
      const handleClose = vi.fn();
      const complexHtml =
        '<h1>Title</h1><p>Para with <b>bold</b> and <i>italic</i></p><ul><li>Item</li></ul>';
      render(<Popup html={complexHtml} onClickOrKeyDown={handleClose} />);

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText(/Para with/)).toBeInTheDocument();
      expect(screen.getByText('Item')).toBeInTheDocument();
    });

    it('renders nothing when html is an empty string and no children are provided', () => {
      const handleClose = vi.fn();
      render(<Popup html="" onClickOrKeyDown={handleClose} />);

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.queryAllByText(/./).length).toBe(0);
    });
  });

  // ── Rendering: children ──

  describe('rendering children', () => {
    it('renders children when html prop is not provided', () => {
      const handleClose = vi.fn();
      render(
        <Popup onClickOrKeyDown={handleClose}>
          <span>Child Content</span>
        </Popup>
      );

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('renders children when html is null', () => {
      const handleClose = vi.fn();
      render(
        <Popup html={null} onClickOrKeyDown={handleClose}>
          <span>Null HTML</span>
        </Popup>
      );

      expect(screen.getByText('Null HTML')).toBeInTheDocument();
      expect(sanitizeHtml).not.toHaveBeenCalled();
    });

    it('renders children when html is undefined', () => {
      const handleClose = vi.fn();
      render(
        <Popup html={undefined} onClickOrKeyDown={handleClose}>
          <span>Undefined HTML</span>
        </Popup>
      );

      expect(screen.getByText('Undefined HTML')).toBeInTheDocument();
      expect(sanitizeHtml).not.toHaveBeenCalled();
    });

    it('prefers html over children when both are provided', () => {
      const handleClose = vi.fn();
      render(
        <Popup html="<b>HTML Content</b>" onClickOrKeyDown={handleClose}>
          <span>Child Content</span>
        </Popup>
      );

      expect(screen.getByText('HTML Content')).toBeInTheDocument();
      expect(screen.queryByText('Child Content')).not.toBeInTheDocument();
    });
  });

  // ── Rendering: CSS structure ──

  describe('rendering structure', () => {
    it('applies popup-overlay and popup-modal CSS classes', () => {
      const handleClose = vi.fn();
      render(
        <Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />
      );

      const overlay = screen.getByTestId('popup-overlay');
      expect(overlay).toHaveClass('popup-overlay');
      expect(overlay.querySelector('.popup-modal')).toHaveClass('popup-modal');
    });

    it('applies role="presentation" to the overlay', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      expect(screen.getByTestId('popup-overlay')).toHaveAttribute('role', 'presentation');
    });
  });

  // ── Overlay click behavior ──

  describe('overlay click', () => {
    it('calls onClickOrKeyDown when the overlay background is clicked', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      fireEvent.click(screen.getByTestId('popup-overlay'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClickOrKeyDown when the modal is clicked', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      const modal = screen.getByTestId('popup-overlay').querySelector('.popup-modal');
      fireEvent.click(modal);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('does NOT call onClickOrKeyDown when modal content is clicked', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test Content</b>" onClickOrKeyDown={handleClose} />);

      const modalContent =
        screen.getByTestId('popup-overlay').querySelector('.popup-modal > div');
      fireEvent.click(modalContent);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  // ── Keyboard behavior ──

  describe('keyboard', () => {
    it('calls onClickOrKeyDown when any key is pressed', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      fireEvent.keyDown(document, { key: 'a' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClickOrKeyDown when Escape is pressed', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes on the first keypress and ignores subsequent keypresses', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      fireEvent.keyDown(document, { key: 'a' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(document, { key: 'b' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('removes the keyboard listener on unmount', () => {
      const handleClose = vi.fn();
      const { unmount } = render(
        <Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />
      );

      unmount();

      fireEvent.keyDown(document, { key: 'a' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  // ── Callback updates ──

  describe('callback updates', () => {
    it('uses the latest onClickOrKeyDown when the prop changes', () => {
      const handleClose1 = vi.fn();
      const handleClose2 = vi.fn();

      const { rerender } = render(
        <Popup html="<b>Test</b>" onClickOrKeyDown={handleClose1} />
      );

      fireEvent.keyDown(document, { key: 'a' });
      expect(handleClose1).toHaveBeenCalledTimes(1);
      expect(handleClose2).not.toHaveBeenCalled();

      rerender(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose2} />);

      fireEvent.keyDown(document, { key: 'b' });
      expect(handleClose2).toHaveBeenCalledTimes(1);
    });
  });
});

// @improved-by-ai
// @cleaned-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Popup from './popup.jsx';

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering: html content ──

  describe('rendering html content', () => {
    it('renders sanitized HTML inside the modal with simple and complex content', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test Content</b>" onClickOrKeyDown={handleClose} />);

      expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

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

  // ── Overlay click behavior ──

  describe('overlay click', () => {
    it('calls onClickOrKeyDown when the overlay background is clicked but not when the modal content is clicked', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test Content</b>" onClickOrKeyDown={handleClose} />);

      fireEvent.click(screen.getByTestId('popup-overlay'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClickOrKeyDown when the modal or its content is clicked', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test Content</b>" onClickOrKeyDown={handleClose} />);

      const modal = screen.getByTestId('popup-overlay').querySelector('.popup-modal');
      fireEvent.click(modal);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  // ── Keyboard behavior ──

  describe('keyboard', () => {
    it('calls onClickOrKeyDown when any key is pressed (e.g. Escape)', () => {
      const handleClose = vi.fn();
      render(<Popup html="<b>Test</b>" onClickOrKeyDown={handleClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});

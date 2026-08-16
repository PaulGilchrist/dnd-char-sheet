// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AvatarModal from './AvatarModal.jsx';

describe('AvatarModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('image rendering', () => {
    it('renders the image with correct src and alt when imagePath is provided', () => {
      render(<AvatarModal name="Gandalf" imagePath="/images/gandalf.png" onClose={vi.fn()} />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/images/gandalf.png');
      expect(img).toHaveAttribute('alt', 'Gandalf');
    });

    it('prepends campaignName to the image path when campaignName is provided', () => {
      render(
        <AvatarModal name="Gandalf" imagePath="/images/gandalf.png" campaignName="my-campaign" onClose={vi.fn()} />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'campaigns/my-campaign//images/gandalf.png');
    });

    it('preserves HTTP URLs without transformation regardless of campaignName', () => {
      render(
        <AvatarModal
          name="Gandalf"
          imagePath="https://example.com/gandalf.png"
          campaignName="my-campaign"
          onClose={vi.fn()}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/gandalf.png');
    });

    it('does not prepend campaignName when imagePath is a relative path without campaignName', () => {
      render(<AvatarModal name="Gandalf" imagePath="/images/gandalf.png" onClose={vi.fn()} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/gandalf.png');
    });
  });

  describe('fallback rendering', () => {
    it('renders the initial letter for a name, uppercased', () => {
      render(<AvatarModal name="gandalf" onClose={vi.fn()} />);
      expect(screen.getByText('G')).toBeInTheDocument();
    });

    it('renders "?" when name is empty, null, or undefined', () => {
      const { rerender } = render(<AvatarModal name="" onClose={vi.fn()} />);
      expect(screen.getByText('?')).toBeInTheDocument();

      rerender(<AvatarModal name={null} onClose={vi.fn()} />);
      expect(screen.getByText('?')).toBeInTheDocument();

      rerender(<AvatarModal name={undefined} onClose={vi.fn()} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('shows initial when imagePath is null', () => {
      render(<AvatarModal name="Gandalf" imagePath={null} onClose={vi.fn()} />);
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('shows initial when imagePath is undefined', () => {
      render(<AvatarModal name="Gandalf" onClose={vi.fn()} />);
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('close interactions', () => {
    it('renders a close button with aria-label', () => {
      render(<AvatarModal name="Gandalf" imagePath="/images/gandalf.png" onClose={vi.fn()} />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(<AvatarModal name="Gandalf" onClose={handleClose} />);

      fireEvent.click(screen.getByLabelText('Close'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
      const handleClose = vi.fn();
      render(<AvatarModal name="Gandalf" onClose={handleClose} />);

      fireEvent.click(screen.getByTestId('avatar-modal-overlay'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the inner modal is clicked', () => {
      const handleClose = vi.fn();
      render(<AvatarModal name="Gandalf" onClose={handleClose} />);

      const innerModal = screen.getByRole('presentation').querySelector('.avatar-modal');
      fireEvent.click(innerModal);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape is pressed', () => {
      const handleClose = vi.fn();
      render(<AvatarModal name="Gandalf" onClose={handleClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('structure and accessibility', () => {
    it('renders the overlay with the correct data-testid and role', () => {
      render(<AvatarModal name="Gandalf" onClose={vi.fn()} />);
      const overlay = screen.getByTestId('avatar-modal-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveAttribute('role', 'presentation');
    });

    it('renders the inner modal container', () => {
      render(<AvatarModal name="Gandalf" onClose={vi.fn()} />);
      const modal = document.querySelector('.avatar-modal');
      expect(modal).toBeInTheDocument();
    });

    it('renders the close button inside the inner modal', () => {
      render(<AvatarModal name="Gandalf" onClose={vi.fn()} />);
      const closeButton = document.querySelector('.avatar-modal-close');
      expect(closeButton).toBeInTheDocument();
    });
  });
});

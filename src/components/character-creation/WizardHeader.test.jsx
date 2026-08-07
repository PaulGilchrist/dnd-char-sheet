import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardHeader from './WizardHeader.jsx';

describe('WizardHeader', () => {
  const baseProps = {
    title: 'Test Title',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the wizard-header container div', () => {
      const { container } = render(<WizardHeader {...baseProps} />);
      expect(container.firstChild).toHaveClass('wizard-header');
    });

    it('renders the heading with the provided title', () => {
      render(<WizardHeader title="Create Character" onClose={() => {}} />);
      const heading = screen.getByRole('heading', { level: 2, name: 'Create Character' });
      expect(heading).toBeInTheDocument();
    });

    it('renders the heading with different title texts', () => {
      render(<WizardHeader title="Basic Information" onClose={() => {}} />);
      expect(screen.getByRole('heading', { level: 2, name: 'Basic Information' })).toBeInTheDocument();
    });

    it('renders the close button', () => {
      const { container } = render(<WizardHeader {...baseProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveClass('close-btn');
    });

    it('renders the close button with the × character as text', () => {
      const { container } = render(<WizardHeader {...baseProps} />);
      const closeButton = container.querySelector('button.close-btn');
      expect(closeButton.textContent).toBe('×');
    });
  });

  describe('close button interaction', () => {
    it('calls onClose when the close button is clicked', () => {
      render(<WizardHeader {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: '×' }));
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the heading is clicked', () => {
      render(<WizardHeader {...baseProps} />);
      fireEvent.click(screen.getByRole('heading', { level: 2 }));
      expect(baseProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('with different title values', () => {
    it('renders an empty title gracefully', () => {
      render(<WizardHeader title="" onClose={() => {}} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe('');
    });

    it('renders a long title', () => {
      const longTitle = 'This is a very long title that might wrap in the UI';
      render(<WizardHeader title={longTitle} onClose={() => {}} />);
      expect(screen.getByRole('heading', { level: 2, name: longTitle })).toBeInTheDocument();
    });
  });
});

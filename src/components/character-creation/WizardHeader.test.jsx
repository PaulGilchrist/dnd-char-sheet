import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WizardHeader from './WizardHeader.jsx';

describe('WizardHeader', () => {
  const createProps = (overrides = {}) => ({
    title: 'Test Title',
    onClose: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the wizard-header container with heading and close button', () => {
      render(<WizardHeader {...createProps()} />);
      expect(screen.getByRole('heading', { level: 2, name: 'Test Title' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '×' })).toHaveClass('close-btn');
    });

    it('renders the heading text dynamically based on the title prop', () => {
      render(<WizardHeader title="Create Character" onClose={() => {}} />);
      expect(screen.getByRole('heading', { level: 2, name: 'Create Character' })).toBeInTheDocument();
    });

    it('renders an empty heading when title is an empty string', () => {
      render(<WizardHeader title="" onClose={() => {}} />);
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('renders a long title without truncation', () => {
      const longTitle = 'This is a very long title that might wrap in the UI';
      render(<WizardHeader title={longTitle} onClose={() => {}} />);
      expect(screen.getByRole('heading', { level: 2, name: longTitle })).toBeInTheDocument();
    });
  });

  describe('close button interaction', () => {
    it('calls onClose when the close button is clicked', () => {
      const onClose = vi.fn();
      render(<WizardHeader title="Test" onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: '×' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the heading is clicked', () => {
      const onClose = vi.fn();
      render(<WizardHeader title="Test" onClose={onClose} />);
      fireEvent.click(screen.getByRole('heading', { level: 2 }));
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

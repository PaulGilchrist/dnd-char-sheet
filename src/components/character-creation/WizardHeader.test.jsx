// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WizardHeader from './WizardHeader.jsx';

describe('WizardHeader', () => {
  it('renders the heading with the provided title', () => {
    render(<WizardHeader title="Test Title" onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Test Title' })).toBeInTheDocument();
  });

  it('renders the close button with the close class', () => {
    render(<WizardHeader title="Test" onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: '×' })).toHaveClass('close-btn');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<WizardHeader title="Test" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders an empty heading when title is an empty string', () => {
    render(<WizardHeader title="" onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders a heading when title is undefined', () => {
    render(<WizardHeader title={undefined} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});

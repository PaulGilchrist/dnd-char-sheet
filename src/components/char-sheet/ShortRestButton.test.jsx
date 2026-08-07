import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ShortRestButton from './ShortRestButton.jsx';

describe('ShortRestButton', () => {
  it('renders a button with the correct text and icon', () => {
    render(<ShortRestButton onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: /short rest/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Short Rest');
    expect(button.querySelector('i.fa-solid.fa-bed')).toBeInTheDocument();
  });

  it('has the correct CSS class and title', () => {
    render(<ShortRestButton onClick={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('char-btn');
    expect(button).toHaveAttribute('title', 'Short Rest: spend Hit Dice and restore short-rest resources');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ShortRestButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without onClick (no crash)', () => {
    render(<ShortRestButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

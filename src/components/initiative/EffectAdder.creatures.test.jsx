import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';

describe('EffectAdder - creature names sorting', () => {
  let props;

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      targetName: 'Goblin',
      initialTab: 'conditions',
      onCancel: vi.fn(),
      onApply: vi.fn(),
      creatures: [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Dragon' },
      ],
    };
  });

  it('should sort creature names alphabetically in source dropdown', () => {
    const sortedProps = {
      ...props,
      creatures: [
        { name: 'Zombie' },
        { name: 'Alice' },
        { name: 'Dragon' },
        { name: 'Bob' },
      ],
    };
    render(<EffectAdder {...sortedProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toEqual(['', 'Alice', 'Bob', 'Dragon', 'Zombie', '__other__']);
  });

  it('should filter out creatures with no name', () => {
    const filteredProps = {
      ...props,
      creatures: [
        { name: 'Alice' },
        { name: null },
        { name: undefined },
        { name: '' },
        { name: 'Bob' },
      ],
    };
    render(<EffectAdder {...filteredProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
    expect(options).toContain('Alice');
    expect(options).toContain('Bob');
    expect(options).not.toContain('');
  });

  it('should deduplicate creature names', () => {
    const dupProps = {
      ...props,
      creatures: [
        { name: 'Alice' },
        { name: 'Alice' },
        { name: 'Bob' },
      ],
    };
    render(<EffectAdder {...dupProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
    const options = Array.from(select.querySelectorAll('option'));
    const aliceOptions = options.filter(o => o.value === 'Alice');
    expect(aliceOptions).toHaveLength(1);
  });

  it('should handle empty creatures array', () => {
    const emptyProps = { ...props, creatures: [] };
    render(<EffectAdder {...emptyProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByText('Source (who caused this):').parentElement.querySelector('select');
    const options = Array.from(select.querySelectorAll('option'));
    // Should only have the default and "Other" options
    expect(options).toHaveLength(2);
  });

  it('should handle undefined creatures prop', () => {
    const undefProps = { ...props, creatures: undefined };
    render(<EffectAdder {...undefProps} initialTab='conditions' />);
    expect(document.querySelector('.ea-modal')).toBeInTheDocument();
  });
});

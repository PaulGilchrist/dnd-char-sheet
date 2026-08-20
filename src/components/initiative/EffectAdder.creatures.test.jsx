// @improved-by-ai
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
    const select = screen.getByRole('combobox');
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
    const select = screen.getByRole('combobox');
    const values = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(values).toContain('Alice');
    expect(values).toContain('Bob');
    // null, undefined, and '' are filtered by .filter(Boolean)
    // The '' in values is the disabled placeholder option, not a creature name
    expect(values.filter(v => v !== '' && v !== '__other__')).toEqual(['Alice', 'Bob']);
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
    const select = screen.getByRole('combobox');
    const aliceOptions = Array.from(select.querySelectorAll('option')).filter(o => o.value === 'Alice');
    expect(aliceOptions).toHaveLength(1);
  });

  it('should handle empty creatures array', () => {
    const emptyProps = { ...props, creatures: [] };
    render(<EffectAdder {...emptyProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    // Only the disabled placeholder and Other options when no creatures exist
    expect(options).toEqual(['', '__other__']);
  });

  it('should handle undefined creatures prop', () => {
    const undefProps = { ...props, creatures: undefined };
    render(<EffectAdder {...undefProps} initialTab='conditions' />);
    expect(document.querySelector('.ea-modal')).toBeInTheDocument();
    // Should behave the same as empty array — no creature names in dropdown
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toEqual(['', '__other__']);
  });

  it('should handle null creatures prop', () => {
    const nullProps = { ...props, creatures: null };
    render(<EffectAdder {...nullProps} initialTab='conditions' />);
    expect(document.querySelector('.ea-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toEqual(['', '__other__']);
  });

  it('should include whitespace-only creature names as truthy strings', () => {
    const whitespaceProps = {
      ...props,
      creatures: [
        { name: 'Alice' },
        { name: '   ' },
        { name: '\t' },
        { name: 'Bob' },
      ],
    };
    render(<EffectAdder {...whitespaceProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByRole('combobox');
    const values = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(values).toContain('Alice');
    expect(values).toContain('Bob');
    // Whitespace-only strings pass .filter(Boolean) since they are truthy
    expect(values).toContain('   ');
    expect(values).toContain('\t');
  });

  it('should include creature names with special characters', () => {
    const specialProps = {
      ...props,
      creatures: [
        { name: "Dragon's Lair" },
        { name: 'Elf-Prince' },
        { name: 'Wizard_1' },
      ],
    };
    render(<EffectAdder {...specialProps} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    fireEvent.click(screen.getByText('Goad'));
    const select = screen.getByRole('combobox');
    const values = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(values).toContain("Dragon's Lair");
    expect(values).toContain('Elf-Prince');
    expect(values).toContain('Wizard_1');
  });
});

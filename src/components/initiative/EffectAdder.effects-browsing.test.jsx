import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EffectAdder from './EffectAdder.jsx';
import { TARGET_EFFECT_DEFINITIONS } from '../../services/combat/conditions/targetEffectDefinitions.js';

describe('EffectAdder - effects browsing', () => {
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

  it('should render a search input when switching to effects tab', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    expect(screen.getByPlaceholderText('Search effects…')).toBeInTheDocument();
  });

  it('should render all effects grouped by category', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const groups = ['Attack', 'Defensive', 'Saves & Checks', 'Spells', 'Movement'];
    groups.forEach(group => {
      expect(screen.getByText(group)).toBeInTheDocument();
    });
  });

  it('should render each effect definition as a clickable badge with icon', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    TARGET_EFFECT_DEFINITIONS.forEach(def => {
      expect(screen.getByText(def.label)).toBeInTheDocument();
    });
  });

  it('should show effects with Font Awesome icons', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const firstEffect = TARGET_EFFECT_DEFINITIONS[0];
    const icon = document.querySelector(`.fa-solid.${firstEffect.icon}`);
    expect(icon).toBeInTheDocument();
  });

  it('should show effect badges with tooltip from description', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const firstEffect = TARGET_EFFECT_DEFINITIONS[0];
    const badge = screen.getByText(firstEffect.label);
    expect(badge).toHaveAttribute('title', firstEffect.description);
  });

  it('should show empty message when search matches nothing', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    fireEvent.change(searchInput, { target: { value: 'zzzznotfound' } });
    expect(screen.getByText(/No effects match/)).toBeInTheDocument();
  });

  it('should filter effects by label', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    fireEvent.change(searchInput, { target: { value: 'Goad' } });
    expect(screen.getByText('Goad')).toBeInTheDocument();
    // "Escape the Horde" should not appear
    expect(screen.queryByText('Escape the Horde')).not.toBeInTheDocument();
  });

  it('should filter effects by description', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    fireEvent.change(searchInput, { target: { value: 'Disadvantage on attack' } });
    // Should find effects with "Disadvantage on attack rolls" in description
    expect(screen.queryByText('No effects match')).not.toBeInTheDocument();
  });

  it('should filter effects by group', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    fireEvent.change(searchInput, { target: { value: 'Movement' } });
    expect(screen.getByText('Movement')).toBeInTheDocument();
  });

  it('should filter effects by effect key', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    fireEvent.change(searchInput, { target: { value: 'slasher_enhanced_critical' } });
    expect(screen.getByText('Attack Disadv')).toBeInTheDocument();
  });

  it('should clear selection when search input changes', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    // Select an effect
    fireEvent.click(screen.getByText('Goad'));
    // Should show config view
    expect(document.querySelector('.ea-config')).toBeInTheDocument();

    // Type in search - this resets selection and goes back to browse
    const searchInput = screen.getByPlaceholderText('Search effects…');
    fireEvent.change(searchInput, { target: { value: 'a' } });

    // Should return to browse view
    expect(document.querySelector('.ea-config')).not.toBeInTheDocument();
  });

  it('should auto-focus the search input', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    expect(searchInput).toHaveFocus();
  });

  it('should only show groups that have matching effects when searching', () => {
    render(<EffectAdder {...props} initialTab='conditions' />);
    fireEvent.click(screen.getByRole('button', { name: 'Effects' }));
    const searchInput = screen.getByPlaceholderText('Search effects…');
    // Search for something that only exists in "Movement" group
    fireEvent.change(searchInput, { target: { value: 'Speed' } });
    // "Movement" group should appear
    expect(screen.getByText('Movement')).toBeInTheDocument();
  });
});

// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HexAbilityModal from './HexAbilityModal.jsx';

const baseProps = {
  onAbilitySelected: vi.fn(),
  onCancel: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) }
}

// ── Default abilities ──

const DEFAULT_ABILITIES = [
  { key: 'STR', label: 'Strength' },
  { key: 'DEX', label: 'Dexterity' },
  { key: 'CON', label: 'Constitution' },
  { key: 'INT', label: 'Intelligence' },
  { key: 'WIS', label: 'Wisdom' },
  { key: 'CHA', label: 'Charisma' },
];

// ── Tests ──

describe('HexAbilityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the modal overlay and content', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the default title', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(screen.getByText('Hex — Choose Ability')).toBeInTheDocument();
    });

    it('renders a custom title when provided', () => {
      render(<HexAbilityModal {...makeProps({ title: 'Custom Title' })} />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders the default prompt text', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(
        screen.getByText(
          'Choose an ability check for the target to have disadvantage on:'
        )
      ).toBeInTheDocument();
    });

    it('renders a custom prompt when provided', () => {
      render(<HexAbilityModal {...makeProps({ prompt: 'Choose wisely:' })} />);
      expect(screen.getByText('Choose wisely:')).toBeInTheDocument();
    });

    it.each([
      { icon: 'fa-eye', expectedClass: 'fa-solid fa-eye' },
      { icon: 'fa-skull', expectedClass: 'fa-solid fa-skull' },
    ])('renders icon "$expectedClass" for icon prop "$icon"', ({ icon, expectedClass }) => {
      render(<HexAbilityModal {...makeProps({ icon })} />);
      const headerIcon = document.querySelector('.sp-header i');
      expect(headerIcon).toHaveClass(expectedClass);
    });

    it.each([null, undefined])('uses default title when title is %s', (title) => {
      render(<HexAbilityModal {...makeProps({ title })} />);
      expect(screen.getByText('Hex — Choose Ability')).toBeInTheDocument();
    });

    it.each([null, undefined])('uses default prompt when prompt is %s', (prompt) => {
      render(<HexAbilityModal {...makeProps({ prompt })} />);
      expect(
        screen.getByText(
          'Choose an ability check for the target to have disadvantage on:'
        )
      ).toBeInTheDocument();
    });

    it.each([null, undefined])('uses default icon when icon is %s', (icon) => {
      render(<HexAbilityModal {...makeProps({ icon })} />);
      const headerIcon = document.querySelector('.sp-header i');
      expect(headerIcon).toHaveClass('fa-solid fa-eye');
    });

    it('renders all six default ability buttons', () => {
      render(<HexAbilityModal {...baseProps} />);
      for (const { label, key } of DEFAULT_ABILITIES) {
        expect(screen.getByRole('button', { name: `${label} (${key})` })).toBeInTheDocument();
      }
    });

    it('renders custom abilities when provided', () => {
      const customAbilities = [
        { key: 'PER', label: 'Perception' },
        { key: 'STE', label: 'Stealth' },
      ];
      render(<HexAbilityModal {...makeProps({ abilities: customAbilities })} />);
      expect(screen.getByRole('button', { name: 'Perception (PER)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Stealth (STE)' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Strength (STR)' })).not.toBeInTheDocument();
    });

    it('renders no ability buttons when abilities is an empty array', () => {
      render(<HexAbilityModal {...makeProps({ abilities: [] })} />);
      expect(document.querySelectorAll('.hex-ability-btn')).toHaveLength(0);
    });

    it('renders the Cancel button', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('ability selection', () => {
    it.each(DEFAULT_ABILITIES)('calls onAbilitySelected with "%s" when %s is clicked', (ability) => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: `${ability.label} (${ability.key})` }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith(ability.key);
    });

    it('calls onAbilitySelected with custom ability keys', () => {
      const customAbilities = [
        { key: 'PER', label: 'Perception' },
        { key: 'STE', label: 'Stealth' },
      ];
      render(<HexAbilityModal {...makeProps({ abilities: customAbilities })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Perception (PER)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('PER');
      fireEvent.click(screen.getByRole('button', { name: 'Stealth (STE)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('STE');
    });

    it('does not call onCancel when an ability is selected', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Strength (STR)' }));
      expect(baseProps.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the overlay is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when clicking the modal content', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(baseProps.onCancel).not.toHaveBeenCalled();
    });
  });
});

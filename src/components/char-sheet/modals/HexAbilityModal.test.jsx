import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HexAbilityModal from './HexAbilityModal.jsx';

const baseProps = {
  onAbilitySelected: vi.fn(),
  onCancel: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

// ── Initial render ──

describe('HexAbilityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render', () => {
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

    it('renders the default icon (fa-eye)', () => {
      render(<HexAbilityModal {...baseProps} />);
      const header = document.querySelector('.sp-header i');
      expect(header).toHaveClass('fa-solid fa-eye');
    });

    it('renders a custom icon when provided', () => {
      render(<HexAbilityModal {...makeProps({ icon: 'fa-skull' })} />);
      const header = document.querySelector('.sp-header i');
      expect(header).toHaveClass('fa-solid fa-skull');
    });

    it('renders all six default ability buttons', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(screen.getByRole('button', { name: 'Strength (STR)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dexterity (DEX)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Constitution (CON)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Intelligence (INT)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Wisdom (WIS)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Charisma (CHA)' })).toBeInTheDocument();
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

    it('renders the Cancel button', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders ability buttons with the correct CSS class', () => {
      render(<HexAbilityModal {...baseProps} />);
      const buttons = document.querySelectorAll('.hex-ability-btn');
      expect(buttons).toHaveLength(6);
    });

    it('renders the hex-ability-buttons container', () => {
      render(<HexAbilityModal {...baseProps} />);
      expect(document.querySelector('.hex-ability-buttons')).toBeInTheDocument();
    });
  });

  // ── Ability selection ──

  describe('ability selection', () => {
    it('calls onAbilitySelected with the ability key when STR is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Strength (STR)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('STR');
    });

    it('calls onAbilitySelected with the ability key when DEX is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Dexterity (DEX)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('DEX');
    });

    it('calls onAbilitySelected with the ability key when CON is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Constitution (CON)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('CON');
    });

    it('calls onAbilitySelected with the ability key when INT is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Intelligence (INT)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('INT');
    });

    it('calls onAbilitySelected with the ability key when WIS is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Wisdom (WIS)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('WIS');
    });

    it('calls onAbilitySelected with the ability key when CHA is clicked', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Charisma (CHA)' }));
      expect(baseProps.onAbilitySelected).toHaveBeenCalledWith('CHA');
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

  // ── Cancel / close behavior ──

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

    it('does not call onCancel when clicking the header', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(document.querySelector('.sp-header'));
      expect(baseProps.onCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel when clicking the body', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(document.querySelector('.sp-body'));
      expect(baseProps.onCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel when clicking the actions area', () => {
      render(<HexAbilityModal {...baseProps} />);
      fireEvent.click(document.querySelector('.sp-actions'));
      expect(baseProps.onCancel).not.toHaveBeenCalled();
    });
  });

  // ── Props defaults ──

  describe('props defaults', () => {
    it('uses default abilities when abilities prop is null', () => {
      render(<HexAbilityModal {...makeProps({ abilities: null })} />);
      expect(screen.getByRole('button', { name: 'Strength (STR)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Charisma (CHA)' })).toBeInTheDocument();
    });

    it('uses default abilities when abilities prop is undefined', () => {
      render(<HexAbilityModal {...makeProps({ abilities: undefined })} />);
      expect(screen.getByRole('button', { name: 'Strength (STR)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Charisma (CHA)' })).toBeInTheDocument();
    });

    it('uses default abilities when abilities prop is an empty array', () => {
      render(<HexAbilityModal {...makeProps({ abilities: [] })} />);
      expect(document.querySelectorAll('.hex-ability-btn').length).toBe(0);
    });

    it('uses default title when title prop is null', () => {
      render(<HexAbilityModal {...makeProps({ title: null })} />);
      expect(screen.getByText('Hex — Choose Ability')).toBeInTheDocument();
    });

    it('uses default title when title prop is undefined', () => {
      render(<HexAbilityModal {...makeProps({ title: undefined })} />);
      expect(screen.getByText('Hex — Choose Ability')).toBeInTheDocument();
    });

    it('uses default prompt when prompt prop is null', () => {
      render(<HexAbilityModal {...makeProps({ prompt: null })} />);
      expect(
        screen.getByText(
          'Choose an ability check for the target to have disadvantage on:'
        )
      ).toBeInTheDocument();
    });

    it('uses default prompt when prompt prop is undefined', () => {
      render(<HexAbilityModal {...makeProps({ prompt: undefined })} />);
      expect(
        screen.getByText(
          'Choose an ability check for the target to have disadvantage on:'
        )
      ).toBeInTheDocument();
    });

    it('uses default icon when icon prop is null', () => {
      render(<HexAbilityModal {...makeProps({ icon: null })} />);
      const header = document.querySelector('.sp-header i');
      expect(header).toHaveClass('fa-solid null');
    });

    it('uses default icon when icon prop is undefined', () => {
      render(<HexAbilityModal {...makeProps({ icon: undefined })} />);
      const header = document.querySelector('.sp-header i');
      expect(header).toHaveClass('fa-solid fa-eye');
    });
  });

  // ── Modal structure ──

  describe('modal structure', () => {
    it('renders the sp-header with icon and title text', () => {
      render(<HexAbilityModal {...baseProps} />);
      const header = document.querySelector('.sp-header');
      expect(header).toBeInTheDocument();
      expect(header.querySelector('i')).toBeInTheDocument();
    });

    it('renders the sp-body with the prompt paragraph', () => {
      render(<HexAbilityModal {...baseProps} />);
      const body = document.querySelector('.sp-body');
      expect(body).toBeInTheDocument();
      expect(body.querySelector('p')).toBeInTheDocument();
    });
  });
});

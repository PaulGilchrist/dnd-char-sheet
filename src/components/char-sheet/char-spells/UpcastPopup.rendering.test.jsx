// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UpcastPopup from './UpcastPopup.jsx';

const mockSpell = { name: 'Fireball', level: 3 };

const mockLevels = [
  { level: 3, formula: '+1d6', availableSlots: 3 },
  { level: 4, formula: '+2d6', availableSlots: 2 },
  { level: 5, formula: '+3d6', availableSlots: 0 },
];

function renderUpcastPopup(props = {}) {
  return render(
    <UpcastPopup
      spell={mockSpell}
      levels={mockLevels}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  );
}

describe('UpcastPopup', () => {
  // ── Rendering: structure and content ──

  describe('rendering structure and content', () => {
    it('renders the popup overlay and modal container', () => {
      renderUpcastPopup();

      expect(document.querySelector('.popup-overlay')).toBeInTheDocument();
      expect(document.querySelector('.popup-modal.upcast-popup')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /upcast fireball/i })).toBeInTheDocument();
    });

    it('renders the descriptive instruction text', () => {
      renderUpcastPopup();

      expect(screen.getByText(/This spell can be cast using a higher-level spell slot/)).toBeInTheDocument();
    });

    it('renders all available upcast levels as radio options', () => {
      renderUpcastPopup();

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('renders level numbers, formulas, and slot counts for each option', () => {
      renderUpcastPopup();

      expect(screen.getByText('Level 3')).toBeInTheDocument();
      expect(screen.getByText('+1d6')).toBeInTheDocument();
      expect(screen.getByText('3 slots remaining')).toBeInTheDocument();

      expect(screen.getByText('Level 4')).toBeInTheDocument();
      expect(screen.getByText('+2d6')).toBeInTheDocument();
      expect(screen.getByText('2 slots remaining')).toBeInTheDocument();

      expect(screen.getByText('Level 5')).toBeInTheDocument();
      expect(screen.getByText('+3d6')).toBeInTheDocument();
      expect(screen.getByText('0 slots remaining')).toBeInTheDocument();
    });

    it('renders the spell name in the heading', () => {
      renderUpcastPopup({ spell: { name: 'Magic Missile', level: 1 } });

      expect(screen.getByText(/upcast magic missile/i)).toBeInTheDocument();
    });
  });

  // ── Rendering: disabled levels ──

  describe('disabled levels', () => {
    it('disables radio inputs for levels with no available slots', () => {
      renderUpcastPopup();

      const level5Radio = screen.getAllByRole('radio').find(r => r.value === '5');
      expect(level5Radio).toBeDisabled();
    });

    it('applies disabled styling class to levels with no available slots', () => {
      renderUpcastPopup();

      const level5Label = screen.getByText('Level 5').closest('label');
      expect(level5Label).toHaveClass('upcast-level-disabled');
    });

    it('enables radio inputs for levels with available slots', () => {
      renderUpcastPopup();

      const level3Radio = screen.getAllByRole('radio').find(r => r.value === '3');
      const level4Radio = screen.getAllByRole('radio').find(r => r.value === '4');
      expect(level3Radio).not.toBeDisabled();
      expect(level4Radio).not.toBeDisabled();
    });
  });

  // ── Rendering: default selection ──

  describe('default selection', () => {
    it('selects the first level with available slots by default', () => {
      renderUpcastPopup();

      const selectedRadio = screen.getByRole('radio', { checked: true });
      expect(selectedRadio.value).toBe('3');
    });

    it('skips unavailable levels when selecting the default', () => {
      const levels = [
        { level: 3, formula: '+1d6', availableSlots: 0 },
        { level: 4, formula: '+2d6', availableSlots: 0 },
        { level: 5, formula: '+3d6', availableSlots: 2 },
      ];

      renderUpcastPopup({ levels });

      const selectedRadio = screen.getByRole('radio', { checked: true });
      expect(selectedRadio.value).toBe('5');
    });

    it('falls back to the first level when no slots are available at all', () => {
      const levels = [
        { level: 3, formula: '+1d6', availableSlots: 0 },
        { level: 4, formula: '+2d6', availableSlots: 0 },
      ];

      renderUpcastPopup({ levels });

      const selectedRadio = screen.getByRole('radio', { checked: true });
      expect(selectedRadio.value).toBe('3');
    });

    it('renders empty level list when levels array is empty but still shows confirm button with fallback level', () => {
      const spell = { name: 'Fireball', level: 3 };

      renderUpcastPopup({ spell, levels: [] });

      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cast at level 3/i })).toBeInTheDocument();
    });
  });

  // ── Rendering: confirm button state ──

  describe('confirm button state', () => {
    it('is enabled when a level with available slots is selected', () => {
      renderUpcastPopup();

      const confirmBtn = screen.getByRole('button', { name: /cast at level 3/i });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('becomes enabled when user selects a level with available slots', () => {
      renderUpcastPopup();

      // Default selection is level 3 (has slots), so confirm starts enabled
      const confirmBtn = screen.getByRole('button', { name: /cast at level 3/i });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('is disabled when only unavailable levels exist', () => {
      const levels = [
        { level: 3, formula: '+1d6', availableSlots: 0 },
        { level: 4, formula: '+2d6', availableSlots: 0 },
      ];

      renderUpcastPopup({ levels });

      const confirmBtn = screen.getByRole('button', { name: /cast at level 3/i });
      expect(confirmBtn).toBeDisabled();
    });
  });

  // ── Interactions: selection ──

  describe('selection interactions', () => {
    it('changes selection when clicking a different available level', () => {
      renderUpcastPopup();

      const level4Radio = screen.getAllByRole('radio').find(r => r.value === '4');
      fireEvent.click(level4Radio);

      const selectedRadio = screen.getByRole('radio', { checked: true });
      expect(selectedRadio.value).toBe('4');
    });

    it('changes the confirm button text to reflect the new selection', () => {
      renderUpcastPopup();

      const level4Radio = screen.getAllByRole('radio').find(r => r.value === '4');
      fireEvent.click(level4Radio);

      expect(screen.getByRole('button', { name: /cast at level 4/i })).toBeInTheDocument();
    });

    it('keeps confirm button disabled when attempting to select a disabled level', () => {
      renderUpcastPopup();

      const level5Radio = screen.getAllByRole('radio').find(r => r.value === '5');
      fireEvent.click(level5Radio);

      const confirmBtn = screen.getByRole('button', { name: /cast at level 5/i });
      expect(confirmBtn).toBeDisabled();
    });
  });

  // ── Interactions: cancel ──

  describe('cancel behavior', () => {
    it('calls onCancel when the cancel button is clicked', () => {
      const onCancel = vi.fn();
      renderUpcastPopup({ onCancel });

      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Escape is pressed', () => {
      const onCancel = vi.fn();
      renderUpcastPopup({ onCancel });

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the overlay background is clicked', () => {
      const onCancel = vi.fn();
      renderUpcastPopup({ onCancel });

      const overlay = document.querySelector('.popup-overlay');
      fireEvent.click(overlay);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onCancel when the modal content is clicked', () => {
      const onCancel = vi.fn();
      renderUpcastPopup({ onCancel });

      const modal = document.querySelector('.popup-modal');
      fireEvent.click(modal);
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  // ── Interactions: confirm ──

  describe('confirm behavior', () => {
    it('calls onConfirm with the selected level number', () => {
      const onConfirm = vi.fn();
      renderUpcastPopup({ onConfirm });

      const confirmBtn = screen.getByRole('button', { name: /cast at level 3/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledWith(3);
    });

    it('calls onConfirm with the newly selected level after changing selection', () => {
      const onConfirm = vi.fn();
      renderUpcastPopup({ onConfirm });

      const level4Radio = screen.getAllByRole('radio').find(r => r.value === '4');
      fireEvent.click(level4Radio);

      const confirmBtn = screen.getByRole('button', { name: /cast at level 4/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledWith(4);
    });

    it('does not call onConfirm when the confirm button is disabled', () => {
      const onConfirm = vi.fn();
      const levels = [
        { level: 3, formula: '+1d6', availableSlots: 0 },
      ];
      renderUpcastPopup({ onConfirm, levels });

      const confirmBtn = screen.getByRole('button', { name: /cast at level 3/i });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Radio input grouping ──

  describe('radio input grouping', () => {
    it('groups all radio inputs under the same name', () => {
      renderUpcastPopup();

      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'upcastLevel');
      });
    });

    it('sets correct value attributes matching the level numbers', () => {
      renderUpcastPopup();

      const radios = screen.getAllByRole('radio');
      const values = radios.map(r => r.value).sort();
      expect(values).toEqual(['3', '4', '5']);
    });
  });
});

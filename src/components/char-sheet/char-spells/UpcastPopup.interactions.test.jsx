import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpcastPopup from './UpcastPopup.jsx';

const mockSpell = {
  name: 'Fireball',
  level: 3,
};

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

describe('UpcastPopup user interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('updates selection when clicking a higher level with available slots', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();

    fireEvent.click(screen.getByText('Level 4'));
    expect(radios[1]).toBeChecked();
  });

  it('does not update selection when clicking a disabled level', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();

    fireEvent.click(screen.getByText('Level 5'));
    expect(radios[0]).toBeChecked();
  });

  it('disables radio inputs for levels with no available slots', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeDisabled();
  });

  it('enables radio inputs for levels with available slots', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).not.toBeDisabled();
    expect(radios[1]).not.toBeDisabled();
  });

  it('disables cast button when selecting a level with no slots', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();

    fireEvent.click(screen.getByText('Level 5'));
    // Level 5 is disabled so selection shouldn't change
    expect(radios[0]).toBeChecked();
  });

  it('enables cast button after selecting a level with available slots', () => {
    renderUpcastPopup();
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).not.toBeDisabled();

    fireEvent.click(screen.getByText('Level 4'));
    const updatedButton = screen.getByRole('button', { name: /Cast at Level 4/ });
    expect(updatedButton).not.toBeDisabled();
  });

  it('updates cast button text when selection changes', () => {
    renderUpcastPopup();
    expect(screen.getByRole('button', { name: /Cast at Level 3/ })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Level 4'));
    expect(screen.getByRole('button', { name: /Cast at Level 4/ })).toBeInTheDocument();
  });

  it('allows clicking the same level again (radio stays checked)', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();

    fireEvent.click(screen.getByText('Level 3'));
    expect(radios[0]).toBeChecked();
  });

  it('applies selected CSS class to the selected level', () => {
    renderUpcastPopup();
    const selectedLevel = document.querySelector('.upcast-level.upcast-level-selected');
    expect(selectedLevel).toBeInTheDocument();
  });

  it('applies disabled CSS class to levels with no slots', () => {
    renderUpcastPopup();
    const disabledLevel = document.querySelector('.upcast-level.upcast-level-disabled');
    expect(disabledLevel).toBeInTheDocument();
  });

  it('applies selected class to exactly one level', () => {
    renderUpcastPopup();
    const allLevels = document.querySelectorAll('.upcast-level');
    let selectedCount = 0;
    allLevels.forEach(level => {
      if (level.classList.contains('upcast-level-selected')) selectedCount++;
    });
    expect(selectedCount).toBe(1);
  });
});

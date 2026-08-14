// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpcastPopup from './UpcastPopup.jsx';

const mockSpell = {
  name: 'Fireball',
  level: 3,
};

function renderUpcastPopup(props = {}) {
  return render(
    <UpcastPopup
      spell={mockSpell}
      levels={[
        { level: 3, formula: '+1d6', availableSlots: 3 },
        { level: 4, formula: '+2d6', availableSlots: 2 },
        { level: 5, formula: '+3d6', availableSlots: 0 },
      ]}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  );
}

describe('UpcastPopup selection edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('selects the first available level when earlier levels are all zero slots', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 0 },
      { level: 4, formula: '+2d6', availableSlots: 0 },
      { level: 5, formula: '+3d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeChecked();
  });

  it('selects the first available level when the spell base level is not in the levels array', () => {
    const levels = [
      { level: 4, formula: '+2d6', availableSlots: 2 },
      { level: 5, formula: '+3d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    const castButton = screen.getByRole('button', { name: /Cast at Level 4/ });
    expect(castButton).not.toBeDisabled();
  });

  it('selects the spell base level when all levels have zero slots', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 0 },
      { level: 4, formula: '+2d6', availableSlots: 0 },
    ];
    renderUpcastPopup({ levels });
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).toBeDisabled();
  });
});

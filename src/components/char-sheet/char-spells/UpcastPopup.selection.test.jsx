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

function getRadioByLevel(level) {
  return screen.getByRole('radio', { name: new RegExp(`^Level ${level}`) });
}

describe('UpcastPopup selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects the first level with available slots as the default', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 0 },
      { level: 4, formula: '+2d6', availableSlots: 0 },
      { level: 5, formula: '+3d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    expect(getRadioByLevel(5)).toBeChecked();
    expect(getRadioByLevel(3)).not.toBeChecked();
    expect(getRadioByLevel(4)).not.toBeChecked();
  });

  it('selects the first level with available slots when the spell base level is absent from the array', () => {
    const levels = [
      { level: 4, formula: '+2d6', availableSlots: 2 },
      { level: 5, formula: '+3d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    expect(getRadioByLevel(4)).toBeChecked();
    expect(getRadioByLevel(5)).not.toBeChecked();
  });

  it('selects the spell base level when it has available slots', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 2 },
      { level: 4, formula: '+2d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    expect(getRadioByLevel(3)).toBeChecked();
    expect(getRadioByLevel(4)).not.toBeChecked();
  });

  it('falls back to the first level when all levels have zero slots', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 0 },
      { level: 4, formula: '+2d6', availableSlots: 0 },
    ];
    renderUpcastPopup({ levels });
    expect(getRadioByLevel(3)).toBeChecked();
    expect(getRadioByLevel(4)).not.toBeChecked();
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).toBeDisabled();
  });

  it('selects the only available level and enables the cast button', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 0 },
      { level: 4, formula: '+2d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    expect(getRadioByLevel(4)).toBeChecked();
    const castButton = screen.getByRole('button', { name: /Cast at Level 4/ });
    expect(castButton).not.toBeDisabled();
  });

  it('selects the spell base level and enables the cast button when it is the only level with slots', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 1 },
      { level: 4, formula: '+2d6', availableSlots: 0 },
    ];
    renderUpcastPopup({ levels });
    expect(getRadioByLevel(3)).toBeChecked();
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).not.toBeDisabled();
  });
});

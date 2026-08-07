import { render, screen } from '@testing-library/react';
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

describe('UpcastPopup default selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it.each([
    ['first level with available slots', mockLevels, 0],
    ['skips zero-slot levels', [{ level: 3, formula: '+1d6', availableSlots: 0 }, { level: 4, formula: '+2d6', availableSlots: 2 }], 1],
    ['falls back to spell base level when all levels have zero slots', [{ level: 3, formula: '+1d6', availableSlots: 0 }], 0],
  ])('selects %s', (_, levels, expectedIndex) => {
    renderUpcastPopup({ levels });
    const radios = screen.queryAllByRole('radio');
    if (radios.length) {
      expect(radios[expectedIndex]).toBeChecked();
    }
  });

  it('selects the first level when levels array is empty', () => {
    renderUpcastPopup({ levels: [] });
    const castButton = screen.getByRole('button', { name: /Cast at Level/ });
    expect(castButton).toBeDisabled();
  });

  it('selects the spell base level when levels array is empty as fallback', () => {
    renderUpcastPopup({ levels: [] });
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).toBeInTheDocument();
    expect(castButton).toBeDisabled();
  });

  it('enables cast button when default selected level has available slots', () => {
    renderUpcastPopup();
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).not.toBeDisabled();
  });

  it('disables cast button when default selected level has no slots', () => {
    const levels = [{ level: 3, formula: '+1d6', availableSlots: 0 }];
    renderUpcastPopup({ levels });
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).toBeDisabled();
  });

  it('uses first available level even if it is later in the array', () => {
    const levels = [
      { level: 3, formula: '+1d6', availableSlots: 0 },
      { level: 4, formula: '+2d6', availableSlots: 0 },
      { level: 5, formula: '+3d6', availableSlots: 1 },
    ];
    renderUpcastPopup({ levels });
    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeChecked();
  });
});

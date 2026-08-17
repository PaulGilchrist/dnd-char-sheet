// @cleaned-by-ai
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

describe('UpcastPopup rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders radio inputs with correct name attribute', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    radios.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'upcastLevel');
    });
  });
});

// @improved-by-ai
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

  it('renders singular "slot" when availableSlots is 1', () => {
    const levels = [{ level: 3, formula: '+1d6', availableSlots: 1 }];
    renderUpcastPopup({ levels });
    expect(screen.getByText('1 slot remaining')).toBeInTheDocument();
  });

  it('renders plural "slots" when availableSlots is not 1', () => {
    const levels = [{ level: 3, formula: '+1d6', availableSlots: 2 }];
    renderUpcastPopup({ levels });
    expect(screen.getByText('2 slots remaining')).toBeInTheDocument();
  });

  it('renders radio inputs with name="upcastLevel"', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    radios.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'upcastLevel');
    });
  });

  it('sets correct value attribute on each radio input', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    const values = Array.from(radios).map(r => r.value);
    expect(values).toEqual(['3', '4', '5']);
  });

  it('renders the overlay and modal containers with correct classes', () => {
    renderUpcastPopup();
    expect(document.querySelector('.popup-overlay')).toBeInTheDocument();
    expect(document.querySelector('.popup-modal.upcast-popup')).toBeInTheDocument();
    expect(document.querySelector('.upcast-popup-inner')).toBeInTheDocument();
  });

  it('renders disabled radio inputs for levels with no available slots', () => {
    renderUpcastPopup();
    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeDisabled();
  });
});

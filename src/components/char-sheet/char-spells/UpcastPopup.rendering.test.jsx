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

  it('renders the spell name in the heading', () => {
    renderUpcastPopup();
    expect(screen.getByText(/Fireball/)).toBeInTheDocument();
  });

  it('renders the upcast icon and title text', () => {
    renderUpcastPopup();
    const heading = screen.getByRole('heading', { name: /Upcast Fireball\?/ });
    expect(heading).toBeInTheDocument();
  });

  it('renders the Font Awesome arrow-up icon', () => {
    renderUpcastPopup();
    const icon = document.querySelector('.fa-solid.fa-arrow-up');
    expect(icon).toBeInTheDocument();
  });

  it('renders the description paragraph', () => {
    renderUpcastPopup();
    expect(
      screen.getByText('This spell can be cast using a higher-level spell slot. Select the level to cast at.')
    ).toBeInTheDocument();
  });

  it('renders all level options with their formulas', () => {
    renderUpcastPopup();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
    expect(screen.getByText('Level 5')).toBeInTheDocument();
    expect(screen.getByText('+1d6')).toBeInTheDocument();
    expect(screen.getByText('+2d6')).toBeInTheDocument();
    expect(screen.getByText('+3d6')).toBeInTheDocument();
  });

  it('renders the correct number of slot counts', () => {
    renderUpcastPopup();
    expect(screen.getByText('3 slots remaining')).toBeInTheDocument();
    expect(screen.getByText('2 slots remaining')).toBeInTheDocument();
    expect(screen.getByText('0 slots remaining')).toBeInTheDocument();
  });

  it('renders singular "slot" when availableSlots is 1', () => {
    const levels = [{ level: 3, formula: '+1d6', availableSlots: 1 }];
    renderUpcastPopup({ levels });
    expect(screen.getByText('1 slot remaining')).toBeInTheDocument();
  });

  it('renders both action buttons', () => {
    renderUpcastPopup();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cast at Level 3/ })).toBeInTheDocument();
  });

  it('renders the cast button with the selected level number', () => {
    renderUpcastPopup();
    const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
    expect(castButton).toHaveTextContent('Cast at Level 3');
  });

  it('renders the wand-magic icon on the cast button', () => {
    renderUpcastPopup();
    const icon = document.querySelector('.fa-solid.fa-wand-magic');
    expect(icon).toBeInTheDocument();
  });

  it('renders the overlay and modal containers with correct classes', () => {
    renderUpcastPopup();
    const overlay = document.querySelector('.popup-overlay');
    const modal = document.querySelector('.popup-modal.upcast-popup');
    const inner = document.querySelector('.upcast-popup-inner');
    expect(overlay).toBeInTheDocument();
    expect(modal).toBeInTheDocument();
    expect(inner).toBeInTheDocument();
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
});

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

describe('UpcastPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('popup structure', () => {
    it('renders the heading with spell name and upcast icon', () => {
      renderUpcastPopup();
      const heading = screen.getByRole('heading', { name: /Upcast Fireball/ });
      expect(heading).toBeInTheDocument();
    });

    it('renders the descriptive paragraph explaining upcasting', () => {
      renderUpcastPopup();
      expect(screen.getByText(/This spell can be cast using a higher-level spell slot/)).toBeInTheDocument();
    });

    it('renders the cast button with wand icon', () => {
      renderUpcastPopup();
      const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
      expect(castButton).toBeInTheDocument();
    });
  });

  describe('props edge cases', () => {
    it('renders correct slot remaining text for singular and plural counts', () => {
      const levels = [{ level: 3, formula: '+1d6', availableSlots: 1 }];
      renderUpcastPopup({ levels });
      expect(screen.getByText('1 slot remaining')).toBeInTheDocument();

      const levels2 = [{ level: 3, formula: '+1d6', availableSlots: 5 }];
      renderUpcastPopup({ levels: levels2 });
      expect(screen.getByText('5 slots remaining')).toBeInTheDocument();
    });
  });
});

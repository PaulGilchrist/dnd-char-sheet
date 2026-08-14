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
      expect(heading.tagName).toBe('H3');
    });

    it('renders the descriptive paragraph explaining upcasting', () => {
      renderUpcastPopup();
      expect(screen.getByText(/This spell can be cast using a higher-level spell slot/)).toBeInTheDocument();
    });

    it('renders the cast button with wand icon', () => {
      renderUpcastPopup();
      const castButton = screen.getByRole('button', { name: /Cast at Level 3/ });
      const icon = castButton.querySelector('i.fa-solid.fa-wand-magic');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('props edge cases', () => {
    it('renders with a multi-word spell name', () => {
      const spell = { name: 'Call Lightning', level: 3 };
      renderUpcastPopup({ spell });
      expect(screen.getByRole('heading', { name: /Upcast Call Lightning/ })).toBeInTheDocument();
    });

    it('renders with a single available slot using singular "slot"', () => {
      const levels = [{ level: 3, formula: '+1d6', availableSlots: 1 }];
      renderUpcastPopup({ levels });
      expect(screen.getByText('1 slot remaining')).toBeInTheDocument();
    });

    it('renders with multiple available slots using plural "slots"', () => {
      const levels = [{ level: 3, formula: '+1d6', availableSlots: 5 }];
      renderUpcastPopup({ levels });
      expect(screen.getByText('5 slots remaining')).toBeInTheDocument();
    });
  });
});

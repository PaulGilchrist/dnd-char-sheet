// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
}));

import { useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

describe('CharSpellSlotLevel - Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('header', () => {
    it('displays the level number in the header', () => {
      useRuntimeValue.mockReturnValue(2);

      render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays different level numbers correctly', () => {
      useRuntimeValue.mockReturnValue(4);

      render(
        <CharSpellSlotLevel
          level={4}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('slot visual states', () => {
    it.each`
      availableSlots | totalSlots | description
      ${4}           | ${4}       | ${'all slots used (full)'}
      ${0}           | ${4}       | ${'no slots used (empty)'}
      ${1}           | ${4}       | ${'one slot used out of four'}
      ${2}           | ${4}       | ${'two slots used out of four'}
      ${3}           | ${4}       | ${'three slots used out of four'}
      ${5}           | ${4}       | ${'available exceeds total'}
      ${2}           | ${3}       | ${'partial total (3 slots)'}
      ${1}           | ${2}       | ${'partial total (2 slots)'}
      ${0}           | ${0}       | ${'no total slots'}
    `(
      'renders correct active/inactive/unclassed slots when $description',
      ({ availableSlots, totalSlots }) => {
        useRuntimeValue.mockReturnValue(availableSlots);

        const { container } = render(
          <CharSpellSlotLevel
            level={1}
            totalSlots={totalSlots}
            playerStats={helpers.createPlayerStats()}
          />
        );

        const slots = [...container.querySelectorAll('.slot')];
        expect(slots.length).toBe(4);

        const activeCount = slots.filter((s) => s.classList.contains('active')).length;
        const inactiveCount = slots.filter((s) => s.classList.contains('inactive')).length;
        const unclassedCount = slots.filter(
          (s) => !s.classList.contains('active') && !s.classList.contains('inactive')
        ).length;

        // Slot i is active (can be spent) when availableSlots < totalSlots - i
        // So active count = totalSlots - availableSlots (capped at 0)
        // Inactive count = availableSlots (capped at totalSlots)
        const expectedActive = Math.max(0, totalSlots - availableSlots);
        const expectedInactive = Math.min(availableSlots, totalSlots);
        const expectedUnclassed = Math.max(0, 4 - totalSlots);

        expect(activeCount).toBe(expectedActive);
        expect(inactiveCount).toBe(expectedInactive);
        expect(unclassedCount).toBe(expectedUnclassed);
      }
    );

    it('renders slots in correct order (active first, then inactive, then unclassed)', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      // First 2 should be active, next 2 should be inactive
      expect(slots[0].classList.contains('active')).toBe(true);
      expect(slots[1].classList.contains('active')).toBe(true);
      expect(slots[2].classList.contains('inactive')).toBe(true);
      expect(slots[3].classList.contains('inactive')).toBe(true);
    });

    it('renders all inactive when available equals total', () => {
      useRuntimeValue.mockReturnValue(3);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      const firstThree = slots.slice(0, 3);
      firstThree.forEach((slot) => {
        expect(slot.classList.contains('inactive')).toBe(true);
        expect(slot.classList.contains('active')).toBe(false);
      });

      // Fourth slot should be unclassed (total < 4)
      expect(slots[3].classList.contains('active')).toBe(false);
      expect(slots[3].classList.contains('inactive')).toBe(false);
    });
  });

  describe('structure', () => {
    it('renders the component with header and slots containers', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(container.querySelector('.char-spell-slot-level.level')).toBeInTheDocument();
      expect(container.querySelector('.header')).toBeInTheDocument();
      expect(container.querySelector('.slots')).toBeInTheDocument();
    });

    it('renders 4 slot divs regardless of totalSlots value', () => {
      useRuntimeValue.mockReturnValue(1);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={2}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);
    });
  });
});

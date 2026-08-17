// @cleaned-by-ai
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
    it('displays the level number', () => {
      useRuntimeValue.mockReturnValue(1);

      render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('slot rendering', () => {
    it.each`
      availableSlots | totalSlots | expectedActive | expectedInactive | expectedUnclassed
      ${4}           | ${4}       | ${0}           | ${4}             | ${0}
      ${0}           | ${4}       | ${4}           | ${0}             | ${0}
      ${1}           | ${4}       | ${3}           | ${1}             | ${0}
      ${2}           | ${4}       | ${2}           | ${2}             | ${0}
      ${3}           | ${4}       | ${1}           | ${3}             | ${0}
      ${5}           | ${4}       | ${0}           | ${4}             | ${0}
      ${2}           | ${3}       | ${1}           | ${2}             | ${1}
      ${1}           | ${2}       | ${1}           | ${1}             | ${2}
    `(
      'renders $expectedActive active, $expectedInactive inactive, and $expectedUnclassed unclassed slots when availableSlots=$availableSlots totalSlots=$totalSlots',
      ({ availableSlots, totalSlots, expectedActive, expectedInactive, expectedUnclassed }) => {
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

        expect(activeCount).toBe(expectedActive);
        expect(inactiveCount).toBe(expectedInactive);
        expect(unclassedCount).toBe(expectedUnclassed);
      }
    );
  });

  describe('structure and accessibility', () => {
    it('renders with clickable, header, and slots CSS classes', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const root = container.querySelector('.char-spell-slot-level');
      expect(root).toHaveClass('clickable');
      expect(root).toHaveAttribute('tabindex', '0');

      expect(container.querySelector('.header')).toBeInTheDocument();
      expect(container.querySelector('.slots')).toBeInTheDocument();
    });
  });
});

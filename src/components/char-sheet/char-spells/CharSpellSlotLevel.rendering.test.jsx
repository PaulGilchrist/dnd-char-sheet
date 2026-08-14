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
    it.each`
      level
      ${1}
      ${5}
      ${9}
    `('displays the level number ($level)', ({ level }) => {
      useRuntimeValue.mockReturnValue(level);

      render(
        <CharSpellSlotLevel
          level={level}
          totalSlots={level}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(screen.getByText(String(level))).toBeInTheDocument();
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

    it('renders 4 slots total regardless of totalSlots value', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={0}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(container.querySelectorAll('.slot').length).toBe(4);
    });

    it('renders slots inside 2 rows', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(container.querySelectorAll('.row').length).toBe(2);
    });
  });

  describe('fallback to _trackedResources', () => {
    it('uses _trackedResources.current when runtime value is null', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_3': { current: 2 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={3}
          totalSlots={4}
          playerStats={playerStats}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      const activeSlots = slots.filter((s) => s.classList.contains('active'));
      // availableSlots=2, totalSlots=4: 2 active, 2 inactive
      expect(activeSlots.length).toBe(2);
    });

    it('falls back to totalSlots when both runtime value and _trackedResources are absent', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {},
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={playerStats}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      const activeSlots = slots.filter((s) => s.classList.contains('active'));
      // availableSlots=3 (from totalSlots), totalSlots=3: 0 active, 3 inactive, 1 unclassed
      expect(activeSlots.length).toBe(0);
    });
  });

  describe('structure and accessibility', () => {
    it.each`
      totalSlots
      ${1}
      ${4}
      ${9}
    `('renders with clickable, level, header, and slots CSS classes (totalSlots=$totalSlots)', ({ totalSlots }) => {
      useRuntimeValue.mockReturnValue(totalSlots);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={totalSlots}
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

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

  describe('rendering', () => {
    it('renders the level number in the header', () => {
      useRuntimeValue.mockReturnValue(3);

      render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it.each`
      availableSlots | totalSlots | expectedActive | expectedInactive
      ${3}           | ${4}       | ${1}           | ${3}
      ${4}           | ${4}       | ${0}           | ${4}
      ${0}           | ${3}       | ${3}           | ${0}
    `('renders $expectedActive active slots and $expectedInactive inactive slots when availableSlots=$availableSlots and totalSlots=$totalSlots', ({ availableSlots, totalSlots, expectedActive, expectedInactive }) => {
      useRuntimeValue.mockReturnValue(availableSlots);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={totalSlots}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(expectedActive);

      const inactiveSlots = [...slots].filter((slot) => slot.classList.contains('inactive'));
      expect(inactiveSlots.length).toBe(expectedInactive);
    });

    it('renders 4 slots in a 2x2 grid layout', () => {
      useRuntimeValue.mockReturnValue(4);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      expect(slots.length).toBe(4);

      const rows = container.querySelectorAll('.row');
      expect(rows.length).toBe(2);
    });

    it('falls back to _trackedResources when runtime value is null', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_3': { current: 5 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={3}
          totalSlots={4}
          playerStats={playerStats}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(0);
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

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(0);
    });

    it('renders all 4 slots as inactive when totalSlots is 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={0}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      expect(slots.length).toBe(4);

      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      const inactiveSlots = [...slots].filter((slot) => slot.classList.contains('inactive'));
      expect(activeSlots.length).toBe(0);
      expect(inactiveSlots.length).toBe(0);
    });

    it('renders all 4 slots as inactive when totalSlots >= 4 and availableSlots >= 4', () => {
      useRuntimeValue.mockReturnValue(4);

      const { container } = render(
        <CharSpellSlotLevel
          level={5}
          totalSlots={9}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(4);
    });

    it('renders correct slot classes at exact boundaries', () => {
      useRuntimeValue.mockReturnValue(1);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      // slot[0]: totalSlots>0 && availableSlots>=totalSlots => 4>0 && 1>=4 => false; availableSlots<totalSlots => 1<4 => true => active
      // slot[1]: totalSlots>0 && availableSlots>=totalSlots-1 => 4>0 && 1>=3 => false; availableSlots<totalSlots-1 => 1<3 => true => active
      // slot[2]: totalSlots>0 && availableSlots>=totalSlots-2 => 4>0 && 1>=2 => false; availableSlots<totalSlots-2 => 1<2 => true => active
      // slot[3]: totalSlots>0 && availableSlots>=totalSlots-3 => 4>0 && 1>=1 => true => inactive
      expect(slots[0].classList.contains('active')).toBe(true);
      expect(slots[1].classList.contains('active')).toBe(true);
      expect(slots[2].classList.contains('active')).toBe(true);
      expect(slots[3].classList.contains('inactive')).toBe(true);
    });

    it('renders correct slot classes when availableSlots = 2', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      // slot[0]: totalSlots>0 && availableSlots>=totalSlots => 4>0 && 2>=4 => false; availableSlots<totalSlots => 2<4 => true => active
      // slot[1]: totalSlots>0 && availableSlots>=totalSlots-1 => 4>0 && 2>=3 => false; availableSlots<totalSlots-1 => 2<3 => true => active
      // slot[2]: totalSlots>0 && availableSlots>=totalSlots-2 => 4>0 && 2>=2 => true => inactive
      // slot[3]: totalSlots>0 && availableSlots>=totalSlots-3 => 4>0 && 2>=1 => true => inactive
      expect(slots[0].classList.contains('active')).toBe(true);
      expect(slots[1].classList.contains('active')).toBe(true);
      expect(slots[2].classList.contains('inactive')).toBe(true);
      expect(slots[3].classList.contains('inactive')).toBe(true);
    });

    it('renders correct slot classes when availableSlots = 3', () => {
      useRuntimeValue.mockReturnValue(3);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      // slot[0]: totalSlots>0 && availableSlots>=totalSlots => 4>0 && 3>=4 => false; availableSlots<totalSlots => 3<4 => true => active
      // slot[1]: totalSlots>0 && availableSlots>=totalSlots-1 => 4>0 && 3>=3 => true => inactive
      // slot[2]: totalSlots>0 && availableSlots>=totalSlots-2 => 4>0 && 3>=2 => true => inactive
      // slot[3]: totalSlots>0 && availableSlots>=totalSlots-3 => 4>0 && 3>=1 => true => inactive
      expect(slots[0].classList.contains('active')).toBe(true);
      expect(slots[1].classList.contains('inactive')).toBe(true);
      expect(slots[2].classList.contains('inactive')).toBe(true);
      expect(slots[3].classList.contains('inactive')).toBe(true);
    });

    it('renders the clickable CSS class', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.char-spell-slot-level');
      expect(levelDiv.classList.contains('clickable')).toBe(true);
    });

    it('sets tabIndex to 0 for keyboard accessibility', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.char-spell-slot-level');
      expect(levelDiv.getAttribute('tabIndex')).toBe('0');
    });

    it('has the header CSS class', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const header = container.querySelector('.header');
      expect(header).toBeInTheDocument();
    });

    it('has the slots CSS class', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slotsContainer = container.querySelector('.slots');
      expect(slotsContainer).toBeInTheDocument();
    });
  });
});

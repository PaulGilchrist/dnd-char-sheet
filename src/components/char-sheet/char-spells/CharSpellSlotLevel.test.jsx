import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import { useRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const createPlayerStats = (overrides = {}) => ({
  name: 'Test Character',
  _trackedResources: {},
  ...overrides,
});

describe('CharSpellSlotLevel', () => {
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
          playerStats={createPlayerStats()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it.each`
      availableSlots | totalSlots | expectedActive
      ${3}           | ${4}       | ${3}
      ${4}           | ${4}       | ${4}
      ${0}           | ${3}       | ${0}
    `('renders $expectedActive active slots when availableSlots=$availableSlots and totalSlots=$totalSlots', ({ availableSlots, totalSlots, expectedActive }) => {
      useRuntimeValue.mockReturnValue(availableSlots);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={totalSlots}
          playerStats={createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(expectedActive);

      const inactiveSlots = [...slots].filter((slot) => slot.classList.contains('inactive'));
      if (availableSlots === 0 && totalSlots > 0) {
        expect(inactiveSlots.length).toBe(totalSlots);
      }
    });

    it('renders 4 slots in a 2x2 grid layout', () => {
      useRuntimeValue.mockReturnValue(4);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      expect(slots.length).toBe(4);

      const rows = container.querySelectorAll('.row');
      expect(rows.length).toBe(2);
    });

    it('falls back to _trackedResources when runtime value is null', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
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
      expect(activeSlots.length).toBe(4);
    });

    it('falls back to totalSlots when both runtime value and _trackedResources are absent', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
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
      expect(activeSlots.length).toBe(3);
    });

    it('renders all 4 slots as inactive when totalSlots is 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={0}
          playerStats={createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      expect(slots.length).toBe(4);

      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      const inactiveSlots = [...slots].filter((slot) => slot.classList.contains('inactive'));
      expect(activeSlots.length).toBe(0);
      expect(inactiveSlots.length).toBe(0);
    });

    it('renders all slots active when totalSlots >= 4 and availableSlots >= 4', () => {
      useRuntimeValue.mockReturnValue(4);

      const { container } = render(
        <CharSpellSlotLevel
          level={5}
          totalSlots={9}
          playerStats={createPlayerStats()}
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
          playerStats={createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      // slot[0]: availableSlots > 0 => true => active
      // slot[1]: availableSlots > 1 => false, totalSlots > 1 => true => inactive
      // slot[2]: availableSlots > 2 => false, totalSlots > 2 => true => inactive
      // slot[3]: availableSlots > 3 => false, totalSlots > 3 => true => inactive
      expect(slots[0].classList.contains('active')).toBe(true);
      expect(slots[1].classList.contains('inactive')).toBe(true);
      expect(slots[2].classList.contains('inactive')).toBe(true);
      expect(slots[3].classList.contains('inactive')).toBe(true);
    });

    it('renders correct slot classes when availableSlots = 2', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      // slot[0]: availableSlots > 0 => true => active
      // slot[1]: availableSlots > 1 => true => active
      // slot[2]: availableSlots > 2 => false, totalSlots > 2 => true => inactive
      // slot[3]: availableSlots > 3 => false, totalSlots > 3 => true => inactive
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
          playerStats={createPlayerStats()}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      // slot[0]: availableSlots > 0 => true => active
      // slot[1]: availableSlots > 1 => true => active
      // slot[2]: availableSlots > 2 => true => active
      // slot[3]: availableSlots > 3 => false, totalSlots > 3 => true => inactive
      expect(slots[0].classList.contains('active')).toBe(true);
      expect(slots[1].classList.contains('active')).toBe(true);
      expect(slots[2].classList.contains('active')).toBe(true);
      expect(slots[3].classList.contains('inactive')).toBe(true);
    });
  });

  describe('interaction', () => {
    it.each`
      availableSlots | expectedNewValue
      ${3}           | ${2}
      ${0}           | ${3}
    `('decrements when available > 0, resets when 0 (availableSlots=$availableSlots)', ({ availableSlots, expectedNewValue }) => {
      useRuntimeValue.mockReturnValue(availableSlots);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        expectedNewValue,
        undefined
      );
    });

    it('decrements on Enter key press', () => {
      useRuntimeValue.mockReturnValue(3);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: 'Enter' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        undefined
      );
    });

    it('decrements on Space key press', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={3}
          playerStats={createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: ' ' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        1,
        undefined
      );
    });

    it('does NOT decrement on Tab key press', () => {
      useRuntimeValue.mockReturnValue(3);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: 'Tab' });

      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('resets to totalSlots when availableSlots is 0 on any key press', () => {
      useRuntimeValue.mockReturnValue(0);

      const { container } = render(
        <CharSpellSlotLevel
          level={3}
          totalSlots={4}
          playerStats={createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: 'Enter' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_3',
        4,
        undefined
      );
    });

    it('uses _trackedResources fallback for interaction when runtime value is null', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_2': { current: 0 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={4}
          playerStats={playerStats}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        4,
        undefined
      );
    });

    it('uses _trackedResources fallback for interaction when available > 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_1': { current: 2 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={playerStats}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        1,
        undefined
      );
    });

    it('calls setRuntimeValue with correct key for non-level-1 slots', () => {
      useRuntimeValue.mockReturnValue(5);

      const { container } = render(
        <CharSpellSlotLevel
          level={5}
          totalSlots={6}
          playerStats={createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_5',
        4,
        undefined
      );
    });
  });

  describe('fallback logic', () => {
    it('uses _trackedResources when runtime value is undefined (not just null)', () => {
      useRuntimeValue.mockReturnValue(undefined);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_1': { current: 2 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={playerStats}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(2);
    });

    it('uses runtime value over _trackedResources when both exist', () => {
      useRuntimeValue.mockReturnValue(1);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_1': { current: 4 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={playerStats}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(1);
    });

    it('uses totalSlots when _trackedResources key is missing (capped at 4 rendered slots)', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_2': { current: 3 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={5}
          playerStats={playerStats}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(4);
    });

    it('uses totalSlots when _trackedResources is missing the key for the level', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_1': { current: 2 },
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
      expect(activeSlots.length).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('handles totalSlots of 0', () => {
      useRuntimeValue.mockReturnValue(0);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={0}
          playerStats={createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      expect(slots.length).toBe(4);

      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(0);

      const inactiveSlots = [...slots].filter((slot) => slot.classList.contains('inactive'));
      expect(inactiveSlots.length).toBe(0);
    });

    it('throws when playerStats is null due to accessing playerStats.name', () => {
      useRuntimeValue.mockReturnValue(null);

      expect(() =>
        render(
          <CharSpellSlotLevel
            level={1}
            totalSlots={3}
            playerStats={null}
          />
        )
      ).toThrow();
    });

    it('throws when playerStats is undefined due to accessing playerStats.name', () => {
      useRuntimeValue.mockReturnValue(null);

      expect(() =>
        render(
          <CharSpellSlotLevel
            level={1}
            totalSlots={2}
            playerStats={undefined}
          />
        )
      ).toThrow();
    });

    it('handles playerStats without _trackedResources', () => {
      useRuntimeValue.mockReturnValue(null);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats({ _trackedResources: undefined })}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(3);
    });

    it('handles negative totalSlots gracefully', () => {
      useRuntimeValue.mockReturnValue(null);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={-1}
          playerStats={createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(0);
    });

    it('handles availableSlots greater than totalSlots', () => {
      useRuntimeValue.mockReturnValue(5);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      // All 4 slots should be active since availableSlots > 3
      expect(activeSlots.length).toBe(4);
    });

    it('handles level as a string', () => {
      useRuntimeValue.mockReturnValue(2);

      render(
        <CharSpellSlotLevel
          level="2"
          totalSlots={3}
          playerStats={createPlayerStats()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders the clickable CSS class', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats()}
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
          playerStats={createPlayerStats()}
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
          playerStats={createPlayerStats()}
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
          playerStats={createPlayerStats()}
        />
      );

      const slotsContainer = container.querySelector('.slots');
      expect(slotsContainer).toBeInTheDocument();
    });
  });

  describe('campaignName propagation', () => {
    it('passes campaignName to setRuntimeValue on click', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={createPlayerStats()}
          campaignName="test-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        1,
        'test-campaign'
      );
    });

    it('passes campaignName to setRuntimeValue on Enter key', () => {
      useRuntimeValue.mockReturnValue(1);

      const { container } = render(
        <CharSpellSlotLevel
          level={3}
          totalSlots={4}
          playerStats={createPlayerStats()}
          campaignName="test-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: 'Enter' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_3',
        0,
        'test-campaign'
      );
    });

    it('passes campaignName to setRuntimeValue when resetting', () => {
      useRuntimeValue.mockReturnValue(0);

      const { container } = render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={5}
          playerStats={createPlayerStats()}
          campaignName="reset-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        5,
        'reset-campaign'
      );
    });
  });

  describe('useRuntimeValue behavior', () => {
    it('calls useRuntimeValue with correct character key and property name', () => {
      useRuntimeValue.mockReturnValue(2);

      render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={3}
          playerStats={createPlayerStats()}
          campaignName="test"
        />
      );

      expect(useRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        'test'
      );
    });

    it('calls useRuntimeValue with correct key for level 9', () => {
      useRuntimeValue.mockReturnValue(1);

      render(
        <CharSpellSlotLevel
          level={9}
          totalSlots={2}
          playerStats={createPlayerStats()}
          campaignName="test"
        />
      );

      expect(useRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_9',
        'test'
      );
    });

    it('uses _trackedResources when useRuntimeValue returns null for interaction', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_4': { current: 1 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={4}
          totalSlots={5}
          playerStats={playerStats}
          campaignName="test"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_4',
        0,
        'test'
      );
    });

    it('uses _trackedResources when useRuntimeValue returns null for rendering', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = createPlayerStats({
        _trackedResources: {
          'spell_slots_level_6': { current: 3 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={6}
          totalSlots={5}
          playerStats={playerStats}
          campaignName="test"
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(3);
    });
  });
});

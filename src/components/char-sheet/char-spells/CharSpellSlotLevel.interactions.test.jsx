import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import { useRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

describe('CharSpellSlotLevel - Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats()}
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

      const playerStats = helpers.createPlayerStats({
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

      const playerStats = helpers.createPlayerStats({
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
          playerStats={helpers.createPlayerStats()}
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
});

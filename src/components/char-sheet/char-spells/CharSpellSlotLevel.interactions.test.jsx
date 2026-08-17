// @cleaned-by-ai
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

  describe('click interactions', () => {
    it('decrements availableSlots by 1 when available > 0', () => {
      useRuntimeValue.mockReturnValue(3);

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
        2,
        undefined
      );
    });

    it('resets to totalSlots when availableSlots is 0', () => {
      useRuntimeValue.mockReturnValue(0);

      const { container } = render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={5}
          playerStats={helpers.createPlayerStats()}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        5,
        undefined
      );
    });

    it('uses _trackedResources.current when runtime value is null and current > 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_2': { current: 2 },
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
        1,
        undefined
      );
    });

    it('resets to totalSlots when _trackedResources.current is 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_4': { current: 0 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={4}
          totalSlots={5}
          playerStats={playerStats}
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_4',
        5,
        undefined
      );
    });

    it('uses totalSlots as fallback when _trackedResources is missing the key', () => {
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

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        undefined
      );
    });
  });

  describe('keyboard interactions', () => {
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
  });

  describe('different spell slot levels', () => {
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

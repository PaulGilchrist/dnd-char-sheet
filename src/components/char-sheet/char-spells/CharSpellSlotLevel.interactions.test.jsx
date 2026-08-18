// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import { useRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'Test Campaign';

function renderSpellSlotLevel(props = {}) {
  return render(
    <CharSpellSlotLevel
      level={1}
      totalSlots={3}
      campaignName={campaignName}
      playerStats={helpers.createPlayerStats()}
      {...props}
    />
  );
}

describe('CharSpellSlotLevel - Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('click interactions', () => {
    it('decrements availableSlots by 1 when available > 0', () => {
      useRuntimeValue.mockReturnValue(3);

      renderSpellSlotLevel();

      const levelElement = screen.getByText('1');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        campaignName
      );
    });

    it('resets to totalSlots when availableSlots is 0', () => {
      useRuntimeValue.mockReturnValue(0);

      renderSpellSlotLevel({ level: 2, totalSlots: 5 });

      const levelElement = screen.getByText('2');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        5,
        campaignName
      );
    });

    it('resets to totalSlots when availableSlots is negative', () => {
      useRuntimeValue.mockReturnValue(-1);

      renderSpellSlotLevel();

      const levelElement = screen.getByText('1');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        3,
        campaignName
      );
    });

    it('resets to totalSlots when totalSlots is 0', () => {
      useRuntimeValue.mockReturnValue(0);

      renderSpellSlotLevel({ totalSlots: 0 });

      const levelElement = screen.getByText('1');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        0,
        campaignName
      );
    });

    it('uses _trackedResources.current when runtime value is null and current > 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_2': { current: 2 },
        },
      });

      renderSpellSlotLevel({ level: 2, totalSlots: 4, playerStats });

      const levelElement = screen.getByText('2');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_2',
        1,
        campaignName
      );
    });

    it('resets to totalSlots when _trackedResources.current is 0', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_4': { current: 0 },
        },
      });

      renderSpellSlotLevel({ level: 4, totalSlots: 5, playerStats });

      const levelElement = screen.getByText('4');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_4',
        5,
        campaignName
      );
    });

    it('uses totalSlots as fallback when _trackedResources is missing the key', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {},
      });

      renderSpellSlotLevel({ playerStats });

      const levelElement = screen.getByText('1');
      levelElement.click();

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        campaignName
      );
    });
  });

  describe('keyboard interactions', () => {
    it('decrements on Enter key press', () => {
      useRuntimeValue.mockReturnValue(3);

      renderSpellSlotLevel();

      const levelElement = screen.getByText('1');
      fireEvent.keyDown(levelElement, { key: 'Enter' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        campaignName
      );
    });

    it('does NOT decrement on Tab key press', () => {
      useRuntimeValue.mockReturnValue(3);

      renderSpellSlotLevel();

      const levelElement = screen.getByText('1');
      fireEvent.keyDown(levelElement, { key: 'Tab' });

      expect(setRuntimeValue).not.toHaveBeenCalled();
    });
  });
});

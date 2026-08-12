import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import { useRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

describe('CharSpellSlotLevel - Runtime Value Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRuntimeValue behavior', () => {
    it('calls useRuntimeValue with correct character key and property name', () => {
      useRuntimeValue.mockReturnValue(2);

      render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats()}
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

      const playerStats = helpers.createPlayerStats({
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

      const playerStats = helpers.createPlayerStats({
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
      // availableSlots=3, totalSlots=5: 2 available (active), 2 consumed (inactive), 1 no class
      expect(activeSlots.length).toBe(2);
    });
  });
});

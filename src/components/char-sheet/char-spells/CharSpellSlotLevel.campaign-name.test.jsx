// @improved-by-ai
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import { useRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

describe('CharSpellSlotLevel - Campaign Name Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('campaignName propagation', () => {
    it('passes campaignName to useRuntimeValue on mount', () => {
      useRuntimeValue.mockReturnValue(2);

      render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
          campaignName="test-campaign"
        />
      );

      expect(useRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        'test-campaign'
      );
    });

    it('passes campaignName to setRuntimeValue on click to decrement', () => {
      useRuntimeValue.mockReturnValue(2);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
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

    it('passes campaignName to setRuntimeValue on click to reset when no slots remain', () => {
      useRuntimeValue.mockReturnValue(0);

      const { container } = render(
        <CharSpellSlotLevel
          level={2}
          totalSlots={5}
          playerStats={helpers.createPlayerStats()}
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

    it('passes campaignName to setRuntimeValue on Enter key press', () => {
      useRuntimeValue.mockReturnValue(1);

      const { container } = render(
        <CharSpellSlotLevel
          level={3}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
          campaignName="enter-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: 'Enter' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_3',
        0,
        'enter-campaign'
      );
    });

    it('passes campaignName to setRuntimeValue on Space key press', () => {
      useRuntimeValue.mockReturnValue(3);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
          campaignName="space-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: ' ' });

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        'space-campaign'
      );
    });

    it('does NOT call setRuntimeValue on Tab key press', () => {
      useRuntimeValue.mockReturnValue(3);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
          campaignName="tab-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.keyDown(levelDiv, { key: 'Tab' });

      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('passes campaignName when using _trackedResources fallback for interaction', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_4': { current: 2 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={4}
          totalSlots={5}
          playerStats={playerStats}
          campaignName="tracked-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_4',
        1,
        'tracked-campaign'
      );
    });

    it('passes campaignName even when playerStats has no _trackedResources', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: undefined,
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={playerStats}
          campaignName="no-tracked-campaign"
        />
      );

      const levelDiv = container.querySelector('.level');
      fireEvent.click(levelDiv);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'spell_slots_level_1',
        2,
        'no-tracked-campaign'
      );
    });
  });
});

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
    it('passes campaignName to setRuntimeValue on click', () => {
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

    it('passes campaignName to setRuntimeValue on Enter key', () => {
      useRuntimeValue.mockReturnValue(1);

      const { container } = render(
        <CharSpellSlotLevel
          level={3}
          totalSlots={4}
          playerStats={helpers.createPlayerStats()}
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
  });
});

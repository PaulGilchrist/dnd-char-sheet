// @cleaned-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
}));

import { useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

describe('CharSpellSlotLevel - Fallback Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fallback logic', () => {
    it('uses _trackedResources when runtime value is undefined', () => {
      useRuntimeValue.mockReturnValue(undefined);

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

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(2);
    });

    it('prioritizes runtime value over _trackedResources when both exist', () => {
      useRuntimeValue.mockReturnValue(1);

      const playerStats = helpers.createPlayerStats({
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
      expect(activeSlots.length).toBe(3);
    });

    it.each`
      trackedResources       | description
      ${{}}                  | 'empty object'
      ${undefined}           | 'undefined'
      ${{ 'spell_slots_level_1': { current: 2 } }} | 'missing key for level'
    `('falls back to totalSlots when $description (trackedResources=$description)', ({ trackedResources }) => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: trackedResources,
      });

      const level = trackedResources && trackedResources['spell_slots_level_1'] ? 3 : 1;
      const totalSlots = trackedResources && typeof trackedResources === 'object' ? 3 : 2;

      const { container } = render(
        <CharSpellSlotLevel
          level={level}
          totalSlots={totalSlots}
          playerStats={playerStats}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(0);
    });
  });
});

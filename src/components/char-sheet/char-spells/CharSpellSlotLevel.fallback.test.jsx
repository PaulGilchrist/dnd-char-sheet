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
    it('uses _trackedResources when runtime value is undefined (not just null)', () => {
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

    it('uses runtime value over _trackedResources when both exist', () => {
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

    it('uses totalSlots when _trackedResources key is missing (capped at 4 rendered slots)', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
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
      expect(activeSlots.length).toBe(0);
    });

    it('uses totalSlots when _trackedResources is missing the key for the level', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
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
      expect(activeSlots.length).toBe(0);
    });
  });
});

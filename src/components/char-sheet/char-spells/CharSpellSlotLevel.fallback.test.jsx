// @improved-by-ai
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

  describe('available slots resolution', () => {
    it('uses _trackedResources.current when runtime value is undefined', () => {
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

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      const activeCount = slots.filter((s) => s.classList.contains('active')).length;
      expect(activeCount).toBe(2);
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

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      const activeCount = slots.filter((s) => s.classList.contains('active')).length;
      expect(activeCount).toBe(3);
    });

    it('uses runtime value of 0 (not _trackedResources)', () => {
      useRuntimeValue.mockReturnValue(0);

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

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      const activeCount = slots.filter((s) => s.classList.contains('active')).length;
      expect(activeCount).toBe(4);
    });

    it.each`
      description
      ${'empty _trackedResources object'}
      ${'undefined _trackedResources'}
      ${'null _trackedResources'}
    `('falls back to totalSlots when $description', ({ description }) => {
      useRuntimeValue.mockReturnValue(null);

      const trackedResources = description === 'undefined _trackedResources'
        ? undefined
        : description === 'null _trackedResources'
          ? null
          : {};

      const playerStats = helpers.createPlayerStats({
        _trackedResources: trackedResources,
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={playerStats}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      const activeCount = slots.filter((s) => s.classList.contains('active')).length;
      expect(activeCount).toBe(0);
    });

    it('falls back to totalSlots when _trackedResources is missing the level key', () => {
      useRuntimeValue.mockReturnValue(null);

      const playerStats = helpers.createPlayerStats({
        _trackedResources: {
          'spell_slots_level_2': { current: 2 },
        },
      });

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={3}
          playerStats={playerStats}
        />
      );

      const slots = [...container.querySelectorAll('.slot')];
      expect(slots.length).toBe(4);

      const activeCount = slots.filter((s) => s.classList.contains('active')).length;
      expect(activeCount).toBe(0);
    });
  });
});

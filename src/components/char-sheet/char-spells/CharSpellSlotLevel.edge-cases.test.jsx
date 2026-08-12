import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSpellSlotLevel from './CharSpellSlotLevel.jsx';
import * as helpers from './CharSpellSlotLevel.test.helpers.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn(),
}));

import { useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

describe('CharSpellSlotLevel - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('edge cases', () => {
    it('handles totalSlots of 0', () => {
      useRuntimeValue.mockReturnValue(0);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={0}
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats({ _trackedResources: undefined })}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      expect(activeSlots.length).toBe(0);
    });

    it('handles negative totalSlots gracefully', () => {
      useRuntimeValue.mockReturnValue(null);

      const { container } = render(
        <CharSpellSlotLevel
          level={1}
          totalSlots={-1}
          playerStats={helpers.createPlayerStats()}
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
          playerStats={helpers.createPlayerStats()}
        />
      );

      const slots = container.querySelectorAll('.slot');
      const activeSlots = [...slots].filter((slot) => slot.classList.contains('active'));
      // All 3 slots that have totalSlots are consumed (inactive), 4th has no class
      expect(activeSlots.length).toBe(0);
    });

    it('handles level as a string', () => {
      useRuntimeValue.mockReturnValue(2);

      render(
        <CharSpellSlotLevel
          level="2"
          totalSlots={3}
          playerStats={helpers.createPlayerStats()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});

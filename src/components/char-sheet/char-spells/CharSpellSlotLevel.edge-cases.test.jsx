// @improved-by-ai
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
    it('renders no active slots when totalSlots is negative', () => {
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

    it('renders no active slots when availableSlots exceeds totalSlots', () => {
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
      expect(activeSlots.length).toBe(0);
    });

    it('renders the level number when level is a string', () => {
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

    it('renders no active slots when _trackedResources is undefined', () => {
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
  });
});

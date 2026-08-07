import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharInventory from './CharInventory.jsx';

// Mock the dataLoader service
vi.mock('../../services/ui/dataLoader.js', () => ({
  loadEquipment: vi.fn(),
  clearDataCache: vi.fn(),
}));

// Mock the usePopup hook
vi.mock('../../hooks/combat/usePopup.js', () => ({
  default: vi.fn(),
}));

// Mock the sanitize service
vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

import usePopup from '../../hooks/combat/usePopup.js';
import { loadEquipment } from '../../services/ui/dataLoader.js';

function renderComponent(playerStats) {
  return render(<CharInventory playerStats={playerStats} />);
}

describe('CharInventory popup plural/singular edge cases', () => {
  let setPopupHtmlSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    setPopupHtmlSpy = vi.fn();

    usePopup.mockImplementation(() => ({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: setPopupHtmlSpy,
    }));

    loadEquipment.mockResolvedValue([
      {
        name: 'Dagger',
        index: 'dagger',
        cost: { quantity: 2, unit: 'gp' },
      },
      {
        name: 'Shield',
        index: 'shield',
        cost: { quantity: 10, unit: 'gp' },
      },
      {
        name: 'Longsword',
        index: 'longsword',
        cost: { quantity: 15, unit: 'gp' },
      },
      {
        name: 'Potion of Healing',
        index: 'potion-of-healing',
        cost: { quantity: 100, unit: 'gp' },
      },
      {
        name: 'Arrow',
        index: 'arrow',
        cost: { quantity: 5, unit: 'cp' },
      },
    ]);
  });

  async function clickItemByText(text) {
    const clickable = screen.getByText(text);
    fireEvent.click(clickable);
    await waitFor(() => {
      expect(setPopupHtmlSpy).toHaveBeenCalled();
    });
  }

  describe('plural/singular resolution edge cases', () => {
    it('should find "Arrow" when searching for "Arrows" (singular to plural fallback)', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Arrows'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Arrows');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Arrow</b>');
    });

    it('should find "Shield" when searching for "Shields" (plural to singular fallback)', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Shields'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Shields');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Shield</b>');
    });

    it('should find "Dagger" when searching for "Daggers" (plural to singular fallback)', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Daggers'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Daggers');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Dagger</b>');
    });

    it('should not double-strip "s" from already plural words', async () => {
      // "Longsword" ends with 's' but is not plural, so singular fallback strips 's' to "longwor" which won't match
      // Then plural fallback adds 's' to get "longswords" which also won't match
      // But exact match "Longsword" should work
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Longsword'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Longsword');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
    });

    it('should show not found when pluralization is irregular (word ending in "es")', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Crossbow',
          index: 'crossbow',
          cost: { quantity: 50, unit: 'gp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Crossbowes'],
          backpack: [],
        },
      };
      renderComponent(stats);
      // "Crossbowes" → strip 's' → "Crossbowe" → doesn't match "crossbow"
      await clickItemByText('Crossbowes');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('Crossbowes');
      expect(callArg).toContain('not found in database');
    });

    it('should show not found when plural is in the middle of the name (not at end)', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Potions of Healing'],
          backpack: [],
        },
      };
      renderComponent(stats);
      // "Potions of Healing" ends with 'g', not 's', so no plural fallback applies
      await clickItemByText('Potions of Healing');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('Potions of Healing');
      expect(callArg).toContain('not found in database');
    });
  });

  describe('popup item not found edge cases', () => {
    it('should show not found for item not in database', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Item',
          index: 'item',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Nonexistent Item'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Nonexistent Item');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('not found in database');
    });

    it('should show not found when equipment data is undefined', async () => {
      loadEquipment.mockResolvedValue(undefined);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Longsword'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Longsword');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('not found in database');
    });
  });
});

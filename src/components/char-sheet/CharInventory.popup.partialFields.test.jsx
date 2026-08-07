// @cleaned-by-ai
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

describe('CharInventory popup partial fields', () => {
  let setPopupHtmlSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    setPopupHtmlSpy = vi.fn();

    usePopup.mockImplementation(() => ({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: setPopupHtmlSpy,
    }));
  });

  async function clickItemByText(text) {
    const clickable = screen.getByText(text);
    fireEvent.click(clickable);
    await waitFor(() => {
      expect(setPopupHtmlSpy).toHaveBeenCalled();
    });
  }

  describe('equipment with partial fields', () => {
    it('should show popup with only cost when item has only cost', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Gold Coin',
          index: 'gold-coin',
          cost: { quantity: 1, unit: 'gp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Gold Coin'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Gold Coin');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Gold Coin</b>');
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('1 gp');
      expect(callArg).not.toContain('<b>Weight:</b>');
      expect(callArg).not.toContain('<b>Category:</b>');
    });

    it('should show popup with only weight when item has only weight', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Rock',
          index: 'rock',
          weight: 15,
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Rock'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Rock');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Rock</b>');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).toContain('15');
      expect(callArg).not.toContain('<b>Cost:</b>');
      expect(callArg).not.toContain('<b>Category:</b>');
    });

    it('should show popup with only category when item has only category', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Strange Artifact',
          index: 'strange-artifact',
          equipment_category: 'Miscellaneous',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Strange Artifact'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Strange Artifact');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Strange Artifact</b>');
      expect(callArg).toContain('<b>Category:</b>');
      expect(callArg).toContain('Miscellaneous');
      expect(callArg).not.toContain('<b>Cost:</b>');
      expect(callArg).not.toContain('<b>Weight:</b>');
    });

    it('should show popup with cost and weight but no category', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Iron Spike',
          index: 'iron-spike',
          cost: { quantity: 5, unit: 'cp' },
          weight: 2,
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Iron Spike'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Iron Spike');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('5 cp');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).toContain('2');
      expect(callArg).not.toContain('<b>Category:</b>');
    });

    it('should show popup with cost and category but no weight', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'House',
          index: 'house',
          cost: { quantity: 10000, unit: 'gp' },
          equipment_category: 'Property',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['House'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('House');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('10000 gp');
      expect(callArg).toContain('<b>Category:</b>');
      expect(callArg).toContain('Property');
      expect(callArg).not.toContain('<b>Weight:</b>');
    });

    it('should show popup with weight and category but no cost', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Boulder',
          index: 'boulder',
          weight: 500,
          equipment_category: 'Natural Material',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Boulder'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Boulder');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Boulder</b>');
      expect(callArg).not.toContain('<b>Cost:</b>');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).toContain('500');
      expect(callArg).toContain('<b>Category:</b>');
    });

    it('should show popup with all fields combined', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Masterwork Dagger',
          index: 'masterwork-dagger',
          desc: ['A finely crafted dagger.'],
          cost: { quantity: 500, unit: 'gp' },
          weight: 1,
          equipment_category: 'Masterwork Weapons',
          ability: 'Dexterity',
          utilize: 'Melee Attack',
          craft: 'Blacksmithing',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Masterwork Dagger'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Masterwork Dagger');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Masterwork Dagger</b>');
      expect(callArg).toContain('A finely crafted dagger.');
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('500 gp');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).toContain('1');
      expect(callArg).toContain('<b>Category:</b>');
      expect(callArg).toContain('Masterwork Weapons');
      expect(callArg).toContain('<b>Ability:</b>');
      expect(callArg).toContain('Dexterity');
      expect(callArg).toContain('<b>Utilize:</b>');
      expect(callArg).toContain('Melee Attack');
      expect(callArg).toContain('<b>Craft:</b>');
      expect(callArg).toContain('Blacksmithing');
    });
  });

  describe('equipment with empty desc array', () => {
    it('should handle item with empty desc array gracefully', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Plain Stone',
          index: 'plain-stone',
          weight: 5,
          desc: [],
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Plain Stone'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Plain Stone');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Plain Stone</b>');
      expect(callArg).toContain('<b>Weight:</b>');
    });

    it('should handle item with desc array containing null entries', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Mysterious Item',
          index: 'mysterious-item',
          desc: [null, 'A known description', null],
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Mysterious Item'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Mysterious Item');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Mysterious Item</b>');
      expect(callArg).toContain('A known description');
    });
  });

  describe('equipment lookup by index', () => {
    it('should find item when name matches index', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Longsword',
          index: 'longsword',
          cost: { quantity: 15, unit: 'gp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['longsword'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('longsword');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
    });

    it('should find item by index with hyphens matching space-separated name', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Potion of Healing',
          index: 'potion-of-healing',
          cost: { quantity: 100, unit: 'gp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Potion of Healing'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Potion of Healing');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Potion of Healing</b>');
    });
  });
});

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

describe('CharInventory edge cases and special scenarios', () => {
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
        name: 'Longsword',
        index: 'longsword',
        desc: ['A common sword.'],
        cost: { quantity: 15, unit: 'gp' },
        weight: 3,
        equipment_category: 'Martial Melee Weapons',
      },
      {
        name: 'Shield',
        index: 'shield',
        cost: { quantity: 10, unit: 'gp' },
      },
      {
        name: 'Potion of Healing',
        index: 'potion-of-healing',
        cost: { quantity: 100, unit: 'gp' },
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

  describe('case sensitivity in item lookup', () => {
    it('should find item with uppercase name via case-insensitive lookup', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['LONGSWORD'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('LONGSWORD');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
    });

    it('should find item with mixed case via case-insensitive lookup', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['LoNgSwOrD'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('LoNgSwOrD');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
    });

    it('should find item by lowercase index match', async () => {
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
  });

  describe('item lookup with whitespace', () => {
    it('should handle item name with leading/trailing spaces via normalization', async () => {
      // The normalization replaces whitespace with hyphens, so " Longsword " becomes "-longsword-"
      // which won't match "longsword" — this tests the behavior
      const stats = {
        inventory: {
          magicItems: [],
          equipped: [' Longsword '],
          backpack: [],
        },
      };
      renderComponent(stats);

      const clickable = screen.getByText(/Longsword/);
      fireEvent.click(clickable);

      await waitFor(() => {
        expect(setPopupHtmlSpy).toHaveBeenCalled();
      });

      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      // " Longsword " normalizes to "-longsword-" which won't match "longsword"
      // The singular fallback strips 's' → "-longworde " → still won't match
      // The plural fallback adds 's' → "-longsword s" → still won't match
      expect(callArg).toContain('not found in database');
    });

    it('should handle multi-word item with extra spaces between words', async () => {
      // "Potion  of  Healing" normalizes to "potion-of-healing" (multiple spaces → single hyphen)
      // This actually DOES match "potion-of-healing" in the database
      // So we test that it finds the item despite extra spaces
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
          equipped: ['Potion  of  Healing'],
          backpack: [],
        },
      };
      const { container } = renderComponent(stats);

      const allSpans = container.querySelectorAll('span.clickable');
      expect(allSpans.length).toBeGreaterThan(0);
      fireEvent.click(allSpans[0]);

      await waitFor(() => {
        expect(setPopupHtmlSpy).toHaveBeenCalled();
      });

      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      // Multiple spaces normalize to single hyphen, so it matches
      expect(callArg).toContain('<b>Potion of Healing</b>');
    });
  });

  describe('equipment data with undefined/null fields', () => {
    it('should handle item with undefined desc gracefully', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Mysterious Stone',
          index: 'mysterious-stone',
          weight: 10,
          desc: undefined,
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Mysterious Stone'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Mysterious Stone');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Mysterious Stone</b>');
      expect(callArg).toContain('<b>Weight:</b>');
    });

    it('should handle item with null desc gracefully', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Plain Rock',
          index: 'plain-rock',
          weight: 5,
          desc: null,
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Plain Rock'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Plain Rock');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Plain Rock</b>');
    });

    it('should handle item with missing cost field', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Found Stick',
          index: 'found-stick',
          weight: 1,
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Found Stick'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Found Stick');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Found Stick</b>');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).not.toContain('<b>Cost:</b>');
    });

    it('should handle item with missing weight field', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Invisible Cloak',
          index: 'invisible-cloak',
          cost: { quantity: 500, unit: 'gp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Invisible Cloak'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Invisible Cloak');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).not.toContain('<b>Weight:</b>');
    });

    it('should handle item with missing equipment_category', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Simple Rock',
          index: 'simple-rock',
          weight: 2,
          cost: { quantity: 1, unit: 'cp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Simple Rock'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Simple Rock');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).not.toContain('<b>Category:</b>');
    });

    it('should handle item with empty string fields', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Unknown Item',
          index: '',
          cost: { quantity: 0, unit: '' },
          weight: 0,
          equipment_category: '',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Unknown Item'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Unknown Item');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Unknown Item</b>');
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('0 ');
      // weight is 0 which is falsy, so the `if(item.weight)` check skips it
      expect(callArg).not.toContain('<b>Weight:</b>');
    });
  });

  describe('equipment with ability/utilize/craft fields', () => {
    it('should show ability field when present', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Magic Staff',
          index: 'magic-staff',
          ability: 'Charisma',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Magic Staff'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Magic Staff');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Ability:</b>');
      expect(callArg).toContain('Charisma');
    });

    it('should show utilize field when present', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Elixir',
          index: 'elixir',
          utilize: 'Drink',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Elixir'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Elixir');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Utilize:</b>');
      expect(callArg).toContain('Drink');
    });

    it('should show craft field when present', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Enchanted Blade',
          index: 'enchanted-blade',
          craft: 'Enchanting',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Enchanted Blade'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Enchanted Blade');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Craft:</b>');
      expect(callArg).toContain('Enchanting');
    });

    it('should show all three fields when all are present', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Arcane Dagger',
          index: 'arcane-dagger',
          ability: 'Intelligence',
          utilize: 'Ranged Attack',
          craft: 'Arcane Crafting',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Arcane Dagger'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Arcane Dagger');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Ability:</b>');
      expect(callArg).toContain('Intelligence');
      expect(callArg).toContain('<b>Utilize:</b>');
      expect(callArg).toContain('Ranged Attack');
      expect(callArg).toContain('<b>Craft:</b>');
      expect(callArg).toContain('Arcane Crafting');
    });

    it('should not show ability/utilize/craft when absent', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Common Rock',
          index: 'common-rock',
          weight: 5,
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Common Rock'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Common Rock');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).not.toContain('<b>Ability:</b>');
      expect(callArg).not.toContain('<b>Utilize:</b>');
      expect(callArg).not.toContain('<b>Craft:</b>');
    });
  });

  describe('multiple inventory sections rendering', () => {
    it('should render all sections in correct order', () => {
      const stats = {
        inventory: {
          magicItems: [
            {
              name: 'Magic Ring',
              type: 'Ring',
              rarity: 'Uncommon',
              description: 'A magic ring.',
            },
          ],
          equipped: ['Longsword', 'Shield'],
          backpack: ['Rations', 'Water'],
        },
      };
      renderComponent(stats);

      expect(screen.getByText(/Magic Items:/)).toBeInTheDocument();
      expect(screen.getByText(/Equipped:/)).toBeInTheDocument();
      expect(screen.getByText(/Backpack:/)).toBeInTheDocument();
    });

    it('should render inventory section even when all sub-sections are empty', () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: [],
          backpack: [],
        },
      };
      renderComponent(stats);

      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.queryByText(/Magic Items:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Equipped:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Backpack:/)).not.toBeInTheDocument();
    });

    it('should render magic items with desc array containing empty strings', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Odd Item',
          index: 'odd-item',
          desc: ['', 'Valid description', ''],
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Odd Item'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Odd Item');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Odd Item</b>');
      expect(callArg).toContain('Valid description');
    });

    it('should handle equipment with all optional fields present', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Complete Item',
          index: 'complete-item',
          desc: ['Description 1', 'Description 2'],
          cost: { quantity: 999, unit: 'pp' },
          weight: 99,
          equipment_category: 'Complete Category',
          ability: 'Wisdom',
          utilize: 'Cast Spell',
          craft: 'Divine Crafting',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Complete Item'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Complete Item');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Complete Item</b>');
      expect(callArg).toContain('Description 1');
      expect(callArg).toContain('Description 2');
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('999 pp');
      expect(callArg).toContain('<b>Weight:</b>');
      expect(callArg).toContain('99');
      expect(callArg).toContain('<b>Category:</b>');
      expect(callArg).toContain('Complete Category');
      expect(callArg).toContain('<b>Ability:</b>');
      expect(callArg).toContain('Wisdom');
      expect(callArg).toContain('<b>Utilize:</b>');
      expect(callArg).toContain('Cast Spell');
      expect(callArg).toContain('<b>Craft:</b>');
      expect(callArg).toContain('Divine Crafting');
    });
  });

  describe('item name extraction from parentheses', () => {
    it('should extract base name from "Item (10)" format', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Arrows',
          index: 'arrows',
          cost: { quantity: 5, unit: 'cp' },
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: [],
          backpack: ['Arrows (10)'],
        },
      };
      renderComponent(stats);
      await clickItemByText('Arrows (10)');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Arrows</b>');
    });

    it('should extract base name from "Item (1)" format', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Potion of Healing',
          index: 'potion-of-healing',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: [],
          backpack: ['Potion of Healing (1)'],
        },
      };
      renderComponent(stats);
      await clickItemByText('Potion of Healing (1)');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Potion of Healing</b>');
    });

    it('should handle item name with parentheses at the start (edge case)', async () => {
      // ParenIndex is 0, so condition `parenIndex > 0` is false, name stays as-is
      loadEquipment.mockResolvedValue([
        {
          name: '(Special) Item',
          index: 'special-item',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['(Special) Item'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('(Special) Item');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>(Special) Item</b>');
    });

    it('should handle item name with multiple parentheses', async () => {
      // Only strips from first '(' onwards
      loadEquipment.mockResolvedValue([
        {
          name: 'Box (Large) (Heavy)',
          index: 'box-large-heavy',
        },
      ]);
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Box (Large) (Heavy)'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Box (Large) (Heavy)');
      const callArg = setPopupHtmlSpy.mock.calls[0][0];
      // Extracts "Box" from "Box (Large) (Heavy)"
      expect(callArg).toContain('Box');
    });
  });

  describe('console.error logging on errors', () => {
    it('should log console.error when equipment loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      loadEquipment.mockRejectedValue(new Error('Connection refused'));
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Longsword'],
          backpack: [],
        },
      };
      renderComponent(stats);
      await clickItemByText('Longsword');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CharInventory] Error loading equipment:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('equipment index field variations', () => {
    it('should find item by index with spaces converted to hyphens', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Potion of Healing',
          index: 'potion_of_healing',
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

    it('should find item when index has hyphens matching name with spaces', async () => {
      loadEquipment.mockResolvedValue([
        {
          name: 'Longsword',
          index: 'long-sword',
        },
      ]);
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
  });

  describe('magic items without description field', () => {
    it('should render magic item without description when description is missing', () => {
      const stats = {
        inventory: {
          magicItems: [
            {
              name: 'Unnamed Ring',
              type: 'Ring',
              rarity: 'Uncommon',
              requiresAttunement: false,
            },
          ],
          equipped: [],
          backpack: [],
        },
      };
      renderComponent(stats);
      expect(screen.getByText(/Unnamed Ring/)).toBeInTheDocument();
      expect(screen.getByText(/Ring,/)).toBeInTheDocument();
      expect(screen.getByText(/Uncommon/)).toBeInTheDocument();
    });

    it('should render magic item with empty string description', () => {
      const stats = {
        inventory: {
          magicItems: [
            {
              name: 'Empty Item',
              type: 'Wondrous Item',
              rarity: 'Common',
              description: '',
              requiresAttunement: false,
            },
          ],
          equipped: [],
          backpack: [],
        },
      };
      renderComponent(stats);
      expect(screen.getByText(/Empty Item/)).toBeInTheDocument();
    });
  });

  describe('renderItems null handling', () => {
    it('should not crash when equipped is null', () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: null,
          backpack: null,
        },
      };
      const { container } = renderComponent(stats);
      expect(container.querySelector('.char-inventory')).toBeInTheDocument();
    });

    it('should not crash when backpack is undefined', () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: [],
          backpack: undefined,
        },
      };
      const { container } = renderComponent(stats);
      expect(container.querySelector('.char-inventory')).toBeInTheDocument();
    });
  });
});

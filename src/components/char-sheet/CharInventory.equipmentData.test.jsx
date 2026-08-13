import { describe, it, expect, vi } from 'vitest';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory equipment data edge cases', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('undefined/null fields', () => {
    it('should handle item with undefined desc gracefully', async () => {
      helpers.setup([
        { name: 'Mysterious Stone', index: 'mysterious-stone', weight: 10, desc: undefined },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Mysterious Stone'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Mysterious Stone');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Mysterious Stone</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Weight:</b>');
    });

    it('should handle item with null desc gracefully', async () => {
      helpers.setup([
        { name: 'Plain Rock', index: 'plain-rock', weight: 5, desc: null },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Plain Rock'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Plain Rock');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Plain Rock</b>');
    });

    it('should handle item with missing cost field', async () => {
      helpers.setup([
        { name: 'Found Stick', index: 'found-stick', weight: 1 },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Found Stick'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Found Stick');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Found Stick</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Weight:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).not.toContain('<b>Cost:</b>');
    });

    it('should handle item with missing weight field', async () => {
      helpers.setup([
        { name: 'Invisible Cloak', index: 'invisible-cloak', cost: { quantity: 500, unit: 'gp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Invisible Cloak'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Invisible Cloak');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Cost:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).not.toContain('<b>Weight:</b>');
    });

    it('should handle item with missing equipment_category', async () => {
      helpers.setup([
        { name: 'Simple Rock', index: 'simple-rock', weight: 2, cost: { quantity: 1, unit: 'cp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Simple Rock'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Simple Rock');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Cost:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Weight:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).not.toContain('<b>Category:</b>');
    });

    it('should handle item with empty string fields', async () => {
      helpers.setup([
        { name: 'Unknown Item', index: '', cost: { quantity: 0, unit: '' }, weight: 0, equipment_category: '' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Unknown Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Unknown Item');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Unknown Item</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Cost:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('0 ');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).not.toContain('<b>Weight:</b>');
    });
  });

  describe('ability/utilize/craft fields', () => {
    it('should show ability field when present', async () => {
      helpers.setup([
        { name: 'Magic Staff', index: 'magic-staff', ability: 'Charisma' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Magic Staff'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Magic Staff');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Ability:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('Charisma');
    });

    it('should show utilize field when present', async () => {
      helpers.setup([
        { name: 'Elixir', index: 'elixir', utilize: 'Drink' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Elixir'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Elixir');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Utilize:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('Drink');
    });

    it('should show craft field when present', async () => {
      helpers.setup([
        { name: 'Enchanted Blade', index: 'enchanted-blade', craft: 'Enchanting' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Enchanted Blade'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Enchanted Blade');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Craft:</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('Enchanting');
    });

    it('should show all three fields when all are present', async () => {
      helpers.setup([
        { name: 'Arcane Dagger', index: 'arcane-dagger', ability: 'Intelligence', utilize: 'Ranged Attack', craft: 'Arcane Crafting' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Arcane Dagger'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Arcane Dagger');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Ability:</b>');
      expect(callArg).toContain('Intelligence');
      expect(callArg).toContain('<b>Utilize:</b>');
      expect(callArg).toContain('Ranged Attack');
      expect(callArg).toContain('<b>Craft:</b>');
      expect(callArg).toContain('Arcane Crafting');
    });

    it('should not show ability/utilize/craft when absent', async () => {
      helpers.setup([
        { name: 'Common Rock', index: 'common-rock', weight: 5 },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Common Rock'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Common Rock');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).not.toContain('<b>Ability:</b>');
      expect(callArg).not.toContain('<b>Utilize:</b>');
      expect(callArg).not.toContain('<b>Craft:</b>');
    });

    it('should handle equipment with all optional fields present', async () => {
      helpers.setup([
        {
          name: 'Complete Item', index: 'complete-item',
          desc: ['Description 1', 'Description 2'],
          cost: { quantity: 999, unit: 'pp' }, weight: 99,
          equipment_category: 'Complete Category',
          ability: 'Wisdom', utilize: 'Cast Spell', craft: 'Divine Crafting',
        },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Complete Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Complete Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
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

  describe('console.error logging', () => {
    it('should log console.error when equipment loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      helpers.setup(null);
      // Override the mock to reject
      const { loadEquipment } = await import('../../services/ui/dataLoader.js');
      loadEquipment.mockRejectedValue(new Error('Connection refused'));
      const stats = { inventory: { magicItems: [], equipped: ['Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CharInventory] Error loading equipment:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });
});

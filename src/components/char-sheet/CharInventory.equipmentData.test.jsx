// @improved-by-ai
// CharInventory equipment data edge cases
//
// Tests in this file cover behavior NOT already verified in other CharInventory test files:
//   - console.error + popup error message on equipment loading failure (unique behavioral assertion)
//   - weight: 0 (falsy but valid — not caught by other tests)
//   - desc as non-array string (not tested elsewhere; code only handles array desc)
//   - ability/utilize/craft with empty string values (not tested elsewhere)
//
// Tests removed as duplicates already covered in:
//   CharInventory.popup.partialFields.test.jsx - partial fields (only cost, only weight, only category,
//     cost+weight, cost+category, weight+cost, all combined), empty desc array, desc with null entries
//   CharInventory.popup.test.jsx - ability/utilize/craft with full values, error message in popup
//   CharInventory.rendering.test.jsx - desc array with empty strings
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory equipment data edge cases', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('equipment loading failure', () => {
    it('should log console.error and show error message in popup when equipment loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      helpers.setup();
      const { loadEquipment } = await import('../../services/ui/dataLoader.js');
      loadEquipment.mockRejectedValue(new Error('Connection refused'));
      const stats = { inventory: { magicItems: [], equipped: ['Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CharInventory] Error loading equipment:',
        expect.any(Error)
      );
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
      expect(callArg).toContain('Error loading item details');
      expect(callArg).toContain('Connection refused');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('falsy but valid field values', () => {
    it('should omit weight when it is 0 (falsy check in source)', async () => {
      helpers.setup([
        { name: 'Feather', index: 'feather', weight: 0, cost: { quantity: 0, unit: 'gp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Feather'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Feather');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Feather</b>');
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).not.toContain('<b>Weight:</b>');
    });

    it('should display cost with zero quantity and empty unit', async () => {
      helpers.setup([
        { name: 'Dust', index: 'dust', cost: { quantity: 0, unit: '' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Dust'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Dust');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Dust</b>');
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).toContain('0 ');
    });
  });

  describe('ability/utilize/craft with empty string values', () => {
    it('should omit ability field when it is an empty string (falsy check in source)', async () => {
      helpers.setup([
        { name: 'Empty Ability Item', index: 'empty-ability-item', ability: '' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Empty Ability Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Empty Ability Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Empty Ability Item</b>');
      expect(callArg).not.toContain('<b>Ability:</b>');
    });

    it('should omit utilize field when it is an empty string (falsy check in source)', async () => {
      helpers.setup([
        { name: 'Empty Utilize Item', index: 'empty-utilize-item', utilize: '' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Empty Utilize Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Empty Utilize Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Empty Utilize Item</b>');
      expect(callArg).not.toContain('<b>Utilize:</b>');
    });

    it('should omit craft field when it is an empty string (falsy check in source)', async () => {
      helpers.setup([
        { name: 'Empty Craft Item', index: 'empty-craft-item', craft: '' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Empty Craft Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Empty Craft Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Empty Craft Item</b>');
      expect(callArg).not.toContain('<b>Craft:</b>');
    });
  });

  describe('desc as non-array', () => {
    it('should not render description when desc is a string instead of array', async () => {
      helpers.setup([
        { name: 'String Desc Item', index: 'string-desc-item', desc: 'A description string' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['String Desc Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('String Desc Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>String Desc Item</b>');
      expect(callArg).not.toContain('A description string');
    });
  });
});

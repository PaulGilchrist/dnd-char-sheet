import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory item lookup', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('case sensitivity', () => {
    it('should find item with uppercase name via case-insensitive lookup', async () => {
      const stats = { inventory: { magicItems: [], equipped: ['LONGSWORD'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('LONGSWORD');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Longsword</b>');
    });

    it('should find item with mixed case via case-insensitive lookup', async () => {
      const stats = { inventory: { magicItems: [], equipped: ['LoNgSwOrD'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('LoNgSwOrD');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Longsword</b>');
    });

    it('should find item by lowercase index match', async () => {
      const stats = { inventory: { magicItems: [], equipped: ['longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('longsword');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Longsword</b>');
    });
  });

  describe('whitespace handling', () => {
    it('should handle item name with leading/trailing spaces via normalization', async () => {
      const stats = { inventory: { magicItems: [], equipped: [' Longsword '], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('not found in database');
    });

    it('should handle multi-word item with extra spaces between words', async () => {
      helpers.setup([
        { name: 'Potion of Healing', index: 'potion-of-healing', cost: { quantity: 100, unit: 'gp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Potion  of  Healing'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText(/Potion/);
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Potion of Healing</b>');
    });

    it('should handle item name that is only whitespace', async () => {
      helpers.setup([
        { name: 'Longsword', index: 'longsword' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['   '], backpack: [] } };
      helpers.renderComponent(stats);
      const clickable = screen.getByText((content, element) => element && element.classList.contains('clickable') && content.trim() === '');
      fireEvent.click(clickable);
      await waitFor(() => { expect(helpers.setPopupHtmlSpy).toHaveBeenCalled(); });
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('not found in database');
    });

    it('should handle tab characters in item name', async () => {
      helpers.setup([
        { name: 'Potion of Healing', index: 'potion-of-healing' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Potion\tof\thealing'], backpack: [] } };
      helpers.renderComponent(stats);
      const clickable = screen.getByText(/Potion/);
      fireEvent.click(clickable);
      await waitFor(() => { expect(helpers.setPopupHtmlSpy).toHaveBeenCalled(); });
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Potion of Healing</b>');
    });
  });

  describe('index field variations', () => {
    it('should find item by index with spaces converted to hyphens', async () => {
      helpers.setup([
        { name: 'Potion of Healing', index: 'potion_of_healing' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Potion of Healing'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Potion of Healing');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Potion of Healing</b>');
    });

    it('should find item when index has hyphens matching name with spaces', async () => {
      helpers.setup([
        { name: 'Longsword', index: 'long-sword' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Longsword</b>');
    });
  });

  describe('plural/singular fallback', () => {
    it('should find item when searching plural and singular matches', async () => {
      helpers.setup([
        { name: 'Arrow', index: 'arrow', weight: 0.5 },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Arrows'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Arrows');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Arrow</b>');
    });

    it('should find item when searching singular and plural matches', async () => {
      helpers.setup([
        { name: 'Arrows', index: 'arrows', weight: 0.5 },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Arrow'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Arrow');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Arrows</b>');
    });
  });

  describe('parentheses extraction', () => {
    it('should extract base name from "Item (10)" format', async () => {
      helpers.setup([
        { name: 'Arrows', index: 'arrows', cost: { quantity: 5, unit: 'cp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: [], backpack: ['Arrows (10)'] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Arrows (10)');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Arrows</b>');
    });

    it('should extract base name from "Item (1)" format', async () => {
      helpers.setup([
        { name: 'Potion of Healing', index: 'potion-of-healing' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: [], backpack: ['Potion of Healing (1)'] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Potion of Healing (1)');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Potion of Healing</b>');
    });

    it('should handle item name with parentheses at the start (edge case)', async () => {
      helpers.setup([
        { name: '(Special) Item', index: 'special-item' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['(Special) Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('(Special) Item');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>(Special) Item</b>');
    });

    it('should handle item name with multiple parentheses', async () => {
      helpers.setup([
        { name: 'Box (Large) (Heavy)', index: 'box-large-heavy' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Box (Large) (Heavy)'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Box (Large) (Heavy)');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('Box');
    });
  });

  describe('empty equipment data', () => {
    it('should show "not found in database" when equipment array is empty', async () => {
      helpers.setup([]);
      const stats = { inventory: { magicItems: [], equipped: ['Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('not found in database');
    });

    it('should show "not found in database" when equipment array is null', async () => {
      helpers.setup(null);
      const stats = { inventory: { magicItems: [], equipped: ['Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('not found in database');
    });
  });
});

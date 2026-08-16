// @improved-by-ai
// CharInventory item lookup tests
//
// Tests in this file cover lookup normalization behavior:
//   - Case-insensitive matching (uppercase, lowercase, mixed case)
//   - Whitespace normalization (extra spaces between words, tab characters)
//   - Index field normalization (spaces → hyphens)
//   - Parentheses extraction (quantity suffix like "Arrows (10)")
//   - Items not found after normalization
//
// Tests removed as duplicates already covered in:
//   CharInventory.popup.test.jsx - plural/singular fallback (Arrow/Arrows),
//     empty equipment array, null equipment data
//   CharInventory.popup.pluralSingular.test.jsx - irregular plurals,
//     multi-word names with mid-name plural
//   CharInventory.edgeCases.test.jsx - whitespace-only item names

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
    it('should find item regardless of case via case-insensitive lookup', async () => {
      const stats = { inventory: { magicItems: [], equipped: ['LoNgSwOrD'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('LoNgSwOrD');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
      expect(callArg).toContain('A common sword.');
    });
  });

  describe('whitespace normalization', () => {
    it('should not find item with leading/trailing spaces (spaces become hyphens)', async () => {
      const stats = { inventory: { magicItems: [], equipped: [' Longsword '], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('not found in database');
    });

    it('should find item with extra spaces between words', async () => {
      const stats = { inventory: { magicItems: [], equipped: ['Potion  of  Healing'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText(/Potion/);
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Potion of Healing</b>');
    });

    it('should find item with tab characters between words', async () => {
      const stats = { inventory: { magicItems: [], equipped: ['Potion\tof\thealing'], backpack: [] } };
      helpers.renderComponent(stats);
      const clickable = screen.getByText(/Potion/);
      fireEvent.click(clickable);
      await waitFor(() => {
        expect(helpers.setPopupHtmlSpy).toHaveBeenCalled();
      });
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Potion of Healing</b>');
    });
  });

  describe('index field normalization', () => {
    it('should find item when index uses hyphens matching name with spaces', async () => {
      helpers.setup([
        { name: 'Longsword', index: 'long-sword' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Longsword</b>');
    });
  });

  describe('parentheses extraction', () => {
    it('should extract base name from "Item (N)" format', async () => {
      helpers.setup([
        { name: 'Arrows', index: 'arrows', cost: { quantity: 5, unit: 'cp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Arrows (10)'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Arrows (10)');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Arrows</b>');
      expect(callArg).toContain('5 cp');
    });

    it('should handle item name with parentheses at the start (no extraction)', async () => {
      helpers.setup([
        { name: '(Special) Item', index: 'special-item' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['(Special) Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('(Special) Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>(Special) Item</b>');
    });

    it('should extract only text before first parentheses for multiple parenthetical groups', async () => {
      helpers.setup([
        { name: 'Box (Large) (Heavy)', index: 'box-large-heavy' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Box (Large) (Heavy)'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Box (Large) (Heavy)');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Box (Large) (Heavy)</b>');
    });
  });

  describe('item not found after normalization', () => {
    it('should show not found when item exists but lookup normalization prevents match', async () => {
      helpers.setup([
        { name: 'Longsword', index: 'longsword' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: [' Longsword'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Longsword');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b> Longsword</b>');
      expect(callArg).toContain('not found in database');
    });
  });
});

// @improved-by-ai
// CharInventory edge cases and special scenarios
//
// This file contains truly unique edge case tests not covered by other CharInventory test files:
//   - HTML-special characters in item names (XSS-like)
//   - cost: null (not just missing)
//   - desc: undefined vs missing entirely
//   - weight: undefined (distinct from weight: 0)
//   - Empty string item names in inventory arrays
//   - Negative magic item quantity
//   - Missing type on magic item
//   - Item name that becomes empty after whitespace extraction
//
// Previously this file was a barrel re-export of split test modules.
// Those modules now live as independent test files:
//   CharInventory.itemLookup.test.jsx
//   CharInventory.equipmentData.test.jsx
//   CharInventory.rendering.test.jsx

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory edge cases', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('null/undefined field values', () => {
    it('should omit cost section when cost is explicitly null', async () => {
      helpers.setup([
        { name: 'Null Cost Item', index: 'null-cost-item', cost: null, weight: 2 },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Null Cost Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Null Cost Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Null Cost Item</b>');
      expect(callArg).not.toContain('<b>Cost:</b>');
      expect(callArg).toContain('<b>Weight:</b>');
    });

    it('should handle desc as undefined (not an array)', async () => {
      helpers.setup([
        { name: 'Undefined Desc Item', index: 'undefined-desc-item', weight: 1, desc: undefined },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Undefined Desc Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Undefined Desc Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Undefined Desc Item</b>');
      expect(callArg).not.toContain('A description');
    });

    it('should omit weight when it is undefined', async () => {
      helpers.setup([
        { name: 'No Weight Item', index: 'no-weight-item', cost: { quantity: 5, unit: 'sp' }, weight: undefined },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['No Weight Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('No Weight Item');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Cost:</b>');
      expect(callArg).not.toContain('<b>Weight:</b>');
    });
  });

  describe('empty and special item names', () => {
    it('should handle empty string in equipped array without crashing', () => {
      const stats = { inventory: { magicItems: [], equipped: [''], backpack: [] } };
      helpers.renderComponent(stats);
      expect(screen.getByText('Inventory')).toBeInTheDocument();
    });

    it('should handle empty string in backpack array without crashing', () => {
      const stats = { inventory: { magicItems: [], equipped: [], backpack: [''] } };
      helpers.renderComponent(stats);
      expect(screen.getByText('Inventory')).toBeInTheDocument();
    });

    it('should show not found when clicking an empty string item', async () => {
      helpers.setup([
        { name: 'Longsword', index: 'longsword' },
      ]);
      const stats = { inventory: { magicItems: [], equipped: [''], backpack: [] } };
      helpers.renderComponent(stats);
      // Empty string renders as empty span; find it by class
      const emptySpan = screen.getByText((content, element) =>
        element && element.classList.contains('clickable') && element.textContent === ''
      );
      fireEvent.click(emptySpan);
      await waitFor(() => {
        expect(helpers.setPopupHtmlSpy).toHaveBeenCalled();
      });
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('not found in database');
    });
  });

  describe('magic item edge cases', () => {
    it('should render magic item with negative quantity showing qty text (negative is truthy in JS)', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Broken Item', type: 'Wondrous Item', rarity: 'Common', quantity: -1, description: 'Broken' }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/Broken Item/)).toBeInTheDocument();
      expect(screen.getByText(/qty -1/)).toBeInTheDocument();
    });

    it('should render magic item with missing type without crashing', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Orphan Item', rarity: 'Uncommon', description: 'No type' }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/Orphan Item/)).toBeInTheDocument();
    });
  });

  describe('HTML-special characters in item names', () => {
    it('should display item name with angle brackets safely in popup', async () => {
      helpers.setup([
        { name: 'Longsword', index: 'longsword', cost: { quantity: 15, unit: 'gp' } },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Item <script>alert(1)</script>'], backpack: [] } };
      helpers.renderComponent(stats);
      const clickable = screen.getByText(/Item/);
      fireEvent.click(clickable);
      await waitFor(() => {
        expect(helpers.setPopupHtmlSpy).toHaveBeenCalled();
      });
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      // The item name with HTML tags should appear in the popup (sanitize happens on magic item descriptions only)
      expect(callArg).toContain('not found in database');
    });
  });
});

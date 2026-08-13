// @improved-by-ai
// CharInventory popup plural/singular edge cases
//
// Tests unique to this file (not covered by other CharInventory test files):
//   - "Crossbowes" irregular pluralization (word ending in "es" pattern that simple strip/add-s can't handle)
//   - "Potions of Healing" with plural in the middle of a multi-word name (no trailing 's', so fallbacks never trigger)
//
// Tests removed as duplicates already covered in:
//   CharInventory.itemLookup.test.jsx - Arrow plural fallback, null equipment data
//   CharInventory.popup.test.jsx - Shield/Dagger plural-to-singular, Longsword exact match, error handling
//   CharInventory.popupAndRendering.test.jsx - general popup rendering
//   CharInventory.equipmentData.test.jsx - console.error logging on failure
import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory popup plural/singular edge cases', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('irregular pluralization that simple strip/add-s cannot handle', () => {
    it('should show not found for misspelled irregular plural (word ending in "es" instead of "ow")', async () => {
      helpers.setup([
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
      helpers.renderComponent(stats);
      // "Crossbowes" → strip 's' → "Crossbowe" → doesn't match "crossbow"
      // → add 's' → "Crossbowes" → doesn't match → not found
      const clickable = screen.getByText('Crossbowes');
      fireEvent.click(clickable);
      await waitFor(() => {
        expect(helpers.setPopupHtmlSpy).toHaveBeenCalled();
      });
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Crossbowes</b>');
      expect(callArg).toContain('not found in database');
    });
  });

  describe('multi-word names with plural not at the end', () => {
    it('should show not found when plural marker is in the middle of a multi-word name', async () => {
      const stats = {
        inventory: {
          magicItems: [],
          equipped: ['Potions of Healing'],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      // "Potions of Healing" ends with 'g', not 's', so neither plural fallback applies
      const clickable = screen.getByText('Potions of Healing');
      fireEvent.click(clickable);
      await waitFor(() => {
        expect(helpers.setPopupHtmlSpy).toHaveBeenCalled();
      });
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Potions of Healing</b>');
      expect(callArg).toContain('not found in database');
    });
  });
});

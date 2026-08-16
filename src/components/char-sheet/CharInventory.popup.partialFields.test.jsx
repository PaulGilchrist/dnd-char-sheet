// @improved-by-ai
// CharInventory popup partial fields
//
// Tests in this file cover partial field combinations in popup rendering:
//   - Items with only cost (no weight, no category)
//   - Items with only weight (no cost, no category)
//   - Items with only category (no cost, no weight)
//   - Items with cost + weight (no category)
//   - Items with cost + category (no weight)
//   - Items with weight + category (no cost)
//   - Items with NO partial fields at all
//
// Tests removed as duplicates already covered in:
//   CharInventory.popup.test.jsx - all fields combined (cost+weight+category+ability+utilize+craft+desc)
//   CharInventory.equipmentData.test.jsx - weight:0 (falsy), ability/utilize/craft: '' (empty string)
//   CharInventory.edgeCases.test.jsx - cost: null, weight: undefined, desc: undefined

import { describe, it, expect, beforeEach } from 'vitest';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory popup partial fields', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('partial field combinations', () => {
    const testCases = [
      { name: 'Gold Coin', index: 'gold-coin', fields: { cost: { quantity: 1, unit: 'gp' } }, present: ['Cost:', '1 gp'], absent: ['Weight:', 'Category:'] },
      { name: 'Rock', index: 'rock', fields: { weight: 15 }, present: ['Weight:', '15'], absent: ['Cost:', 'Category:'] },
      { name: 'Strange Artifact', index: 'strange-artifact', fields: { equipment_category: 'Miscellaneous' }, present: ['Category:', 'Miscellaneous'], absent: ['Cost:', 'Weight:'] },
      { name: 'Iron Spike', index: 'iron-spike', fields: { cost: { quantity: 5, unit: 'cp' }, weight: 2 }, present: ['Cost:', '5 cp', 'Weight:', '2'], absent: ['Category:'] },
      { name: 'House', index: 'house', fields: { cost: { quantity: 10000, unit: 'gp' }, equipment_category: 'Property' }, present: ['Cost:', '10000 gp', 'Category:', 'Property'], absent: ['Weight:'] },
      { name: 'Boulder', index: 'boulder', fields: { weight: 500, equipment_category: 'Natural Material' }, present: ['Weight:', '500', 'Category:', 'Natural Material'], absent: ['Cost:'] },
    ];

    for (const tc of testCases) {
      it(`should show popup with ${Object.keys(tc.fields).join(' and ')} partial fields`, async () => {
        helpers.setup([{ name: tc.name, index: tc.index, ...tc.fields }]);
        const stats = { inventory: { magicItems: [], equipped: [tc.name], backpack: [] } };
        helpers.renderComponent(stats);
        await helpers.clickItemByText(tc.name);
        const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
        expect(callArg).toContain(`<b>${tc.name}</b>`);
        for (const text of tc.present) {
          expect(callArg).toContain(text);
        }
        for (const text of tc.absent) {
          expect(callArg).not.toContain(`<b>${text}</b>`);
        }
      });
    }
  });

  describe('item with no partial fields', () => {
    it('should show popup with item name when item has no partial fields', async () => {
      helpers.setup([{ name: 'Mystery Orb', index: 'mystery-orb' }]);
      const stats = { inventory: { magicItems: [], equipped: ['Mystery Orb'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Mystery Orb');
      const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
      expect(callArg).toContain('<b>Mystery Orb</b>');
      expect(callArg).not.toContain('<b>Cost:</b>');
      expect(callArg).not.toContain('<b>Weight:</b>');
      expect(callArg).not.toContain('<b>Category:</b>');
    });
  });
});

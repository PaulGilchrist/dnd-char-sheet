// @improved-by-ai
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory popup content and rendering', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  it('should show full item details in popup HTML when clicking an equipped item', async () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: ['Longsword'],
        backpack: [],
      },
    };
    helpers.renderComponent(stats);
    await helpers.clickItemByText('Longsword');
    const callArg = helpers.setPopupHtmlSpy.mock.calls[0][0];
    expect(callArg).toContain('<b>Longsword</b>');
    expect(callArg).toContain('<b>Cost:</b>');
    expect(callArg).toContain('15 gp');
    expect(callArg).toContain('<b>Weight:</b>');
    expect(callArg).toContain('3');
    expect(callArg).toContain('<b>Category:</b>');
    expect(callArg).toContain('Martial Melee Weapons');
  });

  it('should not render clickable class on magic items', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Magic Sword',
            type: 'Weapon',
            rarity: 'Uncommon',
            description: 'A magical sword.',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    helpers.renderComponent(stats);
    const magicItem = screen.getByText(/Magic Sword/);
    expect(magicItem).not.toHaveClass('clickable');
  });

  it('should render inventory section header', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: [],
        backpack: [],
      },
    };
    helpers.renderComponent(stats);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });
});

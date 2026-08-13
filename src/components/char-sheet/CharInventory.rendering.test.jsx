import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { createRenderComponent } from './charInventoryTestHelpers.jsx';

describe('CharInventory rendering', () => {
  let helpers;

  beforeEach(() => {
    helpers = createRenderComponent();
    helpers.setup();
  });

  describe('section rendering', () => {
    it('should render all sections in correct order', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Magic Ring', type: 'Ring', rarity: 'Uncommon', description: 'A magic ring.' }],
          equipped: ['Longsword', 'Shield'],
          backpack: ['Rations', 'Water'],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/Magic Items:/)).toBeInTheDocument();
      expect(screen.getByText(/Equipped:/)).toBeInTheDocument();
      expect(screen.getByText(/Backpack:/)).toBeInTheDocument();
    });

    it('should render inventory section even when all sub-sections are empty', () => {
      const stats = { inventory: { magicItems: [], equipped: [], backpack: [] } };
      helpers.renderComponent(stats);
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.queryByText(/Magic Items:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Equipped:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Backpack:/)).not.toBeInTheDocument();
    });

    it('should render magic items with desc array containing empty strings', async () => {
      helpers.setup([
        { name: 'Odd Item', index: 'odd-item', desc: ['', 'Valid description', ''] },
      ]);
      const stats = { inventory: { magicItems: [], equipped: ['Odd Item'], backpack: [] } };
      helpers.renderComponent(stats);
      await helpers.clickItemByText('Odd Item');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('<b>Odd Item</b>');
      expect(helpers.setPopupHtmlSpy.mock.calls[0][0]).toContain('Valid description');
    });

    it('should not crash when equipped is null', () => {
      const stats = { inventory: { magicItems: [], equipped: null, backpack: null } };
      const { container } = helpers.renderComponent(stats);
      expect(container.querySelector('.char-inventory')).toBeInTheDocument();
    });

    it('should not crash when backpack is undefined', () => {
      const stats = { inventory: { magicItems: [], equipped: [], backpack: undefined } };
      const { container } = helpers.renderComponent(stats);
      expect(container.querySelector('.char-inventory')).toBeInTheDocument();
    });
  });

  describe('magic items', () => {
    it('should render magic item without description when description is missing', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Unnamed Ring', type: 'Ring', rarity: 'Uncommon', requiresAttunement: false }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/Unnamed Ring/)).toBeInTheDocument();
      expect(screen.getByText(/Ring,/)).toBeInTheDocument();
      expect(screen.getByText(/Uncommon/)).toBeInTheDocument();
    });

    it('should render magic item with empty string description', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Empty Item', type: 'Wondrous Item', rarity: 'Common', description: '', requiresAttunement: false }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/Empty Item/)).toBeInTheDocument();
    });

    it('should display "requires attunement" when requiresAttunement is true without custom requirements', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Ring of Protection', type: 'Ring', rarity: 'Rare', requiresAttunement: true, description: 'AC +1' }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/requires attunement/)).toBeInTheDocument();
    });

    it('should display custom attunement requirements when provided', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Armor of Invulnerability', type: 'Armor', subtype: 'Heavy', rarity: 'Legendary', requiresAttunement: true, attunementRequirements: 'by a barbarian', description: 'Immune to damage' }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/by a barbarian/)).toBeInTheDocument();
    });

    it('should display magic item quantity when present', () => {
      const stats = {
        inventory: {
          magicItems: [{ name: 'Potion of Healing', type: 'Potion', rarity: 'Common', quantity: 3, description: 'Heals 2d4+2 HP' }],
          equipped: [],
          backpack: [],
        },
      };
      helpers.renderComponent(stats);
      expect(screen.getByText(/qty 3/)).toBeInTheDocument();
    });
  });
});

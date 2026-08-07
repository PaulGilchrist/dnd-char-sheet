// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
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

function renderComponent(playerStats) {
  return render(<CharInventory playerStats={playerStats} />);
}

describe('CharInventory magic items edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usePopup.mockImplementation(() => ({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
  });

  it('should render magic item with requiresAttunement true and custom attunementRequirements', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Cloak of Protection',
            type: 'Armor',
            subtype: 'Cloak',
            rarity: 'Rare',
            description: 'A protective cloak.',
            requiresAttunement: true,
            attunementRequirements: 'Only for rogues',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Cloak of Protection/)).toBeInTheDocument();
    expect(screen.getByText(/Rare/)).toBeInTheDocument();
    expect(screen.getByText(/Only for rogues/)).toBeInTheDocument();
    expect(screen.queryByText(/requires attunement/)).not.toBeInTheDocument();
  });

  it('should render magic item without attunement text when requiresAttunement is false', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Ring of Spell Storing',
            type: 'Ring',
            rarity: 'Rare',
            description: 'Stores spells.',
            requiresAttunement: false,
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Ring of Spell Storing/)).toBeInTheDocument();
    expect(screen.getByText(/Rare/)).toBeInTheDocument();
    expect(screen.queryByText(/requires attunement/)).not.toBeInTheDocument();
  });

  it('should render magic item without subtype parentheses when subtype is missing', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Winged Boots',
            type: 'Armor',
            rarity: 'Rare',
            description: 'Allows flying.',
            requiresAttunement: false,
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Winged Boots/)).toBeInTheDocument();
    expect(screen.getByText(/Rare/)).toBeInTheDocument();
  });

  it('should render magic item with empty string attunementRequirements as empty parentheses', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Boots of Speed',
            type: 'Armor',
            subtype: 'Boots',
            rarity: 'Uncommon',
            description: 'Increases speed.',
            requiresAttunement: true,
            attunementRequirements: '',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Boots of Speed/)).toBeInTheDocument();
    expect(screen.getByText(/Uncommon/)).toBeInTheDocument();
  });

  it('should render multiple magic items with correct separators', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Fire Shield',
            type: 'Weapon',
            rarity: 'Uncommon',
            description: 'Creates a shield of fire.',
            requiresAttunement: false,
          },
          {
            name: 'Ice Storm Staff',
            type: 'Weapon',
            subtype: 'Staff',
            rarity: 'Rare',
            description: 'Creates a storm of ice.',
            requiresAttunement: true,
            attunementRequirements: 'Spellcaster',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Fire Shield/)).toBeInTheDocument();
    expect(screen.getByText(/Ice Storm Staff/)).toBeInTheDocument();
    expect(screen.getByText(/Spellcaster/)).toBeInTheDocument();
  });

  it('should render magic item description with HTML tags via sanitizeHtml', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Staff of Power',
            type: 'Weapon',
            subtype: 'Staff',
            rarity: 'Legendary',
            description: '<b>Legendary Staff</b> with <i>great power</i>.',
            requiresAttunement: true,
            attunementRequirements: 'Sorcerer or Wizard',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Staff of Power/)).toBeInTheDocument();
    expect(screen.getByText(/Sorcerer or Wizard/)).toBeInTheDocument();
  });

  it('should render magic items with quantity display', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Potion of Fire Breath',
            quantity: 3,
            type: 'Potion',
            rarity: 'Uncommon',
            description: 'Grants fire breath.',
            requiresAttunement: false,
          },
          {
            name: 'Potion of Invisibility',
            quantity: 1,
            type: 'Potion',
            rarity: 'Rare',
            description: 'Makes you invisible.',
            requiresAttunement: false,
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/qty 3/)).toBeInTheDocument();
    expect(screen.getByText(/qty 1/)).toBeInTheDocument();
  });

  it('should render magic items with both subtype and attunement requirements', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Armor of Resistance',
            type: 'Armor',
            subtype: 'Chain Mail',
            rarity: 'Uncommon',
            description: 'Resistant to fire.',
            requiresAttunement: true,
            attunementRequirements: 'Requires attunement by a barbarian',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);
    expect(screen.getByText(/Armor of Resistance/)).toBeInTheDocument();
    expect(screen.getByText(/Chain Mail/)).toBeInTheDocument();
    expect(screen.getByText(/Requires attunement by a barbarian/)).toBeInTheDocument();
  });
});

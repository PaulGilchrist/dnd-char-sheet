import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
import { loadEquipment } from '../../services/ui/dataLoader.js';

function renderComponent(playerStats) {
  return render(<CharInventory playerStats={playerStats} />);
}

describe('CharInventory popup visibility and interaction', () => {
  let setPopupHtmlSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    setPopupHtmlSpy = vi.fn();

    usePopup.mockImplementation(() => ({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: setPopupHtmlSpy,
    }));

    loadEquipment.mockResolvedValue([
      {
        name: 'Longsword',
        index: 'longsword',
        cost: { quantity: 15, unit: 'gp' },
      },
    ]);
  });

  it('should render Popup component when setPopupHtml is called with HTML content', async () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: ['Longsword'],
        backpack: [],
      },
    };
    renderComponent(stats);

    const clickable = screen.getByText('Longsword');
    fireEvent.click(clickable);

    await waitFor(() => {
      expect(setPopupHtmlSpy).toHaveBeenCalled();
    });

    const popupHtmlContent = setPopupHtmlSpy.mock.calls[0][0];
    expect(popupHtmlContent).toContain('<b>Longsword</b>');
  });

  it('should render clickable class on equipped items', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: ['Longsword'],
        backpack: [],
      },
    };
    renderComponent(stats);

    const clickable = screen.getByText('Longsword');
    expect(clickable).toHaveClass('clickable');
  });

  it('should render clickable class on backpack items', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: [],
        backpack: ['Potion of Healing'],
      },
    };
    loadEquipment.mockResolvedValue([
      { name: 'Potion of Healing', index: 'potion-of-healing' },
    ]);
    renderComponent(stats);

    const clickable = screen.getByText('Potion of Healing');
    expect(clickable).toHaveClass('clickable');
  });

  it('should set popupHtml when clicking an equipped item', async () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: ['Longsword'],
        backpack: [],
      },
    };
    renderComponent(stats);

    const clickable = screen.getByText('Longsword');
    fireEvent.click(clickable);

    await waitFor(() => {
      expect(setPopupHtmlSpy).toHaveBeenCalledWith(
        expect.stringContaining('<b>Longsword</b>')
      );
    });
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
    renderComponent(stats);

    const magicItem = screen.getByText(/Magic Sword/);
    expect(magicItem).not.toHaveClass('clickable');
  });

  it('should render separator comma between multiple equipped items', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: ['Longsword', 'Shield', 'Dagger'],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Longsword/)).toBeInTheDocument();
    expect(screen.getByText(/Shield/)).toBeInTheDocument();
    expect(screen.getByText(/Dagger/)).toBeInTheDocument();
  });

  it('should render separator comma between multiple backpack items', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: [],
        backpack: ['Rations', 'Torch', 'Water'],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Rations/)).toBeInTheDocument();
    expect(screen.getByText(/Torch/)).toBeInTheDocument();
    expect(screen.getByText(/Water/)).toBeInTheDocument();
  });

  it('should not render trailing comma after single equipped item', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: ['Longsword'],
        backpack: [],
      },
    };
    renderComponent(stats);

    const equippedSection = screen.getByText(/Equipped:/).parentElement;
    expect(equippedSection.textContent).toBe('Equipped: Longsword');
  });

  it('should not render trailing comma after single backpack item', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: [],
        backpack: ['Torch'],
      },
    };
    renderComponent(stats);

    const backpackSection = screen.getByText(/Backpack:/).parentElement;
    expect(backpackSection.textContent).toBe('Backpack: Torch');
  });

  it('should render inventory section header', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  it('should render char-inventory wrapper class', () => {
    const stats = {
      inventory: {
        magicItems: [],
        equipped: [],
        backpack: [],
      },
    };
    const { container } = renderComponent(stats);

    expect(container.querySelector('.char-inventory')).toBeInTheDocument();
  });

  it('should render magic items section even when equipped/backpack are empty', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Ring of Protection',
            type: 'Ring',
            rarity: 'Rare',
            description: 'A protective ring.',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Magic Items:/)).toBeInTheDocument();
    expect(screen.getByText(/Ring of Protection/)).toBeInTheDocument();
    expect(screen.queryByText(/Equipped:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Backpack:/)).not.toBeInTheDocument();
  });

  it('should render all three sections when all have items', () => {
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
        equipped: ['Longsword'],
        backpack: ['Rations'],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Magic Items:/)).toBeInTheDocument();
    expect(screen.getByText(/Equipped:/)).toBeInTheDocument();
    expect(screen.getByText(/Backpack:/)).toBeInTheDocument();
  });

  it('should render magic item type and rarity inline', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Wand of Fireballs',
            type: 'Wand',
            subtype: 'Staff',
            rarity: 'Very Rare',
            description: 'Fires fireballs.',
            requiresAttunement: true,
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Wand of Fireballs/)).toBeInTheDocument();
    expect(screen.getByText(/Wand,/)).toBeInTheDocument();
    expect(screen.getByText(/Very Rare/)).toBeInTheDocument();
    expect(screen.getByText(/Staff/)).toBeInTheDocument();
  });

  it('should render magic item with quantity 0 as not showing qty text', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Elixir of Healing',
            quantity: 0,
            type: 'Potion',
            rarity: 'Common',
            description: 'A potion.',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Elixir of Healing/)).toBeInTheDocument();
    expect(screen.queryByText(/qty/)).not.toBeInTheDocument();
  });

  it('should render magic item with quantity 1 as showing qty text', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Elixir of Healing',
            quantity: 1,
            type: 'Potion',
            rarity: 'Common',
            description: 'A potion.',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Elixir of Healing/)).toBeInTheDocument();
    expect(screen.getByText(/qty 1/)).toBeInTheDocument();
  });

  it('should render magic item with quantity 5 as showing qty text', () => {
    const stats = {
      inventory: {
        magicItems: [
          {
            name: 'Arrows',
            quantity: 5,
            type: 'Ammunition',
            rarity: 'Common',
            description: 'Magic arrows.',
          },
        ],
        equipped: [],
        backpack: [],
      },
    };
    renderComponent(stats);

    expect(screen.getByText(/Arrows/)).toBeInTheDocument();
    expect(screen.getByText(/qty 5/)).toBeInTheDocument();
  });
});

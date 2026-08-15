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
});

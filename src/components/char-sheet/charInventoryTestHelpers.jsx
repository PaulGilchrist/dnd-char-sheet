import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CharInventory from './CharInventory.jsx';
import usePopup from '../../hooks/combat/usePopup.js';
import { loadEquipment } from '../../services/ui/dataLoader.js';

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

export function createRenderComponent() {
  let setPopupHtmlSpy;

  function setup(defaultEquipment) {
    vi.clearAllMocks();
    setPopupHtmlSpy = vi.fn();
    usePopup.mockImplementation(() => ({
      showPopup: vi.fn(),
      popupHtml: null,
      setPopupHtml: setPopupHtmlSpy,
    }));
    loadEquipment.mockResolvedValue(defaultEquipment !== undefined ? defaultEquipment : [
      {
        name: 'Longsword',
        index: 'longsword',
        desc: ['A common sword.'],
        cost: { quantity: 15, unit: 'gp' },
        weight: 3,
        equipment_category: 'Martial Melee Weapons',
      },
      {
        name: 'Shield',
        index: 'shield',
        cost: { quantity: 10, unit: 'gp' },
      },
      {
        name: 'Potion of Healing',
        index: 'potion-of-healing',
        cost: { quantity: 100, unit: 'gp' },
      },
    ]);
  }

  function renderComponent(playerStats) {
    return render(<CharInventory playerStats={playerStats} />);
  }

  async function clickItemByText(text) {
    const clickable = screen.getByText(text);
    fireEvent.click(clickable);
    await waitFor(() => {
      expect(setPopupHtmlSpy).toHaveBeenCalled();
    });
  }

  return { setup, renderComponent, clickItemByText, get setPopupHtmlSpy() { return setPopupHtmlSpy; } };
}

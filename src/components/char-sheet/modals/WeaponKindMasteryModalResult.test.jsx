import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/automation/index.js', () => ({
  applyWeaponKindMastery: vi.fn(),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

import * as automation from '../../../services/automation/index.js';
import WeaponKindMasteryModal from './WeaponKindMasteryModal.jsx';

const mockPlayerStats = {
  name: 'Fighter1',
  level: 5,
  class: {
    class_levels: [
      { level: 1, weapon_mastery: 2 },
      { level: 5, weapon_mastery: 3 },
    ],
  },
};
const mockCampaignName = 'test-campaign';

const mockWeapons = [
  { name: 'Battleaxe', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Topple' },
  { name: 'Blowgun', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Ranged', mastery: 'Sap' },
  { name: 'Club', equipment_category: 'Weapon', weapon_category: 'Simple', weapon_range: 'Melee', mastery: 'Slow' },
  { name: 'Longbow', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Ranged', mastery: 'Vex' },
  { name: 'Shortsword', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Vex' },
];

const baseProps = {
  action: undefined,
  playerStats: mockPlayerStats,
  campaignName: mockCampaignName,
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

function renderWithWeapons(overrides, weaponsToMock = mockWeapons) {
  const fetchMock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(weaponsToMock),
  });
  globalThis.fetch = fetchMock;
  return render(<WeaponKindMasteryModal {...makeProps(overrides)} />);
}

describe('WeaponKindMasteryModal', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('result state', () => {
    function setupResultState(result) {
      automation.applyWeaponKindMastery.mockResolvedValue(result);
      renderWithWeapons();
      return { checkboxes: () => document.querySelectorAll('input[type="checkbox"]') };
    }

    it('shows the result description after applying', async () => {
      setupResultState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: 'Weapon kinds set to: Battleaxe, Club.',
        },
      });
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[2]);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        expect(screen.getByText(/Weapon kinds set to/)).toBeInTheDocument();
      });
    });

    it('replaces the weapon list with a Done button after applying', async () => {
      setupResultState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: 'Weapon kinds set to: Battleaxe.',
        },
      });
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        expect(screen.queryByLabelText('Battleaxe')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Select' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
      });
    });

    it('renders result payload description as HTML via dangerouslySetInnerHTML', async () => {
      setupResultState({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: '<strong>Battleaxe</strong> selected.',
        },
      });
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        const bodyDiv = document.querySelector('.sp-body');
        expect(bodyDiv.querySelector('strong')).toBeInTheDocument();
      });
    });

    it('renders result state when result payload description is falsy', async () => {
      const falsyDescription = '';
      automation.applyWeaponKindMastery.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: falsyDescription,
        },
      });
      renderWithWeapons();
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });
  });

  describe('close behavior', () => {
    it('calls onClose when Done button is clicked in result state', async () => {
      const onClose = vi.fn();
      automation.applyWeaponKindMastery.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: 'Weapon kinds set to: Battleaxe.',
        },
      });
      renderWithWeapons({ onClose });
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Skip button is clicked', async () => {
      const onClose = vi.fn();
      renderWithWeapons({ onClose });
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call applyWeaponKindMastery when Skip is clicked', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      });
      expect(automation.applyWeaponKindMastery).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('renders with no weapons when equipment.json returns empty array', async () => {
      renderWithWeapons([], []);
      await waitFor(() => {
        expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
      });
    });

    it('renders with no weapons when no weapons match the filter criteria', async () => {
      const nonWeaponItems = [
        { name: 'Potion', equipment_category: 'Adventuring Gear' },
      ];
      renderWithWeapons({}, nonWeaponItems);
      await waitFor(() => {
        expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
      });
    });

    it('renders with meleeOnly=true when no melee weapons exist', async () => {
      const rangedOnly = [
        { name: 'Longbow', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Ranged', mastery: 'Vex' },
      ];
      renderWithWeapons({ meleeOnly: true }, rangedOnly);
      await waitFor(() => {
        expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
      });
    });
  });
});

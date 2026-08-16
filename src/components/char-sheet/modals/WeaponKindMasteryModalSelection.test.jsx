// @improved-by-ai
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/automation/index.js', () => ({
  applyWeaponKindMastery: vi.fn(),
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
  return { ...render(<WeaponKindMasteryModal {...makeProps(overrides)} />) };
}

describe('WeaponKindMasteryModal', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('weapon selection', () => {
    it('toggles a weapon selection on checkbox click', async () => {
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('enables the Select button after a weapon is selected', async () => {
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      fireEvent.click(checkbox);
      expect(screen.getByRole('button', { name: 'Select' })).not.toBeDisabled();
    });

    it('prevents selecting more than maxKinds weapons', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 2 } },
      });
      renderWithWeapons(props);
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].disabled).toBe(true);
    });

    it('disables unchecked weapons when maxKinds is reached', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 1 } },
      });
      renderWithWeapons(props);
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[1].disabled).toBe(true);
      expect(checkboxes[2].disabled).toBe(true);
    });

    it('allows deselecting a weapon to free up a slot', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 1 } },
      });
      renderWithWeapons(props);
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[1].disabled).toBe(true);
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[1].disabled).toBe(false);
    });

    it('pre-selects weapons from the existing prop', async () => {
      renderWithWeapons({ existing: ['Battleaxe', 'Club'] });
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);
    });

    it('respects maxKinds limit when weapons are pre-selected via existing', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 2 } },
        existing: ['Battleaxe', 'Club'],
      });
      renderWithWeapons(props);
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[3].disabled).toBe(true);
    });
  });

  describe('selection counter', () => {
    it('displays "Selected: 0/2" by default', async () => {
      renderWithWeapons();
      await waitFor(() => screen.getByText(/Selected: 0\/2/));
    });

    it('updates the counter after selecting and deselecting a weapon', async () => {
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      fireEvent.click(checkbox);
      await waitFor(() => screen.getByText(/Selected: 1\/2/));
      fireEvent.click(checkbox);
      await waitFor(() => screen.getByText(/Selected: 0\/2/));
    });

    it('uses the correct maxKinds in the counter', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 3 } },
      });
      renderWithWeapons(props);
      await waitFor(() => screen.getByText(/Selected: 0\/3/));
    });
  });

  describe('melee-only label', () => {
    it('shows "(Melee only)" suffix when meleeOnly is true', async () => {
      renderWithWeapons({ meleeOnly: true });
      await waitFor(() => screen.getByText(/Melee only/));
    });

    it('does not show "(Melee only)" suffix when meleeOnly is false or undefined', async () => {
      const { unmount } = renderWithWeapons({ meleeOnly: false });
      await waitFor(() => screen.getByText(/Choose up to/));
      expect(screen.queryByText(/Melee only/)).not.toBeInTheDocument();
      unmount();
      renderWithWeapons();
      await waitFor(() => screen.getByText(/Choose up to/));
      expect(screen.queryByText(/Melee only/)).not.toBeInTheDocument();
    });
  });

  describe('handleSelect / applyWeaponKindMastery', () => {
    it('does not call applyWeaponKindMastery when no weapons are selected', async () => {
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      expect(automation.applyWeaponKindMastery).not.toHaveBeenCalled();
    });

    it('calls applyWeaponKindMastery with selected weapons, playerStats, and campaignName', async () => {
      automation.applyWeaponKindMastery.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: 'Weapon kinds set to: Battleaxe, Club.',
        },
      });
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[2]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        expect(automation.applyWeaponKindMastery).toHaveBeenCalledWith(
          ['Battleaxe', 'Club'],
          mockPlayerStats,
          mockCampaignName
        );
      });
    });

    it('calls applyWeaponKindMastery with a single weapon when one is selected', async () => {
      automation.applyWeaponKindMastery.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Weapon Mastery',
          description: 'Weapon kinds set to: Battleaxe.',
        },
      });
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      fireEvent.click(checkbox);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Select' }));
      });
      await waitFor(() => {
        expect(automation.applyWeaponKindMastery).toHaveBeenCalledWith(
          ['Battleaxe'],
          mockPlayerStats,
          mockCampaignName
        );
      });
    });

    it('does not call applyWeaponKindMastery when Skip is clicked', async () => {
      renderWithWeapons();
      await waitFor(() => screen.getByText('Battleaxe'));
      const checkbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      fireEvent.click(checkbox);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      });
      expect(automation.applyWeaponKindMastery).not.toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when the overlay background is clicked', async () => {
      const onClose = vi.fn();
      renderWithWeapons({ onClose });
      await waitFor(() => screen.getByText('Battleaxe'));
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

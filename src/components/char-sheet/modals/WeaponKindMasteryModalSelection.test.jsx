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

  describe('weapon selection', () => {
    it('has no weapons selected initially', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => expect(cb.checked).toBe(false));
      });
    });

    it('toggles a weapon selection on checkbox click', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0].checked).toBe(true);
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0].checked).toBe(false);
      });
    });

    it('enables the Select button after a weapon is selected', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        expect(screen.getByRole('button', { name: 'Select' })).not.toBeDisabled();
      });
    });

    it('prevents selecting more than maxKinds weapons', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 2 } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[1]);
        expect(checkboxes[0].checked).toBe(true);
        expect(checkboxes[1].checked).toBe(true);
        expect(checkboxes[2].disabled).toBe(true);
      });
    });

    it('disables unchecked weapons when maxKinds is reached', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 1 } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[1].disabled).toBe(true);
        expect(checkboxes[2].disabled).toBe(true);
      });
    });

    it('allows deselecting a weapon to free up a slot', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 1 } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[1].disabled).toBe(true);
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[1].disabled).toBe(false);
      });
    });
  });

  describe('selection counter', () => {
    it('displays "Selected: 0/2" by default', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const counter = document.querySelector('.sp-body p:last-of-type');
        expect(counter.textContent).toContain('0');
        expect(counter.textContent).toContain('2');
      });
    });

    it('updates the counter after selecting and deselecting a weapon', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await waitFor(() => {
        const counter = document.querySelector('.sp-body p:last-of-type');
        expect(counter.textContent).toContain('1');
        expect(counter.textContent).toContain('2');
      });
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
      await waitFor(() => {
        const counter = document.querySelector('.sp-body p:last-of-type');
        expect(counter.textContent).toContain('0');
        expect(counter.textContent).toContain('2');
      });
    });

    it('uses the correct maxKinds in the counter', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 3 } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const counter = document.querySelector('.sp-body p:last-of-type');
        expect(counter.textContent).toContain('0');
        expect(counter.textContent).toContain('3');
      });
    });
  });

  describe('melee-only label', () => {
    it('shows "(Melee only)" suffix when meleeOnly is true', async () => {
      renderWithWeapons({ meleeOnly: true });
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).toContain('Melee only');
      });
    });

    it('does not show "(Melee only)" suffix when meleeOnly is false or undefined', async () => {
      renderWithWeapons({ meleeOnly: false });
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).not.toContain('Melee only');
      });
      renderWithWeapons();
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).not.toContain('Melee only');
      });
    });
  });

  describe('handleSelect / applyWeaponKindMastery', () => {
    it('does not call applyWeaponKindMastery when no weapons are selected', async () => {
      renderWithWeapons();
      await waitFor(() => {
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
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[2]);
      });
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
      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        fireEvent.click(checkboxes[0]);
      });
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
  });
});

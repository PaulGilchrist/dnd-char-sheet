// @improved-by-ai
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

async function waitForWeapons() {
  await waitFor(() => screen.getByText('Battleaxe'));
}

function resetModulesAndMock() {
  vi.resetModules();
  vi.doMock('../../../services/automation/index.js', () => ({
    applyWeaponKindMastery: vi.fn(),
  }));
  vi.doMock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
  }));
}

describe('WeaponKindMasteryModal', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('weapon list', () => {
    it('renders all weapons when meleeOnly is false', async () => {
      renderWithWeapons();
      await waitForWeapons();

      expect(screen.getByRole('checkbox', { name: /Battleaxe/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Blowgun/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Club/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Longbow/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Shortsword/ })).toBeInTheDocument();
    });

    it('renders only melee weapons when meleeOnly is true', async () => {
      resetModulesAndMock();
      const mod = await import('./WeaponKindMasteryModal.jsx');
      const Modal = mod.default;

      const meleeWeapons = [
        { name: 'Battleaxe', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Topple' },
        { name: 'Blowgun', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Ranged', mastery: 'Sap' },
        { name: 'Club', equipment_category: 'Weapon', weapon_category: 'Simple', weapon_range: 'Melee', mastery: 'Slow' },
      ];
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(meleeWeapons),
      });
      globalThis.fetch = fetchMock;
      render(<Modal meleeOnly {...makeProps()} />);
      await waitFor(() => screen.getByText('Battleaxe'));

      expect(screen.getByRole('checkbox', { name: /Battleaxe/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Club/ })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /Blowgun/ })).not.toBeInTheDocument();
    });

    it('renders weapon category and range info next to each weapon name', async () => {
      renderWithWeapons();
      await waitForWeapons();

      const battleaxeLabel = screen.getByRole('checkbox', { name: /Battleaxe/ }).closest('label');
      expect(battleaxeLabel.textContent).toContain('[Martial Melee]');
    });

    it('renders the mastery property for weapons that have one', async () => {
      renderWithWeapons();
      await waitForWeapons();

      const battleaxeLabel = screen.getByRole('checkbox', { name: /Battleaxe/ }).closest('label');
      expect(battleaxeLabel.textContent).toContain('Topple');
    });

    it('renders "—" when a weapon has no mastery property', async () => {
      resetModulesAndMock();
      const mod = await import('./WeaponKindMasteryModal.jsx');
      const Modal = mod.default;

      const weaponsWithNoMastery = [
        { name: 'Test Weapon', equipment_category: 'Weapon', weapon_category: 'Simple', weapon_range: 'Melee' },
      ];
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(weaponsWithNoMastery),
      });
      globalThis.fetch = fetchMock;
      render(<Modal {...makeProps()} />);
      await waitFor(() => screen.getByText('Test Weapon'));

      const label = screen.getByRole('checkbox', { name: /Test Weapon/ }).closest('label');
      expect(label.textContent).toContain('—');
    });

    it('renders weapons sorted alphabetically by name', async () => {
      resetModulesAndMock();
      const mod = await import('./WeaponKindMasteryModal.jsx');
      const Modal = mod.default;

      const unsortedWeapons = [
        { name: 'Zweihander', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Push' },
        { name: 'Axe', equipment_category: 'Weapon', weapon_category: 'Simple', weapon_range: 'Melee', mastery: 'Slow' },
        { name: 'Mace', equipment_category: 'Weapon', weapon_category: 'Simple', weapon_range: 'Melee', mastery: 'Topple' },
      ];
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(unsortedWeapons),
      });
      globalThis.fetch = fetchMock;
      render(<Modal {...makeProps()} />);
      await waitFor(() => screen.getByText('Axe'));

      const checkboxes = screen.getAllByRole('checkbox');
      const names = checkboxes.map(cb => {
        const strong = cb.parentElement?.querySelector('strong');
        return strong?.textContent?.trim() || '';
      });
      expect(names).toEqual(['Axe', 'Mace', 'Zweihander']);
    });

    it('filters out non-weapon items', async () => {
      resetModulesAndMock();
      const mod = await import('./WeaponKindMasteryModal.jsx');
      const Modal = mod.default;

      const mixedItems = [
        { name: 'Potion', equipment_category: 'Adventuring Gear' },
        { name: 'Battleaxe', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Topple' },
      ];
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mixedItems),
      });
      globalThis.fetch = fetchMock;
      render(<Modal {...makeProps()} />);
      await waitFor(() => screen.getByText('Battleaxe'));

      expect(screen.getByText('Battleaxe')).toBeInTheDocument();
      expect(screen.queryByText('Potion')).not.toBeInTheDocument();
    });

    it('filters out weapons without both weapon_category and weapon_range', async () => {
      resetModulesAndMock();
      const mod = await import('./WeaponKindMasteryModal.jsx');
      const Modal = mod.default;

      const items = [
        { name: 'Test Weapon', equipment_category: 'Weapon', weapon_range: 'Melee' },
        { name: 'Test Weapon 2', equipment_category: 'Weapon', weapon_category: 'Simple' },
      ];
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(items),
      });
      globalThis.fetch = fetchMock;
      render(<Modal {...makeProps()} />);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('toggles weapon selection when checkbox is clicked', async () => {
      renderWithWeapons();
      await waitForWeapons();

      const battleaxeCheckbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      expect(battleaxeCheckbox.checked).toBe(false);

      await fireEvent.click(battleaxeCheckbox);
      expect(battleaxeCheckbox.checked).toBe(true);

      await fireEvent.click(battleaxeCheckbox);
      expect(battleaxeCheckbox.checked).toBe(false);
    });

    it('disables the Select button when no weapons are selected', async () => {
      renderWithWeapons();
      expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
    });

    it('enables the Select button when at least one weapon is selected', async () => {
      renderWithWeapons();
      await waitForWeapons();

      const battleaxeCheckbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      await fireEvent.click(battleaxeCheckbox);

      expect(screen.getByRole('button', { name: 'Select' })).toBeEnabled();
    });

    it('disables unchecked weapons when max kinds limit is reached', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 2 } },
      });
      renderWithWeapons(props);
      await waitForWeapons();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(5);

      await fireEvent.click(checkboxes[0]);
      await fireEvent.click(checkboxes[1]);

      expect(checkboxes[2].disabled).toBe(true);
      expect(checkboxes[3].disabled).toBe(true);
      expect(checkboxes[4].disabled).toBe(true);
    });

    it('renders "Selected: X/Y" count after selecting weapons', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 3 } },
      });
      renderWithWeapons(props);
      await waitForWeapons();

      const battleaxeCheckbox = screen.getByRole('checkbox', { name: /Battleaxe/ });
      await fireEvent.click(battleaxeCheckbox);

      const clubCheckbox = screen.getByRole('checkbox', { name: /Club/ });
      await fireEvent.click(clubCheckbox);

      expect(screen.getByText(/Selected: 2\/3/)).toBeInTheDocument();
    });
  });
});

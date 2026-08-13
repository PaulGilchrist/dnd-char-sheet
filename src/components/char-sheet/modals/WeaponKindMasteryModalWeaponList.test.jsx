// @cleaned-by-ai
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/automation/index.js', () => ({
  applyWeaponKindMastery: vi.fn(),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

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

  describe('weapon list', () => {
    it('renders all weapons when meleeOnly is false', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const labels = document.querySelectorAll('label');
        const names = Array.from(labels).map(l => l.querySelector('strong')?.textContent);
        expect(names).toContain('Battleaxe');
        expect(names).toContain('Blowgun');
        expect(names).toContain('Club');
        expect(names).toContain('Longbow');
        expect(names).toContain('Shortsword');
      });
    });

    it('renders only melee weapons when meleeOnly is true', async () => {
      vi.resetModules();
      vi.doMock('../../../services/automation/index.js', () => ({
        applyWeaponKindMastery: vi.fn(),
      }));
      vi.doMock('../../../hooks/runtime/useRuntimeState.js', () => ({
        getRuntimeValue: vi.fn(),
        setRuntimeValue: vi.fn(),
      }));

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
      render(<Modal {...makeProps({ meleeOnly: true })} />);
      await waitFor(() => {
        const labels = document.querySelectorAll('label');
        const names = Array.from(labels).map(l => l.querySelector('strong')?.textContent);
        expect(names).toContain('Battleaxe');
        expect(names).toContain('Club');
        expect(names).not.toContain('Blowgun');
        expect(names).toHaveLength(2);
      });
    });

    it('renders weapon category and range info', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const labels = document.querySelectorAll('label');
        const firstLabel = labels[0];
        expect(firstLabel.textContent).toContain('[Martial Melee]');
      });
    });

    it('renders the mastery property for each weapon', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const labels = document.querySelectorAll('label');
        const firstLabel = labels[0];
        expect(firstLabel.textContent).toContain('Topple');
      });
    });

    it('renders "—" when a weapon has no mastery property', async () => {
      vi.resetModules();
      vi.doMock('../../../services/automation/index.js', () => ({
        applyWeaponKindMastery: vi.fn(),
      }));
      vi.doMock('../../../hooks/runtime/useRuntimeState.js', () => ({
        getRuntimeValue: vi.fn(),
        setRuntimeValue: vi.fn(),
      }));

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
      await waitFor(() => {
        const labels = document.querySelectorAll('label');
        const firstLabel = labels[0];
        expect(firstLabel.textContent).toContain('—');
      });
    });

    it('renders weapons sorted alphabetically by name', async () => {
      vi.resetModules();
      vi.doMock('../../../services/automation/index.js', () => ({
        applyWeaponKindMastery: vi.fn(),
      }));
      vi.doMock('../../../hooks/runtime/useRuntimeState.js', () => ({
        getRuntimeValue: vi.fn(),
        setRuntimeValue: vi.fn(),
      }));

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
      await waitFor(() => {
        const labels = document.querySelectorAll('label');
        const names = Array.from(labels).map(l => l.querySelector('strong')?.textContent);
        expect(names).toEqual(['Axe', 'Mace', 'Zweihander']);
      });
    });

    it('filters out non-weapon items', async () => {
      vi.resetModules();
      vi.doMock('../../../services/automation/index.js', () => ({
        applyWeaponKindMastery: vi.fn(),
      }));
      vi.doMock('../../../hooks/runtime/useRuntimeState.js', () => ({
        getRuntimeValue: vi.fn(),
        setRuntimeValue: vi.fn(),
      }));

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
      await waitFor(() => {
        expect(screen.getByText('Battleaxe')).toBeInTheDocument();
        expect(screen.queryByText('Potion')).not.toBeInTheDocument();
      });
    });

    it('filters out weapons without weapon_category or weapon_range', async () => {
      vi.resetModules();
      vi.doMock('../../../services/automation/index.js', () => ({
        applyWeaponKindMastery: vi.fn(),
      }));
      vi.doMock('../../../hooks/runtime/useRuntimeState.js', () => ({
        getRuntimeValue: vi.fn(),
        setRuntimeValue: vi.fn(),
      }));

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
      await waitFor(() => {
        expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
      });
    });
  });
});

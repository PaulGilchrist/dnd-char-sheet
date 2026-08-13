// @cleaned-by-ai
import { render, waitFor } from '@testing-library/react';
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

  describe('maxKinds computation', () => {
    it('defaults to 2 when action is undefined', async () => {
      renderWithWeapons();
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).toContain('Choose up to');
        expect(bodyP.textContent).toContain('2');
        expect(bodyP.textContent).toContain('weapons');
      });
    });

    it('uses maxKinds from action.automation.maxKinds', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 4 } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).toContain('4');
        expect(bodyP.textContent).toContain('weapons');
      });
    });

    it('uses class_level_scaling from action.automation to derive from playerStats', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 'class_level_scaling' } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).toContain('Choose up to');
        expect(bodyP.textContent).toContain('3');
        expect(bodyP.textContent).toContain('weapons');
      });
    });

    it('falls back to 2 when class_level_scaling weapon_mastery is undefined', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 'class_level_scaling' } },
        playerStats: { name: 'Fighter1', level: 10, class: { class_levels: [] } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const bodyP = document.querySelector('.sp-body p');
        expect(bodyP.textContent).toContain('Choose up to');
        expect(bodyP.textContent).toContain('2');
        expect(bodyP.textContent).toContain('weapons');
      });
    });

    it('shows singular "weapon" when maxKinds is 1', async () => {
      const props = makeProps({
        action: { automation: { maxKinds: 1 } },
      });
      renderWithWeapons(props);
      await waitFor(() => {
        const text = document.querySelector('.sp-body p');
        expect(text.textContent).toContain('weapon');
        expect(text.textContent).not.toContain('weapons');
      });
    });
  });
});

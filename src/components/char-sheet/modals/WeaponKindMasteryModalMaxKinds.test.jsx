// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/automation/index.js', () => ({
  applyWeaponKindMastery: vi.fn(),
}));

import WeaponKindMasteryModal from './WeaponKindMasteryModal.jsx';

const mockCampaignName = 'test-campaign';

const mockWeapons = [
  { name: 'Battleaxe', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Topple' },
  { name: 'Blowgun', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Ranged', mastery: 'Sap' },
  { name: 'Club', equipment_category: 'Weapon', weapon_category: 'Simple', weapon_range: 'Melee', mastery: 'Slow' },
  { name: 'Longbow', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Ranged', mastery: 'Vex' },
  { name: 'Shortsword', equipment_category: 'Weapon', weapon_category: 'Martial', weapon_range: 'Melee', mastery: 'Vex' },
];

const basePlayerStats = {
  name: 'Fighter1',
  level: 5,
  class: {
    class_levels: [
      { level: 1, weapon_mastery: 2 },
      { level: 5, weapon_mastery: 3 },
    ],
  },
};

const baseProps = {
  action: undefined,
  playerStats: basePlayerStats,
  campaignName: mockCampaignName,
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

function renderModal(overrides, weapons = mockWeapons) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(weapons),
  });
  return render(<WeaponKindMasteryModal {...makeProps(overrides)} />);
}

describe('WeaponKindMasteryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('maxKinds computation', () => {
    function findInstructionParagraph(expectedText) {
      return screen.findByText((content, element) => {
        if (element && element.tagName === 'P') {
          return expectedText.test(element.textContent);
        }
        return false;
      });
    }

    it('displays default maxKinds of 2 when action is undefined', async () => {
      renderModal();
      await findInstructionParagraph(/Choose up to 2 weapons/);
    });

    it('displays default maxKinds of 2 when action is null', async () => {
      renderModal({ action: null });
      await findInstructionParagraph(/Choose up to 2 weapons/);
    });

    it('uses numeric maxKinds from action.automation.maxKinds', async () => {
      renderModal({ action: { automation: { maxKinds: 4 } } });
      await findInstructionParagraph(/Choose up to 4 weapons/);
    });

    it('derives maxKinds from class_level_scaling using playerStats', async () => {
      renderModal({ action: { automation: { maxKinds: 'class_level_scaling' } } });
      await findInstructionParagraph(/Choose up to 3 weapons/);
    });

    it('falls back to 2 when class_level_scaling finds no matching level', async () => {
      renderModal({
        action: { automation: { maxKinds: 'class_level_scaling' } },
        playerStats: { name: 'Fighter1', level: 10, class: { class_levels: [] } },
      });
      await findInstructionParagraph(/Choose up to 2 weapons/);
    });

    it('falls back to 2 when playerStats.class is undefined', async () => {
      renderModal({
        action: { automation: { maxKinds: 'class_level_scaling' } },
        playerStats: { name: 'Fighter1', level: 5 },
      });
      await findInstructionParagraph(/Choose up to 2 weapons/);
    });

    it('falls back to 2 when class_levels is undefined', async () => {
      renderModal({
        action: { automation: { maxKinds: 'class_level_scaling' } },
        playerStats: { name: 'Fighter1', level: 5, class: {} },
      });
      await findInstructionParagraph(/Choose up to 2 weapons/);
    });

    it('shows singular "weapon" when maxKinds is 1', async () => {
      renderModal({ action: { automation: { maxKinds: 1 } } });
      const el = await findInstructionParagraph(/Choose up to 1 weapon[^s]/);
      expect(el.textContent).toContain('weapon');
      expect(el.textContent).not.toContain('weapons');
    });

    it('shows plural "weapons" when maxKinds is greater than 1', async () => {
      renderModal({ action: { automation: { maxKinds: 5 } } });
      const el = await findInstructionParagraph(/Choose up to 5 weapons/);
      expect(el.textContent).toContain('weapons');
    });
  });
});

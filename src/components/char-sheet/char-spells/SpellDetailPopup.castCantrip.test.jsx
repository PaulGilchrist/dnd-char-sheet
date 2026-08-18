// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
  getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
  sanitizeHtml: (html) => html,
}));

const baseMockPlayerStats = {
  name: 'Elara',
  level: 5,
  class: { name: 'Sorcerer', major: { name: 'Sorcerer' } },
  abilities: [{ name: 'Charisma', bonus: 3 }],
  proficiency: 3,
  spellAbilities: {
    spell_slots_level_1: 4,
    spell_slots_level_2: 3,
    spell_slots_level_3: 2,
    spells: [],
  },
  automation: { passives: [], actions: [] },
};

const mockCampaignName = 'test-campaign';

const fireBoltSpell = {
  name: 'Fire Bolt',
  level: 0,
  description: 'A flash of fire.',
  casting_time: '1 action',
  range: '120 feet',
  duration: 'Instantaneous',
  damage: {
    damage_at_character_level: {
      1: '1d10',
      5: '2d10',
      11: '3d10',
      17: '4d10',
    },
  },
};

const renderPopup = (
  spell,
  playerStats = baseMockPlayerStats,
  campaignName = mockCampaignName,
  extraProps = {}
) =>
  render(
    <SpellDetailPopup
      spell={spell}
      playerStats={playerStats}
      campaignName={campaignName}
      onClose={vi.fn()}
      {...extraProps}
    />
  );

describe('SpellDetailPopup - handleCast: Cantrip casting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('cantripAutoLevel with damage_at_character_level', () => {
    it('calls onCast with cantrip auto-leveled to player level when applicable', () => {
      const onCast = vi.fn();
      renderPopup(fireBoltSpell, baseMockPlayerStats, mockCampaignName, { onCast, playerLevel: 5 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 5, baseLevel: 0 }),
        expect.any(Object)
      );
    });

    it('caps auto-level at the highest applicable character level tier (17) when player is level 20', () => {
      const onCast = vi.fn();
      const highLevelStats = { ...baseMockPlayerStats, level: 20 };
      renderPopup(fireBoltSpell, highLevelStats, mockCampaignName, { onCast, playerLevel: 20 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 17, baseLevel: 0 }),
        expect.any(Object)
      );
    });

    it('keeps cantrip at base level (0) when no character level tier is applicable', () => {
      const onCast = vi.fn();
      const lowLevelCantrip = {
        ...fireBoltSpell,
        damage: {
          damage_at_character_level: {
            5: '2d10',
            11: '3d10',
          },
        },
      };
      renderPopup(lowLevelCantrip, baseMockPlayerStats, mockCampaignName, { onCast, playerLevel: 3 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 0, baseLevel: 0 }),
        expect.any(Object)
      );
    });

    it('auto-levels to tier 1 when player is at level 1', () => {
      const onCast = vi.fn();
      const level1Stats = { ...baseMockPlayerStats, level: 1 };
      renderPopup(fireBoltSpell, level1Stats, mockCampaignName, { onCast, playerLevel: 1 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 1, baseLevel: 0 }),
        expect.any(Object)
      );
    });
  });

  describe('cantripAutoLevel with damage_at_slot_level fallback', () => {
    it('uses damage_at_slot_level when damage_at_character_level is absent', () => {
      const onCast = vi.fn();
      const cantrip = {
        name: 'Ray of Frost',
        level: 0,
        description: 'A beam of freezing air.',
        casting_time: '1 action',
        range: '60 feet',
        duration: 'Instantaneous',
        damage: {
          damage_at_slot_level: {
            '0': '1d8',
            '1': '2d8',
            '3': '3d8',
            '5': '4d8',
          },
        },
      };
      renderPopup(cantrip, baseMockPlayerStats, mockCampaignName, { onCast, playerLevel: 5 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 5, baseLevel: 0 }),
        expect.any(Object)
      );
    });

    it('keeps cantrip at base level (0) when no slot level tier is applicable', () => {
      const onCast = vi.fn();
      const cantrip = {
        name: 'Ray of Frost',
        level: 0,
        description: 'A beam of freezing air.',
        casting_time: '1 action',
        range: '60 feet',
        duration: 'Instantaneous',
        damage: {
          damage_at_slot_level: {
            '0': '1d8',
            '3': '3d8',
          },
        },
      };
      renderPopup(cantrip, baseMockPlayerStats, mockCampaignName, { onCast, playerLevel: 1 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 0, baseLevel: 0 }),
        expect.any(Object)
      );
    });
  });

  describe('cantrip with no damage scaling', () => {
    it('calls onCast with base level when cantrip has no damage_at_character_level or damage_at_slot_level', () => {
      const onCast = vi.fn();
      const cantrip = {
        name: 'Minor Illusion',
        level: 0,
        description: 'A sound or image.',
        casting_time: '1 action',
        range: '30 feet',
        duration: '1 minute',
        damage: null,
      };
      renderPopup(cantrip, baseMockPlayerStats, mockCampaignName, { onCast, playerLevel: 5 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 0, baseLevel: 0 }),
        expect.any(Object)
      );
    });
  });

  describe('cantrip with damage_at_slot_level that resolves to base level', () => {
    it('calls onCast with base level when damage_at_slot_level only has level 0 tier (no effective scaling)', () => {
      const onCast = vi.fn();
      const cantrip = {
        name: 'Guidance',
        level: 0,
        description: 'Add d4 to ability check.',
        casting_time: '1 action',
        range: 'Touch',
        duration: 'Concentration, up to 1 minute',
        damage: { damage_at_slot_level: { '0': '1d4' } },
      };
      renderPopup(cantrip, baseMockPlayerStats, mockCampaignName, { onCast, playerLevel: 5 });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: 0, baseLevel: 0 }),
        expect.any(Object)
      );
    });
  });

  describe('Rage blocking cantrip casting', () => {
    it('does not call onCast when player is raging', () => {
      const onCast = vi.fn();
      vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);

      renderPopup(fireBoltSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).not.toHaveBeenCalled();
    });

    it('disables the cast button when player is raging', () => {
      vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);

      renderPopup(fireBoltSpell, baseMockPlayerStats, mockCampaignName);

      const castButton = screen.getByRole('button', { name: /Cast Spell/ });
      expect(castButton).toBeDisabled();
    });
  });
});

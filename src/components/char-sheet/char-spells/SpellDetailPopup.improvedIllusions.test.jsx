// @improved-by-ai
import { render, screen } from '@testing-library/react';
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

const baseMockSpell = {
  name: 'Magic Missile',
  level: 1,
  description: 'Three darts of force strike a creature.',
  casting_time: '1 action',
  range: '120 feet',
  duration: 'Instantaneous',
  damage: {
    damage_at_slot_level: {
      '1': '3d4+1',
      '2': '4d4+1',
      '3': '5d4+1',
    },
  },
  school: 'Evocation',
};

const renderPopup = (
  spell = baseMockSpell,
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

describe('SpellDetailPopup - Improved Illusions feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('Improved Illusions banner display', () => {
    it('shows no verbal components banner for warlock with improved illusions casting an illusion spell', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.getByText('No Verbal components (Improved Illusions)')).toBeInTheDocument();
    });

    it('renders the banner with the spell-detail-free-cast class and ghost icon', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      const banner = screen.getByText('No Verbal components (Improved Illusions)').closest('.spell-detail-free-cast');
      expect(banner).toHaveClass('spell-detail-free-cast');
      expect(banner.querySelector('i.fa-solid.fa-ghost')).toBeTruthy();
    });

    it('does not show the banner for warlock without the passive', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: { passives: [], actions: [] },
      };

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show the banner for non-warlock class', () => {
      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, baseMockPlayerStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show the banner for non-illusion spell school', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show the banner when school is undefined', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        school: undefined,
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show the banner when school is null', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        school: null,
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show the banner when school is an empty string', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        school: '',
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('shows the banner for illusion school with lowercase casing (case-insensitive match)', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const spell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'illusion',
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByText('No Verbal components (Improved Illusions)')).toBeInTheDocument();
    });
  });

  describe('Both Psychic Spells and Improved Illusions banners', () => {
    it('shows both banners when warlock has both passives and casts an illusion spell', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [
            { type: 'psychic_spells' },
            { type: 'improved_illusions' },
          ],
          actions: [],
        },
      };

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.getByText('No Verbal or Somatic components (Psychic Spells)')).toBeInTheDocument();
      expect(screen.getByText('No Verbal components (Improved Illusions)')).toBeInTheDocument();
    });

    it('shows only improved illusions banner for illusion spell without psychic spells', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal or Somatic components (Psychic Spells)')).not.toBeInTheDocument();
      expect(screen.getByText('No Verbal components (Improved Illusions)')).toBeInTheDocument();
    });

    it('shows only psychic spells banner for enchantment spell without improved illusions', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'psychic_spells' }],
          actions: [],
        },
      };

      const enchantmentSpell = {
        ...baseMockSpell,
        name: 'Bane',
        level: 1,
        school: 'Enchantment',
      };

      renderPopup(enchantmentSpell, warlockStats, mockCampaignName);
      expect(screen.getByText('No Verbal or Somatic components (Psychic Spells)')).toBeInTheDocument();
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('shows neither banner for illusion spell when warlock has improved illusions but not psychic spells', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal or Somatic components (Psychic Spells)')).not.toBeInTheDocument();
      expect(screen.getByText('No Verbal components (Improved Illusions)')).toBeInTheDocument();
    });
  });
});

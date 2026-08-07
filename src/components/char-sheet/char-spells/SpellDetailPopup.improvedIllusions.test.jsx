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
    it('shows no verbal components banner for warlock with improved illusions casting illusion spell', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.getByText('No Verbal components (Improved Illusions)')).toBeInTheDocument();
    });

    it('does not show improved illusions banner for warlock without the passive', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: { passives: [], actions: [] },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show improved illusions banner for non-warlock', () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const illusionSpell = {
        ...baseMockSpell,
        name: 'Disguise Self',
        level: 1,
        school: 'Illusion',
      };

      renderPopup(illusionSpell, baseMockPlayerStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show improved illusions banner for non-illusion spell', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });

    it('does not show improved illusions banner for spell without school', () => {
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'improved_illusions' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        school: undefined,
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.queryByText('No Verbal components (Improved Illusions)')).not.toBeInTheDocument();
    });
  });

  describe('Both Psychic Spells and Improved Illusions banners', () => {
    it('shows both banners when warlock has both passives and casts illusion spell', () => {
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
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

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
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

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

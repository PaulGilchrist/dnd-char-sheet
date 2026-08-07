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

describe('SpellDetailPopup - Psionic Sorcery Payment UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('Psionic payment checkbox visibility', () => {
    it('shows psionic payment checkbox when psionic spell, psionic sorcery, non-cantrip, not free cast, and both slots and SP available', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile', 'Shield'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByText('Use Sorcery Points (1 SP) instead of spell slot')).toBeInTheDocument();
    });

    it('does not show psionic payment checkbox for non-psionic spell', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Fireball',
        level: 3,
        damage: { damage_at_slot_level: { '3': '8d6' } },
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.queryByText('Use Sorcery Points')).not.toBeInTheDocument();
    });

    it('does not show psionic payment checkbox for cantrip', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Fire Bolt'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const cantrip = {
        ...baseMockSpell,
        name: 'Fire Bolt',
        level: 0,
        damage: { damage_at_slot_level: { '0': '1d10' } },
      };

      renderPopup(cantrip, psionicStats, mockCampaignName);
      expect(screen.queryByText('Use Sorcery Points')).not.toBeInTheDocument();
    });

    it('does not show psionic payment checkbox when free cast authorized', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'naturalRecoveryFreeCast') return ['Magic Missile'];
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.queryByText('Use Sorcery Points')).not.toBeInTheDocument();
    });

    it('does not show psionic payment checkbox when only slots available (no SP)', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 0;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.queryByText('Use Sorcery Points')).not.toBeInTheDocument();
    });

    it('does not show psionic payment checkbox when only SP available (no slots)', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.queryByText('Use Sorcery Points')).not.toBeInTheDocument();
    });

    it('does not show psionic payment checkbox when player lacks psionic sorcery passive', () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName);
      expect(screen.queryByText('Use Sorcery Points')).not.toBeInTheDocument();
    });
  });

  describe('Psionic payment checkbox interaction', () => {
    it('toggles psionic payment checkbox state', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 3;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });
});

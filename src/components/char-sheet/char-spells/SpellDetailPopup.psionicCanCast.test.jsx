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

describe('SpellDetailPopup - Psionic Sorcery canCast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('Psionic SP enabling casting', () => {
    it('enables cast for psionic spell when player has enough SP but no slots', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 2;
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('disables cast for psionic spell when player has insufficient SP and no slots', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 0;
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });

    it('enables cast when both SP and slots are available', () => {
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
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });
  });

  describe('Psionic SP for upcast casting', () => {
    it('enables upcast cast when SP covers the upcast level', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 4;
        if (key === 'spell_slots_level_2') return 0;
        if (key === 'spell_slots_level_3') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 2,
        damage: {
          damage_at_slot_level: {
            '2': '4d4+1',
            '3': '5d4+1',
          },
        },
      };
      const upcastLevels = [
        { level: 2, formula: '4d4+1', availableSlots: 0 },
        { level: 3, formula: '5d4+1', availableSlots: 0 },
      ];

      renderPopup(spell, psionicStats, mockCampaignName, { upcastLevels });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('disables upcast radio when neither slots nor SP cover that level', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 2;
        if (key === 'spell_slots_level_2') return 0;
        if (key === 'spell_slots_level_3') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 2,
        damage: {
          damage_at_slot_level: {
            '2': '4d4+1',
            '3': '5d4+1',
          },
        },
      };
      const upcastLevels = [
        { level: 2, formula: '4d4+1', availableSlots: 0 },
        { level: 3, formula: '5d4+1', availableSlots: 0 },
      ];

      renderPopup(spell, psionicStats, mockCampaignName, { upcastLevels });
      const radios = screen.getAllByRole('radio');
      // Level 2 should be enabled (SP >= 2), level 3 should be disabled (SP < 3)
      expect(radios[0]).not.toBeDisabled();
      expect(radios[1]).toBeDisabled();
    });
  });

  describe('Psionic SP display in upcast selector', () => {
    it('shows SP can cover upcast level in upcast selector', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 5;
        if (key === 'spell_slots_level_2') return 0;
        if (key === 'spell_slots_level_3') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 2,
        damage: {
          damage_at_slot_level: {
            '2': '4d4+1',
            '3': '5d4+1',
          },
        },
      };
      const upcastLevels = [
        { level: 2, formula: '4d4+1', availableSlots: 0 },
        { level: 3, formula: '5d4+1', availableSlots: 0 },
      ];

      renderPopup(spell, psionicStats, mockCampaignName, { upcastLevels });
      const spElements = screen.getAllByText('5 SP');
      expect(spElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Psionic Sorcery available calculation', () => {
    it('returns 0 for non-sorcerer', () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 10;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const nonSorcererStats = {
        ...baseMockPlayerStats,
        class: { name: 'Wizard', major: { name: 'Wizard' } },
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };

      const nonUpcastableSpell = {
        ...baseMockSpell,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(nonUpcastableSpell, nonSorcererStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('returns 0 for sorcerer without psionic spell', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Shield'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 10;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
      };

      const nonUpcastableSpell = {
        ...spell,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(nonUpcastableSpell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });
  });
});

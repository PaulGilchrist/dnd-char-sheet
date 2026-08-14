// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

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
    />,
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

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1 };
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

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1 };
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

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1 };
      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('enables cast for psionic spell when player has slots but zero SP', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 0;
        if (key === 'spell_slots_level_1') return null;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };
      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('enables cast for psionic spell when SP exactly equals spell level', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 1;
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1 };
      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('disables cast for psionic spell when SP is one below spell level', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 0;
        if (key === 'spell_slots_level_2') return 0;
        return null;
      });

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 2 };
      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
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
      expect(radios[0]).not.toBeDisabled();
      expect(radios[1]).toBeDisabled();
    });

    it('enables upcast cast when switching to a level SP can cover', async () => {
      const onCast = vi.fn();
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

      renderPopup(spell, psionicStats, mockCampaignName, { onCast, upcastLevels });
      fireEvent.click(screen.getByText('Level 3'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const passedSpell = onCast.mock.calls[0][0];
      expect(passedSpell.isUpcast).toBe(true);
      expect(passedSpell.upcastLevel).toBe(3);
      expect(passedSpell.usePsionicPayment).toBe(false);
    });

    it('passes usePsionicPayment:false when no checkbox shown (slots=0, only SP available)', async () => {
      const onCast = vi.fn();
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

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1 };
      renderPopup(spell, psionicStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const passedSpell = onCast.mock.calls[0][0];
      expect(passedSpell.usePsionicPayment).toBe(false);
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
    it('returns 0 for non-sorcerer so canCast relies on slots', () => {
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

      const spell = { ...baseMockSpell, damage: { damage_at_slot_level: { '1': '3d4+1' } } };
      renderPopup(spell, nonSorcererStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('returns 0 for sorcerer without psionic spell so canCast relies on slots', () => {
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

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1, damage: { damage_at_slot_level: { '1': '3d4+1' } } };
      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('returns 0 for sorcerer without psionic sorcery passive', () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 10;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const noPassiveStats = {
        ...baseMockPlayerStats,
        automation: { passives: [], actions: [] },
      };

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1, damage: { damage_at_slot_level: { '1': '3d4+1' } } };
      renderPopup(spell, noPassiveStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('returns 0 for cantrip so canCast relies on cantrip logic', () => {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 10;
        return null;
      });

      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Fire Bolt'] }],
          actions: [],
        },
      };

      const cantrip = {
        ...baseMockSpell,
        name: 'Fire Bolt',
        level: 0,
        damage: { damage_at_slot_level: { '0': '1d10' } },
      };

      renderPopup(cantrip, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });
  });

  describe('Rage still blocks psionic casting', () => {
    it('disables cast button when raging even with sufficient SP', () => {
      const psionicStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'psionic_sorcery', psionicSpells: ['Magic Missile'] }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'sorceryPoints') return 5;
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });
      vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);

      const spell = { ...baseMockSpell, name: 'Magic Missile', level: 1 };
      renderPopup(spell, psionicStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });
  });
});

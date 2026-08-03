import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';

const flushPromises = () => new Promise(r => setTimeout(r, 0));

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

vi.mock('../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
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

describe('SpellDetailPopup - handleCast: Special features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
    vi.mocked(getCombatSummary).mockReturnValue(null);
  });

  describe('War God\'s Blessing (WGB) management', () => {
    it('calls onCast with WGB spell and baseLevel=0', async () => {
      const onCast = vi.fn();
      const wgbStats = {
        ...baseMockPlayerStats,
        automation: { passives: [], actions: [] },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_War_Gods_Blessing_active') return true;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Spiritual Weapon',
        level: 2,
        damage: { damage_at_slot_level: { '2': '1d8+3' } },
      };

      renderPopup(spell, wgbStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Spiritual Weapon');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });

    it('calls onCast with non-WGB spell and baseLevel=0', async () => {
      const onCast = vi.fn();
      const wgbStats = {
        ...baseMockPlayerStats,
        automation: { passives: [], actions: [] },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_War_Gods_Blessing_active') return true;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, wgbStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Magic Missile');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });
  });

  describe('SpellBreaker — Dispel Magic as bonus action', () => {
    it('calls onCast with Dispel Magic and passes dispelAbilityCheckBonus in metaCtx', async () => {
      const onCast = vi.fn();
      const spellBreakerStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'spell_breaker' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_3') return 2;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Dispel Magic',
        level: 3,
        casting_time: '1 action',
        damage: null,
      };

      renderPopup(spell, spellBreakerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Dispel Magic');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
      const metaCtx = onCast.mock.calls[0][1];
      expect(metaCtx.dispelAbilityCheckBonus).toBe(3);
    });

    it('calls onCast with non-Dispel Magic spell and no dispelAbilityCheckBonus', async () => {
      const onCast = vi.fn();
      const spellBreakerStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'spell_breaker' }],
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
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, spellBreakerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Magic Missile');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });
  });

  describe('Psychic Spells override', () => {
    it('calls onCast with psychic override flag when Warlock with Psychic Spells and psychic damage toggled', async () => {
      const onCast = vi.fn();
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'psychic_spells' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Burning Hands',
        level: 1,
        school: 'Evocation',
        damage: { damage_at_slot_level: { '1': '3d4' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByText('Change damage type to Psychic'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Burning Hands');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });

    it('does not show psychic damage toggle for non-Warlock', () => {
      const onCast = vi.fn();
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      expect(screen.queryByText('Change damage type to Psychic')).not.toBeInTheDocument();
    });

    it('does not show psychic damage toggle for Warlock without Psychic Spells passive', () => {
      const onCast = vi.fn();
      const warlockNoPsychic = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: { passives: [], actions: [] },
      };

      renderPopup(baseMockSpell, warlockNoPsychic, mockCampaignName, { onCast });

      expect(screen.queryByText('Change damage type to Psychic')).not.toBeInTheDocument();
    });

    it('does not show psychic damage toggle for spells without damage', () => {
      const onCast = vi.fn();
      const warlockStats = {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'psychic_spells' }],
          actions: [],
        },
      };
      const noDamageSpell = {
        ...baseMockSpell,
        name: 'Bane',
        level: 1,
        damage: null,
      };

      renderPopup(noDamageSpell, warlockStats, mockCampaignName, { onCast });

      expect(screen.queryByText('Change damage type to Psychic')).not.toBeInTheDocument();
    });
  });

  describe('Phantasmal Creatures', () => {
    it('calls onCast with Summon Beast and baseLevel=0', async () => {
      const onCast = vi.fn();
      const phantasmalStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'phantasmal_creatures' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Phantasmal_Creatures_freeCastCount') return 1;
        if (key === 'spell_slots_level_2') return 3;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Summon Beast',
        level: 2,
        school: 'Conjuration',
        damage: { damage_at_slot_level: { '2': '3d6' } },
      };

      renderPopup(spell, phantasmalStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Summon Beast');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });

    it('calls onCast with Summon Fey and baseLevel=0', async () => {
      const onCast = vi.fn();
      const phantasmalStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'phantasmal_creatures' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Phantasmal_Creatures_freeCastCount') return 1;
        if (key === 'spell_slots_level_2') return 3;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Summon Fey',
        level: 2,
        school: 'Conjuration',
        damage: { damage_at_slot_level: { '2': '3d6' } },
      };

      renderPopup(spell, phantasmalStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Summon Fey');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });

    it('calls onCast with Summon Fey and baseLevel=0 when appending to existing list', async () => {
      const onCast = vi.fn();
      const phantasmalStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'phantasmal_creatures' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Phantasmal_Creatures_freeCastCount') return 1;
        if (key === '_phantasmalCreatures_list') return ['Bestial Spirit'];
        if (key === 'spell_slots_level_2') return 3;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Summon Fey',
        level: 2,
        school: 'Conjuration',
        damage: { damage_at_slot_level: { '2': '3d6' } },
      };

      renderPopup(spell, phantasmalStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Summon Fey');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });
  });

  describe('metaCtx for overchannel', () => {
    it('passes overchannel: false in metaCtx when not toggled', async () => {
      const onCast = vi.fn();
      const overchannelStats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'overchannel' }],
          actions: [],
        },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });
      vi.mocked(useRuntimeValue).mockReturnValue(0);

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '1d6' } },
      };

      renderPopup(spell, overchannelStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Magic Missile');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
      const metaCtx = onCast.mock.calls[0][1];
      expect(metaCtx.overchannel).toBe(false);
    });
  });
});

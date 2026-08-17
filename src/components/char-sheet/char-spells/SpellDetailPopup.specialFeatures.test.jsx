// @cleaned-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';

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
    />,
  );

describe('SpellDetailPopup - handleCast: Special features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
    vi.mocked(getCombatSummary).mockReturnValue(null);
  });

  describe('SpellBreaker — Dispel Magic as bonus action', () => {
    it.each([
      { spellName: 'Dispel Magic', expectBonus: true },
      { spellName: 'Magic Missile', expectBonus: false },
    ])('passes dispelAbilityCheckBonus in metaCtx when casting $spellName with SpellBreaker', async ({ spellName, expectBonus }) => {
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
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: spellName,
        level: spellName === 'Dispel Magic' ? 3 : 1,
        casting_time: '1 action',
        damage: spellName === 'Dispel Magic' ? null : { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, spellBreakerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const metaCtx = onCast.mock.calls[0][1];
      if (expectBonus) {
        expect(metaCtx.dispelAbilityCheckBonus).toBe(3);
      } else {
        expect(metaCtx.dispelAbilityCheckBonus).toBeUndefined();
      }
    });
  });

  describe('Psychic Spells — damage type override', () => {
    it('passes usePsychicDamage:true when psychic damage toggle is checked', async () => {
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
      expect(onCast.mock.calls[0][0].usePsychicDamage).toBe(true);
    });

    it('passes usePsychicDamage:false when psychic damage toggle is not checked', async () => {
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

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].usePsychicDamage).toBe(false);
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

});

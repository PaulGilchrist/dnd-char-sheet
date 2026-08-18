// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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

vi.mock('../../../services/automation/handlers/class-wizard/overchannelHandler.js', () => ({
  getOverchannelNecroticDamage: vi.fn(() => null),
}));

vi.mock('../../../services/rules/spells/metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

vi.mock('../../../services/rules/spells/spellPreparationService.js', () => ({
  isFreeCastAuthorized: vi.fn(() => Promise.resolve(false)),
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
  extraProps = {},
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
    vi.mocked(getRuntimeValue).mockReturnValue(null);
  });

  describe('SpellBreaker — Dispel Magic as bonus action', () => {
    function makeSpellBreakerStats() {
      return {
        ...baseMockPlayerStats,
        automation: {
          passives: [{ type: 'spell_breaker' }],
          actions: [],
        },
      };
    }

    function setupSpellSlots(slots) {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        return slots[key] ?? null;
      });
    }

    it('passes dispelAbilityCheckBonus in metaCtx when casting Dispel Magic with SpellBreaker', async () => {
      const onCast = vi.fn();
      const spellBreakerStats = makeSpellBreakerStats();
      setupSpellSlots({ spell_slots_level_3: 2 });

      const spell = {
        ...baseMockSpell,
        name: 'Dispel Magic',
        level: 3,
        casting_time: '1 action',
        damage: null,
      };

      renderPopup(spell, spellBreakerStats, mockCampaignName, { onCast });
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Dispel Magic');
      expect(onCast.mock.calls[0][1].dispelAbilityCheckBonus).toBe(3);
    });

    it('does not pass dispelAbilityCheckBonus when casting a non-Dispel Magic spell with SpellBreaker', async () => {
      const onCast = vi.fn();
      const spellBreakerStats = makeSpellBreakerStats();
      setupSpellSlots({ spell_slots_level_1: 4 });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        casting_time: '1 action',
      };

      renderPopup(spell, spellBreakerStats, mockCampaignName, { onCast });
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Magic Missile');
      expect(onCast.mock.calls[0][1].dispelAbilityCheckBonus).toBeUndefined();
    });
  });

  describe('Psychic Spells — damage type override', () => {
    function makeWarlockStats() {
      return {
        ...baseMockPlayerStats,
        class: { name: 'Warlock', major: { name: 'Warlock' } },
        automation: {
          passives: [{ type: 'psychic_spells' }],
          actions: [],
        },
      };
    }

    function makeBurningHands() {
      return {
        ...baseMockSpell,
        name: 'Burning Hands',
        level: 1,
        school: 'Evocation',
        damage: { damage_at_slot_level: { '1': '3d4' } },
      };
    }

    function setupWarlockSlots() {
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });
    }

    it('passes usePsychicDamage:true when the psychic damage toggle is checked before casting', async () => {
      const onCast = vi.fn();
      setupWarlockSlots();

      renderPopup(makeBurningHands(), makeWarlockStats(), mockCampaignName, { onCast });
      fireEvent.click(screen.getByText('Change damage type to Psychic'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Burning Hands');
      expect(onCast.mock.calls[0][0].usePsychicDamage).toBe(true);
    });

    it('passes usePsychicDamage:false when the psychic damage toggle is not checked', async () => {
      const onCast = vi.fn();
      setupWarlockSlots();

      renderPopup(makeBurningHands(), makeWarlockStats(), mockCampaignName, { onCast });
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Burning Hands');
      expect(onCast.mock.calls[0][0].usePsychicDamage).toBe(false);
    });

    it('does not render the psychic damage toggle for spells without damage', () => {
      const onCast = vi.fn();

      renderPopup(
        { ...baseMockSpell, name: 'Bane', level: 1, damage: null },
        makeWarlockStats(),
        mockCampaignName,
        { onCast },
      );

      expect(screen.queryByText('Change damage type to Psychic')).not.toBeInTheDocument();
    });
  });
});

// SpellDetailPopup no longer calls prepareSpellCast directly.
// Slot consumption, free cast cleanup, and concentration management
// are handled downstream in gateMetamagic → prepareSpellCast.
// These tests verify that handleCast passes the correct spell to onCast.

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import * as storageService from '../../../services/ui/storage.js';

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

vi.mock('../../../services/ui/storage.js', () => ({
  default: { set: vi.fn() },
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

describe('SpellDetailPopup - handleCast: Free cast tracking cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
    vi.mocked(storageService.default.set).mockReturnValue();
  });

  describe('Natural Recovery cleanup', () => {
    it('calls onCast with spell when casting a free cast spell', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'naturalRecoveryFreeCast') return ['Healing Word'];
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Healing Word',
        level: 1,
        damage: { damage_at_slot_level: { '1': '1d4+1' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Healing Word');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });
  });

  describe('Bewitching Magic cleanup', () => {
    it('calls onCast with spell when casting Misty Step', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Bewitching_Magic_freeCast') return true;
        if (key === 'spell_slots_level_2') return 3;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Misty Step',
        level: 2,
        damage: { damage_at_slot_level: { '2': '3d6' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Misty Step');
    });

    it('calls onCast for non-Misty Step spells', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Bewitching_Magic_freeCast') return true;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
    });
  });

  describe('Signature Spells cleanup', () => {
    it('calls onCast with Signature Spell', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
        if (key === 'SignatureSpells_selection') return ['Fireball'];
        if (key === 'SignatureSpells_Fireball_used') return false;
        if (key === 'spell_slots_level_3') return 2;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Fireball',
        level: 3,
        damage: { damage_at_slot_level: { '3': '8d6' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Fireball');
    });

    it('does not match Signature Spell for wrong level', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
        if (key === 'SignatureSpells_selection') return ['Fireball'];
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Magic Missile',
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
    });
  });

  describe('Divination Savant cleanup', () => {
    it('calls onCast with Divination Savant spell', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
        if (key === '_Divination_Savant_selection') return ['Warding Bond'];
        if (key === '_Divination_Savant_Warding_Bond_used') return false;
        if (key === 'spell_slots_level_2') return 3;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'Warding Bond',
        level: 2,
        damage: { damage_at_slot_level: { '2': '2d6' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Warding Bond');
    });
  });

  describe('Counter-based free cast count decrement', () => {
    it('calls onCast for counter-based free_spell action', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Mystic_Arcanum_freeCastCount') return 1;
        if (key === 'spell_slots_level_9') return 1;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'a level 9 Warlock spell (your choice)',
        level: 9,
        damage: { damage_at_slot_level: { '9': '10d6' } },
      };
      const stats = {
        ...baseMockPlayerStats,
        spellAbilities: {
          ...baseMockPlayerStats.spellAbilities,
          spell_slots_level_9: 1,
        },
        automation: {
          passives: [],
          actions: [
            {
              name: 'Mystic Arcanum',
              type: 'free_spell',
              spell: 'a level 9 Warlock spell (your choice)',
              uses_expression: '1/rest',
              usesMax: 1,
            },
          ],
        },
      };

      renderPopup(spell, stats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
    });
  });

  describe('perSpellTracking free cast cleanup', () => {
    it('calls onCast for perSpellTracking free spell', async () => {
      const onCast = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === '_Feature_A_SpellA_freeCast') return true;
        if (key === '_Feature_A_SpellA_used') return false;
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        name: 'SpellA',
        level: 1,
        damage: { damage_at_slot_level: { '1': '1d6' } },
      };
      const stats = {
        ...baseMockPlayerStats,
        automation: {
          passives: [],
          actions: [
            {
              name: 'Feature A',
              type: 'free_spell',
              spell: 'SpellA',
              perSpellTracking: true,
            },
          ],
        },
      };

      renderPopup(spell, stats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('SpellA');
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';

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

describe('SpellDetailPopup - handleCast: Concentration management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
    vi.mocked(getCombatSummary).mockReturnValue(null);
  });

  describe('casting a concentration spell', () => {
    it('calls onCast with the concentration spell and baseLevel=0', () => {
      const onCast = vi.fn();
      const concentrationSpell = {
        ...baseMockSpell,
        name: 'Bane',
        level: 1,
        concentration: true,
        damage: null,
        dc: { dc_type: 'CHA', dc_success: 'half' },
      };
      const cs = {
        creatures: [{ name: 'Elara', concentration: null }],
      };
      vi.mocked(getCombatSummary).mockReturnValue(cs);

      renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Bane');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });

    it('calls onCast even when combat summary is null', () => {
      const onCast = vi.fn();
      const concentrationSpell = {
        ...baseMockSpell,
        name: 'Bane',
        level: 1,
        concentration: true,
        damage: null,
        dc: { dc_type: 'CHA', dc_success: 'half' },
      };
      vi.mocked(getCombatSummary).mockReturnValue(null);

      renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Bane');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });

    it('calls onCast for a non-concentration spell with baseLevel=0', () => {
      const onCast = vi.fn();
      const noConcentrationSpell = {
        ...baseMockSpell,
        name: 'Fireball',
        level: 3,
        concentration: false,
        damage: { damage_at_slot_level: { '3': '8d6' } },
      };
      const cs = {
        creatures: [{ name: 'Elara', concentration: null }],
      };
      vi.mocked(getCombatSummary).mockReturnValue(cs);

      renderPopup(noConcentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast.mock.calls[0][0].name).toBe('Fireball');
      expect(onCast.mock.calls[0][0].baseLevel).toBe(undefined);
    });
  });
});

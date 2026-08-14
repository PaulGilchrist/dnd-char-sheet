// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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
    />
  );

describe('SpellDetailPopup - handleCast: Concentration management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(setRuntimeValue).mockReturnValue();
    vi.mocked(getActiveBuffs).mockReturnValue([]);
    vi.mocked(getCombatSummary).mockReturnValue(null);
  });

  describe('concentration spell casting', () => {
    const concentrationSpell = {
      ...baseMockSpell,
      name: 'Bane',
      level: 1,
      concentration: true,
      damage: null,
      dc: { dc_type: 'CHA', dc_success: 'half' },
    };

    it('calls onCast with the concentration spell name and baseLevel:undefined', async () => {
      const onCast = vi.fn();
      const cs = {
        creatures: [{ name: 'Elara', concentration: null }],
      };
      vi.mocked(getCombatSummary).mockReturnValue(cs);

      renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const passedSpell = onCast.mock.calls[0][0];
      expect(passedSpell.name).toBe('Bane');
      expect(passedSpell.baseLevel).toBe(undefined);
    });

    it('calls onCast even when combat summary is null', async () => {
      const onCast = vi.fn();
      vi.mocked(getCombatSummary).mockReturnValue(null);

      renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const passedSpell = onCast.mock.calls[0][0];
      expect(passedSpell.name).toBe('Bane');
      expect(passedSpell.baseLevel).toBe(undefined);
    });

    it('passes isUpcast:undefined and freeCastAuthorized:false for concentration spell without upcast', async () => {
      const onCast = vi.fn();

      renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const passedSpell = onCast.mock.calls[0][0];
      expect(passedSpell.isUpcast).toBe(undefined);
      expect(passedSpell.freeCastAuthorized).toBe(false);
    });

    it('does not call onCast when player is raging', async () => {
      const onCast = vi.fn();
      vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);

      renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).not.toHaveBeenCalled();
    });
  });

  describe('non-concentration spell casting', () => {
    const nonConcentrationSpell = {
      ...baseMockSpell,
      name: 'Fireball',
      level: 3,
      concentration: false,
      damage: { damage_at_slot_level: { '3': '8d6' } },
    };

    it('calls onCast with the non-concentration spell name and baseLevel:undefined', async () => {
      const onCast = vi.fn();
      const cs = {
        creatures: [{ name: 'Elara', concentration: null }],
      };
      vi.mocked(getCombatSummary).mockReturnValue(cs);

      renderPopup(nonConcentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).toHaveBeenCalledTimes(1);
      const passedSpell = onCast.mock.calls[0][0];
      expect(passedSpell.name).toBe('Fireball');
      expect(passedSpell.baseLevel).toBe(undefined);
    });

    it('does not call onCast when player is raging', async () => {
      const onCast = vi.fn();
      vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);

      renderPopup(nonConcentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();

      expect(onCast).not.toHaveBeenCalled();
    });
  });
});

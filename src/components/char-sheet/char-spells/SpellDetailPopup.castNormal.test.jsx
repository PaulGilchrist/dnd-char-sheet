import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { addConcentration, breakConcentration } from '../../../services/combat/concentration/concentrationService.js';
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

vi.mock('../../../services/combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
  breakConcentration: vi.fn(),
  cleanupConcentrationEffects: vi.fn(),
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

describe('SpellDetailPopup - handleCast: Normal spell casting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
    vi.mocked(setRuntimeValue).mockReturnValue();
    vi.mocked(getCombatSummary).mockReturnValue(null);
    vi.mocked(addConcentration).mockReturnValue();
    vi.mocked(breakConcentration).mockReturnValue(null);
    vi.mocked(storageService.default.set).mockReturnValue();
  });

  describe('non-upcastable spell casting', () => {
    it('calls onCast with spell and baseLevel without consuming slot', async () => {
      const onCast = vi.fn();
      const nonUpcastableSpell = {
        ...baseMockSpell,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(nonUpcastableSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();
      expect(onCast).toHaveBeenCalledTimes(1);
      const modifiedSpell = onCast.mock.calls[0][0];
      expect(modifiedSpell.name).toBe('Magic Missile');
      expect(modifiedSpell.level).toBe(1);
      expect(modifiedSpell.baseLevel).toBe(0);
      // Slot consumption now happens downstream in gateMetamagic → prepareSpellCast
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('passes spell through without modifying stored slot value', async () => {
      const onCast = vi.fn();
      const nonUpcastableSpell = {
        ...baseMockSpell,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 2;
        return null;
      });

      renderPopup(nonUpcastableSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();
      expect(onCast).toHaveBeenCalledTimes(1);
      // Slot consumption now happens downstream in gateMetamagic → prepareSpellCast
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('passes spell through without modifying spellAbilities max', async () => {
      const onCast = vi.fn();
      const nonUpcastableSpell = {
        ...baseMockSpell,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(nonUpcastableSpell, baseMockPlayerStats, mockCampaignName, { onCast });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
      await flushPromises();
      expect(onCast).toHaveBeenCalledTimes(1);
      // Slot consumption now happens downstream in gateMetamagic → prepareSpellCast
      expect(setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('upcast spell casting', () => {
    it('calls onCast with upcasted level and decrements the upcast slot', async () => {
      const onCast = vi.fn();
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_2') return 3;
        return null;
      });

      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, {
        onCast,
        upcastLevels,
      });

      // Select level 2 upcast
      fireEvent.click(screen.getByText('Level 2'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      await flushPromises();
      expect(onCast).toHaveBeenCalledTimes(1);
      const modifiedSpell = onCast.mock.calls[0][0];
      expect(modifiedSpell.level).toBe(2);
      expect(modifiedSpell.baseLevel).toBe(1);
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Elara',
        'spell_slots_level_2',
        2,
        mockCampaignName
      );
    });

    it('uses base level when upcast level is selected but matches spell level', async () => {
      const onCast = vi.fn();
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];

      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, {
        onCast,
        upcastLevels,
      });

      // Default selected is level 1 which matches spell level
      // But since isUpcastable is true and selectedUpcastLvl === "1" === spell.level,
      // isUpcast is false, so it goes through the freeCastAuthorized branch or normal slot consumption
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      // Since isUpcast is false (selected level 1 === spell level 1),
      // and freeCastAuthorized is false, it falls to the else branch
      await flushPromises();
      expect(onCast).toHaveBeenCalledTimes(1);
      const modifiedSpell = onCast.mock.calls[0][0];
      expect(modifiedSpell.level).toBe(1);
      expect(modifiedSpell.baseLevel).toBe(undefined);
    });
  });
});

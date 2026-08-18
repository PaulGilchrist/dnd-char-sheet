// @improved-by-ai
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

vi.mock('../../../services/rules/spells/spellPreparationService.js', () => ({
  isFreeCastAuthorized: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/class-wizard/overchannelHandler.js', () => ({
  getOverchannelNecroticDamage: vi.fn(),
}));

vi.mock('../../../services/rules/spells/metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

vi.mock('../../../services/rules/spells/materialComponents.js', () => ({
  getConsumedMaterial: vi.fn(() => null),
  hasMaterial: vi.fn(() => true),
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

describe('SpellDetailPopup - handleCast: Normal spell casting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('upcast selector visibility', () => {
    it('hides upcast selector when only one upcast level exists', () => {
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });
      expect(screen.queryByText(/Cast at Level:/)).not.toBeInTheDocument();
    });

    it('hides upcast selector when spell is not upcastable (single damage value)', () => {
      const nonUpcastableSpell = {
        ...baseMockSpell,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      renderPopup(nonUpcastableSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });
      expect(screen.queryByText(/Cast at Level:/)).not.toBeInTheDocument();
    });

    it('hides upcast selector when upcastLevels is empty', () => {
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels: [] });
      expect(screen.queryByText(/Cast at Level:/)).not.toBeInTheDocument();
    });
  });

  describe('cast button state', () => {
    it('enables the cast button when at least one upcast level has available slots', () => {
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('disables the cast button when no upcast levels have available slots', () => {
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 0 },
        { level: 2, formula: '4d4+1', availableSlots: 0 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });

    it('disables the cast button when upcastLevels is empty on an upcastable spell with no other slot source', () => {
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels: [] });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });

    it('disables the cast button when the player is raging', () => {
      vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });
  });

  describe('casting without upcast', () => {
    it('calls onCast with base spell data when casting at the spell\'s base level', () => {
      const onCast = vi.fn();
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { onCast, upcastLevels });

      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      expect(onCast).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Magic Missile',
          level: 1,
          isUpcast: false,
          freeCastAuthorized: false,
          usePsionicPayment: false,
          usePsychicDamage: false,
        }),
        expect.objectContaining({ overchannel: false })
      );
    });
  });

  describe('upcast spell casting', () => {
    it('calls onCast with isUpcast:true and upcastLevel when selecting a higher level', () => {
      const onCast = vi.fn();
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];

      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, {
        onCast,
        upcastLevels,
      });

      fireEvent.click(screen.getByText('Level 2'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      const [modifiedSpell, metaCtx] = onCast.mock.calls[0];
      expect(modifiedSpell.name).toBe('Magic Missile');
      expect(modifiedSpell.level).toBe(1);
      expect(modifiedSpell.isUpcast).toBe(true);
      expect(modifiedSpell.upcastLevel).toBe(2);
      expect(modifiedSpell.freeCastAuthorized).toBe(false);
      expect(modifiedSpell.usePsionicPayment).toBe(false);
      expect(modifiedSpell.usePsychicDamage).toBe(false);
      expect(metaCtx.overchannel).toBe(false);
    });

    it('calls onCast with isUpcast:false when casting at the selected level that matches the base level', () => {
      const onCast = vi.fn();
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];

      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, {
        onCast,
        upcastLevels,
      });

      fireEvent.click(screen.getByText('Level 1'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      const [modifiedSpell] = onCast.mock.calls[0];
      expect(modifiedSpell.isUpcast).toBe(false);
      expect(modifiedSpell.upcastLevel).toBeUndefined();
    });

    it('allows upcasting to the highest available level', () => {
      const onCast = vi.fn();
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
        { level: 3, formula: '5d4+1', availableSlots: 2 },
      ];

      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, {
        onCast,
        upcastLevels,
      });

      fireEvent.click(screen.getByText('Level 3'));
      fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

      expect(onCast).toHaveBeenCalledTimes(1);
      const [modifiedSpell] = onCast.mock.calls[0];
      expect(modifiedSpell.isUpcast).toBe(true);
      expect(modifiedSpell.upcastLevel).toBe(3);
    });
  });

  describe('upcast selector UI', () => {
    it('displays all available upcast levels with their formulas', () => {
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });

      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('3d4+1')).toBeInTheDocument();
      expect(screen.getByText('4d4+1')).toBeInTheDocument();
    });

    it('shows the selected upcast level with the selected styling', () => {
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });

      const selectedLevel = screen.getByText('Level 1');
      expect(selectedLevel.closest('.spell-detail-upcast-level')).toHaveClass('spell-detail-upcast-selected');
    });

    it('updates the selected level when a different level is clicked', () => {
      const upcastLevels = [
        { level: 1, formula: '3d4+1', availableSlots: 4 },
        { level: 2, formula: '4d4+1', availableSlots: 3 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { upcastLevels });

      fireEvent.click(screen.getByText('Level 2'));

      const selectedLevel = screen.getByText('Level 2');
      expect(selectedLevel.closest('.spell-detail-upcast-level')).toHaveClass('spell-detail-upcast-selected');
    });
  });

  describe('close button', () => {
    it('calls onClose when the close button is clicked', () => {
      const onClose = vi.fn();
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { onClose });

      fireEvent.click(screen.getByRole('button', { name: /Close/ }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

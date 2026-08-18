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

const concentrationSpell = {
  name: 'Bane',
  level: 1,
  description: 'Three darts of force strike a creature.',
  casting_time: '1 action',
  range: '120 feet',
  duration: 'Instantaneous',
  concentration: true,
  damage: null,
  dc: { dc_type: 'CHA', dc_success: 'half' },
};

const renderPopup = (
  spell = concentrationSpell,
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

describe('SpellDetailPopup - handleCast: Concentration spell casting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  it('calls onCast with the concentration spell when the player can cast', () => {
    const onCast = vi.fn();

    renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

    const castButton = screen.getByRole('button', { name: /Cast Spell/ });
    expect(castButton).not.toBeDisabled();

    fireEvent.click(castButton);

    expect(onCast).toHaveBeenCalledTimes(1);
    const passedSpell = onCast.mock.calls[0][0];
    expect(passedSpell.name).toBe('Bane');
    expect(passedSpell.level).toBe(1);
    expect(passedSpell.baseLevel).toBe(undefined);
    expect(passedSpell.isUpcast).toBe(undefined);
  });

  it('disables the cast button when the player is raging', () => {
    const onCast = vi.fn();
    vi.mocked(getActiveBuffs).mockReturnValue([{ name: 'Rage' }]);

    renderPopup(concentrationSpell, baseMockPlayerStats, mockCampaignName, { onCast });

    const castButton = screen.getByRole('button', { name: /Cast Spell/ });
    expect(castButton).toBeDisabled();

    fireEvent.click(castButton);

    expect(onCast).not.toHaveBeenCalled();
  });
});

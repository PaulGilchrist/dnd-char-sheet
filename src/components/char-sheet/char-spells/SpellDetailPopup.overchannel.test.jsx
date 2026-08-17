// @cleaned-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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
    />
  );

describe('SpellDetailPopup - Overchannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('Overchannel feature', () => {
    const overchannelStats = {
      ...baseMockPlayerStats,
      automation: {
        passives: [{ type: 'overchannel' }],
        actions: [],
      },
    };

    describe('checkbox visibility', () => {
      it.each([
        { name: 'level 0 cantrip', level: 0, hasDamage: true, shouldShow: false },
        { name: 'level 1 spell with damage', level: 1, hasDamage: true, shouldShow: true },
        { name: 'level 3 spell with damage', level: 3, hasDamage: true, shouldShow: true },
        { name: 'level 5 spell with damage (upper boundary)', level: 5, hasDamage: true, shouldShow: true },
        { name: 'level 6 spell (above range)', level: 6, hasDamage: true, shouldShow: false },
        { name: 'level 3 spell without damage', level: 3, hasDamage: false, shouldShow: false },
        { name: 'no overchannel passive', level: 3, hasDamage: true, hasPassive: false, shouldShow: false },
      ])(
        'checkbox $shouldShow for $name',
        ({ level, hasDamage, hasPassive = true, shouldShow }) => {
          const spell = {
            ...baseMockSpell,
            level,
            damage: hasDamage ? { damage_at_slot_level: { [String(level || 1)]: '3d6' } } : null,
          };
          const stats = hasPassive ? overchannelStats : { ...baseMockPlayerStats, automation: { passives: [], actions: [] } };
          renderPopup(spell, stats, mockCampaignName);
          if (shouldShow) {
            expect(screen.getByText('Overchannel (Maximize Damage)')).toBeInTheDocument();
          } else {
            expect(screen.queryByText('Overchannel (Maximize Damage)')).not.toBeInTheDocument();
          }
        },
      );
    });

    describe('overchannel warning messages', () => {
      it('shows first-use-no-damage message when use count is 0 and checkbox is toggled', () => {
        vi.mocked(useRuntimeValue).mockReturnValue(0);
        const spell = {
          ...baseMockSpell,
          level: 1,
          damage: { damage_at_slot_level: { '1': '1d6' } },
        };
        renderPopup(spell, overchannelStats, mockCampaignName);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(screen.getByText('First use: no necrotic damage')).toBeInTheDocument();
      });

      it('shows damage warning when use count > 1 and checkbox is toggled', () => {
        vi.mocked(useRuntimeValue).mockReturnValue(1);
        const spell = {
          ...baseMockSpell,
          level: 1,
          damage: { damage_at_slot_level: { '1': '1d6' } },
        };
        renderPopup(spell, overchannelStats, mockCampaignName);
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(screen.getByText(/Warning: Using Overchannel/)).toBeInTheDocument();
      });
    });

    describe('metaCtx overchannel flag on cast', () => {
      it.each([
        { toggled: false, expectedOverchannel: false, label: 'not toggled' },
        { toggled: true, expectedOverchannel: true, label: 'toggled' },
      ])('passes overchannel:$expectedOverchannel in metaCtx when $label', async ({ toggled, expectedOverchannel }) => {
        vi.mocked(useRuntimeValue).mockReturnValue(0);
        const onCast = vi.fn();
        const spell = {
          ...baseMockSpell,
          level: 1,
          damage: { damage_at_slot_level: { '1': '1d6' } },
        };
        renderPopup(spell, overchannelStats, mockCampaignName, { onCast });

        if (toggled) {
          fireEvent.click(screen.getByRole('checkbox'));
        }
        fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
        await flushPromises();

        expect(onCast).toHaveBeenCalledTimes(1);
        const metaCtx = onCast.mock.calls[0][1];
        expect(metaCtx.overchannel).toBe(expectedOverchannel);
      });
    });
  });
});

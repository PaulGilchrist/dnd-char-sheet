// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
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

const mockCampaignName = 'test-campaign';

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

describe('SpellDetailPopup - Material components display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('Consumed material display', () => {
    it.each([
      { name: 'Animate Dead', level: 3, dmg: { '3': '3d6' }, itemName: 'Drop of Blood.*Piece of Flesh.*Pinch of Bone Dust', required: 'a drop of blood, a piece of flesh, and a pinch of bone dust' },
      { name: 'Create Undead', level: 6, dmg: { '6': '4d6' }, itemName: 'Black Onyx.*150 gp', required: null },
      { name: 'Revivify', level: 3, dmg: null, itemName: 'Diamond.*300 gp', required: null },
    ])('shows material requirement for $name', ({ name, level, dmg, itemName, required }) => {
      const spell = {
        ...baseMockSpell,
        name,
        level,
        damage: dmg,
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName);
      expect(screen.getByText(/Material:/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(itemName))).toBeInTheDocument();
      if (required) {
        expect(screen.getByText(new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
      }
    });
  });

  describe('Missing material indicator', () => {
    it('shows "not found in backpack" when player lacks the material', () => {
      const spell = {
        ...baseMockSpell,
        name: 'Animate Dead',
        level: 3,
        damage: { damage_at_slot_level: { '3': '3d6' } },
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName);
      expect(screen.getByText('(not found in backpack)')).toBeInTheDocument();
    });

    it('hides missing indicator when player has the exact material in backpack', () => {
      const stats = {
        ...baseMockPlayerStats,
        inventory: {
          backpack: [
            'Drop of Blood, Piece of Flesh, Pinch of Bone Dust',
            'Longsword',
          ],
        },
      };
      const spell = {
        ...baseMockSpell,
        name: 'Animate Dead',
        level: 3,
        damage: { damage_at_slot_level: { '3': '3d6' } },
      };

      renderPopup(spell, stats, mockCampaignName);
      expect(screen.queryByText('(not found in backpack)')).not.toBeInTheDocument();
    });

    it('hides missing indicator when player has the material as an object item', () => {
      const stats = {
        ...baseMockPlayerStats,
        inventory: {
          backpack: [
            { name: 'Diamond (300 gp)', quantity: 1 },
            { name: 'Potion of Healing', quantity: 3 },
          ],
        },
      };
      const spell = {
        ...baseMockSpell,
        name: 'Revivify',
        level: 3,
      };

      renderPopup(spell, stats, mockCampaignName);
      expect(screen.queryByText('(not found in backpack)')).not.toBeInTheDocument();
    });
  });

  describe('No material display for spells without consumed materials', () => {
    it.each([
      { name: 'Magic Missile', level: 1 },
      { name: 'Fireball', level: 3, dmg: { '3': '8d6' } },
    ])('does not show material section for $name', ({ name, level, dmg }) => {
      const spell = {
        ...baseMockSpell,
        name,
        level,
        damage: dmg || baseMockSpell.damage,
      };

      renderPopup(spell, baseMockPlayerStats, mockCampaignName);
      expect(screen.queryByText(/Material:/)).not.toBeInTheDocument();
    });
  });
});

describe('SpellDetailPopup - Upcast formula resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('MOD substitution', () => {
    it.each([
      { modifier: 3, expected: ['1d8\\+3', '2d8\\+3'], label: 'positive modifier' },
      { modifier: undefined, expected: ['1d8\\+0', '2d8\\+0'], label: 'undefined (defaults to 0)' },
      { modifier: -1, expected: ['1d8\\+-1', '2d8\\+-1'], label: 'negative modifier' },
    ])('replaces MOD with $label ($modifier)', ({ modifier, expected }) => {
      const stats = {
        ...baseMockPlayerStats,
        spellAbilities: {
          ...baseMockPlayerStats.spellAbilities,
          modifier,
        },
      };
      const spell = {
        ...baseMockSpell,
        damage: {
          damage_at_slot_level: {
            '1': '1d8+MOD',
            '2': '2d8+MOD',
          },
        },
      };
      const upcastLevels = [
        { level: 1, formula: '1d8+MOD', availableSlots: 4 },
        { level: 2, formula: '2d8+MOD', availableSlots: 3 },
      ];

      renderPopup(spell, stats, mockCampaignName, { upcastLevels });
      expect(screen.getByText(new RegExp(expected[0]))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expected[1]))).toBeInTheDocument();
    });
  });

  it('handles MOD appearing multiple times in the same formula', () => {
    const stats = {
      ...baseMockPlayerStats,
      spellAbilities: {
        ...baseMockPlayerStats.spellAbilities,
        modifier: 2,
      },
    };
    const spell = {
      ...baseMockSpell,
      damage: {
        damage_at_slot_level: {
          '1': '2d6+MOD+MOD',
          '2': '3d6+MOD+MOD',
        },
      },
    };
    const upcastLevels = [
      { level: 1, formula: '2d6+MOD+MOD', availableSlots: 4 },
      { level: 2, formula: '3d6+MOD+MOD', availableSlots: 3 },
    ];

    renderPopup(spell, stats, mockCampaignName, { upcastLevels });
    expect(screen.getByText(/2d6\+2\+2/)).toBeInTheDocument();
    expect(screen.getByText(/3d6\+2\+2/)).toBeInTheDocument();
  });

  it('handles MOD at the start of a formula', () => {
    const stats = {
      ...baseMockPlayerStats,
      spellAbilities: {
        ...baseMockPlayerStats.spellAbilities,
        modifier: 5,
      },
    };
    const spell = {
      ...baseMockSpell,
      damage: {
        damage_at_slot_level: {
          '1': 'MOD+2d6',
          '2': 'MOD+3d6',
        },
      },
    };
    const upcastLevels = [
      { level: 1, formula: 'MOD+2d6', availableSlots: 4 },
      { level: 2, formula: 'MOD+3d6', availableSlots: 3 },
    ];

    renderPopup(spell, stats, mockCampaignName, { upcastLevels });
    expect(screen.getByText(/5\+2d6/)).toBeInTheDocument();
    expect(screen.getByText(/5\+3d6/)).toBeInTheDocument();
  });
});

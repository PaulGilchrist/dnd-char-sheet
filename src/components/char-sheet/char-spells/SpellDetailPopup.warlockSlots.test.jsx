// @improved-by-ai
import { render, screen } from '@testing-library/react';
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

const makeWarlockStats = (spellSlots) => ({
  ...baseMockPlayerStats,
  class: { name: 'Warlock', major: { name: 'Warlock' } },
  spellAbilities: {
    spell_slots_level_1: spellSlots?.level_1 ?? 0,
    spell_slots_level_2: spellSlots?.level_2 ?? 0,
    spell_slots_level_3: spellSlots?.level_3 ?? 0,
    spells: [],
  },
  automation: { passives: [], actions: [] },
});

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

describe('SpellDetailPopup - Warlock slot display and casting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Warlock slots remaining display', () => {
    it('shows the warlock slot level when warlock has no base slots but higher level slots available', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 2 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 0;
        if (key === 'spell_slots_level_2') return 2;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByText(/Slots Remaining:/)).toBeInTheDocument();
      expect(screen.getByText(/2 slot/)).toBeInTheDocument();
    });

    it('shows singular "slot" when warlock has exactly 1 slot remaining', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 1 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 0;
        if (key === 'spell_slots_level_2') return 1;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByText(/1 slot$/)).toBeInTheDocument();
      expect(screen.queryByText(/1 slots$/)).not.toBeInTheDocument();
    });

    it('shows 0 when warlock has no available slots', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 0 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key.startsWith('spell_slots_level_')) return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByText(/Slots Remaining:/)).toBeInTheDocument();
      expect(screen.getByText(/0$/)).toBeInTheDocument();
    });

    it('shows base level (1) slots when warlock has them available', () => {
      const warlockStats = makeWarlockStats({ level_1: 4, level_2: 0 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByText(/Slots Remaining:/)).toBeInTheDocument();
      expect(screen.getByText(/4 slot/)).toBeInTheDocument();
    });
  });

  describe('Warlock canCast logic', () => {
    it('enables cast button when warlock has no base level slots but higher level slots available', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 2 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 0;
        if (key === 'spell_slots_level_2') return 2;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('disables cast button when warlock has no available slots at any level', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 0 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key.startsWith('spell_slots_level_')) return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });

    it('enables cast for warlock when base level slots are available', () => {
      const warlockStats = makeWarlockStats({ level_1: 4, level_2: 0 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 4;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('uses current runtime value over spellAbilities max for slot availability', () => {
      const warlockStats = makeWarlockStats({ level_1: 4, level_2: 0 });
      // Runtime value is 0 (exhausted), spellAbilities max is 4
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });

    it('falls back to spellAbilities max when runtime value is null', () => {
      const warlockStats = makeWarlockStats({ level_1: 2, level_2: 0 });
      // Runtime value is null, so component falls back to spellAbilities
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_1') return null;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('searches up to level 9 for available warlock slots', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 0, level_3: 0 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_9') return 1;
        if (key.startsWith('spell_slots_level_')) return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 1,
        damage: { damage_at_slot_level: { '1': '3d4+1' } },
      };

      renderPopup(spell, warlockStats, mockCampaignName);
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });
  });

  describe('Warlock upcast casting', () => {
    it('enables cast when warlock can use higher level slots for upcast', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 0, level_3: 2 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'spell_slots_level_2') return 0;
        if (key === 'spell_slots_level_3') return 2;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 2,
        damage: {
          damage_at_slot_level: {
            '2': '4d4+1',
            '3': '5d4+1',
          },
        },
      };
      const upcastLevels = [
        { level: 2, formula: '4d4+1', availableSlots: 0 },
        { level: 3, formula: '5d4+1', availableSlots: 2 },
      ];

      renderPopup(spell, warlockStats, mockCampaignName, { upcastLevels });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
    });

    it('disables cast for upcast when warlock has no slots at the spell level or higher', () => {
      const warlockStats = makeWarlockStats({ level_1: 0, level_2: 0, level_3: 0 });
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key.startsWith('spell_slots_level_')) return 0;
        return null;
      });

      const spell = {
        ...baseMockSpell,
        level: 2,
        damage: {
          damage_at_slot_level: {
            '2': '4d4+1',
            '3': '5d4+1',
          },
        },
      };
      const upcastLevels = [
        { level: 2, formula: '4d4+1', availableSlots: 0 },
        { level: 3, formula: '5d4+1', availableSlots: 0 },
      ];

      renderPopup(spell, warlockStats, mockCampaignName, { upcastLevels });
      expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeDisabled();
    });
  });
});

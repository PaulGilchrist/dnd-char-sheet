// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';

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

const mockCampaignName = 'test-campaign';

describe('SpellDetailPopup - upcast selector visibility', () => {
  it('hides upcast selector when only one upcast level exists', () => {
    const upcastLevels = [
      { level: 1, formula: '3d4+1', availableSlots: 4 },
    ];
    render(
      <SpellDetailPopup
        spell={baseMockSpell}
        playerStats={baseMockPlayerStats}
        campaignName={mockCampaignName}
        onClose={vi.fn()}
        upcastLevels={upcastLevels}
      />
    );
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
    render(
      <SpellDetailPopup
        spell={nonUpcastableSpell}
        playerStats={baseMockPlayerStats}
        campaignName={mockCampaignName}
        onClose={vi.fn()}
        upcastLevels={upcastLevels}
      />
    );
    expect(screen.queryByText(/Cast at Level:/)).not.toBeInTheDocument();
  });
});

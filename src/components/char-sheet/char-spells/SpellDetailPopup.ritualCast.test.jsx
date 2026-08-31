// CLA-234 regression: SpellDetailPopup for a Nature Speaker ritual-only spell.
// With ZERO spell slots the popup must still show the ritual cast option, enable
// Cast Spell, display the Wisdom casting-ability override, and never show the
// "No spell slots available" warning. Non-ritual free casts keep the original
// "Free Cast — no spell slot consumed" line.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
  sanitizeHtml: (html) => html,
}));

const ritualText = 'Ritual Cast — cast as a Ritual, no spell slot consumed';
const freeCastText = 'Free Cast — no spell slot consumed';

// lv13 Path of the Wild Heart Barbarian; lv5 slots EMPTY.
const barbarianStats = {
  name: 'DraconicDragon',
  level: 13,
  class: { name: 'Barbarian', spell_casting_ability: 'Intelligence', major: { name: 'Path of the Wild Heart', spell_casting_ability: 'Wisdom' } },
  abilities: [
    { name: 'Intelligence', bonus: -1 },
    { name: 'Wisdom', bonus: 3 },
  ],
  proficiency: 5,
  spellAbilities: {
    spellCastingAbility: 'Intelligence',
    saveDc: 12,
    modifier: -1,
    spell_slots_level_5: 0,
    spells: [
      { name: 'Commune with Nature', level: 5, casting_time: 'Ritual', _ritualOnly: true, _ritualFeature: 'Nature Speaker', spellCastingAbility: 'Wisdom' },
    ],
  },
  automation: { passives: [], actions: [], bonusActions: [], specialActions: [] },
};

const communeSpell = {
  name: 'Commune with Nature',
  level: 5,
  description: '<p>You commune with nature spirits.</p>',
  casting_time: 'Ritual',
  range: 'Self',
  duration: 'Instantaneous',
  school: 'Divination',
  damage: null,
  ritual: true,
  _ritualOnly: true,
  _ritualFeature: 'Nature Speaker',
  spellCastingAbility: 'Wisdom',
};

describe('SpellDetailPopup — Nature Speaker ritual-only cast (CLA-234)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
  });

  it('shows the ritual cast line with zero spell slots and keeps Cast Spell enabled', () => {
    render(
      <SpellDetailPopup
        spell={communeSpell}
        playerStats={barbarianStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={vi.fn()}
      />
    );

    expect(screen.getByText(ritualText)).toBeInTheDocument();
    expect(screen.queryByText(freeCastText)).not.toBeInTheDocument();
    expect(screen.queryByText('No spell slots available for this level.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cast Spell/ })).toBeEnabled();
  });

  it('displays the Wisdom casting-ability override', () => {
    render(
      <SpellDetailPopup
        spell={communeSpell}
        playerStats={barbarianStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={vi.fn()}
      />
    );

    expect(screen.getByText(/Casting Ability:/)).toBeInTheDocument();
    expect(screen.getByText(/Wisdom/)).toBeInTheDocument();
  });

  it('passes freeCastAuthorized through onCast', () => {
    const onCast = vi.fn();
    render(
      <SpellDetailPopup
        spell={communeSpell}
        playerStats={barbarianStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={onCast}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));
    expect(onCast).toHaveBeenCalledTimes(1);
    expect(onCast.mock.calls[0][0].freeCastAuthorized).toBe(true);
  });

  it('keeps the classic Free Cast line for non-ritual authorized spells', () => {
    vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
      if (key === '_Bewitching_Magic_freeCast') return true;
      return null;
    });
    const spell = {
      name: 'Misty Step',
      level: 2,
      description: 'Teleport.',
      casting_time: '1 bonus action',
      range: 'Self',
      duration: 'Instantaneous',
      school: 'Conjuration',
      damage: null,
    };
    const stats = { ...barbarianStats, spellAbilities: { ...barbarianStats.spellAbilities, spell_slots_level_2: 0, spells: [spell] } };

    render(
      <SpellDetailPopup
        spell={spell}
        playerStats={stats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={vi.fn()}
      />
    );

    expect(screen.getByText(freeCastText)).toBeInTheDocument();
    expect(screen.queryByText(ritualText)).not.toBeInTheDocument();
  });
});

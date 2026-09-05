// FT-068 regression: SpellDetailPopup Quick Ritual affordance for Ritual Master
// feat-granted prepared ritual spells — checkbox offers a regular-casting-time
// slot-free cast, disabled + warned once the once-per-long-rest counter is spent,
// and the cast payload carries quickRitual only when the box is ticked.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
  sanitizeHtml: (html) => html,
}));

const hexStats = {
  name: 'HexWarlock',
  level: 14,
  class: { name: 'Warlock', spell_casting_ability: 'Charisma' },
  abilities: [{ name: 'Charisma', bonus: 4 }],
  proficiency: 5,
  spellAbilities: {
    spellCastingAbility: 'Charisma',
    saveDc: 17,
    modifier: 4,
    spell_slots_level_1: 0,
    spell_slots_level_5: 2,
  },
  automation: { passives: [], actions: [], bonusActions: [], specialActions: [] },
};

const identifySpell = {
  name: 'Identify',
  level: 1,
  description: '<p>You choose one object that you must touch.</p>',
  casting_time: '1 minute',
  range: 'Touch',
  duration: 'Instantaneous',
  school: 'Divination',
  damage: null,
  ritual: true,
  _ritualMasterRitual: true,
  spellCastingAbility: 'Charisma',
};

describe('SpellDetailPopup — FT-068 Quick Ritual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(useRuntimeValue).mockReturnValue(null);
  });

  it('offers the Quick Ritual checkbox while the counter is fresh', () => {
    render(
      <SpellDetailPopup
        spell={identifySpell}
        playerStats={hexStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Quick Ritual/ });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeDisabled();
    expect(screen.queryByText(/Quick Ritual already used/)).not.toBeInTheDocument();
  });

  it('ticks Quick Ritual and forwards quickRitual:true in the cast payload', () => {
    const onCast = vi.fn();
    render(
      <SpellDetailPopup
        spell={identifySpell}
        playerStats={hexStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={onCast}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /Quick Ritual/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

    expect(onCast).toHaveBeenCalledTimes(1);
    expect(onCast.mock.calls[0][0].quickRitual).toBe(true);
  });

  it('leaves quickRitual false when the box is unticked', () => {
    const onCast = vi.fn();
    render(
      <SpellDetailPopup
        spell={identifySpell}
        playerStats={hexStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={onCast}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cast Spell/ }));

    expect(onCast).toHaveBeenCalledTimes(1);
    expect(onCast.mock.calls[0][0].quickRitual).toBe(false);
  });

  it('disables the checkbox and warns once Quick Ritual is spent for the Long Rest', () => {
    vi.mocked(useRuntimeValue).mockReturnValue(1234567890);
    render(
      <SpellDetailPopup
        spell={identifySpell}
        playerStats={hexStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: /Quick Ritual/ })).toBeDisabled();
    expect(screen.getByText(/Quick Ritual already used/)).toBeInTheDocument();
  });

  it('does not offer Quick Ritual for non-granted or non-ritual spells', () => {
    render(
      <SpellDetailPopup
        spell={{ ...identifySpell, _ritualMasterRitual: undefined }}
        playerStats={hexStats}
        campaignName="test-campaign"
        onClose={vi.fn()}
        onCast={vi.fn()}
      />
    );

    expect(screen.queryByRole('checkbox', { name: /Quick Ritual/ })).not.toBeInTheDocument();
  });
});

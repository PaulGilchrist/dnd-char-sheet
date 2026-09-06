// CLA-322: Spell Breaker display override helper.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
}));

import { isSpellBreakerBonusActionSpell } from './spellSectionUtils.js';

const SPELL_BREAKER = {
  type: 'spell_breaker',
  name: 'Spell Breaker',
  bonusActionSpells: ['Dispel Magic'],
};

describe('spellSectionUtils — isSpellBreakerBonusActionSpell (CLA-322)', () => {
  it('returns true for spells listed in the Spell Breaker bonusActionSpells', () => {
    const ps = { automation: { passives: [SPELL_BREAKER] } };
    expect(isSpellBreakerBonusActionSpell(ps, 'Dispel Magic')).toBe(true);
  });

  it('returns false for unlisted spell names', () => {
    const ps = { automation: { passives: [SPELL_BREAKER] } };
    expect(isSpellBreakerBonusActionSpell(ps, 'Counterspell')).toBe(false);
  });

  it('returns false without the Spell Breaker passive (5e regression gate)', () => {
    expect(isSpellBreakerBonusActionSpell({ automation: { passives: [] } }, 'Dispel Magic')).toBe(false);
    expect(isSpellBreakerBonusActionSpell({}, 'Dispel Magic')).toBe(false);
    expect(isSpellBreakerBonusActionSpell(null, 'Dispel Magic')).toBe(false);
  });

  it('returns false for a missing spell name', () => {
    const ps = { automation: { passives: [SPELL_BREAKER] } };
    expect(isSpellBreakerBonusActionSpell(ps, null)).toBe(false);
    expect(isSpellBreakerBonusActionSpell(ps, undefined)).toBe(false);
  });
});

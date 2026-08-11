import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionSpellMetamagic } from './useActionSpellMetamagic.js';
import { makeHookProps, makeSpell, setupBeforeEach } from './useActionSpellMetamagic.test-helpers.js';

vi.mock('./useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 5),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
  logMetamagicUse: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/spells/metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

vi.mock('../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn(() => Promise.resolve({ modifiedSpell: {}, metaCtx: {} })),
  isFreeCastAuthorized: vi.fn(() => false),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(() => Promise.resolve(null)),
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

describe('useActionSpellMetamagic - handleActionMetamagicSkip', () => {
  setupBeforeEach();

  it('does nothing when no pending metamagic', () => {
    const props = makeHookProps();
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    act(() => {
      result.current.handleActionMetamagicSkip();
    });

    expect(result.current.pendingActionMetamagic).toBeNull();
  });

  it('clears pending and calls action with empty metaCtx on skip', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { addEntry } = await import('../../services/ui/logService.js');
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);

    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicSkip();
    });

    expect(result.current.pendingActionMetamagic).toBeNull();
    expect(addEntry).toHaveBeenCalledWith(
      'test-campaign',
      expect.objectContaining({
        type: 'spell',
        characterName: 'TestSorcerer',
        spellName: 'Fireball',
        spellLevel: 3,
        castingTime: '1 Action',
        metamagic: [],
        spCost: 0,
        timestamp: expect.any(Number),
      }),
    );
  });
});

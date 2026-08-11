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

describe('useActionSpellMetamagic - handleActionMetamagicConfirm', () => {
  setupBeforeEach();

  it('does nothing when no pending metamagic', () => {
    const props = makeHookProps();
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    act(() => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(result.current.pendingActionMetamagic).toBeNull();
  });

  it('clears pending and calls action on confirm with basic result', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
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
      result.current.handleActionMetamagicConfirm({});
    });

    expect(result.current.pendingActionMetamagic).toBeNull();
    expect(executeSpellCast).toHaveBeenCalled();
  });

  it('spends sorcery points when totalCost > 0', async () => {
    const { spendSorceryPoints } = await import('./useMetamagic.js');
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
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
      result.current.handleActionMetamagicConfirm({ totalCost: 3, options: ['Heightened Spell'] });
    });

    expect(spendSorceryPoints).toHaveBeenCalledWith(
      'TestSorcerer',
      3,
      'test-campaign',
      10,
    );
  });

  it('adds Psionic Sorcery to options when psionicCost > 0', async () => {
    const { logMetamagicUse } = await import('./useMetamagic.js');
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

    isPsionicSpell.mockReturnValue(true);
    hasPsionicSorcery.mockReturnValue(true);

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
      result.current.handleActionMetamagicConfirm({ totalCost: 0, options: [] });
    });

    expect(logMetamagicUse).toHaveBeenCalledWith(
      'test-campaign',
      'TestSorcerer',
      'Fireball',
      expect.arrayContaining(['Psionic Sorcery']),
      3,
    );
  });

  it('logs metamagic use when totalCost > 0', async () => {
    const { logMetamagicUse } = await import('./useMetamagic.js');
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
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

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 2, options: ['Quickened Spell'] });
    });

    expect(logMetamagicUse).toHaveBeenCalledWith(
      'test-campaign',
      'TestSorcerer',
      'Fireball',
      expect.arrayContaining(['Quickened Spell']),
      2,
    );
  });

  it('adds logEntry for spell when confirming with metamagic', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
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

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 2, options: ['Quickened Spell'] });
    });

    expect(addEntry).toHaveBeenCalledWith(
      'test-campaign',
      expect.objectContaining({
        type: 'spell',
        characterName: 'TestSorcerer',
        spellName: 'Fireball',
        spellLevel: 3,
        castingTime: '1 Action',
        metamagic: expect.arrayContaining(['Quickened Spell']),
        spCost: 2,
        timestamp: expect.any(Number),
      }),
    );
  });

  it('sets metamagicHeighten in metaCtx when Heightened Spell is selected', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
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

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 3, options: ['Heightened Spell'] });
    });

    expect(executeSpellCast).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ metamagicHeighten: true }),
      expect.any(Object),
    );
  });

  it('sets metamagicCareful in metaCtx when Careful Spell is selected', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
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

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 1, options: ['Careful Spell'] });
    });

    expect(executeSpellCast).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ metamagicCareful: true }),
      expect.any(Object),
    );
  });

  it('sets metamagicTwinTarget when Twinned Spell with twinTarget', async () => {
    const spell = makeSpell({ name: 'Magic Missile', level: 1 });
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Magic Missile',
      spellLevel: 1,
      castingTime: '1 Action',
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    await act(async () => {
      result.current.handleActionMetamagicConfirm({
        totalCost: 1,
        options: ['Twinned Spell'],
        twinTarget: 'Goblin A',
      });
    });

    expect(executeSpellCast).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ metamagicTwinTarget: 'Goblin A' }),
      expect.any(Object),
    );
  });

  it('does not set metamagicTwinTarget when Twinned Spell without twinTarget', async () => {
    const spell = makeSpell({ name: 'Magic Missile', level: 1 });
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Magic Missile',
      spellLevel: 1,
      castingTime: '1 Action',
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    await act(async () => {
      result.current.handleActionMetamagicConfirm({
        totalCost: 1,
        options: ['Twinned Spell'],
      });
    });

    expect(executeSpellCast).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({}),
      expect.any(Object),
    );
  });

  it('sets metamagicDistant in metaCtx when Distant Spell is selected', async () => {
    const spell = makeSpell({ name: 'Magic Missile', level: 1 });
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Magic Missile',
      spellLevel: 1,
      castingTime: '1 Action',
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 1, options: ['Distant Spell'] });
    });

    expect(executeSpellCast).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ metamagicDistant: true }),
      expect.any(Object),
    );
  });

  it('sets psionicSpell in metaCtx when psionicCost > 0', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    isPsionicSpell.mockReturnValue(true);
    hasPsionicSorcery.mockReturnValue(true);
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

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 0, options: [] });
    });

    expect(executeSpellCast).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ psionicSpell: true }),
      expect.any(Object),
    );
  });

  it('does not spend SP when totalCost is 0', async () => {
    const { spendSorceryPoints } = await import('./useMetamagic.js');
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
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

    await act(async () => {
      result.current.handleActionMetamagicConfirm({ totalCost: 0, options: [] });
    });

    expect(spendSorceryPoints).not.toHaveBeenCalled();
  });
});

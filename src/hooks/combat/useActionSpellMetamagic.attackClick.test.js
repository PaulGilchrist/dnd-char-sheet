import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionSpellMetamagic } from './useActionSpellMetamagic.js';
import { makeHookProps, makeSpell, makeNonSorcererStats, setupBeforeEach } from './useActionSpellMetamagic.test-helpers.js';

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

describe('useActionSpellMetamagic - handleSpellAttackClick', () => {
  setupBeforeEach();

  it('returns early when cannotAct is true', async () => {
    const handleAttackClick = vi.fn();
    const props = makeHookProps({
      cannotAct: true,
      handleAttackClick,
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');

    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(handleAttackClick).not.toHaveBeenCalled();
    expect(executeSpellCast).not.toHaveBeenCalled();
    expect(prepareSpellCast).not.toHaveBeenCalled();
  });

  it('calls handleAttackClick when spell is not found for non-sorcerer', async () => {
    const handleAttackClick = vi.fn();
    const props = makeHookProps({
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [] },
      }),
      handleAttackClick,
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    const attack = {
      name: 'UnknownSpell',
      spellLevel: 0,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(handleAttackClick).toHaveBeenCalledWith(attack);
    expect(executeSpellCast).not.toHaveBeenCalled();
  });

  it('calls executeSpellCast for non-sorcerer when spell is found', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [spell] },
      }),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');

    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(prepareSpellCast).toHaveBeenCalled();
    expect(executeSpellCast).toHaveBeenCalled();
  });

  it('non-sorcerer calls setPopupHtml when automationPopup is returned', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [spell] },
      }),
      setPopupHtml: vi.fn(),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    executeSpellCast.mockResolvedValue({
      automationPopup: {
        type: 'popup',
        payload: '<div>Attack cast!</div>',
      },
    });

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Attack cast!</div>');
  });

  it('non-sorcerer does not call setPopupHtml when automationPopup type is modal', async () => {
    const spell = makeSpell();
    const setModalState = vi.fn();
    const props = makeHookProps({
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [spell] },
      }),
      setModalState,
      setPopupHtml: vi.fn(),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    executeSpellCast.mockResolvedValue({
      automationPopup: {
        type: 'modal',
        modalName: 'testModal',
        payload: { action: { name: 'Test' } },
      },
    });

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(props.setPopupHtml).not.toHaveBeenCalled();
  });

  it('sorcerer with no spell found calls handleAttackClick', async () => {
    const handleAttackClick = vi.fn();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [] },
      },
      handleAttackClick,
    });

    const attack = {
      name: 'UnknownSpell',
      spellLevel: 0,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(handleAttackClick).toHaveBeenCalledWith(attack);
  });

  it('sorcerer sets pendingActionMetamagic when spell is found', async () => {
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

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();
    expect(result.current.pendingActionMetamagic.spellName).toBe('Fireball');
    expect(result.current.pendingActionMetamagic.spellLevel).toBe(3);
  });

  it('sorcerer pending uses spell.casting_time from spell object', async () => {
    const spell = makeSpell({ casting_time: '1 Bonus Action' });
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

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic.castingTime).toBe('1 Bonus Action');
  });

  it('sorcerer pending uses attack.castingTime fallback when spell missing casting_time', async () => {
    const spell = makeSpell({});
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

    const attack = {
      name: 'Fireball',
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic.castingTime).toBe('1 Action');
  });

  it('sorcerer pending action calls executeSpellCast when confirmed', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(executeSpellCast).toHaveBeenCalled();
  });

  it('sorcerer pending action calls setPopupHtml when automationPopup returned', async () => {
    const spell = makeSpell();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
      setPopupHtml: vi.fn(),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
    executeSpellCast.mockResolvedValue({
      automationPopup: {
        type: 'popup',
        payload: '<div>Attack result!</div>',
      },
    });

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Attack result!</div>');
  });

  it('sorcerer pending action does not call setPopupHtml when automationPopup type is modal', async () => {
    const spell = makeSpell();
    const setModalState = vi.fn();
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
      setPopupHtml: vi.fn(),
      setModalState,
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    const { isPsionicSpell, hasPsionicSorcery } = await import('../../services/rules/spells/metamagicRules.js');

    isPsionicSpell.mockReturnValue(false);
    hasPsionicSorcery.mockReturnValue(false);
    executeSpellCast.mockResolvedValue({
      automationPopup: {
        type: 'modal',
        modalName: 'testModal',
        payload: { action: { name: 'Test' } },
      },
    });

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(props.setPopupHtml).not.toHaveBeenCalled();
  });

  it('sorcerer pending uses spell.level as fallback for attack.spellLevel', async () => {
    const spell = makeSpell({ level: 4 });
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

    const attack = {
      name: 'Fireball',
      spellLevel: 0,
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic.spellLevel).toBe(4);
  });

  it('sorcerer pending uses spell.level when attack missing spellLevel', async () => {
    const spell = makeSpell({ level: 5 });
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

    const attack = {
      name: 'Fireball',
      spellLevel: undefined,
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic.spellLevel).toBe(5);
  });

  it('sorcerer handleSpellAttackClick passes targetName from buildCtx to getTargetInfo', async () => {
    const spell = makeSpell();
    const buildCtx = vi.fn(async () => ({ targetName: 'Goblin A' }));
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
      buildCtx,
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
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(executeSpellCast).toHaveBeenCalled();
    const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
    const targetInfo = await getTargetInfo();
    expect(targetInfo).toEqual({ name: 'Goblin A' });
  });

  it('sorcerer handleSpellAttackClick getTargetInfo returns null when buildCtx has no targetName', async () => {
    const spell = makeSpell();
    const buildCtx = vi.fn(async () => ({}));
    const props = makeHookProps({
      playerStats: {
        name: 'TestSorcerer',
        class: { name: 'Sorcerer' },
        level: 5,
        spellAbilities: { spells: [spell] },
      },
      buildCtx,
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
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(executeSpellCast).toHaveBeenCalled();
    const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
    const targetInfo = await getTargetInfo();
    expect(targetInfo).toBeNull();
  });

  it('non-sorcerer handleSpellAttackClick with spell passes targetName from buildCtx to getTargetInfo', async () => {
    const spell = makeSpell();
    const buildCtx = vi.fn(async () => ({ targetName: 'Orc B' }));
    const props = makeHookProps({
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [spell] },
      }),
      buildCtx,
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleSpellAttackClick(attack);
    });

    expect(executeSpellCast).toHaveBeenCalled();
    const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
    const targetInfo = await getTargetInfo();
    expect(targetInfo).toEqual({ name: 'Orc B' });
  });
});

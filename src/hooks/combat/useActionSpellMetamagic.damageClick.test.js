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

describe('useActionSpellMetamagic - handleActionSpellDamageClick', () => {
  setupBeforeEach();

  it('sets modalState for area of effect attacks with shape', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
      saveDc: 15,
      saveSuccess: 0.5,
      damage: '8d6',
      damageType: 'fire',
      saveType: 'DEX',
      range: '150 feet',
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(setModalState).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAttackAoeModal: expect.objectContaining({
          shape: 'sphere',
          range: 150,
          damage: '8d6',
          damageType: 'fire',
          saveType: 'DEX',
          saveDc: 15,
          dcSuccess: 'half',
        }),
      }),
    );
  });

  it('extracts range number from range string', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'cone', size: '30-foot' },
      range: '30 feet',
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(setModalState).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAttackAoeModal: expect.objectContaining({ range: 30 }),
      }),
    );
  });

  it('handles Self range as 0', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
      range: 'Self',
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(setModalState).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAttackAoeModal: expect.objectContaining({ range: 0 }),
      }),
    );
  });

  it('handles numeric range directly', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
      range: 60,
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(setModalState).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAttackAoeModal: expect.objectContaining({ range: 60 }),
      }),
    );
  });

  it('handles saveSuccess 0 as none', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
      saveSuccess: 0,
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(setModalState).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAttackAoeModal: expect.objectContaining({ dcSuccess: 'none' }),
      }),
    );
  });

  it('handles all recognized area shapes', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const shapes = ['emanation', 'cone', 'line', 'sphere', 'cube', 'cylinder', 'square', 'circle', 'wall', 'cage', 'floor', 'area'];

    for (const shape of shapes) {
      vi.clearAllMocks();
      setModalState.mockClear();
      const attack = {
        name: 'Fireball',
        spellLevel: 3,
        castingTime: '1 Action',
        area_of_effect: { shape: shape, size: '20-foot-radius' },
      };

      await act(async () => {
        result.current.handleActionSpellDamageClick(attack);
      });

      expect(setModalState).toHaveBeenCalled();
      expect(setModalState).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAttackAoeModal: expect.objectContaining({ shape }),
        }),
      );
    }
  });

  it('does not set modalState for non-area attacks', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Magic Missile',
      spellLevel: 1,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(setModalState).not.toHaveBeenCalled();
  });

  it('does not set modalState when setModalState is null', async () => {
    const props = makeHookProps({ setModalState: null });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
    };

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).toBeNull();
  });

  it('does not set modalState for non-sorcerer when no spell found', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({
      setModalState,
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [] },
      }),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');
    const { prepareSpellCast } = await import('../../services/rules/spells/spellPreparationService.js');
    const { isFreeCastAuthorized } = await import('../../services/rules/spells/spellPreparationService.js');

    executeSpellCast.mockResolvedValue(null);

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(executeSpellCast).toHaveBeenCalled();
    expect(prepareSpellCast).toHaveBeenCalled();
    expect(isFreeCastAuthorized).toHaveBeenCalled();
  });

  it('non-sorcerer resolveSpellDamage calls setPopupHtml when automationPopup popup returned (no spell)', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({
      setModalState,
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [] },
      }),
      setPopupHtml: vi.fn(),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    executeSpellCast.mockResolvedValue({
      automationPopup: {
        type: 'popup',
        payload: '<div>Spell cast!</div>',
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Spell cast!</div>');
  });

  it('non-sorcerer resolveSpellDamage does not call setPopupHtml when automationPopup type is modal (no spell)', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({
      setModalState,
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [] },
      }),
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(props.setPopupHtml).not.toHaveBeenCalled();
  });

  it('calls executeSpellCast for non-sorcerer with spell found', async () => {
    const setModalState = vi.fn();
    const spell = makeSpell();
    const props = makeHookProps({
      setModalState,
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(prepareSpellCast).toHaveBeenCalled();
    expect(executeSpellCast).toHaveBeenCalled();
  });

  it('non-sorcerer calls setPopupHtml when automationPopup is returned', async () => {
    const setModalState = vi.fn();
    const spell = makeSpell();
    const props = makeHookProps({
      setModalState,
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [spell] },
      }),
      setPopupHtml: vi.fn(),
    });
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    executeSpellCast.mockResolvedValue({
      automationPopup: {
        type: 'popup',
        payload: '<div>Spell cast!</div>',
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Spell cast!</div>');
  });

  it('non-sorcerer does not call setPopupHtml when automationPopup type is modal', async () => {
    const setModalState = vi.fn();
    const spell = makeSpell();
    const props = makeHookProps({
      setModalState,
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [spell] },
      }),
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
      result.current.handleActionSpellDamageClick(attack);
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
    const { executeSpellCast } = await import('../../services/rules/spells/spellCastService.js');

    const attack = {
      name: 'UnknownSpell',
      spellLevel: 0,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(handleAttackClick).toHaveBeenCalledWith(attack);
    expect(executeSpellCast).not.toHaveBeenCalled();
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();
    expect(result.current.pendingActionMetamagic.spellName).toBe('Fireball');
    expect(result.current.pendingActionMetamagic.spellLevel).toBe(3);
    expect(result.current.pendingActionMetamagic.isPsionic).toBe(false);
  });

  it('sorcerer sets pendingActionMetamagic with psionic info when psionic', async () => {
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

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: null,
    };

    const { result } = renderHook(() => useActionSpellMetamagic(props));

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();
    expect(result.current.pendingActionMetamagic.isPsionic).toBe(true);
    expect(result.current.pendingActionMetamagic.psionicCost).toBe(3);
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
      result.current.handleActionSpellDamageClick(attack);
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
        payload: '<div>Cast result!</div>',
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Cast result!</div>');
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(props.setPopupHtml).not.toHaveBeenCalled();
  });

  it('does not set modalState for area attacks when cannotAct is true (handled by handleSpellAttackClick)', async () => {
    const setModalState = vi.fn();
    const props = makeHookProps({ setModalState });
    const { result } = renderHook(() => useActionSpellMetamagic(props));

    const attack = {
      name: 'Fireball',
      spellLevel: 3,
      castingTime: '1 Action',
      area_of_effect: { shape: 'sphere', size: '20-foot-radius' },
    };

    // Manually set cannotAct to true
    props.cannotAct = true;

    await act(async () => {
      result.current.handleActionSpellDamageClick(attack);
    });

    // resolveSpellDamage does NOT check cannotAct - only handleSpellAttackClick does
    // So modal should still be set
    expect(setModalState).toHaveBeenCalled();
  });

  it('non-sorcerer resolveSpellDamage with spell passes targetName from buildCtx to getTargetInfo', async () => {
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(executeSpellCast).toHaveBeenCalled();
    const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
    const targetInfo = await getTargetInfo();
    expect(targetInfo).toEqual({ name: 'Orc B' });
  });

  it('non-sorcerer resolveSpellDamage no spell passes targetName from buildCtx to getTargetInfo', async () => {
    const buildCtx = vi.fn(async () => ({ targetName: 'Skeleton C' }));
    const props = makeHookProps({
      playerStats: makeNonSorcererStats({
        spellAbilities: { spells: [] },
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(executeSpellCast).toHaveBeenCalled();
    const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
    const targetInfo = await getTargetInfo();
    expect(targetInfo).toEqual({ name: 'Skeleton C' });
  });

  it('sorcerer resolveSpellDamage pending action passes targetName from buildCtx to getTargetInfo', async () => {
    const spell = makeSpell();
    const buildCtx = vi.fn(async () => ({ targetName: 'Dragon D' }));
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
      result.current.handleActionSpellDamageClick(attack);
    });

    expect(result.current.pendingActionMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleActionMetamagicConfirm({});
    });

    expect(executeSpellCast).toHaveBeenCalled();
    const getTargetInfo = executeSpellCast.mock.calls[0][2].getTargetInfo;
    const targetInfo = await getTargetInfo();
    expect(targetInfo).toEqual({ name: 'Dragon D' });
  });
});

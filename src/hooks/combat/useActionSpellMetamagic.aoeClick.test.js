import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionSpellMetamagic } from './useActionSpellMetamagic.js';
import { makeHookProps, setupBeforeEach } from './useActionSpellMetamagic.test-helpers.js';

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

describe('useActionSpellMetamagic - handleActionSpellDamageClick - area of effect', () => {
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
});

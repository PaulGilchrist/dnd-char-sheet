import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActionSpellMetamagic } from './useActionSpellMetamagic.js';
import { makeHookProps, makePlayerStats, makeNonSorcererStats, setupBeforeEach } from './useActionSpellMetamagic.test-helpers.js';

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

describe('useActionSpellMetamagic', () => {
  setupBeforeEach();

  describe('return value', () => {
    it('returns an object with expected properties', () => {
      const props = makeHookProps();
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current).toHaveProperty('pendingActionMetamagic');
      expect(result.current).toHaveProperty('isBonusSorcerer');
      expect(result.current).toHaveProperty('handleActionMetamagicConfirm');
      expect(result.current).toHaveProperty('handleActionMetamagicSkip');
      expect(result.current).toHaveProperty('handleActionSpellDamageClick');
      expect(result.current).toHaveProperty('handleSpellAttackClick');
      expect(typeof result.current.handleActionMetamagicConfirm).toBe('function');
      expect(typeof result.current.handleActionMetamagicSkip).toBe('function');
      expect(typeof result.current.handleActionSpellDamageClick).toBe('function');
      expect(typeof result.current.handleSpellAttackClick).toBe('function');
    });

    it('returns null for pendingActionMetamagic initially', () => {
      const props = makeHookProps();
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current.pendingActionMetamagic).toBeNull();
    });

    it('sets isBonusSorcerer to true when class is Sorcerer', () => {
      const props = makeHookProps({ playerStats: makePlayerStats() });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current.isBonusSorcerer).toBe(true);
    });

    it('sets isBonusSorcerer to false when class is not Sorcerer', () => {
      const props = makeHookProps({ playerStats: makeNonSorcererStats() });
      const { result } = renderHook(() => useActionSpellMetamagic(props));

      expect(result.current.isBonusSorcerer).toBe(false);
    });
  });
});

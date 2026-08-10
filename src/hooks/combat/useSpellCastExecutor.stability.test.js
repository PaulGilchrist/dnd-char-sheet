import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

import { renderHook } from '@testing-library/react';
import { useSpellCastExecutor } from './useSpellCastExecutor.js';

function makePlayerStats(overrides = {}) {
  return { name: 'TestCaster', ...overrides };
}

function makeProps(overrides = {}) {
  return {
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    playerStats: makePlayerStats(),
    getTargetInfo: vi.fn(),
    campaignName: 'TestCampaign',
    mapName: 'TestMap',
    characters: [],
    setPopupHtml: vi.fn(),
    extraMeta: {},
    ...overrides,
  };
}

describe('useSpellCastExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCallback stability', () => {
    it('returns the same castAction function when props do not change', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      rerender({ p: props, em: extraMeta, r: ref });

      expect(result.current.castAction).toBe(firstAction);
    });

    it('creates a new castAction when rollAttack changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      const newRollDamage = vi.fn();
      rerender({
        p: { ...props, rollDamage: newRollDamage },
        em: extraMeta,
        r: ref,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });

    it('creates a new castAction when playerStats changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      const newStats = makePlayerStats({ name: 'NewCaster' });
      rerender({
        p: { ...props, playerStats: newStats },
        em: extraMeta,
        r: ref,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });

    it('creates a new castAction when campaignName changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      rerender({
        p: { ...props, campaignName: 'NewCampaign' },
        em: extraMeta,
        r: ref,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });

    it('creates a new castAction when extraMeta object changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      rerender({
        p: props,
        em: { newFlag: true },
        r: ref,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });

    it('creates a new castAction when setPopupHtml changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      const newSetPopupHtml = vi.fn();
      rerender({
        p: { ...props, setPopupHtml: newSetPopupHtml },
        em: extraMeta,
        r: ref,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });

    it('creates a new castAction when cachedPosRef changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};

      const { result, rerender } = renderHook(
        ({ p, em, r }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref },
        }
      );

      const firstAction = result.current.castAction;

      const newRef = { current: null };
      rerender({
        p: props,
        em: extraMeta,
        r: newRef,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });

    it('creates a new castAction when setModalState changes', () => {
      const props = makeProps();
      const ref = { current: null };
      const extraMeta = {};
      const setModalState = vi.fn();

      const { result, rerender } = renderHook(
        ({ p, em, r, ms }) =>
          useSpellCastExecutor(
            p.rollAttack,
            p.rollDamage,
            p.playerStats,
            p.getTargetInfo,
            p.campaignName,
            p.mapName,
            p.characters,
            p.setPopupHtml,
            em,
            r,
            ms,
          ),
        {
          initialProps: { p: props, em: extraMeta, r: ref, ms: setModalState },
        }
      );

      const firstAction = result.current.castAction;

      const newSetModalState = vi.fn();
      rerender({
        p: props,
        em: extraMeta,
        r: ref,
        ms: newSetModalState,
      });

      expect(result.current.castAction).not.toBe(firstAction);
    });
  });
});

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

  describe('return value', () => {
    it('returns an object with castAction and cachedPosRef', () => {
      const props = makeProps();
      const { result } = renderHook(() =>
        useSpellCastExecutor(
          props.rollAttack,
          props.rollDamage,
          props.playerStats,
          props.getTargetInfo,
          props.campaignName,
          props.mapName,
          props.characters,
          props.setPopupHtml,
          props.extraMeta,
        )
      );

      expect(result.current).toHaveProperty('castAction');
      expect(result.current).toHaveProperty('cachedPosRef');
      expect(typeof result.current.castAction).toBe('function');
      expect(result.current.cachedPosRef).toHaveProperty('current');
    });

    it('uses the provided cachedPosRef when given', () => {
      const externalRef = { current: { attackerPos: { x: 1, y: 2 } } };
      const props = makeProps();
      const { result } = renderHook(() =>
        useSpellCastExecutor(
          props.rollAttack,
          props.rollDamage,
          props.playerStats,
          props.getTargetInfo,
          props.campaignName,
          props.mapName,
          props.characters,
          props.setPopupHtml,
          props.extraMeta,
          externalRef,
        )
      );

      expect(result.current.cachedPosRef).toBe(externalRef);
    });

    it('creates an internal ref when no cachedPosRef is provided', () => {
      const props = makeProps();
      const { result } = renderHook(() =>
        useSpellCastExecutor(
          props.rollAttack,
          props.rollDamage,
          props.playerStats,
          props.getTargetInfo,
          props.campaignName,
          props.mapName,
          props.characters,
          props.setPopupHtml,
          props.extraMeta,
        )
      );

      expect(result.current.cachedPosRef).not.toBe(null);
      expect(result.current.cachedPosRef.current).toBeNull();
    });
  });
});

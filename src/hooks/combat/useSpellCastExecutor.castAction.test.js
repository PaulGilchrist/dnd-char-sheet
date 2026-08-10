import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

import { executeSpellCast } from '../../services/rules/spells/spellCastService.js';
import { renderHook, act } from '@testing-library/react';
import { useSpellCastExecutor } from './useSpellCastExecutor.js';

function makePlayerStats(overrides = {}) {
  return { name: 'TestCaster', ...overrides };
}

function makeSpell(overrides = {}) {
  return { name: 'Fireball', ...overrides };
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

  describe('castAction — executeSpellCast invocation', () => {
    it('calls executeSpellCast with correct arguments', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue(null);

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

      const spell = makeSpell();
      const metaCtx = { slotLevel: 2 };

      await act(async () => {
        await result.current.castAction(spell, metaCtx);
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        spell,
        metaCtx,
        expect.objectContaining({
          rollAttack: props.rollAttack,
          rollDamage: props.rollDamage,
          playerStats: props.playerStats,
          getTargetInfo: props.getTargetInfo,
          campaignName: props.campaignName,
          mapName: props.mapName,
          characters: props.characters,
        })
      );
    });

    it('passes extraMeta into the options object', async () => {
      const props = makeProps({ extraMeta: { customFlag: true } });
      executeSpellCast.mockResolvedValue(null);

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

      const spell = makeSpell();
      const metaCtx = {};

      await act(async () => {
        await result.current.castAction(spell, metaCtx);
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        spell,
        metaCtx,
        expect.objectContaining({
          customFlag: true,
        })
      );
    });

    it('passes attackerPos and targetPos from ref.current', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue(null);

      const ref = { current: { attackerPos: { x: 10, y: 20 }, targetPos: { x: 30, y: 40 } } };

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
          ref,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          attackerPos: { x: 10, y: 20 },
          targetPos: { x: 30, y: 40 },
        })
      );
    });

    it('passes undefined attackerPos/targetPos when ref.current is null', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue(null);

      const ref = { current: null };

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
          ref,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(executeSpellCast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          attackerPos: undefined,
          targetPos: undefined,
        })
      );
    });

    it('clears ref.current after castAction completes (success)', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue(null);

      const ref = { current: { attackerPos: { x: 1 } } };

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
          ref,
        )
      );

      expect(ref.current).not.toBeNull();

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(ref.current).toBeNull();
    });

    it('clears ref.current after castAction completes (error caught)', async () => {
      const props = makeProps();
      executeSpellCast.mockRejectedValue(new Error('Cast failed'));

      const ref = { current: { attackerPos: { x: 1 } } };

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
          ref,
        )
      );

      expect(ref.current).not.toBeNull();

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(ref.current).toBeNull();
    });

    it('returns early without calling setPopupHtml when executeSpellCast returns falsy', async () => {
      const props = makeProps();
      executeSpellCast.mockReturnValue(undefined);

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
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('returns early without calling setPopupHtml when executeSpellCast returns null', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue(null);

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
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('returns early without calling setPopupHtml when executeSpellCast returns 0', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue(0);

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
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('returns early without calling setPopupHtml when executeSpellCast returns empty string', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue('');

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
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });
  });
});

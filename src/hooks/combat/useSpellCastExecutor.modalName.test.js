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

  describe('castAction — modalName result handling', () => {
    it('calls handleModalResult when result has modalName and setModalState is provided', async () => {
      const props = makeProps();
      const setModalState = vi.fn();

      executeSpellCast.mockResolvedValue({
        modalName: 'massHealTarget',
        payload: { action: { name: 'Mass Heal' } },
        healAmount: 20,
      });

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
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ massHealModal: { action: { name: 'Mass Heal' } } });
      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('falls back to setPopupHtml when result has modalName but no setModalState', async () => {
      const props = makeProps();

      executeSpellCast.mockResolvedValue({
        modalName: 'fear',
        payload: { action: { name: 'Fear' } },
      });

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

      expect(props.setPopupHtml).toHaveBeenCalledWith({ action: { name: 'Fear' } });
    });

    it('handles unknown modalName with console.error when setModalState is provided', async () => {
      const props = makeProps();
      const setModalState = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();

      executeSpellCast.mockResolvedValue({
        modalName: 'unknownModalType',
        payload: { action: { name: 'Unknown' } },
      });

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
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useSpellCastExecutor] Unknown modalName from spell cast: unknownModalType'
      );
      expect(setModalState).not.toHaveBeenCalled();
      expect(props.setPopupHtml).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});

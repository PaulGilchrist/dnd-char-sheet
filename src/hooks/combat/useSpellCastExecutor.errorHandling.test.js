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

  describe('error handling', () => {
    it('does not set popupHtml when executeSpellCast throws', async () => {
      const props = makeProps();
      executeSpellCast.mockRejectedValue(new Error('Cast failed'));

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

    it('logs error to console when executeSpellCast throws', async () => {
      const props = makeProps();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();
      executeSpellCast.mockRejectedValue(new Error('Cast failed'));

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

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useSpellCastExecutor] executeSpellCast error for Fireball:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('logs error with correct spell name when executeSpellCast throws', async () => {
      const props = makeProps();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue();
      executeSpellCast.mockRejectedValue(new Error('Cast failed'));

      const spell = makeSpell({ name: 'Burning Hands' });

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
        await result.current.castAction(spell, {});
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useSpellCastExecutor] executeSpellCast error for Burning Hands:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

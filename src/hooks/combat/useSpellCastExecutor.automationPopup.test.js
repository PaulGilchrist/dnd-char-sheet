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

  describe('castAction — automationPopup handling', () => {
    it('sets popupHtml when result has automationPopup without type modal', async () => {
      const props = makeProps();
      const popupPayload = '<div>Spell cast!</div>';
      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: popupPayload,
        },
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

      expect(props.setPopupHtml).toHaveBeenCalledWith(popupPayload);
    });

    it('sets popupHtml when result has automationPopup with type popup and payload string', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'popup',
          payload: '<div>Automation info</div>',
        },
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

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Automation info</div>');
    });

    it('sets modalState when automationPopup has type modal', async () => {
      const props = makeProps();
      const setModalState = vi.fn();
      const modalPayload = { action: { name: 'Test' } };

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'massHealTarget',
          payload: modalPayload,
        },
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

      expect(setModalState).toHaveBeenCalledWith({ massHealModal: modalPayload });
      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });

    it('falls back to setPopupHtml when automationPopup has type modal but no setModalState', async () => {
      const props = makeProps();
      const modalPayload = { action: { name: 'Test' } };

      executeSpellCast.mockResolvedValue({
        automationPopup: {
          type: 'modal',
          modalName: 'massHealTarget',
          payload: modalPayload,
        },
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

      expect(props.setPopupHtml).toHaveBeenCalledWith(modalPayload);
    });

    it('prefers automationPopup over healAmount display', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue({
        automationPopup: { payload: '<div>Automation!</div>' },
        healAmount: 10,
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

      expect(props.setPopupHtml).toHaveBeenCalledWith('<div>Automation!</div>');
    });
  });
});

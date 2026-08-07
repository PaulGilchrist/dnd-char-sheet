// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellCastExecutor } from './useSpellCastExecutor.js';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockExecuteSpellCast = vi.fn();

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: (...args) => mockExecuteSpellCast(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useSpellCastExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Return value structure ─────────────────────────────────────────────

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

  // ── castAction — executeSpellCast invocation ────────────────────────────

  describe('castAction', () => {
    it('calls executeSpellCast with correct arguments', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue(null);

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

      expect(mockExecuteSpellCast).toHaveBeenCalledWith(
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
      mockExecuteSpellCast.mockResolvedValue(null);

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

      expect(mockExecuteSpellCast).toHaveBeenCalledWith(
        spell,
        metaCtx,
        expect.objectContaining({
          customFlag: true,
        })
      );
    });

    it('passes attackerPos and targetPos from ref.current', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue(null);

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

      expect(mockExecuteSpellCast).toHaveBeenCalledWith(
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
      mockExecuteSpellCast.mockResolvedValue(null);

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

      expect(mockExecuteSpellCast).toHaveBeenCalledWith(
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
      mockExecuteSpellCast.mockResolvedValue(null);

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
      mockExecuteSpellCast.mockRejectedValue(new Error('Cast failed'));

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
      mockExecuteSpellCast.mockReturnValue(undefined);

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
      mockExecuteSpellCast.mockResolvedValue(null);

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
      mockExecuteSpellCast.mockResolvedValue(0);

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
      mockExecuteSpellCast.mockResolvedValue('');

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

  // ── castAction — automationPopup result handling ───────────────────────

  describe('castAction — automationPopup handling', () => {
    it('sets popupHtml when result has automationPopup without type modal', async () => {
      const props = makeProps();
      const popupPayload = '<div>Spell cast!</div>';
      mockExecuteSpellCast.mockResolvedValue({
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
      mockExecuteSpellCast.mockResolvedValue({
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

      mockExecuteSpellCast.mockResolvedValue({
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

      mockExecuteSpellCast.mockResolvedValue({
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
      mockExecuteSpellCast.mockResolvedValue({
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

  // ── castAction — modalName result handling ─────────────────────────────

  describe('castAction — modalName result handling', () => {
    it('calls handleModalResult when result has modalName and setModalState is provided', async () => {
      const props = makeProps();
      const setModalState = vi.fn();

      mockExecuteSpellCast.mockResolvedValue({
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

      mockExecuteSpellCast.mockResolvedValue({
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

      mockExecuteSpellCast.mockResolvedValue({
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

  // ── castAction — modalName handling via handleModalResult ──────────────

  describe('handleModalResult — modalName routing', () => {
    it('maps massHealTarget to massHealModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'massHealTarget',
        payload: { data: 'massHeal' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ massHealModal: { data: 'massHeal' } });
    });

    it('maps massCureWoundsTarget to massCureWoundsModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'massCureWoundsTarget',
        payload: { data: 'massCure' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ massCureWoundsModal: { data: 'massCure' } });
    });

    it('maps prayerOfHealingTarget to prayerOfHealingModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'prayerOfHealingTarget',
        payload: { data: 'prayer' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ prayerOfHealingModal: { data: 'prayer' } });
    });

    it('maps powerWordFortifyTarget to powerWordFortifyModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'powerWordFortifyTarget',
        payload: { data: 'fortify' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ powerWordFortifyModal: { data: 'fortify' } });
    });

    it('maps massHealingWordTarget to massHealingWordModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'massHealingWordTarget',
        payload: { data: 'massHealingWord' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ massHealingWordModal: { data: 'massHealingWord' } });
    });

    it('maps saveAttackAoe to saveAttackAoeModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'saveAttackAoe',
        payload: { data: 'saveAoe' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ saveAttackAoeModal: { data: 'saveAoe' } });
    });

    it('maps aoeCondition to aoeConditionModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'aoeCondition',
        payload: { data: 'aoeCond' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ aoeConditionModal: { data: 'aoeCond' } });
    });

    it('maps fear to fearModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'fear',
        payload: { data: 'fearData' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ fearModal: { data: 'fearData' } });
    });

    it('maps hypnoticPattern to hypnoticPatternModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'hypnoticPattern',
        payload: { data: 'hypno' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ hypnoticPatternModal: { data: 'hypno' } });
    });

    it('maps calmEmotions to calmEmotionsModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'calmEmotions',
        payload: { data: 'calm' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ calmEmotionsModal: { data: 'calm' } });
    });

    it('maps massSuggestion to massSuggestionModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'massSuggestion',
        payload: { data: 'massSugg' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ massSuggestionModal: { data: 'massSugg' } });
    });

    it('maps ArcaneVigor to arcaneVigorModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'ArcaneVigor',
        payload: { data: 'arcane' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ arcaneVigorModal: { data: 'arcane' } });
    });

    it('maps blindnessDeafness to blindnessDeafnessModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'blindnessDeafness',
        payload: { data: 'blind' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ blindnessDeafnessModal: { data: 'blind' } });
    });

    it('maps silenceTargetSelection to silenceModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'silenceTargetSelection',
        payload: { data: 'silence' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ silenceModal: { data: 'silence' } });
    });

    it('maps eyebiteEffect to eyebiteEffectModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'eyebiteEffect',
        payload: { data: 'eyebite' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ eyebiteEffectModal: { data: 'eyebite' } });
    });

    it('maps wildMagicSurge to wildMagicSurgeModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'wildMagicSurge',
        payload: { data: 'wild' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ wildMagicSurgeModal: { data: 'wild' } });
    });

    it('maps feignDeathTargetSelection to feignDeathModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'feignDeathTargetSelection',
        payload: { data: 'feign' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ feignDeathModal: { data: 'feign' } });
    });

    it('maps tashasLaughter to tashasLaughterModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'tashasLaughter',
        payload: { data: 'laughter' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ tashasLaughterModal: { data: 'laughter' } });
    });

    it('maps animateDead to animateDeadModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'animateDead',
        payload: { data: 'animate' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ animateDeadModal: { data: 'animate' } });
    });

    it('maps createUndead to createUndeadModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'createUndead',
        payload: { data: 'createUndead' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ createUndeadModal: { data: 'createUndead' } });
    });

    it('maps summonSpirit to summonSpiritModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'summonSpirit',
        payload: { data: 'summon' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ summonSpiritModal: { data: 'summon' } });
    });

    it('maps starryChaliceHeal to starryChaliceHealModal', async () => {
      const setModalState = vi.fn();
      mockExecuteSpellCast.mockResolvedValue({
        modalName: 'starryChaliceHeal',
        payload: { data: 'starry' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          makeProps().rollAttack,
          makeProps().rollDamage,
          makeProps().playerStats,
          makeProps().getTargetInfo,
          makeProps().campaignName,
          makeProps().mapName,
          makeProps().characters,
          makeProps().setPopupHtml,
          {},
          undefined,
          setModalState,
        )
      );

      await act(async () => {
        await result.current.castAction(makeSpell(), {});
      });

      expect(setModalState).toHaveBeenCalledWith({ starryChaliceHealModal: { data: 'starry' } });
    });
  });

  // ── castAction — heal result handling ──────────────────────────────────

  describe('castAction — heal result handling', () => {
    it('sets popupHtml for heal results with no automationPopup', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 15,
        formula: '2d8+3',
        rolls: [4, 3, 5],
        targetName: 'Ally 1',
        bonusHeal: 3,
        bonusDetails: [{ amount: 3, name: 'Divine Favor' }],
      });

      const spell = makeSpell({ name: 'Cure Wounds' });

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

      expect(props.setPopupHtml).toHaveBeenCalledWith({
        type: 'heal',
        name: 'Cure Wounds',
        formula: '2d8+3',
        rolls: [4, 3, 5],
        total: 15,
        targetName: 'Ally 1',
        finalHeal: 15,
        bonusHeal: 3,
        bonusHealDetail: '3 Divine Favor',
        healingRerollOriginalRolls: null,
        healingRerollDisplayRolls: null,
      });
    });

    it('uses rawTotal over healAmount for total when both are present', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 10,
        rawTotal: 18,
        formula: '2d8+3',
        rolls: [4, 3, 5],
        targetName: 'Ally 1',
      });

      const spell = makeSpell({ name: 'Lesser Restoration' });

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

      expect(props.setPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 18,
          finalHeal: 10,
        })
      );
    });

    it('handles heal result with empty bonusDetails', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 8,
        formula: '1d8',
        rolls: [8],
        targetName: 'Ally 2',
        bonusHeal: 0,
        bonusDetails: [],
      });

      const spell = makeSpell({ name: 'Healing Word' });

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

      expect(props.setPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          bonusHeal: 0,
          bonusHealDetail: '',
        })
      );
    });

    it('handles heal result with missing bonusHeal defaulting to 0', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 12,
        formula: '2d6+2',
        rolls: [3, 5],
        targetName: 'Ally 3',
        bonusDetails: [],
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

      expect(props.setPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          bonusHeal: 0,
        })
      );
    });

    it('handles heal result with healingReroll rolls', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 10,
        formula: '2d8',
        rolls: [1, 1],
        targetName: 'Ally 4',
        healingRerollOriginalRolls: [1, 1],
        healingRerollDisplayRolls: [6, 6],
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

      expect(props.setPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          healingRerollOriginalRolls: [1, 1],
          healingRerollDisplayRolls: [6, 6],
        })
      );
    });

    it('handles heal result with multiple bonusDetails', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 20,
        formula: '3d8+2',
        rolls: [5, 4, 3],
        targetName: 'Ally 5',
        bonusHeal: 8,
        bonusDetails: [
          { amount: 5, name: 'Divine Favor' },
          { amount: 3, name: 'Blessing' },
        ],
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

      expect(props.setPopupHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          bonusHealDetail: '5 Divine Favor, 3 Blessing',
        })
      );
    });

    it('does not set popupHtml when result has no targetName and no automationPopup', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockResolvedValue({
        healAmount: 10,
        formula: '1d8',
        rolls: [10],
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

      expect(props.setPopupHtml).not.toHaveBeenCalled();
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────

  describe('error handling', () => {
    it('does not set popupHtml when executeSpellCast throws', async () => {
      const props = makeProps();
      mockExecuteSpellCast.mockRejectedValue(new Error('Cast failed'));

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
      mockExecuteSpellCast.mockRejectedValue(new Error('Cast failed'));

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
      mockExecuteSpellCast.mockRejectedValue(new Error('Cast failed'));

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

  // ── useCallback stability ──────────────────────────────────────────────

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

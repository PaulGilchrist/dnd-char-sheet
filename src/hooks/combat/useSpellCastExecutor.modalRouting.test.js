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

  describe('handleModalResult — modalName routing', () => {
    const baseProps = makeProps();

    it('maps massHealTarget to massHealModal', async () => {
      const setModalState = vi.fn();
      executeSpellCast.mockResolvedValue({
        modalName: 'massHealTarget',
        payload: { data: 'massHeal' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'massCureWoundsTarget',
        payload: { data: 'massCure' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'prayerOfHealingTarget',
        payload: { data: 'prayer' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'powerWordFortifyTarget',
        payload: { data: 'fortify' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'massHealingWordTarget',
        payload: { data: 'massHealingWord' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'saveAttackAoe',
        payload: { data: 'saveAoe' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'aoeCondition',
        payload: { data: 'aoeCond' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'fear',
        payload: { data: 'fearData' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'hypnoticPattern',
        payload: { data: 'hypno' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'calmEmotions',
        payload: { data: 'calm' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'massSuggestion',
        payload: { data: 'massSugg' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'ArcaneVigor',
        payload: { data: 'arcane' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'blindnessDeafness',
        payload: { data: 'blind' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'silenceTargetSelection',
        payload: { data: 'silence' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'eyebiteEffect',
        payload: { data: 'eyebite' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'wildMagicSurge',
        payload: { data: 'wild' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'feignDeathTargetSelection',
        payload: { data: 'feign' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'tashasLaughter',
        payload: { data: 'laughter' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'animateDead',
        payload: { data: 'animate' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'createUndead',
        payload: { data: 'createUndead' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'summonSpirit',
        payload: { data: 'summon' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
      executeSpellCast.mockResolvedValue({
        modalName: 'starryChaliceHeal',
        payload: { data: 'starry' },
      });

      const { result } = renderHook(() =>
        useSpellCastExecutor(
          baseProps.rollAttack,
          baseProps.rollDamage,
          baseProps.playerStats,
          baseProps.getTargetInfo,
          baseProps.campaignName,
          baseProps.mapName,
          baseProps.characters,
          baseProps.setPopupHtml,
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
});

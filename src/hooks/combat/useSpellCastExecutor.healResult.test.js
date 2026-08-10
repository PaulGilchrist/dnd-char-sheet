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

  describe('castAction — heal result handling', () => {
    it('sets popupHtml for heal results with no automationPopup', async () => {
      const props = makeProps();
      executeSpellCast.mockResolvedValue({
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
      executeSpellCast.mockResolvedValue({
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
      executeSpellCast.mockResolvedValue({
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
      executeSpellCast.mockResolvedValue({
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
      executeSpellCast.mockResolvedValue({
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
      executeSpellCast.mockResolvedValue({
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
      executeSpellCast.mockResolvedValue({
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
});

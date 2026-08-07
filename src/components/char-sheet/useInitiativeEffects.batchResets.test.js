import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useInitiativeEffects from './useInitiativeEffects.js';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getStore: vi.fn(() => new Map()),
    useSyncedState: vi.fn(() => [null, vi.fn()]),
    listeners: new Map(),
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
    setRuntimeBatch: vi.fn(),
    getAllStoreKeys: vi.fn(() => []),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../services/ui/utils.js', () => ({
    default: {
        getName: vi.fn((n) => n || 'Unknown'),
    },
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../services/ui/storage.js', () => ({
    default: {
        set: vi.fn(),
    },
}));

vi.mock('../../services/rules/features/invisibilityService.js', () => ({
    endInvisibility: vi.fn(),
    endGreaterInvisibility: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/polymorphService.js', () => ({
    revertPolymorph: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/shapechangeService.js', () => ({
    revertShapechange: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue, setRuntimeBatch } from '../../hooks/runtime/useRuntimeState.js';

describe('useInitiativeEffects - batch resets and once-per-turn trackers', () => {
    const campaignName = 'test-campaign';
    const defaultPlayerStats = {
        name: 'TestMonk',
        level: 15,
        class: {
            name: 'Monk',
            class_levels: [{ level: 15, focus_points: 6 }],
        },
        abilities: [{ name: 'Wisdom', bonus: 4 }],
        automation: {
            passives: [],
            actions: [],
        },
        actions: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue(null);
    });

    function renderHookWithStats(stats = defaultPlayerStats) {
        return renderHook(() =>
            useInitiativeEffects(stats, campaignName, vi.fn())
        );
    }

    function dispatchInitiativeRoll(detail) {
        window.dispatchEvent(
            new CustomEvent('initiative-rolled', { detail })
        );
    }

    describe('setRuntimeBatch once-per-turn trackers', () => {
        it('resets actionSurgeUsedThisRound via batch', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ actionSurgeUsedThisRound: null }),
                campaignName
            );
        });

        it('resets psionicStrikeUsedThisTurn via batch', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ psionicStrikeUsedThisTurn: null }),
                campaignName
            );
        });

        it('resets dreadAmbushUsedThisTurn via batch', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ dreadAmbushUsedThisTurn: null }),
                campaignName
            );
        });

        it('resets hurlThroughHellTurnUsed via batch', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ hurlThroughHellTurnUsed: null }),
                campaignName
            );
        });

        it('resets portentUsedThisTurn via batch', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ portentUsedThisTurn: null }),
                campaignName
            );
        });

        it('resets boonOfCombatProwessUsed and strokeOfLuckUsed via batch', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ boonOfCombatProwessUsed: null }),
                campaignName
            );
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ strokeOfLuckUsed: null }),
                campaignName
            );
        });

        it('resets relentlessUsedRound when player has Relentless passive', () => {
            const stats = {
                ...defaultPlayerStats,
                automation: {
                    ...defaultPlayerStats.automation,
                    passives: [
                        { type: 'passive_rule', effect: 'relentless' },
                    ],
                },
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.objectContaining({ relentlessUsedRound: null }),
                campaignName
            );
        });

        it('does not reset relentlessUsedRound when player lacks Relentless passive', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeBatch).toHaveBeenCalledWith(
                'TestMonk',
                expect.not.objectContaining({ relentlessUsedRound: null }),
                campaignName
            );
        });

        it('does not call setRuntimeBatch when no updates are needed (no matching character)', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'OtherPlayer', roll: 15 });
            expect(setRuntimeBatch).not.toHaveBeenCalled();
        });
    });

    describe('setRuntimeValue individual resets', () => {
        it('resets _Charge_Attack_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_Charge_Attack_usedRound', null, campaignName
            );
        });

        it('resets _FastHands_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_FastHands_usedRound', null, campaignName
            );
        });

        it('resets _CunningAction_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_CunningAction_usedRound', null, campaignName
            );
        });

        it('resets _Cleave_UsedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_Cleave_UsedRound', null, campaignName
            );
        });

        it('resets _Nick_UsedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_Nick_UsedRound', null, campaignName
            );
        });

        it('resets surgeUsedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'surgeUsedRound', null, campaignName
            );
        });

        it('resets illusoryRealityUsedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'illusoryRealityUsedRound', null, campaignName
            );
        });

        it('resets _BrutalStrike_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_BrutalStrike_usedRound', null, campaignName
            );
        });

        it('resets _fortifiedHealth_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_fortifiedHealth_usedRound', null, campaignName
            );
        });

        it('resets _Shield_Bash_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_Shield_Bash_usedRound', null, campaignName
            );
        });

        it('resets piercerPunctureUsedThisTurn on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'piercerPunctureUsedThisTurn', null, campaignName
            );
        });

        it('resets _Savage_Attacker_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_Savage_Attacker_usedRound', null, campaignName
            );
        });

        it('resets _Hamstring_usedRound on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_Hamstring_usedRound', null, campaignName
            );
        });

        it('resets resistanceUsedThisTurn on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'resistanceUsedThisTurn', null, campaignName
            );
        });
    });
});

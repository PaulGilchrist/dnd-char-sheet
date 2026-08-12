// @cleaned-by-ai
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

import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { rollExpression } from '../../services/dice/diceRoller.js';

describe('useInitiativeEffects - turn-undead-result event', () => {
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
        rollExpression.mockReturnValue({ total: 4, rolls: [4], modifier: 0 });
    });

    function dispatchTurnUndeadResult(detail) {
        window.dispatchEvent(
            new CustomEvent('turn-undead-result', { detail })
        );
    }

    function createClericStats() {
        return {
            ...defaultPlayerStats,
            name: 'Cleric',
            automation: {
                ...defaultPlayerStats.automation,
                actions: [
                    {
                        name: 'Searing Undead',
                        type: 'damage_bonus',
                        trigger: 'turn_undead_fail',
                        damageType: 'Radiant',
                    },
                ],
            },
            abilities: [{ name: 'Wisdom', bonus: 4 }],
        };
    }

    describe('guard clauses', () => {
        it('does nothing when playerStats is null or undefined', () => {
            const rollDamage = vi.fn();
            renderHook(() =>
                useInitiativeEffects(null, campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName,
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).not.toHaveBeenCalled();
        });

        it('does nothing when event detail is null or undefined', () => {
            const rollDamage = vi.fn();
            renderHook(() =>
                useInitiativeEffects(createClericStats(), campaignName, rollDamage)
            );
            dispatchTurnUndeadResult(null);
            expect(rollDamage).not.toHaveBeenCalled();
        });

        it('does nothing when attackerName does not match player', () => {
            const rollDamage = vi.fn();
            renderHook(() =>
                useInitiativeEffects(createClericStats(), campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'OtherCleric',
                campaignName,
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).not.toHaveBeenCalled();
        });

        it('does nothing when campaignName does not match', () => {
            const rollDamage = vi.fn();
            renderHook(() =>
                useInitiativeEffects(createClericStats(), campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName: 'other-campaign',
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).not.toHaveBeenCalled();
        });

        it('does nothing when no searing undead action exists', () => {
            const rollDamage = vi.fn();
            renderHook(() =>
                useInitiativeEffects(defaultPlayerStats, campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'TestMonk',
                campaignName,
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).not.toHaveBeenCalled();
        });

        it('does nothing when rollExpression returns null', () => {
            const rollDamage = vi.fn();
            rollExpression.mockReturnValue(null);
            renderHook(() =>
                useInitiativeEffects(createClericStats(), campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName,
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).not.toHaveBeenCalled();
        });
    });

    describe('successful damage application', () => {
        it('applies radiant damage to each failed target', () => {
            const rollDamage = vi.fn();
            const stats = createClericStats();
            rollExpression.mockReturnValue({
                total: 4,
                rolls: [4],
                modifier: 0,
            });
            renderHook(() =>
                useInitiativeEffects(stats, campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName,
                failedTargets: ['Goblin', 'Zombie'],
                saveDc: 13,
                saveType: 'WIS',
            });
            expect(rollDamage).toHaveBeenCalledTimes(2);
            expect(rollDamage).toHaveBeenCalledWith(
                'Searing Undead',
                '4d8',
                4,
                [4],
                0,
                expect.objectContaining({
                    damageType: 'Radiant',
                    attackerName: 'Cleric',
                    targetName: 'Goblin',
                    saveDc: 13,
                    saveType: 'WIS',
                    dcSuccess: false,
                })
            );
            expect(rollDamage).toHaveBeenCalledWith(
                'Searing Undead',
                '4d8',
                4,
                [4],
                0,
                expect.objectContaining({
                    targetName: 'Zombie',
                })
            );
        });

        it('uses Wisdom bonus for damage dice count', () => {
            const rollDamage = vi.fn();
            const stats = {
                ...createClericStats(),
                abilities: [{ name: 'Wisdom', bonus: 3 }],
            };
            rollExpression.mockReturnValue({
                total: 3,
                rolls: [3],
                modifier: 0,
            });
            renderHook(() =>
                useInitiativeEffects(stats, campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName,
                failedTargets: ['Goblin'],
                saveDc: 13,
                saveType: 'WIS',
            });
            expect(rollDamage).toHaveBeenCalledWith(
                'Searing Undead',
                '3d8',
                3,
                [3],
                0,
                expect.any(Object)
            );
        });

        it('uses minimum 1 Wisdom modifier for dice count', () => {
            const rollDamage = vi.fn();
            const stats = {
                ...createClericStats(),
                abilities: [{ name: 'Wisdom', bonus: -2 }],
            };
            rollExpression.mockReturnValue({
                total: 1,
                rolls: [1],
                modifier: 0,
            });
            renderHook(() =>
                useInitiativeEffects(stats, campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName,
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).toHaveBeenCalledWith(
                'Searing Undead',
                '1d8',
                1,
                [1],
                0,
                expect.any(Object)
            );
        });

        it('uses damageType from action or defaults to Radiant', () => {
            const rollDamage = vi.fn();
            const stats = {
                ...createClericStats(),
                automation: {
                    ...createClericStats().automation,
                    actions: [
                        {
                            name: 'Searing Undead',
                            type: 'damage_bonus',
                            trigger: 'turn_undead_fail',
                            // no damageType specified
                        },
                    ],
                },
            };
            rollExpression.mockReturnValue({
                total: 4,
                rolls: [4],
                modifier: 0,
            });
            renderHook(() =>
                useInitiativeEffects(stats, campaignName, rollDamage)
            );
            dispatchTurnUndeadResult({
                attackerName: 'Cleric',
                campaignName,
                failedTargets: ['Goblin'],
            });
            expect(rollDamage).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.objectContaining({
                    damageType: 'Radiant',
                })
            );
        });
    });
});

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

import { getRuntimeValue, setRuntimeValue, getAllStoreKeys } from '../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import * as storageService from '../../services/ui/storage.js';
import { rollExpression } from '../../services/dice/diceRoller.js';

describe('useInitiativeEffects - edge cases and missing coverage', () => {
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

    function mockCombatSummary(concentrationSpell) {
        vi.mocked(getCombatSummary).mockReturnValue({
            creatures: [
                {
                    name: 'TestMonk',
                    concentration: concentrationSpell ? { spell: concentrationSpell } : null,
                },
            ],
        });
    }

    describe('Perfect Focus edge cases', () => {
        it('does not recover focus points when class level lookup fails (no matching level)', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'uncannyMetabolismUsed') return null;
                if (key === 'focusPoints') return 2;
                return null;
            });
            const stats = {
                ...defaultPlayerStats,
                automation: {
                    ...defaultPlayerStats.automation,
                    passives: [
                        { type: 'passive_rule', effect: 'perfect_focus' },
                    ],
                },
                class: {
                    ...defaultPlayerStats.class,
                    class_levels: [{ level: 20, focus_points: 6 }],
                },
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // classLevel lookup finds level 20, not level 15, so classLevel?.focus_points is undefined
            // maxFP = 0 (Number(undefined ?? 0)), currentFP(2) < maxFP(0) is false
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'TestMonk',
                'focusPoints',
                expect.any(Number),
                campaignName
            );
        });

        it('does not recover focus points when maxFP is 0', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'uncannyMetabolismUsed') return null;
                if (key === 'focusPoints') return 2;
                return null;
            });
            const stats = {
                ...defaultPlayerStats,
                automation: {
                    ...defaultPlayerStats.automation,
                    passives: [
                        { type: 'passive_rule', effect: 'perfect_focus' },
                    ],
                },
                class: {
                    ...defaultPlayerStats.class,
                    class_levels: [{ level: 15, focus_points: 0 }],
                },
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'TestMonk',
                'focusPoints',
                expect.any(Number),
                campaignName
            );
        });

        it('does not recover when focusPoints is exactly at threshold (3) but at max', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'uncannyMetabolismUsed') return null;
                if (key === 'focusPoints') return 3;
                return null;
            });
            const stats = {
                ...defaultPlayerStats,
                automation: {
                    ...defaultPlayerStats.automation,
                    passives: [
                        { type: 'passive_rule', effect: 'perfect_focus' },
                    ],
                },
                class: {
                    ...defaultPlayerStats.class,
                    class_levels: [{ level: 15, focus_points: 3 }],
                },
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // currentFP(3) <= threshold(3) is true, but currentFP(3) < maxFP(3) is false
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'TestMonk',
                'focusPoints',
                expect.any(Number),
                campaignName
            );
        });
    });

    describe('Wild Shape recovery edge cases', () => {
        it('does not recover when druid level lookup fails', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'wildShapeUses') return 0;
                return null;
            });
            const stats = {
                ...defaultPlayerStats,
                level: 20,
                automation: {
                    ...defaultPlayerStats.automation,
                    actions: [
                        { type: 'initiative_action', effect: 'wild_shape_regen_on_initiative' },
                    ],
                },
                class: {
                    ...defaultPlayerStats.class,
                    class_levels: [{ level: 25, wild_shape: 3 }],
                },
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // druidLevel finds level 25, not level 20, so druidLevel?.wild_shape is undefined
            // maxWS = 0, maxWS > 0 is false
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'TestMonk',
                'wildShapeUses',
                expect.any(Number),
                campaignName
            );
        });
    });

    describe('Bardic Inspiration edge cases', () => {
        it('does not recover when class level lookup fails and no proficiency fallback', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'bardicInspirationUses') return 0;
                return null;
            });
            const stats = {
                ...defaultPlayerStats,
                name: 'Bard',
                level: 20,
                class: {
                    ...defaultPlayerStats.class,
                    name: 'Bard',
                    class_levels: [{ level: 25, bardic_inspiration_uses: 5 }],
                },
                automation: {
                    ...defaultPlayerStats.automation,
                    actions: [
                        { type: 'initiative_action', effect: 'regain_bardic_inspiration_on_initiative' },
                    ],
                },
                proficiency: undefined,
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'Bard', roll: 15 });
            // classLevel finds level 25, not level 20, so classLevel?.bardic_inspiration_uses is undefined
            // maxBI = undefined ?? undefined ?? 0 = 0, currentBI(0) < minTarget(2) is true, newBI = min(0, 2) = 0
            // setRuntimeValue is called with 0
            const biCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'bardicInspirationUses'
            );
            expect(biCalls.length).toBe(1);
            expect(biCalls[0][2]).toBe(0);
        });
    });

    describe('Calm Emotions edge cases', () => {
        it('does not restore suppressed conditions when mode is not immunity', () => {
            mockCombatSummary('Calm Emotions');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    {
                        effect: 'calm_emotions',
                        source: 'TestMonk',
                        mode: 'suppressed',
                        suppressedConditions: ['Frightened'],
                        target: 'Enemy1',
                    },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // mode is 'suppressed', not 'immunity', so conditions should NOT be restored
            const conditionCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
            // But calm_emotions effects should still be removed
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                campaignName,
                true
            );
        });

        it('does not restore conditions that are already present on target', () => {
            mockCombatSummary('Calm Emotions');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    {
                        effect: 'calm_emotions',
                        source: 'TestMonk',
                        mode: 'immunity',
                        suppressedConditions: ['Frightened'],
                        target: 'Enemy1',
                    },
                ];
                if (key === 'activeConditions') return ['Frightened'];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Frightened is already present, so should NOT be re-added
            const conditionCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('handles case-insensitive condition matching for already-present conditions', () => {
            mockCombatSummary('Calm Emotions');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    {
                        effect: 'calm_emotions',
                        source: 'TestMonk',
                        mode: 'immunity',
                        suppressedConditions: ['frightened'],
                        target: 'Enemy1',
                    },
                ];
                if (key === 'activeConditions') return ['Frightened'];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // 'frightened'.toLowerCase() === 'frightened'.toLowerCase(), so should NOT be re-added
            const conditionCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('handles empty suppressedConditions array', () => {
            mockCombatSummary('Calm Emotions');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    {
                        effect: 'calm_emotions',
                        source: 'TestMonk',
                        mode: 'immunity',
                        suppressedConditions: [],
                        target: 'Enemy1',
                    },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // No conditions to restore, but calm_emotions effects should still be removed
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [],
                campaignName,
                true
            );
        });
    });

    describe('Concentration with unhandled spells', () => {
        it('clears concentration but does not clean up targetEffects for unhandled spells', () => {
            mockCombatSummary('Shield');
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Concentration should be cleared
            expect(storageService.default.set).toHaveBeenCalledWith(
                'combatSummary',
                expect.objectContaining({
                    creatures: expect.arrayContaining([
                        expect.objectContaining({ concentration: null }),
                    ]),
                }),
                campaignName
            );
            // But no targetEffects cleanup for 'Shield' (not in the if-else chain)
            const effCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[0] === 'campaign' && call[1] === 'targetEffects'
            );
            expect(effCalls.length).toBe(0);
        });

        it('clears concentration for Magic Missile (unhandled spell)', () => {
            mockCombatSummary('Magic Missile');
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(storageService.default.set).toHaveBeenCalledWith(
                'combatSummary',
                expect.objectContaining({
                    creatures: expect.arrayContaining([
                        expect.objectContaining({ concentration: null }),
                    ]),
                }),
                campaignName
            );
        });
    });

    describe('Regenerate clearing edge cases', () => {
        it('does nothing when getAllStoreKeys returns empty array', () => {
            getRuntimeValue.mockImplementation((_charKey, prop) => {
                if (prop === 'regenerateActive') return true;
                if (prop === 'hitPoints') return 20;
                return null;
            });
            vi.mocked(getAllStoreKeys).mockReturnValue([]);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // No creatures to iterate over, so no setRuntimeValue calls for regenerate
            const regenCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'regenerateActive'
            );
            expect(regenCalls.length).toBe(0);
        });

        it('handles mixed string and non-string keys in getAllStoreKeys', () => {
            getRuntimeValue.mockImplementation((charKey, prop) => {
                if (prop === 'regenerateActive') return charKey === 'ValidCreature' ? true : false;
                if (prop === 'hitPoints') return 20;
                return null;
            });
            vi.mocked(getAllStoreKeys).mockReturnValue(['ValidCreature', 123, null, 'AnotherCreature']);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Only string keys are processed (123 and null are skipped by typeof check)
            // ValidCreature has regenerateActive=true, AnotherCreature has false
            const regenCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'regenerateActive'
            );
            expect(regenCalls.length).toBe(1);
            expect(regenCalls).toContainEqual(['ValidCreature', 'regenerateActive', false, campaignName]);
        });
    });

    describe('playerStats.automation edge cases', () => {
        it('handles playerStats with no automation property', () => {
            getRuntimeValue.mockReturnValue(null);
            const stats = {
                ...defaultPlayerStats,
                automation: undefined,
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Should not throw when automation is undefined
            expect(setRuntimeValue).toHaveBeenCalled();
        });

        it('handles playerStats with no passives in automation', () => {
            getRuntimeValue.mockReturnValue(null);
            const stats = {
                ...defaultPlayerStats,
                automation: {
                    passives: undefined,
                    actions: undefined,
                },
            };
            renderHookWithStats(stats);
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Should not throw when passives/actions are undefined
            expect(setRuntimeValue).toHaveBeenCalled();
        });
    });

    describe('setRuntimeValue individual clears for Boon of Combat Prowess / Stroke of Luck', () => {
        it('calls setRuntimeValue for boonOfCombatProwessUsed individually', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'boonOfCombatProwessUsed',
                null,
                campaignName
            );
        });

        it('calls setRuntimeValue for strokeOfLuckUsed individually', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'strokeOfLuckUsed',
                null,
                campaignName
            );
        });
    });

    describe('getCombatSummary when creature has no concentration property', () => {
        it('does nothing when creature exists but has no concentration property', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'TestMonk' },
                ],
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            const concCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'concentration'
            );
            expect(concCalls.length).toBe(0);
        });

        it('does nothing when creature concentration is undefined', () => {
            vi.mocked(getCombatSummary).mockReturnValue({
                creatures: [
                    { name: 'TestMonk', concentration: undefined },
                ],
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            const concCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'concentration'
            );
            expect(concCalls.length).toBe(0);
        });
    });

    describe('Turn Undead edge cases', () => {
        it('does nothing when failedTargets is empty', () => {
            const rollDamage = vi.fn();
            const stats = {
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
            renderHook(() =>
                useInitiativeEffects(stats, campaignName, rollDamage)
            );
            window.dispatchEvent(
                new CustomEvent('turn-undead-result', {
                    detail: {
                        attackerName: 'Cleric',
                        campaignName,
                        failedTargets: [],
                        saveDc: 13,
                        saveType: 'WIS',
                    },
                })
            );
            expect(rollDamage).not.toHaveBeenCalled();
        });

        it('uses minimum 1 Wisdom modifier when Wisdom ability is missing', () => {
            const rollDamage = vi.fn();
            rollExpression.mockReturnValue({ total: 1, rolls: [1], modifier: 0 });
            const stats = {
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
                abilities: [],
            };
            renderHook(() =>
                useInitiativeEffects(stats, campaignName, rollDamage)
            );
            window.dispatchEvent(
                new CustomEvent('turn-undead-result', {
                    detail: {
                        attackerName: 'Cleric',
                        campaignName,
                        failedTargets: ['Goblin'],
                        saveDc: 13,
                        saveType: 'WIS',
                    },
                })
            );
            // wis is undefined, wis?.bonus is undefined, Math.max(1, undefined) = 1
            // So 1d8 is rolled
            expect(rollDamage).toHaveBeenCalled();
            expect(rollDamage).toHaveBeenCalledWith(
                'Searing Undead',
                '1d8',
                1,
                [1],
                0,
                expect.any(Object)
            );
        });
    });
});

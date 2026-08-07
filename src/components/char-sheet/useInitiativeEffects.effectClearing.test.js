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

import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

describe('useInitiativeEffects - campaign targetEffects clearing', () => {
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

    function assertCampaignEffectCleared(effectName, filteredEffects) {
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'targetEffects',
            filteredEffects,
            campaignName,
            true
        );
    }

    function assertCampaignEffectNotCleared() {
        const calls = vi.mocked(setRuntimeValue).mock.calls.filter(
            call => call[0] === 'campaign' && call[1] === 'targetEffects'
        );
        expect(calls.length).toBe(0);
    }

    describe('Pass Without Trace clearing', () => {
        it('removes pass_without_trace_bonus from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'pass_without_trace_bonus', source: 'TestMonk' },
                    { effect: 'other_effect', source: 'Ally' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('pass_without_trace_bonus', [
                { effect: 'other_effect', source: 'Ally' },
            ]);
        });

        it('does nothing when no pass_without_trace_bonus exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect', source: 'Ally' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });

    describe('Blur clearing', () => {
        it('removes blur from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'blur', target: 'Enemy' },
                    { effect: 'other_effect', source: 'Ally' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('blur', [
                { effect: 'other_effect', source: 'Ally' },
            ]);
        });

        it('does nothing when no blur exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });

    describe('Globe of Invulnerability clearing', () => {
        it('removes globe_barrier from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'globe_barrier', target: 'Ally' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('globe_barrier', [
                { effect: 'other_effect' },
            ]);
        });

        it('does nothing when no globe_barrier exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });

    describe('Forcecage clearing', () => {
        it('removes forcecage from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'forcecage', target: 'Enemy' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('forcecage', [
                { effect: 'other_effect' },
            ]);
        });

        it('does nothing when no forcecage exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });

    describe('Antimagic Field clearing', () => {
        it('removes antimagic_field from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'antimagic_field', target: 'Area' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('antimagic_field', [
                { effect: 'other_effect' },
            ]);
        });

        it('does nothing when no antimagic_field exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });

    describe('Regenerate effect clearing', () => {
        it('removes regenerate from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'regenerate', target: 'Enemy' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('regenerate', [
                { effect: 'other_effect' },
            ]);
        });

        it('does nothing when no regenerate exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });

    describe('Beacon of Hope clearing', () => {
        it('removes beacon_of_hope from targetEffects on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'beacon_of_hope', target: 'Party' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectCleared('beacon_of_hope', [
                { effect: 'other_effect' },
            ]);
        });

        it('does nothing when no beacon_of_hope exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            assertCampaignEffectNotCleared();
        });
    });
});

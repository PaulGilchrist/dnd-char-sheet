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
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { revertPolymorph } from '../../services/automation/handlers/spells/polymorphService.js';
import { revertShapechange } from '../../services/automation/handlers/spells/shapechangeService.js';

describe('useInitiativeEffects - concentration clearing (Calm Emotions, Circle of Power, Compulsion, Enhance Ability, Polymorph, Shapechange)', () => {
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

    describe('Calm Emotions concentration clearing', () => {
        it('removes calm_emotions targetEffects and restores suppressed conditions', () => {
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
                    { effect: 'other_effect', source: 'Ally' },
                ];
                if (key === 'activeConditions') return [];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Should restore Frightened to Enemy1
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Enemy1',
                'activeConditions',
                ['Frightened'],
                campaignName
            );
            // Should remove calm_emotions effects
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [{
                    effect: 'other_effect',
                    source: 'Ally',
                }],
                campaignName,
                true
            );
        });

        it('removes Calm Emotions buff from all creatures', () => {
            mockCombatSummary('Calm Emotions');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'calm_emotions', source: 'TestMonk', target: 'Enemy1' },
                ];
                if (key === 'activeBuffs') return [
                    { name: 'Calm Emotions', effect: 'calm_emotions' },
                    { name: 'Mage Armor', effect: 'mage_armor' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'activeBuffs',
                [{ name: 'Mage Armor', effect: 'mage_armor' }],
                campaignName
            );
        });

        it('does nothing when no calm_emotions effects exist', () => {
            mockCombatSummary('Calm Emotions');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                if (key === 'activeBuffs') return [{ name: 'Mage Armor', effect: 'mage_armor' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            const effCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[0] === 'campaign' && call[1] === 'targetEffects'
            );
            expect(effCalls.length).toBe(0);
        });
    });

    describe('Circle of Power concentration clearing', () => {
        it('removes circle_of_power targetEffect and Circle of Power buff from all creatures', () => {
            mockCombatSummary('Circle of Power');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'circle_of_power', source: 'TestMonk' },
                    { effect: 'other_effect' },
                ];
                if (key === 'activeBuffs') return [
                    { name: 'Circle of Power', effect: 'circle_power' },
                    { name: 'Mage Armor', effect: 'mage_armor' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [{ effect: 'other_effect' }],
                campaignName,
                true
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'activeBuffs',
                [{ name: 'Mage Armor', effect: 'mage_armor' }],
                campaignName
            );
        });

        it('does nothing when no circle_of_power exists', () => {
            mockCombatSummary('Circle of Power');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                if (key === 'activeBuffs') return [{ name: 'Mage Armor', effect: 'mage_armor' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            const effCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[0] === 'campaign' && call[1] === 'targetEffects'
            );
            expect(effCalls.length).toBe(0);
        });
    });

    describe('Compulsion concentration clearing', () => {
        it('removes compulsion targetEffect from campaign', () => {
            mockCombatSummary('Compulsion');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'compulsion', source: 'TestMonk', target: 'Enemy' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [{ effect: 'other_effect' }],
                campaignName,
                true
            );
        });

        it('does nothing when no compulsion exists', () => {
            mockCombatSummary('Compulsion');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            const effCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[0] === 'campaign' && call[1] === 'targetEffects'
            );
            expect(effCalls.length).toBe(0);
        });
    });

    describe('Enhance Ability concentration clearing', () => {
        it('removes enhance_ability targetEffect from campaign', () => {
            mockCombatSummary('Enhance Ability');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'enhance_ability', source: 'TestMonk', target: 'Ally' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                [{ effect: 'other_effect' }],
                campaignName,
                true
            );
        });

        it('does nothing when no enhance_ability exists', () => {
            mockCombatSummary('Enhance Ability');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            const effCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[0] === 'campaign' && call[1] === 'targetEffects'
            );
            expect(effCalls.length).toBe(0);
        });
    });

    describe('Polymorph concentration clearing', () => {
        it('calls revertPolymorph for each polymorph effect', () => {
            mockCombatSummary('Polymorph');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'polymorph', source: 'TestMonk', target: 'Goblin1' },
                    { effect: 'polymorph', source: 'TestMonk', target: 'Goblin2' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(revertPolymorph).toHaveBeenCalledWith('Goblin1', campaignName);
            expect(revertPolymorph).toHaveBeenCalledWith('Goblin2', campaignName);
        });

        it('does not call revertPolymorph when no polymorph effects exist', () => {
            mockCombatSummary('Polymorph');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(revertPolymorph).not.toHaveBeenCalled();
        });
    });

    describe('Shapechange concentration clearing', () => {
        it('calls revertShapechange for each shapechange effect', () => {
            mockCombatSummary('Shapechange');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [
                    { effect: 'shapechange', source: 'TestMonk', target: 'Dragon' },
                    { effect: 'other_effect' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(revertShapechange).toHaveBeenCalledWith('Dragon', campaignName);
        });

        it('does not call revertShapechange when no shapechange effects exist', () => {
            mockCombatSummary('Shapechange');
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'targetEffects') return [{ effect: 'other_effect' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(revertShapechange).not.toHaveBeenCalled();
        });
    });
});

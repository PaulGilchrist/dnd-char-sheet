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

describe('useInitiativeEffects - active state clearing', () => {
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

    describe('War God\'s Blessing / Living Legend clearing', () => {
        it('clears _War_Gods_Blessing_active on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', '_War_Gods_Blessing_active', null, campaignName
            );
        });

        it('clears livingLegendActive on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'livingLegendActive', null, campaignName
            );
        });

        it('clears unerringStrikeUsed on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'unerringStrikeUsed', null, campaignName
            );
        });
    });

    describe('Holy Nimbus clearing', () => {
        it('clears holyNimbusActive on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'holyNimbusActive', null, campaignName
            );
        });
    });

    describe('Elder Champion clearing', () => {
        it('clears elderChampionActive (sets to false) on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'elderChampionActive', false, campaignName
            );
        });
    });

    describe('Avenging Angel clearing', () => {
        it('clears avengingAngelActive (sets to false) on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'avengingAngelActive', false, campaignName
            );
        });
    });

    describe('Vow of Enmity clearing', () => {
        it('clears vowOfEnmityTarget and vowOfEnmityCostPaid on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'vowOfEnmityTarget', null, campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'vowOfEnmityCostPaid', null, campaignName
            );
        });

        it('removes vow_of_enmity buff from target creature when vowOfEnmityTarget exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'vowOfEnmityTarget') return 'EnemyTarget';
                if (key === 'activeBuffs') return [
                    { effect: 'vow_of_enmity', source: 'TestMonk' },
                    { effect: 'other_buff', source: 'Ally' },
                ];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'EnemyTarget',
                'activeBuffs',
                [{ effect: 'other_buff', source: 'Ally' }],
                campaignName
            );
        });

        it('does not modify target buffs when vowOfEnmityTarget is null', () => {
            getRuntimeValue.mockReturnValue(null);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Should not call setRuntimeValue for target buffs since there's no target
            const targetBuffCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[0] === 'EnemyTarget'
            );
            expect(targetBuffCalls.length).toBe(0);
        });
    });

    describe('Large Form clearing', () => {
        it('clears largeFormActive on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'largeFormActive', null, campaignName
            );
        });
    });

    describe('Trance of Order clearing', () => {
        it('clears tranceOfOrderActive on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'tranceOfOrderActive', null, campaignName
            );
        });
    });

    describe('Poisoned Weapons clearing', () => {
        it('clears poisonedWeaponsActive on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'poisonedWeaponsActive', null, campaignName
            );
        });
    });

    describe('Awakened Mind clearing', () => {
        it('removes Awakened Mind buff from activeBuffs on initiative', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [
                    { name: 'Awakened Mind', effect: 'awakened_mind' },
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

        it('clears awakenedMindTarget on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'awakenedMindTarget', null, campaignName
            );
        });

        it('does nothing when no Awakened Mind buff is present', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [{ name: 'Mage Armor', effect: 'mage_armor' }];
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'TestMonk',
                'activeBuffs',
                expect.any(Array),
                campaignName
            );
        });
    });

    describe('Bastion of Law clearing', () => {
        it('clears all bastionOfLaw fields on initiative', () => {
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'bastionOfLawActive', null, campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'bastionOfLawWardDice', null, campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'bastionOfLawWardSource', null, campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'bastionOfLawWardUsed', null, campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk', 'bastionOfLawLastAttackDamage', null, campaignName
            );
        });
    });
});

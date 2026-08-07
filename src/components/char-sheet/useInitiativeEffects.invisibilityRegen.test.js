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
import { endInvisibility, endGreaterInvisibility } from '../../services/rules/features/invisibilityService.js';

describe('useInitiativeEffects - invisibility and regenerate clearing', () => {
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

    describe('Invisibility clearing', () => {
        it('calls endInvisibility when activeInvisibility key exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === `_activeInvisibility_TestMonk`) return 'TestMonk';
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(endInvisibility).toHaveBeenCalledWith(
                'TestMonk',
                campaignName,
                'target rolled initiative'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                `_activeInvisibility_TestMonk`,
                null,
                campaignName
            );
        });

        it('does not call endInvisibility when activeInvisibility key is null', () => {
            getRuntimeValue.mockReturnValue(null);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(endInvisibility).not.toHaveBeenCalled();
        });
    });

    describe('Greater Invisibility clearing', () => {
        it('calls endGreaterInvisibility when activeGreaterInvisibility key exists', () => {
            getRuntimeValue.mockImplementation((_name, key) => {
                if (key === `_activeGreaterInvisibility_TestMonk`) return 'TestMonk';
                return null;
            });
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(endGreaterInvisibility).toHaveBeenCalledWith(
                'TestMonk',
                campaignName,
                'target rolled initiative'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                `_activeGreaterInvisibility_TestMonk`,
                null,
                campaignName
            );
        });

        it('does not call endGreaterInvisibility when activeGreaterInvisibility key is null', () => {
            getRuntimeValue.mockReturnValue(null);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            expect(endGreaterInvisibility).not.toHaveBeenCalled();
        });
    });

    describe('Regenerate HP restoration', () => {
        it('sets HP to max for all creatures with regenerateActive', () => {
            getRuntimeValue.mockImplementation((charKey, prop) => {
                if (prop === 'regenerateActive') return true;
                if (prop === 'hitPoints') return 20;
                return null;
            });
            vi.mocked(getAllStoreKeys).mockReturnValue(['TestMonk', 'Goblin', 'Zombie']);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Should set currentHitPoints = hitPoints for each creature with regenerateActive
            // and set regenerateActive = false for each
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'currentHitPoints',
                20,
                campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'currentHitPoints',
                20,
                campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Zombie',
                'currentHitPoints',
                20,
                campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'regenerateActive',
                false,
                campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'regenerateActive',
                false,
                campaignName
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Zombie',
                'regenerateActive',
                false,
                campaignName
            );
        });

        it('skips non-string keys in getAllStoreKeys for regenerate loop', () => {
            getRuntimeValue.mockImplementation((_charKey, prop) => {
                if (prop === 'regenerateActive') return true;
                if (prop === 'hitPoints') return 20;
                return null;
            });
            vi.mocked(getAllStoreKeys).mockReturnValue([123, null]);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // The regenerate loop should not have called setRuntimeValue for those keys
            const regenCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'regenerateActive'
            );
            expect(regenCalls.length).toBe(0);
        });

        it('does not set currentHitPoints when hitPoints is null', () => {
            getRuntimeValue.mockImplementation((_charKey, prop) => {
                if (prop === 'regenerateActive') return true;
                if (prop === 'hitPoints') return null;
                return null;
            });
            vi.mocked(getAllStoreKeys).mockReturnValue(['TestMonk']);
            renderHookWithStats();
            dispatchInitiativeRoll({ characterName: 'TestMonk', roll: 15 });
            // Should still set regenerateActive to false but not currentHitPoints
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'regenerateActive',
                false,
                campaignName
            );
            const hpCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
                call => call[1] === 'currentHitPoints'
            );
            expect(hpCalls.length).toBe(0);
        });
    });
});

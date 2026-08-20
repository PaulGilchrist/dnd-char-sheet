import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConcentrationHandlers } from './initiative-concentration.jsx';

// @improved-by-ai
vi.mock('../../services/ui/storage.js', () => ({
    default: {
        get: vi.fn(),
        set: vi.fn(),
        getProperty: vi.fn(),
        setProperty: vi.fn(),
    },
}));

vi.mock('../../services/combat/concentration/concentrationService.js', () => ({
    rollConcentrationSave: vi.fn(),
    breakConcentration: vi.fn(),
    buildConcentrationPopup: vi.fn(),
    cleanupConcentrationEffects: vi.fn(),
}));

vi.mock('../../services/encounters/combatLoggingService.js', () => ({
    logConcentrationSave: vi.fn(),
    logConditionEvent: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

import storage from '../../services/ui/storage.js';
import {
    rollConcentrationSave,
    breakConcentration,
    cleanupConcentrationEffects,
} from '../../services/combat/concentration/concentrationService.js';
import { logConditionEvent } from '../../services/encounters/combatLoggingService.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

describe('initiative-concentration', () => {
    let mockCombatSummary;
    let mockCharacters;
    let mockCampaignNpcs;
    let mockSetConditionPopup;
    let mockSetCombatSummary;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCombatSummary = {
            round: 1,
            creatures: [
                { name: 'Alice', type: 'player' },
                { name: 'Goblin', type: 'npc' },
            ],
        };
        mockCharacters = [
            { name: 'Alice', saveModifiers: [], computedStats: {} },
            { name: 'Goblin', saveModifiers: [], computedStats: {} },
        ];
        mockCampaignNpcs = [];
        mockSetConditionPopup = vi.fn();
        mockSetCombatSummary = vi.fn();
    });

    function createHandlers() {
        return createConcentrationHandlers({
            combatSummary: mockCombatSummary,
            campaignName: 'test-campaign',
            characters: mockCharacters,
            campaignNpcs: mockCampaignNpcs,
            mapName: 'test-map',
            setConditionPopup: mockSetConditionPopup,
            setCombatSummary: mockSetCombatSummary,
        });
    }

    // ------------------------------------------------------------------
    // Returned handlers object
    // ------------------------------------------------------------------

    describe('returned handlers object', () => {
        it('should return an object with handleRollConcentrationSave and handleBreakConcentration', () => {
            const handlers = createHandlers();
            expect(typeof handlers.handleRollConcentrationSave).toBe('function');
            expect(typeof handlers.handleBreakConcentration).toBe('function');
        });
    });

    // ------------------------------------------------------------------
    // handleBreakConcentration — early returns
    // ------------------------------------------------------------------

    describe('handleBreakConcentration — early returns', () => {
        it('should return early when combatSummary is null', () => {
            const { handleBreakConcentration } = createConcentrationHandlers({
                combatSummary: null,
                campaignName: 'test-campaign',
                characters: mockCharacters,
                campaignNpcs: mockCampaignNpcs,
                mapName: 'test-map',
                setConditionPopup: mockSetConditionPopup,
                setCombatSummary: mockSetCombatSummary,
            });
            handleBreakConcentration('Alice');
            expect(breakConcentration).not.toHaveBeenCalled();
            expect(storage.set).not.toHaveBeenCalled();
            expect(logConditionEvent).not.toHaveBeenCalled();
            expect(cleanupConcentrationEffects).not.toHaveBeenCalled();
        });

        it('should return early when breakConcentration returns null (creature not found or no concentration)', () => {
            breakConcentration.mockReturnValue(null);
            const { handleBreakConcentration } = createHandlers();
            handleBreakConcentration('NonExistent');
            expect(storage.set).not.toHaveBeenCalled();
            expect(logConditionEvent).not.toHaveBeenCalled();
            expect(cleanupConcentrationEffects).not.toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // handleBreakConcentration — successful break
    // ------------------------------------------------------------------

    describe('handleBreakConcentration — successful break', () => {
        it('should execute full flow on break', () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            breakConcentration.mockReturnValue('Fireball');

            const { handleBreakConcentration } = createHandlers();
            handleBreakConcentration('Alice');

            expect(breakConcentration).toHaveBeenCalledWith(mockCombatSummary, 'Alice');
            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(mockSetCombatSummary).toHaveBeenCalled();
            expect(logConditionEvent).toHaveBeenCalledWith(
                'test-campaign',
                'removed',
                'Alice',
                'Concentration: Fireball'
            );
            expect(cleanupConcentrationEffects).toHaveBeenCalledWith(
                'Alice',
                'Fireball',
                'test-campaign'
            );
        });

        it('should call setCombatSummary with a cloned object (cloneDeep)', () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            breakConcentration.mockReturnValue('Fireball');

            const { handleBreakConcentration } = createHandlers();
            handleBreakConcentration('Alice');

            expect(mockSetCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = mockSetCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(mockCombatSummary);
            expect(calledWith).not.toBe(mockCombatSummary);
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — cloneDeep usage
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — cloneDeep usage', () => {
        it('should call setCombatSummary with a cloned object on success', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });
            getRuntimeValue.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(mockSetCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = mockSetCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(mockCombatSummary);
            expect(calledWith).not.toBe(mockCombatSummary);
        });

        it('should call setCombatSummary with a cloned object on failure', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 5,
                success: false,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [5],
            });
            getRuntimeValue.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(mockSetCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = mockSetCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(mockCombatSummary);
            expect(calledWith).not.toBe(mockCombatSummary);
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — getRuntimeValue import behavior
    // ------------------------------------------------------------------

    describe('dynamic getRuntimeValue import', () => {
        it('should resolve lastAttack from runtime store', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });
            getRuntimeValue.mockResolvedValue({ attackerName: 'Goblin' });

            mockCharacters[1].saveModifiers = [
                { condition: 'concentration_breaker', effect: 'disadvantage', source: 'Goblin' },
            ];

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(getRuntimeValue).toHaveBeenCalledWith('campaign', 'lastAttack', 'test-campaign');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConcentrationHandlers } from './initiative-concentration.jsx';

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
    buildConcentrationPopup,
    cleanupConcentrationEffects,
} from '../../services/combat/concentration/concentrationService.js';
import { logConcentrationSave, logConditionEvent } from '../../services/encounters/combatLoggingService.js';

describe('initiative-concentration', () => {
    let mockCombatSummary;
    let mockCharacters;
    let mockCampaignNpcs;
    let mockSetConditionPopup;
    let mockSetCombatSummary;

    beforeEach(() => {
        vi.clearAllMocks();
        storage.set.mockReturnValue(undefined);
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
        });

        it('should return early when breakConcentration returns null (creature not found)', () => {
            breakConcentration.mockReturnValue(null);
            const { handleBreakConcentration } = createHandlers();
            handleBreakConcentration('NonExistent');
            expect(storage.set).not.toHaveBeenCalled();
            expect(logConditionEvent).not.toHaveBeenCalled();
            expect(cleanupConcentrationEffects).not.toHaveBeenCalled();
        });

        it('should return early when breakConcentration returns null (no concentration)', () => {
            breakConcentration.mockReturnValue(null);
            const { handleBreakConcentration } = createHandlers();
            handleBreakConcentration('Alice');
            expect(storage.set).not.toHaveBeenCalled();
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
    });

    // ------------------------------------------------------------------
    // buildConcentrationPopup arguments
    // ------------------------------------------------------------------

    describe('buildConcentrationPopup arguments', () => {
        it('should pass correct arguments to buildConcentrationPopup on success', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 18,
                success: true,
                bonus: 3,
                bonusDetail: '(+3 proficiency)',
                starryDragonFloor: false,
                displayRolls: [18],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(buildConcentrationPopup).toHaveBeenCalledWith(
                18,
                3,
                '(+3 proficiency)',
                'Fireball',
                13,
                true,
                false,
                [18]
            );
        });

        it('should pass correct arguments to buildConcentrationPopup on failure', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 5,
                success: false,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [5],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(buildConcentrationPopup).toHaveBeenCalledWith(
                5,
                2,
                undefined,
                'Fireball',
                13,
                false,
                false,
                [5]
            );
        });

        it('should pass starryDragonFloor when true', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 10,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: true,
                displayRolls: [10],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(buildConcentrationPopup).toHaveBeenCalledWith(
                10,
                2,
                undefined,
                'Fireball',
                13,
                true,
                true,
                [10]
            );
        });
    });

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
    // logConcentrationSave mode determination
    // ------------------------------------------------------------------

    describe('logConcentrationSave mode determination', () => {
        it('should pass "disadvantage" mode when hasConcentrationBreaker is true regardless of advantageSources', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue({ attackerName: 'Goblin' });

            mockCharacters[1].saveModifiers = [
                { condition: 'concentration_breaker', effect: 'disadvantage', source: 'Goblin' },
            ];
            mockCharacters[0].saveModifiers = [
                {
                    source: 'Bard',
                    target: 'concentration_saving_throws',
                    condition: 'bless',
                    effect: 'advantage',
                },
            ];

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(logConcentrationSave).toHaveBeenCalledWith(
                'test-campaign',
                'Alice',
                15,
                2,
                undefined,
                'Fireball',
                13,
                true,
                'disadvantage',
                expect.any(Array)
            );
        });
    });

    // ------------------------------------------------------------------
    // combatSummary persistence (storage.set + setCombatSummary)
    // ------------------------------------------------------------------

    describe('combatSummary persistence', () => {
        it('should persist combatSummary on success', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(mockSetCombatSummary).toHaveBeenCalled();
        });

        it('should persist combatSummary on failure', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 5,
                success: false,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [5],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(mockSetCombatSummary).toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // cloneDeep usage in setCombatSummary
    // ------------------------------------------------------------------

    describe('cloneDeep usage', () => {
        it('should call setCombatSummary with a cloned object', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue(null);

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            // Verify setCombatSummary was called and the argument is a deep clone
            // (structurally equal but not the same reference as mockCombatSummary)
            expect(mockSetCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = mockSetCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(mockCombatSummary);
            expect(calledWith).not.toBe(mockCombatSummary);
        });
    });

    // ------------------------------------------------------------------
    // getRuntimeValue import behavior
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

            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue({ attackerName: 'Goblin' });

            mockCharacters[1].saveModifiers = [
                { condition: 'concentration_breaker', effect: 'disadvantage', source: 'Goblin' },
            ];

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(grv).toHaveBeenCalledWith('campaign', 'lastAttack', 'test-campaign');
        });
    });
});

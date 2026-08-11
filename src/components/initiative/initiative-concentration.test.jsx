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
    // handleRollConcentrationSave — early returns
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — early returns', () => {
        it('should return early when combatSummary is null', async () => {
            const { handleRollConcentrationSave } = createConcentrationHandlers({
                combatSummary: null,
                campaignName: 'test-campaign',
                characters: mockCharacters,
                campaignNpcs: mockCampaignNpcs,
                mapName: 'test-map',
                setConditionPopup: mockSetConditionPopup,
                setCombatSummary: mockSetCombatSummary,
            });
            await handleRollConcentrationSave('Alice');
            expect(rollConcentrationSave).not.toHaveBeenCalled();
        });

        it('should return early when creature is not found', async () => {
            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('NonExistent');
            expect(rollConcentrationSave).not.toHaveBeenCalled();
        });

        it('should return early when creature has no concentration', async () => {
            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');
            expect(rollConcentrationSave).not.toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — successful save
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — successful save', () => {
        it('should execute full flow on success', async () => {
            mockCombatSummary.creatures[0].concentration = {
                spell: 'Fireball',
                dc: 13,
            };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(rollConcentrationSave).toHaveBeenCalledWith(
                { name: 'Alice', type: 'player', concentration: { spell: 'Fireball', dc: 13 } },
                { spell: 'Fireball', dc: 13 },
                mockCharacters,
                mockCampaignNpcs,
                'test-campaign',
                'test-map',
                expect.any(Function),
                false
            );
            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(mockSetCombatSummary).toHaveBeenCalled();
            expect(buildConcentrationPopup).toHaveBeenCalled();
            expect(logConcentrationSave).toHaveBeenCalled();
            expect(cleanupConcentrationEffects).not.toHaveBeenCalled();
            // concentration should remain untouched on success
            expect(mockCombatSummary.creatures[0].concentration).toEqual({ spell: 'Fireball', dc: 13 });
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — failed save
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — failed save', () => {
        it('should clear concentration and call cleanup on failure', async () => {
            mockCombatSummary.creatures[0].concentration = {
                spell: 'Fireball',
                dc: 13,
            };
            rollConcentrationSave.mockResolvedValue({
                roll: 5,
                success: false,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [5],
            });

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(mockCombatSummary.creatures[0].concentration).toBeNull();
            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(buildConcentrationPopup).toHaveBeenCalled();
            expect(logConcentrationSave).toHaveBeenCalled();
            expect(cleanupConcentrationEffects).toHaveBeenCalledWith(
                'Alice',
                'Fireball',
                'test-campaign'
            );
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — hasConcentrationBreaker (disadvantage)
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — hasConcentrationBreaker', () => {
        it('should pass hasConcentrationBreaker=true when attacker has concentration_breaker disadvantage modifier', async () => {
            mockCombatSummary.creatures[0].concentration = { spell: 'Fireball', dc: 13 };
            rollConcentrationSave.mockResolvedValue({
                roll: 15,
                success: true,
                bonus: 2,
                bonusDetail: undefined,
                starryDragonFloor: false,
                displayRolls: [15],
            });

            // Simulate: lastAttack points to an attacker with concentration_breaker modifier
            const { getRuntimeValue: grv } = await import('../../hooks/runtime/useRuntimeState.js');
            grv.mockResolvedValue({
                attackerName: 'Goblin',
            });

            mockCharacters[1].saveModifiers = [
                { condition: 'concentration_breaker', effect: 'disadvantage', source: 'Goblin' },
            ];

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(rollConcentrationSave).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.any(Array),
                expect.any(Array),
                'test-campaign',
                'test-map',
                expect.any(Function),
                true // hasConcentrationBreaker
            );
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
                undefined
            );
        });

        it('should default hasConcentrationBreaker to false when lastAttack is null', async () => {
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

            expect(rollConcentrationSave).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.any(Array),
                expect.any(Array),
                'test-campaign',
                'test-map',
                expect.any(Function),
                false
            );
        });

        it('should default hasConcentrationBreaker to false when lastAttack has no attackerName', async () => {
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
            grv.mockResolvedValue({});

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(rollConcentrationSave).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.any(Array),
                expect.any(Array),
                'test-campaign',
                'test-map',
                expect.any(Function),
                false
            );
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — advantageSources from targetModifiers
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — advantageSources', () => {
        it('should collect advantageSources from saveModifiers with target "concentration_saving_throws"', async () => {
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
                'advantage',
                ['Bard']
            );
        });

        it('should collect advantageSources from saveModifiers with target "saving_throw" + concentration_spell_damage + Constitution', async () => {
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

            mockCharacters[0].saveModifiers = [
                {
                    source: 'Paladin',
                    target: 'saving_throw',
                    condition: 'concentration_spell_damage',
                    effect: 'advantage',
                    abilities: ['Constitution'],
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
                'advantage',
                ['Paladin']
            );
        });

        it('should NOT collect advantageSources when target is "saving_throw" but abilities does not include Constitution', async () => {
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

            mockCharacters[0].saveModifiers = [
                {
                    source: 'SomeSource',
                    target: 'saving_throw',
                    condition: 'concentration_spell_damage',
                    effect: 'advantage',
                    abilities: ['Strength'],
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
                'normal',
                undefined
            );
        });

        it('should deduplicate advantageSources from multiple modifiers', async () => {
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

            mockCharacters[0].saveModifiers = [
                {
                    source: 'Bard',
                    target: 'concentration_saving_throws',
                    condition: 'bless',
                    effect: 'advantage',
                },
                {
                    source: 'Bard',
                    target: 'concentration_saving_throws',
                    condition: 'other',
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
                'advantage',
                ['Bard']
            );
        });

        it('should default to "normal" when no targetModifiers exist', async () => {
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

            mockCharacters[0].saveModifiers = undefined;

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
                'normal',
                undefined
            );
        });

        it('should default to "normal" when targetModifiers is empty array', async () => {
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

            mockCharacters[0].saveModifiers = [];

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
                'normal',
                undefined
            );
        });
    });

    // ------------------------------------------------------------------
    // handleRollConcentrationSave — targetCharacter finding
    // ------------------------------------------------------------------

    describe('handleRollConcentrationSave — targetCharacter matching', () => {
        it('should find targetCharacter by exact name match', async () => {
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

            expect(rollConcentrationSave).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Alice' }),
                expect.any(Object),
                expect.arrayContaining([expect.objectContaining({ name: 'Alice' })]),
                expect.any(Array),
                'test-campaign',
                'test-map',
                expect.any(Function),
                false
            );
        });

        it('should find targetCharacter by name with trailing space in characters array (e.g. "Goblin Companion")', async () => {
            // When creatureName has a trailing space match in characters,
            // the targetCharacter lookup should find it for saveModifiers
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

            // Add a character named "Alice Companion" that matches Alice with trailing space
            mockCharacters.push({ name: 'Alice Companion', saveModifiers: [], computedStats: {} });

            const { handleRollConcentrationSave } = createHandlers();
            await handleRollConcentrationSave('Alice');

            expect(rollConcentrationSave).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Alice' }),
                expect.any(Object),
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Alice' }),
                    expect.objectContaining({ name: 'Alice Companion' }),
                ]),
                expect.any(Array),
                'test-campaign',
                'test-map',
                expect.any(Function),
                false
            );
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

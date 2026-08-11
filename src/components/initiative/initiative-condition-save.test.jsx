import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRollConditionSaveHandler } from './initiative-condition-save.jsx';

// We need to create the mock objects here at the top level since vi.mock is hoisted
// Each vi.mock factory creates its own isolated mock object

vi.mock('../../services/ui/storage.js', () => ({
    default: {
        get: vi.fn(),
        set: vi.fn(),
        getProperty: vi.fn(),
        setProperty: vi.fn(),
    },
}));

vi.mock('../../services/combat/conditions/conditionSaveService.js', () => ({
    rollConditionSave: vi.fn(),
    removeCondition: vi.fn(),
    addCondition: vi.fn(),
    buildConditionPopup: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/forcecageHandler.js', () => ({
    removeForcecageEffect: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/mazeHandler.js', () => ({
    removeMazeEffect: vi.fn(),
}));

vi.mock('../../services/encounters/combatLoggingService.js', () => ({
    logConditionSave: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
    getLog: vi.fn(async () => []),
    addEntry: vi.fn(async () => ({})),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

// Import the mocked modules so we can access their mocks
import storage from '../../services/ui/storage.js';
import { rollConditionSave, removeCondition, buildConditionPopup } from '../../services/combat/conditions/conditionSaveService.js';
import { removeForcecageEffect } from '../../services/automation/handlers/spells/forcecageHandler.js';
import { removeMazeEffect } from '../../services/automation/handlers/spells/mazeHandler.js';
import { logConditionSave } from '../../services/encounters/combatLoggingService.js';
import { addEntry } from '../../services/ui/logService.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

describe('initiative-condition-save', () => {
    let mockCombatSummary;
    let mockCharacters;
    let mockCampaignNpcs;
    let mockSetConditionPopup;
    let mockSetCombatSummary;

    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        storage.set.mockReturnValue(undefined);

        mockCombatSummary = {
            round: 1,
            creatures: [
                { name: 'Alice', type: 'player' },
                { name: 'Goblin', type: 'npc' },
            ],
        };
        mockCharacters = [
            { name: 'Alice', computedStats: { hitPoints: 20, currentHitPoints: 20 } },
        ];
        mockCampaignNpcs = [];
        mockSetConditionPopup = vi.fn();
        mockSetCombatSummary = vi.fn();
    });

    function createHandler() {
        return createRollConditionSaveHandler({
            combatSummary: mockCombatSummary,
            campaignName: 'test-campaign',
            characters: mockCharacters,
            campaignNpcs: mockCampaignNpcs,
            mapName: 'test-map',
            setConditionPopup: mockSetConditionPopup,
            setCombatSummary: mockSetCombatSummary,
        });
    }

    describe('early returns', () => {
        it('should return early when combatSummary is null', async () => {
            const handler = createRollConditionSaveHandler({
                combatSummary: null,
                campaignName: 'test-campaign',
                characters: mockCharacters,
                campaignNpcs: mockCampaignNpcs,
                mapName: 'test-map',
                setConditionPopup: mockSetConditionPopup,
                setCombatSummary: mockSetCombatSummary,
            });
            await handler('Alice', { key: 'blinded', label: 'Blinded' });
            expect(rollConditionSave).not.toHaveBeenCalled();
        });

        it('should return early when creature is not found', async () => {
            const handler = createHandler();
            await handler('NonExistent', { key: 'blinded', label: 'Blinded' });
            expect(rollConditionSave).not.toHaveBeenCalled();
        });
    });

    describe('successful saves - general flow', () => {
        it('should call rollConditionSave, removeCondition, storage.set, setCombatSummary, buildConditionPopup, and logConditionSave on success', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ name: 'Alice', condition: 'Blinded', success: true });

            await handler('Alice', { key: 'blinded', label: 'Blinded', dc: 10, ability: 'con' });

            expect(rollConditionSave).toHaveBeenCalledWith(
                { name: 'Alice', type: 'player' },
                { key: 'blinded', label: 'Blinded', dc: 10, ability: 'con' },
                mockCharacters,
                mockCampaignNpcs,
                'test-campaign',
                'test-map',
                expect.any(Function)
            );
            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'blinded', label: 'Blinded', dc: 10, ability: 'con' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(mockSetCombatSummary).toHaveBeenCalled();
            expect(buildConditionPopup).toHaveBeenCalled();
            expect(logConditionSave).toHaveBeenCalled();
        });

        it('should do nothing on failure (success=false)', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 3, success: false, bonus: 2, bonusDetail: '', rolls: [3], starryDragonFloor: false,
            });

            await handler('Alice', { key: 'blinded', label: 'Blinded', dc: 10, ability: 'con' });

            expect(removeCondition).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
        });
    });

    describe('Otto\'s Irresistible Dance - Charmed save success', () => {
        it('should remove speed_zero, remove targetEffect, and log when charmed save succeeds with dance effect present', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'ottos_irresistible_dance', source: 'Goblin', dc: 15 }];
                }
                return null;
            });

            await handler('Alice', { key: 'charmed', label: 'Charmed', dc: 15, ability: 'wis' });

            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'speed_zero' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign', 'targetEffects', [], 'test-campaign'
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'save_result',
                    rollType: 'save-ottos-dance',
                    targetName: 'Alice',
                    saveType: 'WIS',
                    success: true,
                })
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'condition',
                    action: 'removed',
                    condition: 'Charmed, Speed 0',
                })
            );
        });

        it('should NOT trigger Otto dance cleanup when no dance effect exists', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'charmed', label: 'Charmed', dc: 15, ability: 'wis' });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'campaign', 'targetEffects', [], 'test-campaign'
            );
            expect(addEntry).not.toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({ rollType: 'save-ottos-dance' })
            );
        });

        it('should handle case when targetEffects is undefined', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(undefined);

            await handler('Alice', { key: 'charmed', label: 'Charmed', dc: 15, ability: 'wis' });

            expect(setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('Tasha\'s Hideous Laughter - Prone/Incapacitated save success', () => {
        it('should remove prone and incapacitated, remove targetEffect, and log when prone save succeeds with laughter effect present', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'tashas_hideous_laughter', source: 'Goblin', dc: 10 }];
                }
                return null;
            });

            await handler('Alice', { key: 'prone', label: 'Prone', dc: 10, ability: 'wis' });

            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'prone' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'incapacitated' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign', 'targetEffects', [], 'test-campaign'
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'save_result',
                    rollType: 'save-tashas-laughter',
                    targetName: 'Alice',
                    saveType: 'WIS',
                    success: true,
                })
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'condition',
                    action: 'removed',
                    condition: 'Prone, Incapacitated',
                })
            );
        });

        it('should also trigger Tasha\'s cleanup when incapacitated is the condition being saved', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'tashas_hideous_laughter', source: 'Goblin', dc: 10 }];
                }
                return null;
            });

            await handler('Alice', { key: 'incapacitated', label: 'Incapacitated', dc: 10, ability: 'wis' });

            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'prone' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'incapacitated' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign', 'targetEffects', [], 'test-campaign'
            );
        });

        it('should NOT trigger Tasha cleanup when no laughter effect exists', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'prone', label: 'Prone', dc: 10, ability: 'wis' });

            expect(removeCondition).not.toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'incapacitated' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
        });
    });

    describe('Confusion - Confused save success', () => {
        it('should remove charmed and speed_zero, remove targetEffect, and log when confused save succeeds with confusion effect present', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'confusion', source: 'Goblin', dc: 15 }];
                }
                return null;
            });

            await handler('Alice', { key: 'confused', label: 'Confused', dc: 15, ability: 'wis' });

            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'charmed' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(removeCondition).toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'speed_zero' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign', 'targetEffects', [], 'test-campaign'
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'save_result',
                    rollType: 'save-confusion',
                    targetName: 'Alice',
                    saveType: 'WIS',
                    success: true,
                })
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'condition',
                    action: 'removed',
                    condition: 'Charmed, Speed 0',
                })
            );
        });

        it('should NOT trigger Confusion cleanup when no confusion effect exists', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'confused', label: 'Confused', dc: 15, ability: 'wis' });

            expect(removeCondition).not.toHaveBeenCalledWith(
                mockCombatSummary, 'Alice', { key: 'charmed' },
                expect.any(Function), expect.any(Function), 'test-campaign'
            );
        });
    });

    describe('Forcecaged - Forcecaged save success', () => {
        it('should call removeForcecageEffect, remove targetEffect, and log when forcecaged save succeeds with forcecage effect present', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeForcecageEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'forcecage', source: 'Goblin', dc: 15 }];
                }
                return null;
            });

            await handler('Alice', { key: 'forcecaged', label: 'Forcecaged', dc: 15, ability: 'cha' });

            expect(removeForcecageEffect).toHaveBeenCalledWith(
                'Alice', 'Goblin', 'test-campaign'
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'save_result',
                    rollType: 'save-forcecage',
                    targetName: 'Alice',
                    saveType: 'CHA',
                    success: true,
                })
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'condition',
                    action: 'removed',
                    condition: 'Forcecaged',
                })
            );
        });

        it('should NOT trigger Forcecage cleanup when no forcecage effect exists', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'forcecaged', label: 'Forcecaged', dc: 15, ability: 'cha' });

            expect(removeForcecageEffect).not.toHaveBeenCalled();
        });
    });

    describe('Incapacitated - Maze escape', () => {
        it('should call removeMazeEffect, clear mazeData, filter activeConditions, and log when incapacitated save succeeds with maze effect present', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 18, success: true, bonus: 5, bonusDetail: '', rolls: [18], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeMazeEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'maze', source: 'Goblin', dc: 20 }];
                }
                if (key === 'Alice' && prop === 'mazeData') {
                    return { casterName: 'Goblin', dc: 20 };
                }
                if (key === 'Alice' && prop === 'activeConditions') {
                    return ['incapacitated', 'blinded'];
                }
                return null;
            });

            await handler('Alice', { key: 'incapacitated', label: 'Incapacitated', dc: 20, ability: 'int' });

            expect(removeMazeEffect).toHaveBeenCalledWith(
                'Alice', 'Goblin', 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Alice', 'mazeData', null, 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Alice', 'activeConditions', ['blinded'], 'test-campaign'
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'save_result',
                    rollType: 'save-maze-escape',
                    targetName: 'Alice',
                    saveType: 'INT',
                    success: true,
                })
            );
            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign', expect.objectContaining({
                    type: 'condition',
                    action: 'removed',
                    condition: 'Incapacitated',
                })
            );
        });

        it('should handle mazeData being null', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 18, success: true, bonus: 5, bonusDetail: '', rolls: [18], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeMazeEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'maze', source: 'Goblin', dc: 20 }];
                }
                if (key === 'Alice' && prop === 'mazeData') {
                    return null;
                }
                if (key === 'Alice' && prop === 'activeConditions') {
                    return ['incapacitated'];
                }
                return null;
            });

            await handler('Alice', { key: 'incapacitated', label: 'Incapacitated', dc: 20, ability: 'int' });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Alice', 'mazeData', null, 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Alice', 'activeConditions', [], 'test-campaign'
            );
        });

        it('should handle activeConditions being null', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 18, success: true, bonus: 5, bonusDetail: '', rolls: [18], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeMazeEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'maze', source: 'Goblin', dc: 20 }];
                }
                if (key === 'Alice' && prop === 'mazeData') {
                    return { casterName: 'Goblin' };
                }
                if (key === 'Alice' && prop === 'activeConditions') {
                    return null;
                }
                return null;
            });

            await handler('Alice', { key: 'incapacitated', label: 'Incapacitated', dc: 20, ability: 'int' });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Alice', 'activeConditions', [], 'test-campaign'
            );
        });

        it('should NOT trigger Maze cleanup when no maze effect exists', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 18, success: true, bonus: 5, bonusDetail: '', rolls: [18], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'incapacitated', label: 'Incapacitated', dc: 20, ability: 'int' });

            expect(removeMazeEffect).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Alice', 'mazeData', null, 'test-campaign'
            );
        });
    });

    describe('buildConditionPopup call', () => {
        it('should pass correct arguments to buildConditionPopup on success', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 3, bonusDetail: '(+3 proficiency)', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'blinded', label: 'Blinded', dc: 12, ability: 'con' });

            expect(buildConditionPopup).toHaveBeenCalledWith(
                15, 3, '(+3 proficiency)', 'Constitution', 'Blinded', 12, true, [15], false, false
            );
        });

        it('should pass advantage=true when rolls has multiple entries', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15, 12], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'blinded', label: 'Blinded', dc: 12, ability: 'con' });

            expect(buildConditionPopup).toHaveBeenCalledWith(
                15, 2, '', 'Constitution', 'Blinded', 12, true, [15, 12], true, false
            );
        });

        it('should pass starryDragonFloor when true', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 10, success: true, bonus: 3, bonusDetail: '', rolls: [5], starryDragonFloor: true,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockReturnValue(null);

            await handler('Alice', { key: 'blinded', label: 'Blinded', dc: 12, ability: 'con' });

            expect(buildConditionPopup).toHaveBeenCalledWith(
                10, 3, '', 'Constitution', 'Blinded', 12, true, [5], false, true
            );
        });
    });

    describe('case-insensitive condition key matching', () => {
        it('should match Otto\'s Dance with uppercase CHARMED', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'ottos_irresistible_dance', source: 'Goblin' }];
                }
                return null;
            });

            await handler('Alice', { key: 'CHARMED', label: 'Charmed', dc: 15, ability: 'wis' });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign', 'targetEffects', [], 'test-campaign'
            );
        });

        it('should match Forcecage with uppercase FORCECAGED', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeForcecageEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'forcecage', source: 'Goblin' }];
                }
                return null;
            });

            await handler('Alice', { key: 'FORCECAGED', label: 'Forcecaged', dc: 15, ability: 'cha' });

            expect(removeForcecageEffect).toHaveBeenCalledWith(
                'Alice', 'Goblin', 'test-campaign'
            );
        });

        it('should match Maze with uppercase INCAPACITATED', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 18, success: true, bonus: 5, bonusDetail: '', rolls: [18], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeMazeEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'maze', source: 'Goblin' }];
                }
                if (key === 'Alice' && prop === 'mazeData') return null;
                if (key === 'Alice' && prop === 'activeConditions') return ['incapacitated'];
                return null;
            });

            await handler('Alice', { key: 'INCAPACITATED', label: 'Incapacitated', dc: 20, ability: 'int' });

            expect(removeMazeEffect).toHaveBeenCalledWith(
                'Alice', 'Goblin', 'test-campaign'
            );
        });
    });

    describe('logService.addEntry error handling', () => {
        it('should not throw when logService.addEntry rejects', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 15, success: true, bonus: 2, bonusDetail: '', rolls: [15], starryDragonFloor: false,
            });
            removeCondition.mockReturnValue(undefined);
            buildConditionPopup.mockReturnValue({ success: true });
            removeForcecageEffect.mockReturnValue({});
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') {
                    return [{ target: 'Alice', effect: 'forcecage', source: 'Goblin' }];
                }
                return null;
            });
            addEntry.mockRejectedValue(new Error('log failure'));

            await expect(handler('Alice', { key: 'forcecaged', label: 'Forcecaged', dc: 15, ability: 'cha' }))
                .resolves.toBeUndefined();

            expect(removeForcecageEffect).toHaveBeenCalled();
        });
    });

    describe('combatSummary persistence', () => {
        it('should always call storage.set and setCombatSummary regardless of success/failure', async () => {
            const handler = createHandler();
            rollConditionSave.mockResolvedValue({
                roll: 3, success: false, bonus: 2, bonusDetail: '', rolls: [3], starryDragonFloor: false,
            });
            buildConditionPopup.mockReturnValue({ success: false });

            await handler('Alice', { key: 'blinded', label: 'Blinded', dc: 10, ability: 'con' });

            expect(storage.set).toHaveBeenCalledWith('combatSummary', mockCombatSummary, 'test-campaign');
            expect(mockSetCombatSummary).toHaveBeenCalled();
        });
    });
});

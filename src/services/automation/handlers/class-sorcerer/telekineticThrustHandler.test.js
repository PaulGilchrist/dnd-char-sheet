import { handle, applyTelekineticThrust } from './telekineticThrustHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';
import * as savePrompt from '../../common/savePrompt.js';
import * as conditionSaveService from '../../../combat/conditions/conditionSaveService.js';
import storage from '../../../../services/ui/storage.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(),
    createSaveListener: vi.fn(),
}));

vi.mock('../../../../services/ui/storage.js', () => ({
    default: {
        set: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock('../../../../services/combat/conditions/conditionSaveService.js', () => ({
    addCondition: vi.fn(),
}));

const makeAction = (auto = {}) => ({
    name: 'Telekinetic Thrust',
    automation: { type: 'telekinetic_thrust', saveType: 'STR', options: [], ...auto },
});

const makeActionWithOptions = (auto = {}) => ({
    name: 'Telekinetic Thrust',
    automation: { type: 'telekinetic_thrust', saveType: 'STR', options: [{ name: 'Push', effect: 'prone_and_push', value: 10 }], ...auto },
});

const makePlayerStats = (overrides = {}) => ({
    name: 'TestHero',
    ...overrides,
});

describe('telekineticThrustHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        damageUtils.getCombatContext.mockReturnValue(null);
        savePrompt.buildSaveDc.mockReturnValue(13);
        runtimeState.getRuntimeValue.mockReturnValue(null);
    });

    describe('handle', () => {
        function setupSaveMock() {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true, total: 15, roll: 12, saveBonus: 3 }),
            });
        }

        beforeEach(() => {
            runtimeState.getRuntimeValue.mockReturnValue([]);
        });

        it('should return info popup when no options available', async () => {
            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('ready');
        });

        it('should return no-target popup when options exist but no target', async () => {
            const result = await handle(makeActionWithOptions(), makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No target selected');
        });

        it('should create save listener when options exist and target is present', async () => {
            setupSaveMock();
            damageUtils.getCombatContext.mockReturnValue({
                attacker: { nextTargetAttacking: 'Goblin' },
            });
            damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });

            await handle(makeActionWithOptions(), makePlayerStats(), 'test-campaign', 'map');

            expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 13,
            });
        });

        it('should add campaign log entry for ability use', async () => {
            await handle(makeAction(), makePlayerStats(), 'test-campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestHero',
                abilityName: 'Telekinetic Thrust',
            }));
        });

        it('should include target name in log description when target exists', async () => {
            damageUtils.getCombatContext.mockReturnValue({
                attacker: { nextTargetAttacking: 'Goblin' },
            });
            damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });

            await handle(makeAction(), makePlayerStats(), 'test-campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                description: expect.stringContaining('against Goblin'),
            }));
        });

        it('should omit target from log description when no target exists', async () => {
            await handle(makeAction(), makePlayerStats(), 'test-campaign', 'map');

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                description: expect.stringContaining('Telekinetic Thrust used'),
            }));
        });

        it('should use custom saveType when specified in automation', async () => {
            setupSaveMock();
            damageUtils.getCombatContext.mockReturnValue({
                attacker: { nextTargetAttacking: 'Goblin' },
            });
            damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });

            await handle(makeActionWithOptions({ saveType: 'DEX' }), makePlayerStats(), 'test-campaign', 'map');

            expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
                targetName: 'Goblin',
                saveType: 'DEX',
                saveDc: 13,
            });
        });

        it('should default to STR saveType when not specified in automation options', async () => {
            setupSaveMock();
            damageUtils.getCombatContext.mockReturnValue({
                attacker: { nextTargetAttacking: 'Goblin' },
            });
            damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });

            const actionWithoutSaveType = {
                name: 'Telekinetic Thrust',
                automation: {
                    type: 'telekinetic_thrust',
                    options: [{ name: 'Push', effect: 'prone_and_push', value: 10 }],
                },
            };

            await handle(actionWithoutSaveType, makePlayerStats(), 'test-campaign', 'map');

            expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 13,
            });
        });

        it('should return a popup with save result when target exists and save resolves', async () => {
            setupSaveMock();
            damageUtils.getCombatContext.mockReturnValue({
                attacker: { nextTargetAttacking: 'Goblin' },
            });
            damageUtils.getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });

            const result = await handle(makeActionWithOptions(), makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Success');
        });

        it('should handle addEntry rejection gracefully in handle()', async () => {
            logService.addEntry.mockRejectedValue(new Error('log error'));

            const result = await handle(makeAction(), makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('ready');
        });

        it('should handle undefined auto.options in handle()', async () => {
            const actionWithoutOptions = {
                name: 'Telekinetic Thrust',
                automation: { type: 'telekinetic_thrust', saveType: 'STR' },
            };

            const result = await handle(actionWithoutOptions, makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('ready');
        });
    });

    describe('applyTelekineticThrust', () => {
        it('should return null when no options available', async () => {
            const result = await applyTelekineticThrust(makeAction(), makePlayerStats(), 'test-campaign', 'Goblin', 13, 'STR');

            expect(result).toBeNull();
        });

        it('should clear pendingRiderChoice before processing', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true, total: 15, roll: 12, saveBonus: 3 }),
            });

            await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestHero',
                'pendingRiderChoice',
                null,
                'test-campaign'
            );
        });

        it('should return popup with no-target message when targetName is null', async () => {
            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                null,
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No target selected');
        });

        it('should create a save listener and wait for the result', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(savePrompt.createSaveListener).toHaveBeenCalledWith('test-campaign', {
                targetName: 'Goblin',
                saveType: 'STR',
                saveDc: 13,
            });
        });

        it('should return a popup indicating success when save passes', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true, total: 15, roll: 12, saveBonus: 3 }),
            });

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Success');
            expect(result.payload.description).toContain('No effect applied');
        });

        it('should return a popup indicating failure and apply effect when save fails', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
            expect(result.payload.description).toContain('Push');
        });

        it('should handle missing combatContext gracefully on failure', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });
            runtimeState.getRuntimeValue.mockReturnValue([]);
            damageUtils.getCombatContext.mockResolvedValue(null);

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
        });

        it('should apply prone condition and push when save fails and target is not already prone', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const combatContext = {
                creatures: [
                    { name: 'Goblin', conditions: [] },
                ],
            };
            damageUtils.getCombatContext.mockResolvedValue(combatContext);

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
            expect(conditionSaveService.addCondition).toHaveBeenCalledWith(
                combatContext,
                'Goblin',
                { key: 'prone', label: 'Prone' },
                13,
                'STR',
                expect.any(Function),
                expect.any(Function),
                'test-campaign',
                expect.any(Object)
            );
            expect(storage.set).toHaveBeenCalledWith('combatSummary', combatContext, 'test-campaign');
            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                description: expect.stringContaining('Prone'),
            }));
        });

        it('should skip prone condition when target is already prone', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const combatContext = {
                creatures: [
                    { name: 'Goblin', conditions: [{ key: 'prone' }] },
                ],
            };
            damageUtils.getCombatContext.mockResolvedValue(combatContext);

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
            expect(conditionSaveService.addCondition).not.toHaveBeenCalled();
            expect(storage.set).not.toHaveBeenCalled();
        });

        it('should use option name in result message for unknown effect types', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const combatContext = {
                creatures: [
                    { name: 'Goblin', conditions: [] },
                ],
            };
            damageUtils.getCombatContext.mockResolvedValue(combatContext);

            const actionWithUnknownEffect = {
                name: 'Telekinetic Thrust',
                automation: {
                    type: 'telekinetic_thrust',
                    saveType: 'STR',
                    options: [{ name: 'Unique Effect', effect: 'custom_effect', value: 15 }],
                },
            };

            const result = await applyTelekineticThrust(
                actionWithUnknownEffect,
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
            expect(result.payload.description).toContain('Unique Effect');
        });

        it('should handle missing target creature gracefully on failure', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const combatContext = {
                creatures: [],
            };
            damageUtils.getCombatContext.mockResolvedValue(combatContext);

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
            expect(conditionSaveService.addCondition).not.toHaveBeenCalled();
        });

        it('should handle addEntry rejection on first entry in applyTelekineticThrust', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true, total: 15, roll: 12, saveBonus: 3 }),
            });
            logService.addEntry.mockRejectedValueOnce(new Error('log error')).mockResolvedValue(undefined);

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Success');
        });

        it('should handle addEntry rejection on second entry in applyTelekineticThrust', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true, total: 15, roll: 12, saveBonus: 3 }),
            });
            logService.addEntry.mockResolvedValue(undefined).mockRejectedValueOnce(new Error('log error'));

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Success');
        });

        it('should handle undefined auto.options in applyTelekineticThrust', async () => {
            const actionWithoutOptions = {
                name: 'Telekinetic Thrust',
                automation: { type: 'telekinetic_thrust', saveType: 'STR' },
            };

            const result = await applyTelekineticThrust(
                actionWithoutOptions,
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result).toBeNull();
        });

        it('should handle saveResult with missing total, roll, and saveBonus', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true }),
            });

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Success');
            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                total: 0,
                rolls: [0],
                bonus: 0,
            }));
        });

        it('should handle saveResult with saveBonus of 0', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: true, total: 13, roll: 13, saveBonus: 0 }),
            });

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Success');
            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                formula: '1d20',
            }));
        });

        it('should use default push value when option has no value property', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const combatContext = {
                creatures: [
                    { name: 'Goblin', conditions: [] },
                ],
            };
            damageUtils.getCombatContext.mockResolvedValue(combatContext);

            const actionWithoutValue = {
                name: 'Telekinetic Thrust',
                automation: {
                    type: 'telekinetic_thrust',
                    saveType: 'STR',
                    options: [{ name: 'Push', effect: 'prone_and_push' }],
                },
            };

            await applyTelekineticThrust(
                actionWithoutValue,
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                description: expect.stringContaining('pushed 10 feet'),
            }));
        });

        it('should handle addEntry rejection in applyThrustEffect', async () => {
            savePrompt.createSaveListener.mockReturnValue({
                promptId: 'test-id',
                promise: Promise.resolve({ success: false, total: 10, roll: 8, saveBonus: 2 }),
            });

            const combatContext = {
                creatures: [
                    { name: 'Goblin', conditions: [] },
                ],
            };
            damageUtils.getCombatContext.mockResolvedValue(combatContext);
            logService.addEntry.mockResolvedValue(undefined).mockResolvedValue(undefined).mockRejectedValueOnce(new Error('log error'));

            const result = await applyTelekineticThrust(
                makeActionWithOptions(),
                makePlayerStats(),
                'test-campaign',
                'Goblin',
                13,
                'STR'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Failure');
        });
    });
});

// end of file

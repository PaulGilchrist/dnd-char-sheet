import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCharActionsCleave from './useCharActionsCleave.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn(),
}));

import { rollExpression } from '../../services/dice/diceRoller.js';

function createDeps(overrides = {}) {
    const playerStats = {
        name: 'TestFighter',
        level: 5,
        proficiency: 3,
        abilities: [{ name: 'Strength', bonus: 3 }],
        attacks: [{ name: 'Longsword', abilityName: 'Strength' }],
        ...overrides.playerStats,
    };
    // addEntry must return a promise with .catch() to avoid unhandled rejection
    const entryPromise = Promise.resolve();
    entryPromise.catch(() => {});
    return {
        playerStats,
        campaignName: 'test-campaign',
        rollDamage: vi.fn(),
        getCombatContext: vi.fn(),
        getRuntimeValue: vi.fn(),
        setRuntimeValue: vi.fn(),
        addEntry: vi.fn().mockReturnValue(entryPromise),
        setShowCleaveTargetSelection: vi.fn(),
        setTacticalMasterModal: vi.fn(),
        ...overrides,
    };
}

describe('useCharActionsCleave', () => {
    let deps;

    beforeEach(() => {
        vi.clearAllMocks();
        deps = createDeps();
        deps.getRuntimeValue.mockReturnValue(null);
        deps.setRuntimeValue.mockResolvedValue(undefined);
        // addEntry must return a promise with .catch() to avoid unhandled rejection
        const entryPromise = Promise.resolve();
        entryPromise.catch(() => {});
        deps.addEntry.mockReturnValue(entryPromise);
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3] });
        globalThis.Math.random = () => 0.5;
    });

    describe('handleCleaveAttack', () => {
        it('returns early without setting modal state when cleaveTargetName is falsy', async () => {
            const { handleCleaveAttack } = useCharActionsCleave(deps);
            await handleCleaveAttack(null);
            expect(deps.setShowCleaveTargetSelection).toHaveBeenCalledWith(false);
        });

        it('returns early when there is no lastAttack', async () => {
            const testDeps = createDeps();
            testDeps.getRuntimeValue.mockReturnValueOnce(null);
            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Goblin');
            expect(testDeps.setShowCleaveTargetSelection).toHaveBeenCalledWith(false);
            expect(testDeps.rollDamage).not.toHaveBeenCalled();
            expect(testDeps.addEntry).not.toHaveBeenCalled();
        });

        it('rolls damage and logs entry when cleave attack hits', async () => {
            const lastAttack = {
                attackName: 'Longsword',
                damageFormula: '1d8+3',
                damageType: 'slashing',
                targetName: 'Goblin',
            };
            const testDeps = createDeps();
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Goblin');

            expect(testDeps.setShowCleaveTargetSelection).toHaveBeenCalledWith(false);
            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword (Cleave)',
                '1d8',
                8,
                [5, 3],
                0,
                {
                    targetName: 'Goblin',
                    damageType: 'slashing',
                    attackerName: 'TestFighter',
                }
            );
            expect(testDeps.addEntry).toHaveBeenCalledWith('test-campaign', {
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Cleave',
                description: 'TestFighter used Cleave on Longsword against Goblin',
                targetName: 'Goblin',
            });
        });

        it('strips ability modifier from damage formula for cleave', async () => {
            const lastAttack = {
                attackName: 'Longsword',
                damageFormula: '1d8+3 (STR)',
                damageType: 'slashing',
                targetName: 'Orc',
            };
            const testDeps = createDeps();
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Orc');

            // The regex removes "+3" but leaves "(STR)" — formula becomes '1d8 (STR)'
            // which still contains 'd' so it passes the check
            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword (Cleave)',
                '1d8 (STR)',
                8,
                [5, 3],
                0,
                expect.objectContaining({ targetName: 'Orc' })
            );
        });

        it('falls back to original damage formula when stripping produces invalid formula', async () => {
            const lastAttack = {
                attackName: 'Magic Weapon',
                damageFormula: '+3',
                damageType: 'force',
                targetName: 'Ghost',
            };
            const testDeps = createDeps();
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Ghost');

            // After stripping "+3", formula is empty, no 'd' found, falls back to original
            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Magic Weapon (Cleave)',
                '+3',
                8,
                [5, 3],
                0,
                expect.objectContaining({ targetName: 'Ghost' })
            );
        });

        it('rolls damage with 0 when hit but rollExpression returns null', async () => {
            const lastAttack = {
                attackName: 'Longsword',
                damageFormula: '1d8+3',
                damageType: 'slashing',
                targetName: 'Goblin',
            };
            const testDeps = createDeps();
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);
            rollExpression.mockReturnValue(null);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Goblin');

            // When hit but damageResult is null, goes to else branch
            // Formula after stripping: '1d8' (the +3 was removed)
            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword (Cleave)',
                '1d8',
                0,
                [],
                0,
                {
                    attackerName: 'TestFighter',
                    damageType: 'slashing',
                    isAutoMiss: true,
                    targetName: 'Goblin',
                }
            );
        });

        it('handles miss when d20 + attack bonus < target AC', async () => {
            const lastAttack = {
                attackName: 'Longsword',
                damageFormula: '1d8+3',
                damageType: 'slashing',
                targetName: 'Ogre',
            };
            // After stripping: '1d8'
            // Use AC 30 which even a natural 20 + 6 = 26 cannot hit
            const testDeps = createDeps();
            testDeps.getCombatContext.mockResolvedValue({ creatures: [{ name: 'Ogre', ac: 30 }] });
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Ogre');

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword (Cleave)',
                '1d8',
                0,
                [],
                0,
                {
                    attackerName: 'TestFighter',
                    damageType: 'slashing',
                    isAutoMiss: true,
                    targetName: 'Ogre',
                }
            );
            expect(testDeps.addEntry).toHaveBeenCalledWith('test-campaign', {
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Cleave',
                description: 'TestFighter used Cleave on Longsword against Ogre — Miss',
                targetName: 'Ogre',
            });
        });

        it('uses first ability name when abilities array is empty', async () => {
            const lastAttack = {
                attackName: 'Longsword',
                damageFormula: '1d8+3',
                damageType: 'slashing',
                targetName: 'Goblin',
            };
            const testDeps = createDeps({ playerStats: { abilities: [] } });
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Goblin');

            // abilityName defaults to 'STR' when first ability has no name
            expect(testDeps.rollDamage).toHaveBeenCalled();
        });

        it('uses target AC of 0 when target not found in combat summary', async () => {
            const lastAttack = {
                attackName: 'Longsword',
                damageFormula: '1d8+3',
                damageType: 'slashing',
                targetName: 'Unknown',
            };
            const testDeps = createDeps();
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Unknown');

            // AC = 0, so d20 + 6 >= 0 always hits
            expect(testDeps.rollDamage).toHaveBeenCalled();
        });

        it('uses playerStats.name as attackerName in context', async () => {
            const lastAttack = {
                attackName: 'Spear',
                damageFormula: '1d6+3',
                damageType: 'piercing',
                targetName: 'Goblin',
            };
            const testDeps = createDeps({ playerStats: { name: 'CustomName' } });
            testDeps.getRuntimeValue.mockReturnValueOnce(lastAttack);

            const { handleCleaveAttack } = useCharActionsCleave(testDeps);
            await handleCleaveAttack('Goblin');

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Spear (Cleave)',
                '1d6',
                8,
                [5, 3],
                0,
                {
                    attackerName: 'CustomName',
                    damageType: 'piercing',
                    targetName: 'Goblin',
                }
            );
        });
    });

    describe('handleTacticalMasterConfirm', () => {
        it('returns early when chosenMastery is falsy', async () => {
            deps.getRuntimeValue.mockReturnValue(null);
            const { handleTacticalMasterConfirm } = useCharActionsCleave(deps);
            await handleTacticalMasterConfirm(null);
            expect(deps.setTacticalMasterModal).toHaveBeenCalledWith(null);
            expect(deps.addEntry).not.toHaveBeenCalled();
        });

        it('logs ability_use entry when targetName exists in pending data', async () => {
            const testDeps = createDeps();
            const pending = { baseMastery: 'Piercing', attackName: 'Longsword', targetName: 'Goblin' };
            testDeps.getRuntimeValue.mockReturnValue(pending);
            const applyMasteryEffect = vi.fn();
            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...testDeps,
                applyMasteryEffect,
            });
            await handleTacticalMasterConfirm('Vex');

            expect(testDeps.addEntry).toHaveBeenCalledWith('test-campaign', {
                type: 'ability_use',
                characterName: 'TestFighter',
                abilityName: 'Tactical Master',
                description: 'TestFighter used Tactical Master on Longsword against Goblin — changed mastery from Piercing to Vex',
                targetName: 'Goblin',
            });
        });

        it('returns early when lastAttack has no targetName', async () => {
            const testDeps = createDeps();
            const pending = { baseMastery: 'Piercing', attackName: 'Longsword', targetName: 'Goblin' };
            testDeps.getRuntimeValue.mockReturnValueOnce(pending).mockReturnValueOnce(pending).mockReturnValueOnce(pending).mockReturnValueOnce({ targetName: null });
            const applyMasteryEffect = vi.fn();
            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...testDeps,
                applyMasteryEffect,
            });
            await handleTacticalMasterConfirm('Vex');

            // Should have logged the Tactical Master entry but not the mastery effect
            expect(testDeps.addEntry).toHaveBeenCalledTimes(1);
        });

        it('applies Topple mastery with CON save and prone condition on failed save', async () => {
            const pending = { baseMastery: 'Piercing', attackName: 'Greataxe', targetName: 'Orc' };
            const lastAttack = { targetName: 'Orc' };
            deps.getRuntimeValue
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(lastAttack)
                .mockReturnValueOnce([]);

            const saveListenerMock = {
                promise: Promise.resolve({ success: false, roll: 5, saveBonus: 2, total: 7 }),
            };
            const createSaveListener = vi.fn(() => saveListenerMock);

            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...deps,
                createSaveListener,
            });
            await handleTacticalMasterConfirm('Topple');

            // Verify save DC calculation: 8 + STR(3) + prof(3) = 14
            expect(createSaveListener).toHaveBeenCalledWith('test-campaign', {
                targetName: 'Orc',
                saveType: 'CON',
                saveDc: 14,
            });

            // Verify setRuntimeValue was called to add prone condition
            expect(deps.setRuntimeValue).toHaveBeenCalledWith('Orc', 'activeConditions', ['prone'], 'test-campaign');

            // Verify entries were logged: Tactical Master + CON save result + Topple ability
            expect(deps.addEntry).toHaveBeenCalledTimes(4);
        });

        it('does not add prone condition if target already has it', async () => {
            const pending = { baseMastery: 'Piercing', attackName: 'Greataxe', targetName: 'Orc' };
            const lastAttack = { targetName: 'Orc' };
            deps.getRuntimeValue
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(lastAttack)
                .mockReturnValueOnce(['prone']);

            const saveListenerMock = {
                promise: Promise.resolve({ success: false, roll: 5, saveBonus: 2, total: 7 }),
            };
            const createSaveListener = vi.fn(() => saveListenerMock);

            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...deps,
                createSaveListener,
            });
            await handleTacticalMasterConfirm('Topple');

            // prone should not be added again
            expect(deps.setRuntimeValue).not.toHaveBeenCalledWith('Orc', 'activeConditions', expect.arrayContaining(['prone']), 'test-campaign');
        });

        it('does nothing when save result indicates success', async () => {
            const pending = { baseMastery: 'Piercing', attackName: 'Greataxe', targetName: 'Orc' };
            const lastAttack = { targetName: 'Orc' };
            deps.getRuntimeValue
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(lastAttack)
                .mockReturnValueOnce([]);

            const saveListenerMock = {
                promise: Promise.resolve({ success: true, roll: 15, saveBonus: 2, total: 17 }),
            };
            const createSaveListener = vi.fn(() => saveListenerMock);

            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...deps,
                createSaveListener,
            });
            await handleTacticalMasterConfirm('Topple');

            // No prone condition should be added
            expect(deps.setRuntimeValue).not.toHaveBeenCalled();
            // Only the initial Tactical Master entry should be logged
            expect(deps.addEntry).toHaveBeenCalledTimes(2);
        });

        it('calls applyMasteryEffect for non-Topple mastery choices', async () => {
            const testDeps = createDeps();
            const pending = { baseMastery: 'Piercing', attackName: 'Longsword', targetName: 'Goblin' };
            const lastAttack = { targetName: 'Goblin' };
            testDeps.getRuntimeValue
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(lastAttack);

            const applyMasteryEffect = vi.fn();

            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...testDeps,
                applyMasteryEffect,
            });
            await handleTacticalMasterConfirm('Vex');

            expect(applyMasteryEffect).toHaveBeenCalledWith('Vex', testDeps.playerStats, 'test-campaign', 'Goblin');
            expect(testDeps.addEntry).toHaveBeenCalledTimes(1);
        });

        it('handles Topple with missing weapon attack gracefully', async () => {
            const pending = { baseMastery: 'Piercing', attackName: 'NonexistentWeapon', targetName: 'Orc' };
            const lastAttack = { targetName: 'Orc' };
            deps.getRuntimeValue
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(lastAttack)
                .mockReturnValueOnce([]);

            const saveListenerMock = {
                promise: Promise.resolve({ success: false, roll: 5, saveBonus: 2, total: 7 }),
            };
            const createSaveListener = vi.fn(() => saveListenerMock);

            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...deps,
                createSaveListener,
                playerStats: {
                    attacks: [],
                    abilities: [{ name: 'Strength', bonus: 3 }],
                    proficiency: 3,
                },
            });
            await handleTacticalMasterConfirm('Topple');

            // Should default to 'Strength' when weapon attack not found
            expect(createSaveListener).toHaveBeenCalledWith('test-campaign', {
                targetName: 'Orc',
                saveType: 'CON',
                saveDc: 14,
            });
        });

        it('handles null save result gracefully', async () => {
            const pending = { baseMastery: 'Piercing', attackName: 'Greataxe', targetName: 'Orc' };
            const lastAttack = { targetName: 'Orc' };
            deps.getRuntimeValue
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(pending)
                .mockReturnValueOnce(lastAttack)
                .mockReturnValueOnce([]);

            const saveListenerMock = {
                promise: Promise.resolve(null),
            };
            const createSaveListener = vi.fn(() => saveListenerMock);

            const { handleTacticalMasterConfirm } = useCharActionsCleave({
                ...deps,
                createSaveListener,
            });
            await handleTacticalMasterConfirm('Topple');

            // null result should skip the prone condition block
            expect(deps.setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('handleTacticalMasterDismiss', () => {
        it('closes the tactical master modal', async () => {
            const { handleTacticalMasterDismiss } = useCharActionsCleave(deps);
            handleTacticalMasterDismiss();
            expect(deps.setTacticalMasterModal).toHaveBeenCalledWith(null);
        });
    });

    describe('returned functions', () => {
        it('returns handleCleaveAttack, handleTacticalMasterConfirm, and handleTacticalMasterDismiss', () => {
            const { handleCleaveAttack, handleTacticalMasterConfirm, handleTacticalMasterDismiss } = useCharActionsCleave(deps);
            expect(typeof handleCleaveAttack).toBe('function');
            expect(typeof handleTacticalMasterConfirm).toBe('function');
            expect(typeof handleTacticalMasterDismiss).toBe('function');
        });
    });
});

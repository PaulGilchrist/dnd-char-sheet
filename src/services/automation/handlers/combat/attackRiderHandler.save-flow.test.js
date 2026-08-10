import { describe, it, expect, vi, beforeEach } from 'vitest';

import { applyRiderOption } from './attackRiderHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn((opt) => opt.saveDc || 15),
    createSaveListener: vi.fn(() => ({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
    })),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => ({
        creatures: [{ name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } }],
    })),
    getTargetFromAttacker: vi.fn(() => ({ name: 'Goblin' })),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('./massFearHandler.js', () => ({
    resolveMassFear: vi.fn(async () => ({
        type: 'popup',
        payload: { type: 'automation_info', description: 'Mass Fear resolved' },
    })),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { createSaveListener } from '../../../automation/common/savePrompt.js';
import { rollExpression } from '../../../dice/diceRoller.js';

// ── Helpers ────────────────────────────────────────────────────

function makeAction(overrides = {}) {
    return {
        name: 'Cunning Strike',
        description: 'Apply a rider effect on a hit.',
        automation: {
            type: 'attack_rider',
            options: [
                { name: 'Trip', effect: 'prone' },
                { name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" },
                { name: 'Daze', effect: 'daze' },
                { name: 'Push 15ft', effect: 'push_15ft', value: 15 },
                { name: 'Disadvantage on Save', effect: 'disadvantage_on_next_save' },
                { name: 'No Opportunity Attacks', effect: 'no_opportunity_attacks', movement: true },
                { name: 'Sudden Strike', effect: 'sudden_strike' },
                { name: 'Mass Fear', effect: 'mass_fear', saveType: 'WIS', saveAbility: 'WIS' },
                { name: 'Damage Bonus', effect: 'damage_bonus', damageExpression: '2d6' },
                { name: 'Next Attack Advantage', effect: 'next_attack_advantage', value: 5 },
                { name: 'Push', effect: 'push', value: 10 },
                { name: 'Ally Movement', effect: 'ally_movement', movement: true },
                { name: 'Unconscious', effect: 'unconscious' },
                { name: 'Blinded', effect: 'blinded' },
                { name: 'Speed Reduction', effect: 'speed_reduction', value: 10 },
            ],
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestHero',
        proficiency: 3,
        abilities: [
            { name: 'Dexterity', bonus: 2 },
            { name: 'Constitution', bonus: 1 },
            { name: 'Wisdom', bonus: 3 },
            { name: 'Strength', bonus: 4 },
        ],
        toolProficiencies: [],
        automation: { passives: [] },
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - applyRiderEffect save flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveType handling', () => {
        it('should create save listener and return null when saveType is set', async () => {
            getRuntimeValue.mockImplementation((_key, prop) => {
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', saveDc: 14, saveAbility: 'DEX' }],
                },
            });
            const result = await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(result).toBeNull();
            expect(createSaveListener).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                targetName: 'Goblin',
                saveType: 'DEX',
                saveDc: 14,
            }));
        });

        it('should apply condition on failed save', async () => {
            getRuntimeValue.mockImplementation((_key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                if (prop === 'activeConditions' && _key === 'Goblin') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', condition: 'prone' }],
                },
            });
            await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining(['prone']), 'test-campaign');
        });

        it('should not apply condition on successful save', async () => {
            getRuntimeValue.mockImplementation((_key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: true, roll: 18, total: 18, saveBonus: 3 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', condition: 'prone' }],
                },
            });
            const result = await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(result).toBeNull();
            expect(setRuntimeValue).not.toHaveBeenCalledWith('Goblin', 'activeConditions', expect.any(Array), 'test-campaign');
        });

        it('should log save result to campaign log', async () => {
            getRuntimeValue.mockImplementation((_key, prop) => {
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: false, roll: 7, total: 7, saveBonus: 0 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', condition: 'prone' }],
                },
            });
            await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                description: expect.stringContaining('failed'),
            }));
        });
    });

    describe('saveType with Psychic Veil removal', () => {
        it('should remove Psychic Veil buff and invisible condition on save failure', async () => {
            getRuntimeValue.mockImplementation((key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
                if (prop === 'activeConditions' && key === 'TestHero') return ['invisible', 'poisoned'];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX' }],
                },
            });
            const result = await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(result).toBeNull();
            expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', ['poisoned'], 'test-campaign');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeBuffs', [], 'test-campaign');
        });

        it('should remove Psychic Veil even when save succeeds', async () => {
            getRuntimeValue.mockImplementation((key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
                if (prop === 'activeConditions' && key === 'TestHero') return ['invisible'];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: true, roll: 18, total: 18, saveBonus: 3 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX' }],
                },
            });
            await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            // Psychic Veil removal happens regardless of save result
            expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', [], 'test-campaign');
            expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeBuffs', [], 'test-campaign');
        });
    });

    describe('Envenom Weapons on poison save fail', () => {
        it('should apply 2d6 Poison damage when Envenom Weapons passive exists and CON save fails', async () => {
            getRuntimeValue.mockImplementation((_key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
            });
            vi.mocked(rollExpression).mockReturnValue({ total: 8 });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Poison', effect: 'poisoned', saveType: 'CON', requires: "Poisoner's Kit" }],
                },
            });
            const stats = makePlayerStats({
                toolProficiencies: ["Poisoner's Kit"],
                automation: {
                    passives: [
                        { type: 'damage_bonus', trigger: 'cunning_strike_poison_save_fail', name: 'Envenom Weapons', automation: { damageExpression: '2d6', damageType: 'Poison' } },
                    ],
                },
            });
            await applyRiderOption(action, stats, 'test-campaign', 'Goblin', ['Poison']);

            expect(rollExpression).toHaveBeenCalledWith('2d6');
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                abilityName: 'Envenom Weapons',
                description: expect.stringContaining('8'),
            }));
        });

        it('should not apply Envenom Weapons damage when save succeeds', async () => {
            getRuntimeValue.mockImplementation((_key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: true, roll: 18, total: 18, saveBonus: 3 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Poison', effect: 'poisoned', saveType: 'CON', requires: "Poisoner's Kit" }],
                },
            });
            const stats = makePlayerStats({
                toolProficiencies: ["Poisoner's Kit"],
                automation: {
                    passives: [
                        { type: 'damage_bonus', trigger: 'cunning_strike_poison_save_fail', name: 'Envenom Weapons', automation: { damageExpression: '2d6', damageType: 'Poison' } },
                    ],
                },
            });
            await applyRiderOption(action, stats, 'test-campaign', 'Goblin', ['Poison']);

            expect(rollExpression).not.toHaveBeenCalled();
        });

        it('should not apply Envenom Weapons when passive does not exist', async () => {
            getRuntimeValue.mockImplementation((_key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                return null;
            });
            vi.mocked(createSaveListener).mockReturnValue({
                promptId: 'save-prompt',
                promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Poison', effect: 'poisoned', saveType: 'CON', requires: "Poisoner's Kit" }],
                },
            });
            const stats = makePlayerStats({
                toolProficiencies: ["Poisoner's Kit"],
                automation: { passives: [] },
            });
            await applyRiderOption(action, stats, 'test-campaign', 'Goblin', ['Poison']);

            expect(rollExpression).not.toHaveBeenCalled();
        });
    });

    describe('speed_reduction immediate logging', () => {
        it('should log speed_reduction to campaign log immediately', async () => {
            getRuntimeValue.mockImplementation((_key, prop) => {
                if (prop === 'targetEffects') return [];
                return null;
            });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Hamstring', effect: 'speed_reduction', value: 15 }],
                },
            });
            await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Hamstring']);

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                description: expect.stringContaining('Hamstring'),
            }));
        });
    });
});

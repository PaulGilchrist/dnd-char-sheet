// @cleaned-by-ai
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
    createSaveListener: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(() => ({ name: 'Goblin' })),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { createSaveListener } from '../../../automation/common/savePrompt.js';
import { rollExpression } from '../../../dice/diceRoller.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';

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

/**
 * Set up mocks for a save flow test: targetEffects is [],
 * and the save listener returns the given save result.
 */
function setupSaveFlow(saveResult) {
    getRuntimeValue.mockImplementation((_key, prop, _camp) => {
        if (prop === 'targetEffects') return [];
        return null;
    });
    vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'save-prompt',
        promise: Promise.resolve(saveResult),
    });
}

/**
 * Set up mocks for a save flow test where the target has active conditions/buffs.
 */
function setupSaveFlowWithState(targetEffects, activeBuffs, activeConditions) {
    getRuntimeValue.mockImplementation((key, prop, _camp) => {
        if (prop === 'targetEffects') return targetEffects;
        if (prop === 'activeBuffs' && key === 'TestHero') return activeBuffs;
        if (prop === 'activeConditions' && key === 'TestHero') return activeConditions;
        if (prop === 'activeConditions' && key === 'Goblin') return activeConditions;
        return null;
    });
    vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'save-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
    });
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - save flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveType creates save listener', () => {
        it('should return null and create save listener when saveType is set', async () => {
            setupSaveFlow({ success: false, roll: 5, total: 5, saveBonus: 0 });

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
    });

    describe('save failure applies condition', () => {
        it('should apply condition on failed save', async () => {
            setupSaveFlow({ success: false, roll: 5, total: 5, saveBonus: 0 });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', condition: 'prone' }],
                },
            });
            const result = await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(result).toBeNull();
            expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining(['prone']), 'test-campaign');
        });

        it('should not apply condition on successful save', async () => {
            setupSaveFlow({ success: true, roll: 18, total: 18, saveBonus: 3 });

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

    });

    describe('save result logging', () => {
        it('should log save result to campaign log on failure', async () => {
            setupSaveFlow({ success: false, roll: 7, total: 7, saveBonus: 0 });

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

        it('should include roll value and DC in log description', async () => {
            setupSaveFlow({ success: false, roll: 12, total: 12, saveBonus: 0 });

            const action = makeAction({
                automation: {
                    type: 'attack_rider',
                    options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', saveDc: 14, condition: 'prone' }],
                },
            });
            await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            const logCall = addEntry.mock.calls[addEntry.mock.calls.length - 1];
            expect(logCall[1].description).toContain('12');
            expect(logCall[1].description).toContain('DC 14');
        });
    });

    describe('Psychic Veil removal with saveType', () => {
        it('should remove Psychic Veil buff and invisible condition on save failure', async () => {
            setupSaveFlowWithState([], [{ name: 'Psychic Veil' }], ['invisible', 'poisoned']);

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

        it('should remove only invisible condition, preserving other conditions', async () => {
            getRuntimeValue.mockImplementation((key, prop, _camp) => {
                if (prop === 'targetEffects') return [];
                if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
                if (prop === 'activeConditions' && key === 'TestHero') return ['invisible', 'poisoned', 'exhaustion'];
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
            await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

            expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', ['poisoned', 'exhaustion'], 'test-campaign');
        });

    });

    describe('Envenom Weapons on poison save fail', () => {
        it('should apply 2d6 Poison damage when Envenom Weapons passive exists and CON save fails', async () => {
            setupSaveFlow({ success: false, roll: 5, total: 5, saveBonus: 0 });
            vi.mocked(rollExpression).mockReturnValue({ total: 8 });
            vi.mocked(getCombatContext).mockResolvedValue({
                creatures: [{ name: 'Goblin' }],
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

            expect(rollExpression).toHaveBeenCalledWith('2d6');
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                abilityName: 'Envenom Weapons',
                description: expect.stringContaining('8'),
            }));
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

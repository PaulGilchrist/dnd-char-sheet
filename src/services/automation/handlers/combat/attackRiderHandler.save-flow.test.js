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
    getCombatContext: vi.fn(async () => ({
        creatures: [{ name: 'Goblin' }],
    })),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(async () => {}),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(() => ({ total: 7 })),
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

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - save flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        { effect: 'prone', saveType: 'DEX', condition: 'prone', desc: 'Trip / prone' },
        { effect: 'unconscious', saveType: 'CON', condition: 'unconscious', desc: 'Unconscious' },
        { effect: 'blinded', saveType: 'DEX', condition: 'blinded', desc: 'Blinded' },
    ])('should apply %s condition on failed save', async ({ effect, saveType, condition }) => {
        setupSaveFlow({ success: false, roll: 5, total: 5, saveBonus: 0 });

        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: effect, effect, saveType, condition }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', [effect]);

        expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining([condition]), 'test-campaign');
    });

    it('should not apply condition on successful save', async () => {
        setupSaveFlow({ success: true, roll: 16, total: 16, saveBonus: 0 });

        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', condition: 'prone' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'test-campaign', 'Goblin', ['Trip']);

        expect(setRuntimeValue).not.toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining(['prone']), 'test-campaign');
    });

    it('should apply Envenom Weapons damage when CON poison save fails and passive exists', async () => {
        vi.mocked(rollExpression).mockReturnValue({ total: 8 });
        vi.mocked(getCombatContext).mockResolvedValue({
            creatures: [{ name: 'Goblin' }],
        });
        setupSaveFlow({ success: false, roll: 5, total: 5, saveBonus: 0 });

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
        }));
    });
});

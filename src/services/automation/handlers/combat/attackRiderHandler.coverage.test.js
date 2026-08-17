// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { applyRiderOption } from './attackRiderHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => ({
        creatures: [{ name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } }],
        round: 1,
        activeCreatureName: 'TestHero',
    })),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(() => 15),
    createSaveListener: vi.fn(() => ({
        promptId: 'test-prompt-id',
        promise: Promise.resolve({ roll: 12, success: false }),
    })),
}));

// ── Re-imports after mocking ───────────────────────────────────

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
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
                { name: 'Cleave', effect: 'cleave', oncePerTurn: true },
                { name: 'Next Attack Advantage', effect: 'next_attack_advantage', value: 5 },
                { name: 'Push', effect: 'push', value: 10 },
                { name: 'Ally Movement', effect: 'ally_movement', movement: true },
                { name: 'Unconscious', effect: 'unconscious' },
                { name: 'Blinded', effect: 'blinded' },
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
        ],
        toolProficiencies: [],
        automation: { passives: [] },
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - rider effects with saveType', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null and create save listener when effect has saveType', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', saveDc: 15, saveAbility: 'DEX' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result).toBeNull();
    });

    it('should return popup and not create save listener when effect has no saveType', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
    });
});

describe('attackRiderHandler - Psychic Veil removal on default rider with saveType', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should remove Psychic Veil buff and invisible condition when saveType is set and Psychic Veil active', async () => {
        getRuntimeValue.mockImplementation((key, prop, _camp) => {
            if (prop === 'targetEffects') return [];
            if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
            if (prop === 'activeConditions' && key === 'TestHero') return ['invisible', 'poisoned'];
            return null;
        });

        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result).toBeNull();
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', ['poisoned'], 'campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeBuffs', [], 'campaign');
    });
});

describe('attackRiderHandler - Versatile Trickster edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not set versatile trickster targets when combat context has no creatures', async () => {
        getRuntimeValue.mockReturnValue([]);
        vi.mocked(getCombatContext).mockResolvedValue({});
        const stats = makePlayerStats({
            automation: {
                passives: [{ type: 'passive_rule', effect: 'versatile_trickster' }],
            },
        });
        const action = makeAction();
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Trip']);

        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'versatileTricksterSecondaryTargets', expect.any(Array), 'campaign');
    });
});

describe('attackRiderHandler - targetEffects field population', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should set targetEffects with save fields when provided on option', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone', saveType: 'DEX', saveDc: 15, saveAbility: 'DEX' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ saveType: 'DEX', saveDc: 15, saveAbility: 'DEX' }),
        ]));
    });

    it('should set targetEffects with damageDoubled from option', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Double Damage', effect: 'damage_bonus', damageDoubled: true }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Double Damage']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ damageDoubled: true }),
        ]));
    });

    it('should set targetEffects with damageDoubled from automation fallback', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                damageDoubled: true,
                options: [{ name: 'Double Damage', effect: 'damage_bonus' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Double Damage']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ damageDoubled: true }),
        ]));
    });

    it('should set targetEffects with sizeLimit field when no requires', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone', sizeLimit: 'large_or_smaller' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ sizeLimit: 'large_or_smaller' }),
        ]));
    });

    it('should set targetEffects with cost and movement fields', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Costly Trip', effect: 'prone', cost: '1d6', movement: true }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Costly Trip']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ cost: '1d6', movement: true }),
        ]));
    });

    it('should set targetEffects with ignoreResistance and restoreCost fields', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Special', effect: 'poisoned', requires: "Poisoner's Kit", ignoreResistance: true, restoreCost: '1d6' }],
            },
        });
        const stats = makePlayerStats({ toolProficiencies: ["Poisoner's Kit"] });
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Special']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ ignoreResistance: true, restoreCost: '1d6' }),
        ]));
    });
});

describe('attackRiderHandler - tool requirement matching', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should match tool requirement case-insensitively', async () => {
        const stats = makePlayerStats({
            toolProficiencies: ["poisoner's kit"],
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).not.toContain('cannot be used');
    });
});

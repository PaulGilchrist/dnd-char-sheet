// @improved-by-ai
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
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';

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

describe('attackRiderHandler - rider effect descriptions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should include poisoned description with Constitution save', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const stats = makePlayerStats({ toolProficiencies: ["Poisoner's Kit"] });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Constitution save');
        expect(result.payload.description).toContain('Poisoned for 1 minute');
        expect(result.payload.description).toContain('repeats save');
    });

    it('should include prone description with Dexterity save', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Dexterity save');
        expect(result.payload.description).toContain('Prone condition');
    });

    it('should include push effect description with distance and verify no targetEffects set', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Push', effect: 'push', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('pushed 10 feet away');
        expect(setRuntimeValue).not.toHaveBeenCalledWith('campaign', 'targetEffects', expect.anything());
    });

    it('should include push_15ft description', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Push 15ft', effect: 'push_15ft', value: 15 }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Push 15ft']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Push 15ft applied to Goblin');
    });

    it('should include next_attack_advantage description with custom value', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Advantage', effect: 'next_attack_advantage', value: 5 }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Advantage']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('+5');
        expect(result.payload.description).toContain('Goblin');
    });

    it('should include next_attack_advantage description with default value when value prop missing', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Advantage', effect: 'next_attack_advantage' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Advantage']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('+5');
        expect(result.payload.description).toContain('Goblin');
    });

    it('should include unconscious description with Constitution save', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Unconscious', effect: 'unconscious' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Unconscious']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Constitution save');
        expect(result.payload.description).toContain('Unconscious for 1 minute');
        expect(result.payload.description).toContain('repeats save');
    });

    it('should include blinded description with Dexterity save', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Blinded', effect: 'blinded' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Blinded']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Dexterity save');
        expect(result.payload.description).toContain('Blinded until end of its next turn');
    });

    it('should include ally_movement description with movement', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Ally Move', effect: 'ally_movement', movement: true }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Ally Move']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('ally moves');
        expect(result.payload.description).toContain('without provoking Opportunity Attacks');
    });

    it('should include daze description with Constitution save', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Daze', effect: 'daze' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Daze']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Constitution save');
        expect(result.payload.description).toContain('one of: move, action, or Bonus Action');
    });

    it('should include no_opportunity_attacks description using noOpportunityAttacks boolean without effect field', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'No OA', noOpportunityAttacks: true }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['No OA']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('cannot make Opportunity Attacks');
        expect(result.payload.description).toContain('start of your next turn');
    });

    it('should include disadvantage_on_next_save description', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Disadvantage', effect: 'disadvantage_on_next_save' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Disadvantage']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Disadvantage on the next saving throw');
    });

    it('should include damage_bonus with default 1d6 expression', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Damage Bonus', effect: 'damage_bonus' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Damage Bonus']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('1d6 extra damage');
    });

    it('should include damage_bonus with custom damageExpression', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Damage Bonus', effect: 'damage_bonus', damageExpression: '2d6' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Damage Bonus']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('2d6 extra damage');
    });

    it('should include speed_reduction description with value', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Hamstring', effect: 'speed_reduction', value: 15 }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Hamstring']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Speed reduced by 15 ft');
    });

    it('should include speed_reduction description with default value when value prop missing', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Hamstring', effect: 'speed_reduction' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Hamstring']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Speed reduced by 10 ft');
    });
});

describe('attackRiderHandler - Psychic Veil removal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should remove Psychic Veil buff and invisible condition on mass_fear with Psychic Veil active', async () => {
        getRuntimeValue.mockImplementation((key, prop, _camp) => {
            if (prop === 'targetEffects') return [];
            if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
            if (prop === 'activeConditions' && key === 'TestHero') return ['invisible', 'poisoned'];
            return null;
        });

        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Mass Fear', effect: 'mass_fear', saveType: 'WIS', saveAbility: 'WIS' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Mass Fear']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Mass Fear');
        expect(result.payload.description).toContain('affected');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', ['poisoned'], 'campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeBuffs', [], 'campaign');
    });

    it('should remove Psychic Veil buff and invisible condition on default rider with saveType and Psychic Veil', async () => {
        getRuntimeValue.mockImplementation((key, prop, _camp) => {
            if (prop === 'targetEffects') return [];
            if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
            if (prop === 'activeConditions' && key === 'TestHero') return ['invisible'];
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
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeConditions', [], 'campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'activeBuffs', [], 'campaign');
    });

    it('should not remove Psychic Veil when option has no saveType', async () => {
        getRuntimeValue.mockImplementation((key, prop, _camp) => {
            if (prop === 'targetEffects') return [];
            if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Psychic Veil' }];
            return null;
        });

        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip');
        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'activeBuffs', expect.any(Array), 'campaign');
    });

    it('should not modify conditions/buffs when Psychic Veil is not active on mass_fear', async () => {
        getRuntimeValue.mockImplementation((key, prop, _camp) => {
            if (prop === 'targetEffects') return [];
            if (prop === 'activeBuffs' && key === 'TestHero') return [{ name: 'Some Other Buff' }];
            return null;
        });

        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Mass Fear', effect: 'mass_fear', saveType: 'WIS', saveAbility: 'WIS' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Mass Fear']);

        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'activeConditions', expect.any(Array), 'campaign');
        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'activeBuffs', expect.any(Array), 'campaign');
    });
});

describe('attackRiderHandler - Versatile Trickster edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not set versatile trickster targets when no secondary targets within 5ft', async () => {
        getRuntimeValue.mockReturnValue([]);
        vi.mocked(getCombatContext).mockResolvedValue({
            creatures: [
                { name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } },
                { name: 'Skeleton', size: 'Medium', position: { x: 10, y: 10 } },
            ],
        });
        isWithinRange.mockResolvedValue(false);
        const stats = makePlayerStats({
            automation: {
                passives: [{ type: 'passive_rule', effect: 'versatile_trickster' }],
            },
        });
        const action = makeAction();
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Trip']);

        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'versatileTricksterSecondaryTargets', expect.any(Array), 'campaign');
    });

    it('should not set versatile trickster targets when primary target has no position', async () => {
        getRuntimeValue.mockReturnValue([]);
        vi.mocked(getCombatContext).mockResolvedValue({
            creatures: [
                { name: 'Goblin', size: 'Medium' },
                { name: 'Skeleton', size: 'Medium', position: { x: 2, y: 1 } },
            ],
        });
        const stats = makePlayerStats({
            automation: {
                passives: [{ type: 'passive_rule', effect: 'versatile_trickster' }],
            },
        });
        const action = makeAction();
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Trip']);

        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'versatileTricksterSecondaryTargets', expect.any(Array), 'campaign');
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

    it('should set targetEffects with repeatingSave field', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit", repeatingSave: true }],
            },
        });
        const stats = makePlayerStats({ toolProficiencies: ["Poisoner's Kit"] });
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        const callArgs = setRuntimeValue.mock.calls.find(
            call => call[1] === 'targetEffects'
        );
        expect(callArgs).toBeDefined();
        expect(callArgs[2]).toEqual(expect.arrayContaining([
            expect.objectContaining({ repeatingSave: true }),
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

    it('should set targetEffects with saveType, saveDc, saveAbility fields', async () => {
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

describe('attackRiderHandler - oncePerTurn marks used round', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should set usedRound runtime value using action name when oncePerTurn option is applied', async () => {
        getRuntimeValue.mockReturnValue(0);
        vi.mocked(getCombatContext).mockResolvedValue({
            creatures: [{ name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } }],
            round: 1,
            activeCreatureName: 'TestHero',
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Cleave', effect: 'cleave' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Cleave']);

        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', '_CunningStrike_usedRound', { round: 1, activeCreature: 'TestHero' }, 'campaign');
    });
});

describe('attackRiderHandler - Cunning Strike cost with multiple options', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should accumulate Cunning Strike cost across multiple options', async () => {
        getRuntimeValue.mockReturnValue(0);
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [
                    { name: 'Costly 1', effect: 'poisoned', cost: '2d6', requires: "Poisoner's Kit" },
                    { name: 'Costly 2', effect: 'prone', cost: '1d6' },
                ],
            },
        });
        const stats = makePlayerStats({ toolProficiencies: ["Poisoner's Kit"] });
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Costly 1', 'Costly 2']);

        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', '_cunningStrikeCostUsed', 3, 'campaign');
    });

    it('should include cost note in combined description when multiple Cunning Strike options are applied', async () => {
        getRuntimeValue.mockReturnValue(0);
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [
                    { name: 'Costly 1', effect: 'poisoned', cost: '2d6', requires: "Poisoner's Kit" },
                    { name: 'Costly 2', effect: 'prone', cost: '1d6' },
                ],
            },
        });
        const stats = makePlayerStats({ toolProficiencies: ["Poisoner's Kit"] });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Costly 1', 'Costly 2']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('Forgoing 3d6 Sneak Attack damage dice');
    });
});

describe('attackRiderHandler - mass_fear description format', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should include Mass Fear description with target name', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Mass Fear', effect: 'mass_fear', saveType: 'WIS', saveAbility: 'WIS' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Mass Fear']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Mass Fear');
        expect(result.payload.description).toContain('affected');
        expect(result.payload.description).toContain('Goblin');
    });

    it('should use default saveType WIS when not specified', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Mass Fear', effect: 'mass_fear' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Mass Fear']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Mass Fear');
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

    it('should reject when tool proficiency does not include the required name', async () => {
        const stats = makePlayerStats({
            toolProficiencies: ["Poisoner's Tools"],
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('cannot be used');
    });
});

describe('attackRiderHandler - no target handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return info popup noting no target for manual application', async () => {
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', null, ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('No target selected');
        expect(result.payload.description).toContain('manual application');
    });
});

describe('attackRiderHandler - edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null when optionNames is an empty array', async () => {
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', []);

        expect(result).toBe(null);
    });

    it('should return null when all option names are invalid', async () => {
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['NonExistent1', 'NonExistent2']);

        expect(result).toBe(null);
    });
});

// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { applyRiderOption } from './attackRiderHandler.js';
import { setGetCombatContextSyncOverride, clearGetCombatContextSyncOverride } from './cunningStrikeUtils.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
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

vi.mock('../../common/oncePerTurn.js', () => ({
    checkOncePerTurn: vi.fn(async () => null),
    checkOncePerTurnWithSkip: vi.fn(async () => null),
    markOncePerTurn: vi.fn(),
}));

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { markOncePerTurn } from '../../common/oncePerTurn.js';

// ── Helpers ────────────────────────────────────────────────────

function makeAction(overrides = {}) {
    return {
        name: 'Cunning Strike',
        description: 'Apply a rider effect on a hit.',
        automation: {
            type: 'attack_rider',
            options: [
                { name: 'Trip', effect: 'prone', sizeLimit: 'large_or_smaller' },
                { name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 },
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
        ],
        toolProficiencies: [],
        automation: { passives: [] },
        size: overrides.size || 'Medium',
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - sizeLimit: large_or_smaller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockImplementation((_scope, key) => {
            if (key === 'targetEffects') return [];
            return null;
        });
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject Trip when target is Huge', async () => {
        setGetCombatContextSyncOverride({ name: 'HugeGiant', size: 'Huge' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'HugeGiant', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('<b>Trip</b> cannot be used');
        expect(result.payload.description).toContain('Huge');
        expect(result.payload.description).toContain('Large or smaller');
    });

    it('should reject Trip when target is Gargantuan', async () => {
        setGetCombatContextSyncOverride({ name: 'Dragon', size: 'Gargantuan' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Dragon', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('<b>Trip</b> cannot be used');
        expect(result.payload.description).toContain('Gargantuan');
        expect(result.payload.description).toContain('Large or smaller');
    });

    it('should allow Trip when target is Large (boundary)', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Ogre', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Ogre');
        expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.any(Array), 'campaign');
    });

    it('should allow Trip when target is Medium', async () => {
        setGetCombatContextSyncOverride({ name: 'Goblin', size: 'Medium' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Goblin');
    });

    it('should allow Trip when target is Small', async () => {
        setGetCombatContextSyncOverride({ name: 'Kobold', size: 'Small' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Kobold', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Kobold');
    });

    it('should allow Trip when target is Tiny', async () => {
        setGetCombatContextSyncOverride({ name: 'Rat', size: 'Tiny' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Rat', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Rat');
    });

    it('should pass through when combat context is unavailable (no size info)', async () => {
        clearGetCombatContextSyncOverride();
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Goblin');
    });

    it('should mark oncePerTurn after passing size validation', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Trip', effect: 'prone', sizeLimit: 'large_or_smaller' }],
            },
        });
        await applyRiderOption(action, makePlayerStats(), 'campaign', 'Ogre', ['Trip']);

        expect(markOncePerTurn).toHaveBeenCalledWith(
            'Cunning Strike',
            '_CunningStrike_usedRound',
            expect.any(Object),
            'campaign'
        );
    });
});

describe('attackRiderHandler - sizeLimit: one_size_larger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockImplementation((_scope, key) => {
            if (key === 'targetEffects') return [];
            if (key === '_cunningStrikeCostUsed') return 0;
            return null;
        });
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject when target is two sizes larger than player', async () => {
        setGetCombatContextSyncOverride({ name: 'HugeGiant', size: 'Huge' });
        const stats = makePlayerStats({ size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'HugeGiant', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('<b>Charger Push</b> cannot be used');
        expect(result.payload.description).toContain('Huge');
    });

    it('should reject when target is Gargantuan and player is Medium', async () => {
        setGetCombatContextSyncOverride({ name: 'Tyrannosaurus', size: 'Gargantuan' });
        const stats = makePlayerStats({ size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Tyrannosaurus', ['Charger Push']);

        expect(result.payload.description).toContain('<b>Charger Push</b> cannot be used');
        expect(result.payload.description).toContain('Gargantuan');
    });

    it('should allow when target is one size larger than player (Medium player → Large target)', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const stats = makePlayerStats({ size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Ogre', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Ogre was pushed');
    });

    it('should allow when target is one size larger than player (Large player → Huge target)', async () => {
        setGetCombatContextSyncOverride({ name: 'Giant', size: 'Huge' });
        const stats = makePlayerStats({ size: 'Large' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Giant', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Giant was pushed');
    });

    it('should allow when target is same size as player', async () => {
        setGetCombatContextSyncOverride({ name: 'Hobgoblin', size: 'Medium' });
        const stats = makePlayerStats({ size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Hobgoblin', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Hobgoblin was pushed');
    });

    it('should allow when target is smaller than player', async () => {
        setGetCombatContextSyncOverride({ name: 'Goblin', size: 'Small' });
        const stats = makePlayerStats({ size: 'Large' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Goblin was pushed');
    });

    it('should reject when Tiny player targets Large (two sizes larger)', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const stats = makePlayerStats({ size: 'Tiny' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Ogre', ['Charger Push']);

        expect(result.payload.description).toContain('<b>Charger Push</b> cannot be used');
        expect(result.payload.description).toContain('Large');
    });

    it('should allow Tiny player to target Small (one size larger)', async () => {
        setGetCombatContextSyncOverride({ name: 'Kobold', size: 'Small' });
        const stats = makePlayerStats({ size: 'Tiny' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Kobold', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Kobold was pushed');
    });

    it('should pass through when combat context is unavailable', async () => {
        clearGetCombatContextSyncOverride();
        const stats = makePlayerStats({ size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Goblin was pushed');
    });
});

describe('attackRiderHandler - size validation with other prerequisites', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockImplementation((_scope, key) => {
            if (key === 'targetEffects') return [];
            if (key === '_cunningStrikeCostUsed') return 0;
            return null;
        });
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject for missing tool even when size is valid', async () => {
        setGetCombatContextSyncOverride({ name: 'Goblin', size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Poison']);

        expect(result.payload.description).toContain("Requires Poisoner's Kit");
        expect(result.payload.description).toContain('cannot be used');
    });

    it('should allow when both tool and size requirements are met', async () => {
        setGetCombatContextSyncOverride({ name: 'Goblin', size: 'Medium' });
        const stats = makePlayerStats({
            toolProficiencies: ["Poisoner's Kit"],
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Poison applied');
    });

    it('should reject size validation before checking tool requirement', async () => {
        // Trip has no tool requirement but has sizeLimit; Huge target should be rejected
        setGetCombatContextSyncOverride({ name: 'Colossus', size: 'Gargantuan' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Trip', effect: 'prone', sizeLimit: 'large_or_smaller' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Colossus', ['Trip']);

        expect(result.payload.description).toContain('<b>Trip</b> cannot be used');
        expect(result.payload.description).toContain('Gargantuan');
    });

    it('should allow option without sizeLimit regardless of target size', async () => {
        setGetCombatContextSyncOverride({ name: 'Titan', size: 'Gargantuan' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Daze', effect: 'daze' }],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Titan', ['Daze']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Daze applied');
    });
});

describe('attackRiderHandler - size validation with multiple options', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockImplementation((_scope, key) => {
            if (key === 'targetEffects') return [];
            if (key === '_cunningStrikeCostUsed') return 0;
            return null;
        });
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject when any option fails size validation', async () => {
        setGetCombatContextSyncOverride({ name: 'HugeGiant', size: 'Huge' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [
                    { name: 'Trip', effect: 'prone', sizeLimit: 'large_or_smaller' },
                    { name: 'Daze', effect: 'daze' },
                ],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'HugeGiant', ['Trip', 'Daze']);

        expect(result.payload.description).toContain('<b>Trip</b> cannot be used');
        expect(result.payload.description).toContain('Huge');
    });

    it('should allow when all options pass size validation', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [
                    { name: 'Trip', effect: 'prone', sizeLimit: 'large_or_smaller' },
                    { name: 'Daze', effect: 'daze' },
                ],
            },
        });
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Ogre', ['Trip', 'Daze']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip');
        expect(result.payload.description).toContain('Daze');
    });

});

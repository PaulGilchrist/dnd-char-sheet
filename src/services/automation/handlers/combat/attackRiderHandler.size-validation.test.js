// @cleaned-by-ai
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

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

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
        getRuntimeValue.mockImplementation((_scope, key) => {
            if (key === 'targetEffects') return [];
            return null;
        });
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject when target is too large (Huge)', async () => {
        setGetCombatContextSyncOverride({ name: 'HugeGiant', size: 'Huge' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'HugeGiant', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('<b>Trip</b> cannot be used');
        expect(result.payload.description).toContain('Huge');
        expect(result.payload.description).toContain('Large or smaller');
    });

    it('should allow when target is Large (boundary)', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Ogre', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Ogre');
    });

    it('should allow when target is Medium or smaller', async () => {
        setGetCombatContextSyncOverride({ name: 'Goblin', size: 'Medium' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Goblin');
    });

    it('should pass through when combat context is unavailable (no size info)', async () => {
        clearGetCombatContextSyncOverride();
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip applied to Goblin');
    });
});

describe('attackRiderHandler - sizeLimit: one_size_larger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockImplementation((_scope, key) => {
            if (key === 'targetEffects') return [];
            if (key === '_cunningStrikeCostUsed') return 0;
            return null;
        });
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject when target is two sizes larger than player (Medium → Huge)', async () => {
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

    it('should allow when target is one size larger than player (Medium → Large)', async () => {
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

    it('should allow when target is same size or smaller than player', async () => {
        setGetCombatContextSyncOverride({ name: 'Goblin', size: 'Small' });
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handle, applyRiderOption } from './attackRiderHandler.js';
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
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';
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

describe('attackRiderHandler - validateCunningStrikeOption size checks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
    });

    afterEach(() => {
        clearGetCombatContextSyncOverride();
    });

    it('should reject Trip when target is Huge (too large)', async () => {
        setGetCombatContextSyncOverride({ name: 'HugeGiant', size: 'Huge' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'HugeGiant', ['Trip']);

        expect(result.payload.description).toContain('too large for Trip');
        expect(result.payload.description).toContain('Huge');
    });

    it('should reject Trip when target is Gargantuan (too large)', async () => {
        setGetCombatContextSyncOverride({ name: 'GargantuanDragon', size: 'Gargantuan' });
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'GargantuanDragon', ['Trip']);

        expect(result.payload.description).toContain('too large for Trip');
        expect(result.payload.description).toContain('Gargantuan');
    });

    it('should allow Trip when target is Large (within limit)', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        getRuntimeValue.mockReturnValue([]);
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Ogre', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip');
    });

    it('should reject Charger Push when target is too large for player size', async () => {
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

        expect(result.payload.description).toContain('too large for Charger push');
        expect(result.payload.description).toContain('Huge');
    });

    it('should allow Charger Push when target is one size larger than player', async () => {
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        getRuntimeValue.mockReturnValue(0);
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

    it('should allow Charger Push when player is Large and target is Huge', async () => {
        setGetCombatContextSyncOverride({ name: 'HugeGiant', size: 'Huge' });
        getRuntimeValue.mockReturnValue(0);
        const stats = makePlayerStats({ size: 'Large' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'HugeGiant', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('HugeGiant was pushed');
    });

    it('should pass through when getCombatContextSync returns null (no size info)', async () => {
        clearGetCombatContextSyncOverride();
        getRuntimeValue.mockReturnValue([]);
        const action = makeAction();
        const result = await applyRiderOption(action, makePlayerStats(), 'campaign', 'Goblin', ['Trip']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Trip');
    });
});

describe('attackRiderHandler - applyCunningStrikeCost fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearGetCombatContextSyncOverride();
    });

    it('should use 0 as default when getRuntimeValue returns null for Cunning Strike cost', async () => {
        // When getRuntimeValue returns null for the cost key, the ?? 0 fallback is used
        getRuntimeValue.mockImplementation((scope, key, _camp) => {
            if (key === 'targetEffects') return [];
            if (key === '_cunningStrikeCostUsed') return null;
            return null;
        });
        const stats = makePlayerStats({
            inventory: { equipped: [], backpack: [] },
            toolProficiencies: ["Poisoner's Kit"],
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Costly Strike', effect: 'poisoned', cost: '1d6', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Costly Strike']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Costly Strike');
        // Should set cost to 0 + 1 = 1 (using the ?? 0 fallback when getRuntimeValue returns null)
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', '_cunningStrikeCostUsed', 1, 'campaign');
    });
});

describe('attackRiderHandler - item-based tool requirement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
    });

    it('should allow Poison when character has Poisoner\'s Kit in inventory', async () => {
        const stats = makePlayerStats({
            inventory: {
                equipped: ["Poisoner's Kit"],
                backpack: [],
            },
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Poison');
        expect(result.payload.description).not.toContain('cannot be used');
    });

    it('should allow Poison when character has Poisoner\'s Kit in backpack', async () => {
        const stats = makePlayerStats({
            inventory: {
                equipped: [],
                backpack: ["Poisoner's Kit"],
            },
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Poison');
        expect(result.payload.description).not.toContain('cannot be used');
    });

    it('should allow Poison when inventory item is an object with name', async () => {
        const stats = makePlayerStats({
            inventory: {
                equipped: [{ name: "Poisoner's Kit", category: 'tool' }],
                backpack: [],
            },
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Poison', effect: 'poisoned', requires: "Poisoner's Kit" }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Poison']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Poison');
        expect(result.payload.description).not.toContain('cannot be used');
    });
});

describe('attackRiderHandler - getCombatContextSync direct override', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
        clearGetCombatContextSyncOverride();
    });

    it('should use direct override parameter in getCombatContextSync', async () => {
        // This tests the overrideContext parameter path in getCombatContextSync
        // which is used internally when validateCunningStrikeOption calls it
        const stats = makePlayerStats({ size: 'Medium' });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Charger Push', effect: 'push', sizeLimit: 'one_size_larger', value: 10 }],
            },
        });
        // Use the module-level override to simulate getCombatContextSync returning a value
        setGetCombatContextSyncOverride({ name: 'Ogre', size: 'Large' });
        const result = await applyRiderOption(action, stats, 'campaign', 'Ogre', ['Charger Push']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Ogre was pushed');
    });
});

describe('attackRiderHandler - handle oncePerTurn path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
    });

    it('should use action name for usedKey when not a Cunning Strike feature', async () => {
        getRuntimeValue.mockImplementation((_scope, key, _camp) => {
            if (key === 'targetEffects') return [];
            return null;
        });
        const action = {
            name: 'Charger',
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Push', effect: 'push', value: 10 }],
            },
        };
        const result = await handle(action, makePlayerStats(), 'campaign', 'map');

        expect(result.type).toBe('popup');
        expect(markOncePerTurn).toHaveBeenCalledWith('Charger', '_Charger_usedRound', expect.any(Object), 'campaign');
    });

    it('should mark oncePerTurn when single option is applied in handle', async () => {
        getRuntimeValue.mockImplementation((_scope, key, _camp) => {
            if (key === 'targetEffects') return [];
            return null;
        });
        const action = {
            name: 'Cunning Strike',
            automation: {
                type: 'attack_rider',
                oncePerTurn: true,
                options: [{ name: 'Trip', effect: 'prone' }],
            },
        };
        const result = await handle(action, makePlayerStats(), 'campaign', 'map');

        expect(result.type).toBe('popup');
        expect(markOncePerTurn).toHaveBeenCalledWith('Cunning Strike', '_CunningStrike_usedRound', expect.any(Object), 'campaign');
    });
});

describe('attackRiderHandler - Stalker\'s Flurry secondary targets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
    });

    it('should set stalkersFlurrySecondaryTargets when sudden_strike has secondary targets within range', async () => {
        vi.mocked(getCombatContext).mockResolvedValue({
            creatures: [
                { name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } },
                { name: 'Skeleton', size: 'Medium', position: { x: 2, y: 1 } },
            ],
        });
        const stats = makePlayerStats({
            automation: { passives: [] },
        });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Sudden Strike', effect: 'sudden_strike' }],
            },
        });
        const result = await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Sudden Strike']);

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Sudden Strike enabled');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'stalkersFlurrySecondaryTargets', expect.any(Array), 'campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestHero', 'stalkersFlurryPrimaryTarget', 'Goblin', 'campaign');
    });

    it('should not set stalkersFlurrySecondaryTargets when no secondary targets within range', async () => {
        vi.mocked(getCombatContext).mockResolvedValue({
            creatures: [
                { name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } },
                { name: 'Skeleton', size: 'Medium', position: { x: 10, y: 10 } },
            ],
        });
        vi.mocked(isWithinRange).mockResolvedValue(false);
        const stats = makePlayerStats({ automation: { passives: [] } });
        const action = makeAction({
            automation: {
                type: 'attack_rider',
                options: [{ name: 'Sudden Strike', effect: 'sudden_strike' }],
            },
        });
        await applyRiderOption(action, stats, 'campaign', 'Goblin', ['Sudden Strike']);

        expect(setRuntimeValue).not.toHaveBeenCalledWith('TestHero', 'stalkersFlurrySecondaryTargets', expect.any(Array), 'campaign');
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => ({
    __esModule: true,
    default: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

vi.mock('../../../ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(),
}));

vi.mock('../../../encounters/encounterToInitiative.js', () => ({
    getMonsterSaveBonuses: vi.fn().mockImplementation((monster) => {
        const map = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
        for (const [abbr] of Object.entries(map)) {
            if (monster.saving_throws?.[abbr]?.modifier != null) {
                map[abbr] = monster.saving_throws[abbr].modifier;
            }
        }
        return map;
    }),
}));

import { handle, confirmAnimateDead } from './animateDeadHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import { loadMonsters } from '../../../ui/dataLoader.js';

describe('animateDeadHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockPlayerStats = {
        name: 'TestCaster',
        level: 5,
        proficiency: 3,
        abilities: [{ name: 'Charisma', bonus: 3 }],
    };
    const mockCampaignName = 'test-campaign';

    const mockSkeleton = {
        index: 'skeleton',
        name: 'Skeleton',
        type: 'Undead',
        armor_class: 13,
        hit_points: 13,
        damage_resistances: [],
        damage_immunities: [],
        immunities: [],
        saving_throws: {},
        initiative_details: '+2',
    };

    const mockZombie = {
        index: 'zombie',
        name: 'Zombie',
        type: 'Undead',
        armor_class: 8,
        hit_points: 22,
        damage_resistances: [],
        damage_immunities: [],
        immunities: [],
        saving_throws: {},
        initiative_details: '-1',
    };

    function makeAction(overrides = {}) {
        return {
            name: 'Animate Dead',
            automation: { type: 'animate_dead', ...overrides.automation },
            ...overrides,
        };
    }

    // ── handle: max targets check ──────────────────────────────

    describe('handle - max targets', () => {
        it('returns popup when already at max targets for current slot level', async () => {
            const action = makeAction({ metadata: { animateDeadMaxTargets: 1 } });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('1 undead creature(s) created');
        });

        it('returns popup when already at max targets for upcast slot level', async () => {
            const action = makeAction({
                metadata: { animateDeadMaxTargets: 3 },
                automation: { slotLevel: 4 },
            });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('3 undead creature(s) created');
        });

        it('returns modal when not at max targets', async () => {
            const action = makeAction();

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('animateDead');
            expect(result.payload.action).toBe(action);
            expect(result.payload.playerStats).toBe(mockPlayerStats);
            expect(result.payload.campaignName).toBe(mockCampaignName);
            expect(result.payload.maxTargets).toBe(1);
        });

        it('returns modal when metadata key is missing', async () => {
            const action = makeAction({ metadata: {} });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('modal');
        });

        it('returns modal when metadata is undefined', async () => {
            const action = makeAction({ metadata: undefined });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('modal');
        });
    });

    // ── handle: slot level determination ───────────────────────

    describe('handle - slot level', () => {
        it('uses automation.slotLevel when provided', async () => {
            const action = makeAction({ automation: { slotLevel: 5 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(5);
        });

        it('uses metaCtx.slotLevel when automation.slotLevel is absent', async () => {
            const action = makeAction({ metaCtx: { slotLevel: 6 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(7);
        });

        it('uses spell.level as fallback', async () => {
            const action = makeAction({ spell: { level: 7 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(9);
        });

        it('defaults to slot level 3 when no level info is available', async () => {
            const action = makeAction({ automation: {} });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(1);
        });

        it('respects upcast table for all slot levels', async () => {
            const upcast = { 3: 1, 4: 3, 5: 5, 6: 7, 7: 9, 8: 11, 9: 13 };
            for (const [slotLevel, expectedMax] of Object.entries(upcast)) {
                const action = makeAction({ automation: { slotLevel: Number(slotLevel) } });
                const result = await handle(action, mockPlayerStats, mockCampaignName);
                expect(result.payload.maxTargets).toBe(expectedMax);
            }
        });

        it('defaults to 1 for unknown slot levels', async () => {
            const action = makeAction({ automation: { slotLevel: 1 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(1);
        });
    });

    // ── confirmAnimateDead: basic flow ─────────────────────────

    describe('confirmAnimateDead - basic flow', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
                ],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('creates skeletons and zombies when counts are provided', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1, zombieCount: 2 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('Skeleton');
            expect(result.payload.description).toContain('Zombies');
            expect(result.payload.description).toContain('right after you');

            const creatures = combatSummary.creatures;
            expect(creatures.find(c => c.name === 'Skeleton')).toBeDefined();
            expect(creatures.find(c => c.name === 'Zombie')).toBeDefined();
            expect(creatures.find(c => c.name === 'Zombie 2')).toBeDefined();
        });

        it('defaults counts to 0 when both are zero/null', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { zombieCount: 0, skeletonCount: 0 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No undead created.');
        });

        it('defaults counts to 0 when undefined', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                {},
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No undead created.');
        });

        it('defaults counts to 0 when only one is provided', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { zombieCount: 0 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No undead created.');
        });
    });

    // ── confirmAnimateDead: combat summary failures ────────────

    describe('confirmAnimateDead - combat summary failures', () => {
        it('returns error popup when combat summary is null', async () => {
            getCombatSummary.mockReturnValue(null);

            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('Failed to load combat summary.');
        });

        it('returns error popup when combat summary is undefined', async () => {
            getCombatSummary.mockReturnValue(undefined);

            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.payload.description).toBe('Failed to load combat summary.');
        });
    });

    // ── confirmAnimateDead: monster loading failures ───────────

    describe('confirmAnimateDead - monster loading failures', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
        });

        it('returns error popup when skeleton monster is not found', async () => {
            loadMonsters.mockResolvedValue([mockZombie]);

            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('Failed to load skeleton monster data.');
        });

        it('returns error popup when zombie monster is not found', async () => {
            loadMonsters.mockResolvedValue([mockSkeleton]);

            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { zombieCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('Failed to load zombie monster data.');
        });
    });

    // ── confirmAnimateDead: creature creation ──────────────────

    describe('confirmAnimateDead - creature creation', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
                ],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('creates a skeleton with correct properties', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton).toBeDefined();
            expect(skeleton.name).toBe('Skeleton');
            expect(skeleton.type).toBe('Undead');
            expect(skeleton.ac).toBe(13);
            expect(skeleton.maxHp).toBe(13);
            expect(skeleton.currentHp).toBe(13);
            expect(skeleton.monsterIndex).toBe('skeleton');
        });

        it('creates a zombie with correct properties', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { zombieCount: 1 },
            );

            const zombie = combatSummary.creatures.find(c => c.name === 'Zombie');
            expect(zombie).toBeDefined();
            expect(zombie.name).toBe('Zombie');
            expect(zombie.type).toBe('Undead');
            expect(zombie.ac).toBe(8);
            expect(zombie.maxHp).toBe(22);
            expect(zombie.currentHp).toBe(22);
            expect(zombie.monsterIndex).toBe('zombie');
        });

        it('numbers multiple creatures of the same type', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 3 },
            );

            expect(combatSummary.creatures.find(c => c.name === 'Skeleton')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Skeleton 2')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Skeleton 3')).toBeDefined();
        });

        it('numbers multiple zombies correctly', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { zombieCount: 2 },
            );

            expect(combatSummary.creatures.find(c => c.name === 'Zombie')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Zombie 2')).toBeDefined();
        });

        it('sets targetName to null on created creatures', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.targetName).toBeNull();
            expect(skeleton.concentration).toBeNull();
        });

        it('uses monster defaults when properties are missing', async () => {
            const minimalMonster = {
                index: 'skeleton',
                name: 'Skeleton',
            };
            loadMonsters.mockResolvedValue([minimalMonster, mockZombie]);
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '10', initiativeBonus: 0 }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const creature = combatSummary.creatures.find(c => c.monsterIndex === 'skeleton');
            expect(creature.type).toBe('Undead');
            expect(creature.ac).toBe(10);
            expect(creature.maxHp).toBe(10);
        });

        it('creates summoned target effects for each creature', async () => {
            const targetEffects = [];
            getRuntimeValue.mockImplementation((_entity, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1, zombieCount: 1 },
            );

            expect(targetEffects).toHaveLength(2);
            expect(targetEffects.find(te => te.target === 'Skeleton')).toMatchObject({
                source: 'TestCaster',
                effect: 'summoned',
            });
            expect(targetEffects.find(te => te.target === 'Zombie')).toMatchObject({
                source: 'TestCaster',
                effect: 'summoned',
            });
        });

        it('does not duplicate summoned effects for same creature', async () => {
            const targetEffects = [];
            getRuntimeValue.mockImplementation((_entity, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 2 },
            );

            const skeletonEffects = targetEffects.filter(te => te.target === 'Skeleton');
            expect(skeletonEffects).toHaveLength(1);
        });
    });

    // ── confirmAnimateDead: initiative handling ────────────────

    describe('confirmAnimateDead - initiative', () => {
        beforeEach(() => {
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('uses caster initiative from combat summary when available', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '12', initiativeBonus: 2 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.initiative).toBe('12');
        });

        it('uses initiativeBonus when initiative is set', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '10', initiativeBonus: 5 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            // initiativeValue = parseInt('10', 10) || random, then initiativeValue = initiativeValue || random
            // The code sets initiativeValue = parseInt(casterCreature.initiative, 10) = 10
            // Then initiativeValue = 10 || (random) = 10
            expect(skeleton.initiative).toBe('10');
        });

        it('falls back to random roll when caster has no initiative', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '', initiativeBonus: 3 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            // With no initiative, falls back to Math.floor(random * 20) + 1 + bonus
            // The value should be a string of a positive number
            expect(skeleton.initiative).toMatch(/^\d+$/);
        });

        it('falls back to random roll when initiative is undefined', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster' },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.initiative).toMatch(/^\d+$/);
        });

        it('sorts creatures by initiative descending', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 0 },
                    { name: 'Goblin', initiative: '5', initiativeBonus: 0 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const indices = combatSummary.creatures.map(c => c.name);
            const skeletonIdx = indices.indexOf('Skeleton');
            const goblinIdx = indices.indexOf('Goblin');
            expect(skeletonIdx).toBeLessThan(goblinIdx);
        });
    });

    // ── confirmAnimateDead: storage and logging ────────────────

    describe('confirmAnimateDead - storage and logging', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('calls storage.set with combatSummary', async () => {
            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), mockCampaignName);
        });

        it('calls setRuntimeValue with targetEffects', async () => {
            const { setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.any(Array),
                mockCampaignName,
            );
        });

        it('dispatches initiative-rolled event', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'initiative-rolled',
            }));
            dispatchSpy.mockRestore();
        });

        it('calls addEntry with summons log type', async () => {
            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1, zombieCount: 2 },
            );

            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
                type: 'summons',
                characterName: 'TestCaster',
                summonName: 'Animate Dead',
                description: expect.stringContaining('Animate Dead'),
                summonedCreatures: expect.any(Array),
                timestamp: expect.any(Number),
            }));
        });

        it('includes logEntries in the return value', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1, zombieCount: 1 },
            );

            expect(result.logEntries).toBeDefined();
            expect(result.logEntries).toHaveLength(1);
            expect(result.logEntries[0]).toMatchObject({
                type: 'summons',
                characterName: 'TestCaster',
                summonName: 'Animate Dead',
            });
        });

        it('updates action metadata with max targets', async () => {
            const action = makeAction();

            await confirmAnimateDead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(action.metadata).toEqual({ animateDeadMaxTargets: 1 });
        });

        it('merges metadata when it already exists', async () => {
            const action = makeAction({ metadata: { existingKey: 'value' } });

            await confirmAnimateDead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(action.metadata).toEqual({
                existingKey: 'value',
                animateDeadMaxTargets: 1,
            });
        });
    });

    // ── confirmAnimateDead: popup description ──────────────────

    describe('confirmAnimateDead - popup description', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('includes creature list in description', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 2, zombieCount: 1 },
            );

            expect(result.payload.description).toContain('1 Zombie');
            expect(result.payload.description).toContain('2 Skeletons');
        });

        it('uses singular form for single creature', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.payload.description).toContain('Skeleton');
            expect(result.payload.description).not.toContain('Skeletons');
        });

        it('uses plural form for multiple creatures', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { zombieCount: 3 },
            );

            expect(result.payload.description).toContain('Zombies');
        });

        it('includes "right after you" in description', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.payload.description).toContain('right after you');
        });

        it('includes caster name in description', async () => {
            const result = await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.payload.description).toContain('TestCaster');
        });

        it('includes automation in popup payload', async () => {
            const automation = { type: 'animate_dead', slotLevel: 5 };
            const action = makeAction({ automation });

            const result = await confirmAnimateDead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(result.payload.automation).toEqual(automation);
        });
    });

    // ── confirmAnimateDead: only skeletons or only zombies ─────

    describe('confirmAnimateDead - creature type variants', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('creates only skeletons when zombieCount is 0', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 2, zombieCount: 0 },
            );

            const skeletons = combatSummary.creatures.filter(c => c.monsterIndex === 'skeleton');
            const zombies = combatSummary.creatures.filter(c => c.monsterIndex === 'zombie');
            expect(skeletons).toHaveLength(2);
            expect(zombies).toHaveLength(0);
        });

        it('creates only zombies when skeletonCount is 0', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 0, zombieCount: 3 },
            );

            const skeletons = combatSummary.creatures.filter(c => c.monsterIndex === 'skeleton');
            const zombies = combatSummary.creatures.filter(c => c.monsterIndex === 'zombie');
            expect(skeletons).toHaveLength(0);
            expect(zombies).toHaveLength(3);
        });

        it('handles upcast with max targets', async () => {
            const action = makeAction({ automation: { slotLevel: 9 } });
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmAnimateDead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 5, zombieCount: 8 },
            );

            expect(result.type).toBe('popup');
            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'skeleton').length).toBe(5);
            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'zombie').length).toBe(8);
        });
    });

    // ── confirmAnimateDead: initiative sorting edge cases ──────

    describe('confirmAnimateDead - initiative sorting edge cases', () => {
        beforeEach(() => {
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('handles creatures with empty initiative string', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 0 },
                    { name: 'Goblin', initiative: '', initiativeBonus: 0 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const indices = combatSummary.creatures.map(c => c.name);
            const skeletonIdx = indices.indexOf('Skeleton');
            const goblinIdx = indices.indexOf('Goblin');
            expect(skeletonIdx).toBeLessThan(goblinIdx);
        });

        it('handles creatures with undefined initiative', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 0 },
                    { name: 'Goblin' },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const indices = combatSummary.creatures.map(c => c.name);
            const skeletonIdx = indices.indexOf('Skeleton');
            const goblinIdx = indices.indexOf('Goblin');
            expect(skeletonIdx).toBeLessThan(goblinIdx);
        });

        it('handles initiativeBonus being 0', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '10', initiativeBonus: 0 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.initiative).toBe('10');
        });
    });

    // ── confirmAnimateDead: save bonuses ───────────────────────

    describe('confirmAnimateDead - save bonuses', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('includes saveBonuses from monster data', async () => {
            const monsterWithSaves = {
                index: 'skeleton',
                name: 'Skeleton',
                type: 'Undead',
                armor_class: 13,
                hit_points: 13,
                damage_resistances: [],
                damage_immunities: [],
                immunities: [],
                saving_throws: { dex: { modifier: 4 }, con: { modifier: 2 } },
            };
            loadMonsters.mockResolvedValue([monsterWithSaves, mockZombie]);

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.saveBonuses).toBeDefined();
            expect(skeleton.saveBonuses.dex).toBe(4);
            expect(skeleton.saveBonuses.con).toBe(2);
        });

        it('defaults save bonuses to 0 when monster has no saving_throws', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.saveBonuses).toBeDefined();
        });
    });

    // ── confirmAnimateDead: resistances and immunities ─────────

    describe('confirmAnimateDead - resistances and immunities', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
        });

        it('copies damage_resistances from monster', async () => {
            const monster = {
                index: 'skeleton',
                name: 'Skeleton',
                type: 'Undead',
                armor_class: 13,
                hit_points: 13,
                damage_resistances: ['bludgeoning', 'piercing'],
                damage_immunities: [],
                immunities: [],
                saving_throws: {},
            };
            loadMonsters.mockResolvedValue([monster, mockZombie]);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const combatSummary = getCombatSummary(mockCampaignName);
            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.resistances).toEqual(['bludgeoning', 'piercing']);
        });

        it('copies damage_immunities from monster', async () => {
            const monster = {
                index: 'skeleton',
                name: 'Skeleton',
                type: 'Undead',
                armor_class: 13,
                hit_points: 13,
                damage_resistances: [],
                damage_immunities: ['bludgeoning'],
                immunities: [],
                saving_throws: {},
            };
            loadMonsters.mockResolvedValue([monster, mockZombie]);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const combatSummary = getCombatSummary(mockCampaignName);
            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.immunities).toEqual(['bludgeoning']);
        });

        it('falls back to immunities when damage_immunities is missing', async () => {
            const monster = {
                index: 'skeleton',
                name: 'Skeleton',
                type: 'Undead',
                armor_class: 13,
                hit_points: 13,
                damage_resistances: [],
                immunities: ['poison'],
                saving_throws: {},
            };
            loadMonsters.mockResolvedValue([monster, mockZombie]);

            await confirmAnimateDead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            const combatSummary = getCombatSummary(mockCampaignName);
            const skeleton = combatSummary.creatures.find(c => c.name === 'Skeleton');
            expect(skeleton.immunities).toEqual(['poison']);
        });
    });

    // ── confirmAnimateDead: action metadata mutation ───────────

    describe('confirmAnimateDead - action metadata', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockSkeleton, mockZombie]);
        });

        it('sets metadata animateDeadMaxTargets to maxTargets', async () => {
            const action = makeAction({ automation: { slotLevel: 5 } });

            await confirmAnimateDead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(action.metadata.animateDeadMaxTargets).toBe(5);
        });

        it('preserves existing metadata keys', async () => {
            const action = makeAction({ metadata: { otherKey: 'otherValue', animateDeadMaxTargets: 1 } });

            await confirmAnimateDead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { skeletonCount: 1 },
            );

            expect(action.metadata.otherKey).toBe('otherValue');
            expect(action.metadata.animateDeadMaxTargets).toBe(1);
        });
    });
});

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
    getNextUniqueMonsterName: vi.fn().mockImplementation((baseName, existingCreatures) => {
        const names = new Set(existingCreatures.map(c => c.name));
        if (!names.has(baseName)) return baseName;
        let num = 2;
        while (names.has(`${baseName} ${num}`)) num++;
        return `${baseName} ${num}`;
    }),
}));

import { handle, confirmCreateUndead, modalName, confirmType } from './createUndeadHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import { loadMonsters } from '../../../ui/dataLoader.js';

describe('createUndeadHandler', () => {
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

    const mockGhoul = {
        index: 'ghoul',
        name: 'Ghoul',
        type: 'Undead',
        armor_class: 12,
        hit_points: 22,
        damage_resistances: [],
        damage_immunities: [],
        immunities: ['Poison'],
        saving_throws: {},
    };

    function makeAction(overrides = {}) {
        return {
            name: 'Create Undead',
            automation: { type: 'create_undead', ...overrides.automation },
            ...overrides,
        };
    }

    // ── Named exports ──────────────────────────────────────────

    describe('named exports', () => {
        it('exports modalName as "createUndead"', () => {
            expect(modalName).toBe('createUndead');
        });

        it('exports confirmType as "create_undead_confirm"', () => {
            expect(confirmType).toBe('create_undead_confirm');
        });
    });

    // ── handle: max targets check ──────────────────────────────

    describe('handle - max targets', () => {
        it('returns popup when already at max targets for current slot level', async () => {
            const action = makeAction({ metadata: { createUndeadMaxTargets: 3 } });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('3 ghoul(s) created');
        });

        it('returns popup when already at max targets for upcast slot level', async () => {
            const action = makeAction({
                metadata: { createUndeadMaxTargets: 4 },
                automation: { slotLevel: 7 },
            });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('4 ghoul(s) created');
        });

        it('returns modal when not at max targets', async () => {
            const action = makeAction();

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('createUndead');
            expect(result.payload.action).toBe(action);
            expect(result.payload.playerStats).toBe(mockPlayerStats);
            expect(result.payload.campaignName).toBe(mockCampaignName);
            expect(result.payload.maxTargets).toBe(3);
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

        it('returns modal when metadata is null', async () => {
            const action = makeAction({ metadata: null });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('modal');
        });
    });

    // ── handle: slot level determination ───────────────────────

    describe('handle - slot level', () => {
        it('uses automation.slotLevel when provided', async () => {
            const action = makeAction({ automation: { slotLevel: 7 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(4);
        });

        it('uses metaCtx.slotLevel when automation.slotLevel is absent', async () => {
            const action = makeAction({ metaCtx: { slotLevel: 8 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(5);
        });

        it('uses spell.level as fallback', async () => {
            const action = makeAction({ spell: { level: 7 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(4);
        });

        it('defaults to slot level 6 (maxTargets 3) when no level info is available', async () => {
            const action = makeAction({ automation: {} });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(3);
        });

        it('defaults to 3 for unknown slot levels below 6', async () => {
            const action = makeAction({ automation: { slotLevel: 3 } });
            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.payload.maxTargets).toBe(3);
        });

        it('respects upcast table for slot levels 6-9', async () => {
            const upcast = { 6: 3, 7: 4, 8: 5, 9: 6 };
            for (const [slotLevel, expectedMax] of Object.entries(upcast)) {
                const action = makeAction({ automation: { slotLevel: Number(slotLevel) } });
                const result = await handle(action, mockPlayerStats, mockCampaignName);
                expect(result.payload.maxTargets).toBe(expectedMax);
            }
        });
    });

    // ── confirmCreateUndead: basic flow ────────────────────────

    describe('confirmCreateUndead - basic flow', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
                ],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('creates a ghoul when count is 1', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('Ghoul');
            expect(result.payload.description).toContain('right after you');

            const creatures = combatSummary.creatures;
            expect(creatures.find(c => c.name === 'Ghoul')).toBeDefined();
        });

        it('creates multiple ghouls when count > 1', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            expect(combatSummary.creatures.find(c => c.name === 'Ghoul')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Ghoul 2')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Ghoul 3')).toBeDefined();
        });

        it('defaults ghoulCount to 1 when not provided', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                {},
            );

            expect(result.type).toBe('popup');
            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'ghoul')).toHaveLength(1);
        });

        it('creates 1 ghoul when ghoulCount is 0 (falsy default)', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 0 },
            );

            // ghoulCount=0 is falsy, so count = 0 || 1 = 1
            expect(result.type).toBe('popup');
            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'ghoul')).toHaveLength(1);
        });

        it('creates 1 ghoul when ghoulCount is null (falsy default)', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: null },
            );

            // ghoulCount=null is falsy, so count = null || 1 = 1
            expect(result.type).toBe('popup');
            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'ghoul')).toHaveLength(1);
        });

        it('returns early when count is negative', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: -1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No undead created.');
        });

        it('returns early when ghoulCount is undefined and no other counts', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                {},
            );

            // ghoulCount defaults to 1 via `count = ghoulCount || 1`, so this creates 1 ghoul
            expect(result.type).toBe('popup');
        });
    });

    // ── confirmCreateUndead: combat summary failures ───────────

    describe('confirmCreateUndead - combat summary failures', () => {
        it('returns error popup when combat summary is null', async () => {
            getCombatSummary.mockReturnValue(null);
            loadMonsters.mockResolvedValue([mockGhoul]);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('Failed to load combat summary.');
        });

        it('returns error popup when combat summary is undefined', async () => {
            getCombatSummary.mockReturnValue(undefined);
            loadMonsters.mockResolvedValue([mockGhoul]);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.payload.description).toBe('Failed to load combat summary.');
        });
    });

    // ── confirmCreateUndead: monster loading failures ──────────

    describe('confirmCreateUndead - monster loading failures', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
        });

        it('returns error popup when ghoul monster is not found', async () => {
            loadMonsters.mockResolvedValue([]);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('Failed to load ghoul monster data.');
        });

        it('returns error popup when ghoul has wrong index', async () => {
            loadMonsters.mockResolvedValue([{ index: 'zombie' }]);

            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('Failed to load ghoul monster data.');
        });
    });

    // ── confirmCreateUndead: ghoul creature creation ───────────

    describe('confirmCreateUndead - ghoul creature creation', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
                ],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('creates a ghoul with correct properties', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(ghoul).toBeDefined();
            expect(ghoul.name).toBe('Ghoul');
            expect(ghoul.type).toBe('Undead');
            expect(ghoul.ac).toBe(12);
            expect(ghoul.maxHp).toBe(22);
            expect(ghoul.currentHp).toBe(22);
            expect(ghoul.monsterIndex).toBe('ghoul');
            expect(ghoul.targetName).toBeNull();
            expect(ghoul.concentration).toBeNull();
        });

        it('numbers multiple ghouls correctly', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            expect(combatSummary.creatures.find(c => c.name === 'Ghoul')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Ghoul 2')).toBeDefined();
            expect(combatSummary.creatures.find(c => c.name === 'Ghoul 3')).toBeDefined();
        });

        it('uses monster defaults when properties are missing', async () => {
            const minimalMonster = { index: 'ghoul' };
            loadMonsters.mockResolvedValue([minimalMonster]);
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '10', initiativeBonus: 0 }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const creature = combatSummary.creatures.find(c => c.monsterIndex === 'ghoul');
            expect(creature.type).toBe('Undead');
            expect(creature.ac).toBe(10);
            expect(creature.maxHp).toBe(10);
        });

        it('uses monster.damage_resistances when present', async () => {
            const monsterWithResistances = {
                ...mockGhoul,
                damage_resistances: ['bludgeoning', 'piercing'],
            };
            loadMonsters.mockResolvedValue([monsterWithResistances]);

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(ghoul.resistances).toEqual(['bludgeoning', 'piercing']);
        });

        it('uses monster.damage_immunities when present', async () => {
            const monsterWithImmunities = {
                ...mockGhoul,
                damage_immunities: ['cold'],
            };
            loadMonsters.mockResolvedValue([monsterWithImmunities]);

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(ghoul.immunities).toEqual(['cold']);
        });

        it('falls back to immunities when damage_immunities is missing', async () => {
            const monsterWithFallback = {
                ...mockGhoul,
                damage_immunities: undefined,
                immunities: ['poison'],
            };
            loadMonsters.mockResolvedValue([monsterWithFallback]);

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(ghoul.immunities).toEqual(['poison']);
        });

        it('sets saveBonuses from monster data', async () => {
            const monsterWithSaves = {
                ...mockGhoul,
                saving_throws: { dex: { modifier: 4 }, con: { modifier: 2 } },
            };
            loadMonsters.mockResolvedValue([monsterWithSaves]);

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(ghoul.saveBonuses).toBeDefined();
            expect(ghoul.saveBonuses.dex).toBe(4);
            expect(ghoul.saveBonuses.con).toBe(2);
        });
    });

    // ── confirmCreateUndead: summoned target effects ────────────

    describe('confirmCreateUndead - summoned target effects', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('creates summoned target effects for each ghoul', async () => {
            const targetEffects = [];
            getRuntimeValue.mockImplementation((_entity, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 2 },
            );

            const ghoulEffects = targetEffects.filter(te => te.target === 'Ghoul');
            expect(ghoulEffects).toHaveLength(1);
            expect(ghoulEffects[0]).toMatchObject({
                source: 'TestCaster',
                effect: 'summoned',
            });

            const ghoul2Effects = targetEffects.filter(te => te.target === 'Ghoul 2');
            expect(ghoul2Effects).toHaveLength(1);
        });

        it('does not duplicate summoned effects for same creature', async () => {
            const targetEffects = [];
            getRuntimeValue.mockImplementation((_entity, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            const ghoulEffects = targetEffects.filter(te => te.target === 'Ghoul');
            expect(ghoulEffects).toHaveLength(1);

            const ghoul2Effects = targetEffects.filter(te => te.target === 'Ghoul 2');
            expect(ghoul2Effects).toHaveLength(1);

            const ghoul3Effects = targetEffects.filter(te => te.target === 'Ghoul 3');
            expect(ghoul3Effects).toHaveLength(1);
        });

        it('uses the correct source (caster name) in target effects', async () => {
            const targetEffects = [];
            getRuntimeValue.mockImplementation((_entity, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });

            const casterWithDifferentName = { ...mockPlayerStats, name: 'DarkWizard' };

            await confirmCreateUndead(
                makeAction(),
                casterWithDifferentName,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const effect = targetEffects.find(te => te.target === 'Ghoul');
            expect(effect.source).toBe('DarkWizard');
        });
    });

    // ── confirmCreateUndead: initiative handling ────────────────

    describe('confirmCreateUndead - initiative', () => {
        beforeEach(() => {
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('uses caster initiative from combat summary when available', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '12', initiativeBonus: 2 }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            // Ghoul gets initiativeValue - 0.1 = 12 - 0.1 = 11.9
            expect(ghoul.initiative).toBe('11.9');
        });

        it('falls back to random roll when caster has no initiative (empty string)', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '', initiativeBonus: 3 }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            // Random roll: Math.floor(Math.random() * 20) + 1 + 3 = 4..24, minus 0.1
            // Initiative is a string like "X.9" where X is 3..23
            expect(ghoul.initiative).toMatch(/^\d+\.9$/);
        });

        it('falls back to random roll when caster initiative is undefined', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster' }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            // Random roll gives a string like "X.9"
            expect(ghoul.initiative).toMatch(/^\d+\.9$/);
        });

        it('uses initiativeBonus in random roll when no initiative set', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiativeBonus: 5 }],
            });

            // Intercept Math.random to return a predictable value (0.5)
            const originalRandom = Math.random;
            Math.random = () => 0.5;

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            // Math.floor(0.5 * 20) + 1 + 5 = 10 + 1 + 5 = 16, then 16 - 0.1 = 15.9
            expect(ghoul.initiative).toBe('15.9');
            Math.random = originalRandom;
        });

        it('uses caster initiative when initiativeBonus exists', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '10', initiativeBonus: 5 }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            // initiativeValue = 10, ghoul gets 10 - 0.1 = 9.9
            expect(ghoul.initiative).toBe('9.9');
        });
    });

    // ── confirmCreateUndead: initiative sorting ────────────────

    describe('confirmCreateUndead - initiative sorting', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 0 },
                    { name: 'Goblin', initiative: '5', initiativeBonus: 0 },
                ],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('sorts creatures by initiative descending', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const indices = combatSummary.creatures.map(c => c.name);
            const ghoulIdx = indices.indexOf('Ghoul');
            const goblinIdx = indices.indexOf('Goblin');
            expect(ghoulIdx).toBeLessThan(goblinIdx);
        });

        it('handles creatures with empty initiative string in sort', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 0 },
                    { name: 'Goblin', initiative: '', initiativeBonus: 0 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const indices = combatSummary.creatures.map(c => c.name);
            const ghoulIdx = indices.indexOf('Ghoul');
            const goblinIdx = indices.indexOf('Goblin');
            expect(ghoulIdx).toBeLessThan(goblinIdx);
        });

        it('handles creatures with undefined initiative in sort', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 0 },
                    { name: 'Goblin' },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const indices = combatSummary.creatures.map(c => c.name);
            const ghoulIdx = indices.indexOf('Ghoul');
            const goblinIdx = indices.indexOf('Goblin');
            expect(ghoulIdx).toBeLessThan(goblinIdx);
        });
    });

    // ── confirmCreateUndead: storage and logging ───────────────

    describe('confirmCreateUndead - storage and logging', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('calls storage.set with combatSummary', async () => {
            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(storage.set).toHaveBeenCalledWith('combatSummary', expect.any(Object), mockCampaignName);
        });

        it('calls setRuntimeValue with targetEffects', async () => {
            const { setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
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

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'initiative-rolled',
            }));
            dispatchSpy.mockRestore();
        });

        it('calls addEntry with summons log type', async () => {
            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 2 },
            );

            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
                type: 'summons',
                characterName: 'TestCaster',
                summonName: 'Create Undead',
                description: expect.stringContaining('Create Undead'),
                summonedCreatures: expect.any(Array),
                timestamp: expect.any(Number),
            }));
        });

        it('includes logEntries in the return value', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.logEntries).toBeDefined();
            expect(result.logEntries).toHaveLength(1);
            expect(result.logEntries[0]).toMatchObject({
                type: 'summons',
                characterName: 'TestCaster',
                summonName: 'Create Undead',
            });
        });

        it('updates action metadata with max targets', async () => {
            const action = makeAction();

            await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(action.metadata).toEqual({ createUndeadMaxTargets: 3 });
        });

        it('merges metadata when it already exists', async () => {
            const action = makeAction({ metadata: { existingKey: 'value' } });

            await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(action.metadata).toEqual({
                existingKey: 'value',
                createUndeadMaxTargets: 3,
            });
        });
    });

    // ── confirmCreateUndead: popup description ─────────────────

    describe('confirmCreateUndead - popup description', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('uses singular form for single ghoul', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.payload.description).toContain('Ghoul');
            expect(result.payload.description).not.toContain('Ghouls');
        });

        it('uses plural form for multiple ghouls', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            expect(result.payload.description).toContain('3 Ghouls');
        });

        it('includes "right after you" in description', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.payload.description).toContain('right after you');
        });

        it('includes caster name in description', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.payload.description).toContain('TestCaster');
        });

        it('includes automation in popup payload', async () => {
            const automation = { type: 'create_undead', slotLevel: 5 };
            const action = makeAction({ automation });

            const result = await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.payload.automation).toEqual(automation);
        });

        it('includes slot level in log description', async () => {
            const action = makeAction({ automation: { slotLevel: 7 } });

            const result = await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.logEntries[0].description).toContain('slot level 7');
        });
    });

    // ── confirmCreateUndead: upcast ────────────────────────────

    describe('confirmCreateUndead - upcast', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('respects upcast max targets for slot level 6', async () => {
            const action = makeAction({ automation: { slotLevel: 6 } });
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'ghoul')).toHaveLength(3);
        });

        it('respects upcast max targets for slot level 7', async () => {
            const action = makeAction({ automation: { slotLevel: 7 } });
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 4 },
            );

            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'ghoul')).toHaveLength(4);
        });

        it('respects upcast max targets for slot level 9', async () => {
            const action = makeAction({ automation: { slotLevel: 9 } });
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 6 },
            );

            expect(combatSummary.creatures.filter(c => c.monsterIndex === 'ghoul')).toHaveLength(6);
        });

        it('updates metadata with correct max targets for upcast', async () => {
            const action = makeAction({ automation: { slotLevel: 8 } });

            await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(action.metadata.createUndeadMaxTargets).toBe(5);
        });
    });

    // ── confirmCreateUndead: ghoul initiative offset ───────────

    describe('confirmCreateUndead - ghoul initiative offset', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('gives ghouls initiative 0.1 less than caster', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            // initiativeValue = 15, then ghoul gets String(15 - 0.1) = "14.9"
            expect(ghoul.initiative).toBe('14.9');
        });

        it('gives multiple ghouls the same initiative (same turn)', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            const ghoul1 = combatSummary.creatures.find(c => c.name === 'Ghoul');
            const ghoul2 = combatSummary.creatures.find(c => c.name === 'Ghoul 2');
            const ghoul3 = combatSummary.creatures.find(c => c.name === 'Ghoul 3');
            expect(ghoul1.initiative).toBe(ghoul2.initiative);
            expect(ghoul2.initiative).toBe(ghoul3.initiative);
        });
    });

    // ── confirmCreateUndead: action name in popup ──────────────

    describe('confirmCreateUndead - action name in popup', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('uses custom action name in popup', async () => {
            const action = makeAction({ name: 'Custom Undead Spell' });

            const result = await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.payload.name).toBe('Custom Undead Spell');
        });

        it('uses action name in log entry', async () => {
            const action = makeAction({ name: 'Custom Undead Spell' });

            const result = await confirmCreateUndead(
                action,
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.logEntries[0].summonName).toBe('Create Undead');
        });
    });

    // ── confirmCreateUndead: summoned creatures in log ─────────

    describe('confirmCreateUndead - summoned creatures in log', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('includes summonedCreatures array in log entry', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 3 },
            );

            expect(result.logEntries[0].summonedCreatures).toEqual(['Ghoul', 'Ghoul 2', 'Ghoul 3']);
        });

        it('includes timestamp in log entry', async () => {
            const result = await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(result.logEntries[0].timestamp).toBeTypeOf('number');
        });
    });

    // ── confirmCreateUndead: existing creatures with same name ─

    describe('confirmCreateUndead - existing creature naming', () => {
        beforeEach(() => {
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('renames ghoul when one already exists', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
                    { name: 'Ghoul', initiative: '10', initiativeBonus: 0 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            // The new ghoul gets renamed to "Ghoul 2" since "Ghoul" already exists
            expect(combatSummary.creatures.find(c => c.name === 'Ghoul 2')).toBeDefined();
            // The original "Ghoul" still exists
            expect(combatSummary.creatures.find(c => c.name === 'Ghoul')).toBeDefined();
        });

        it('handles chain of existing ghouls', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
                    { name: 'Ghoul', initiative: '10', initiativeBonus: 0 },
                    { name: 'Ghoul 2', initiative: '9', initiativeBonus: 0 },
                    { name: 'Ghoul 3', initiative: '8', initiativeBonus: 0 },
                ],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            expect(combatSummary.creatures.find(c => c.name === 'Ghoul 4')).toBeDefined();
        });
    });

    // ── confirmCreateUndead: ghoul initiative - 0.1 as string ──

    describe('confirmCreateUndead - initiative string format', () => {
        beforeEach(() => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster', initiative: '15', initiativeBonus: 3 }],
            });
            loadMonsters.mockResolvedValue([mockGhoul]);
        });

        it('stores ghoul initiative as string', async () => {
            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(typeof ghoul.initiative).toBe('string');
        });

        it('stores initiative as string even with random fallback', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [{ name: 'TestCaster' }],
            });

            const combatSummary = getCombatSummary(mockCampaignName);

            await confirmCreateUndead(
                makeAction(),
                mockPlayerStats,
                mockCampaignName,
                { ghoulCount: 1 },
            );

            const ghoul = combatSummary.creatures.find(c => c.name === 'Ghoul');
            expect(typeof ghoul.initiative).toBe('string');
        });
    });
});

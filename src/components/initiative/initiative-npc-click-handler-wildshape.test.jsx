import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNpcClickHandler } from './initiative-npc-click-handler.jsx';
import { loadMonsters } from '../../services/ui/dataLoader.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMonsterData } from '../../services/npcs/monsterUtils.js';
import { npcToMonsterFormat } from '../../services/encounters/npcStatBlockUtils.js';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
}));
vi.mock('../../services/npcs/monsterUtils.js', () => ({
    getMonsterData: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../../services/encounters/npcStatBlockUtils.js', () => ({
    npcToMonsterFormat: vi.fn(() => null),
}));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn((_key, _prop, _campaign) => {
        if (_prop === 'currentHitPoints') return 15;
        if (_prop === 'circleFormsAC') return null;
        if (_prop === 'polymorphTempHp') return 0;
        if (_prop === 'shapechangeTempHp') return 0;
        return null;
    }),
}));

describe('createNpcClickHandler - Wild Shape form path', () => {
    let handler;
    let setViewingMonster;
    let campaignNpcs;
    let characters;

    beforeEach(() => {
        vi.clearAllMocks();
        setViewingMonster = vi.fn();
        campaignNpcs = [];
        characters = [
            {
                name: 'DruidAlice',
                computedStats: {
                    hitPoints: 20,
                    currentHitPoints: 20,
                    armorClass: 15,
                    abilities: [
                        { name: 'Intelligence', score: 16 },
                        { name: 'Wisdom', score: 14 },
                        { name: 'Charisma', score: 12 },
                    ],
                    languages: ['Common', 'Elvish'],
                    class: { major: { name: 'Circle of the Moon' } },
                },
            },
        ];
        handler = createNpcClickHandler({
            isLocalhost: true,
            campaignNpcs,
            campaignName: 'test-campaign',
            characters,
            setViewingMonster,
            setViewingMonsterCreatureName: vi.fn(),
        });
        vi.mocked(getCombatSummary).mockReturnValue(null);
        vi.mocked(getMonsterData).mockResolvedValue(null);
        vi.mocked(npcToMonsterFormat).mockReturnValue(null);
    });

    it('should load wild shape form with basic beast data', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: { str: { modifier: 6 }, dex: { modifier: 2 }, con: { modifier: 5 } },
                actions: [{ name: 'Multiattack', attack_bonus: 5, damage_type_primary: 'Bludgeoning', damage_type_secondary: 'Piercing', description: '5 Bludgeoning damage' }],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        expect(setViewingMonster).toHaveBeenCalled();
        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.name).toBe('Brown Bear');
        expect(monster.hit_points).toBe(15);
        expect(monster.ability_scores.int).toBe(16);
        expect(monster.ability_scores.wis).toBe(14);
        expect(monster.ability_scores.cha).toBe(12);
        expect(monster.languages).toBe('Common, Elvish');
    });

    it('should apply circleFormsAC when set', async () => {
        const mockCircleFormsAC = 18;
        vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop, _campaign) => {
            if (prop === 'circleFormsAC') return mockCircleFormsAC;
            if (prop === 'currentHitPoints') return 15;
            if (prop === 'polymorphTempHp') return 0;
            if (prop === 'shapechangeTempHp') return 0;
            return null;
        });
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: { con: { modifier: 5 } },
                actions: [],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.armor_class).toBe(mockCircleFormsAC);
    });

    it('should set saving throws from base monster', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: { str: { modifier: 6 }, dex: { modifier: 2 }, con: { modifier: 5 } },
                actions: [],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.saving_throws.str.modifier).toBe(6);
        expect(monster.saving_throws.dex.modifier).toBe(2);
        expect(monster.saving_throws.con.modifier).toBe(7);
    });

    it('should fall back to ability_score_modifiers for saving throws when saving_throws missing', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'cat',
                    beastName: 'Panther',
                    ac: 12,
                    currentHp: 10,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'cat',
                name: 'Panther',
                armor_class: 12,
                hit_points: 13,
                ability_scores: { str: 12, dex: 14, con: 12, int: 3, wis: 12, cha: 8 },
                ability_score_modifiers: { str: 1, dex: 2, con: 1, int: -4, wis: 1, cha: -1 },
                actions: [],
                size: 'Small',
                type: 'Beast',
                challenge_rating: 0.25,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.saving_throws.str.modifier).toBe(1);
        expect(monster.saving_throws.dex.modifier).toBe(2);
    });

    it('should modify CON save for Moon Druid wild shape', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: { con: { modifier: 5 } },
                actions: [],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.saving_throws.con.modifier).toBe(7);
    });

    it('should change action damage types to Radiant for Moon Druid', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: { con: { modifier: 5 } },
                actions: [
                    { name: 'Bite', attack_bonus: 5, damage_type_primary: 'Bludgeoning', damage_type_secondary: 'Piercing', description: '5 Bludgeoning damage' },
                    { name: 'Claw', attack_bonus: 5, damage_type_primary: 'Slashing', description: 'Claw attack' },
                ],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.actions[0].damage_type_primary).toBe('Radiant');
        expect(monster.actions[0].damage_type_secondary).toBe('Radiant');
        expect(monster.actions[0].description).toContain('Radiant damage');
        expect(monster.actions[1].damage_type_primary).toBe('Radiant');
    });

    it('should add lunarFormAction when present', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                    lunarFormAction: { name: 'Lunar Form', attack_bonus: 7, damage_type_primary: 'Radiant', description: 'Moon magic attack' },
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: { con: { modifier: 5 } },
                actions: [{ name: 'Bite', attack_bonus: 5, damage_type_primary: 'Bludgeoning', description: '5 Bludgeoning damage' }],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.actions.length).toBe(2);
        expect(monster.actions[1].name).toBe('Lunar Form');
    });

    it('should use druidCharacter from abilities (not computedStats) fallback', async () => {
        const charactersNoComputed = [
            {
                name: 'DruidAlice',
                abilities: [
                    { name: 'Intelligence', score: 10 },
                    { name: 'Wisdom', score: 20 },
                    { name: 'Charisma', score: 8 },
                ],
                languages: 'Common',
            },
        ];
        const handler2 = createNpcClickHandler({
            isLocalhost: true,
            campaignNpcs: [],
            campaignName: 'test-campaign',
            characters: charactersNoComputed,
            setViewingMonster,
            setViewingMonsterCreatureName: vi.fn(),
        });
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: {},
                actions: [],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler2({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.ability_scores.int).toBe(10);
        expect(monster.ability_scores.wis).toBe(20);
        expect(monster.ability_scores.cha).toBe(8);
    });

    it('should not set ability scores when druid character not found', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'SomeCreature',
                    wildShapeSource: 'UnknownDruid',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: {},
                actions: [],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler({ name: 'SomeCreature' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.ability_scores.int).toBe(3);
        expect(monster.ability_scores.wis).toBe(13);
        expect(monster.ability_scores.cha).toBe(7);
    });

    it('should not set viewing monster when base monster not found in loadMonsters', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'nonexistent',
                    beastName: 'Unknown Beast',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([]);

        await handler({ name: 'DruidAlice' });

        expect(setViewingMonster).not.toHaveBeenCalled();
    });

    it('should match druid character by name with suffix (e.g. "DruidAlice (Wild Shape)")', async () => {
        const charactersWithSuffix = [
            {
                name: 'DruidAlice (Wild Shape)',
                computedStats: {
                    abilities: [
                        { name: 'Intelligence', score: 18 },
                        { name: 'Wisdom', score: 16 },
                        { name: 'Charisma', score: 14 },
                    ],
                    languages: ['Common', 'Sylvan'],
                },
            },
        ];
        const handler2 = createNpcClickHandler({
            isLocalhost: true,
            campaignNpcs: [],
            campaignName: 'test-campaign',
            characters: charactersWithSuffix,
            setViewingMonster,
            setViewingMonsterCreatureName: vi.fn(),
        });
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    ac: 11,
                    currentHp: 15,
                },
            ],
        };
        vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
        vi.mocked(loadMonsters).mockResolvedValue([
            {
                index: 'bear',
                name: 'Brown Bear',
                armor_class: 11,
                hit_points: 34,
                ability_scores: { str: 19, dex: 10, con: 16, int: 3, wis: 13, cha: 7 },
                saving_throws: {},
                actions: [],
                size: 'Large',
                type: 'Beast',
                challenge_rating: 1,
            },
        ]);

        await handler2({ name: 'DruidAlice' });

        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.ability_scores.int).toBe(18);
    });
});

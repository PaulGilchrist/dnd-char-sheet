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

describe('createNpcClickHandler', () => {
    let handler;
    let setViewingMonster;
    let setViewingMonsterCreatureName;
    let campaignNpcs;
    let characters;

    beforeEach(() => {
        vi.clearAllMocks();
        setViewingMonster = vi.fn();
        setViewingMonsterCreatureName = vi.fn();
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
            setViewingMonsterCreatureName,
        });
    });

    describe('early return for non-localhost', () => {
        beforeEach(() => {
            vi.mocked(loadMonsters).mockResolvedValue([]);
            vi.mocked(getCombatSummary).mockReturnValue(null);
            vi.mocked(getMonsterData).mockResolvedValue(null);
            vi.mocked(npcToMonsterFormat).mockReturnValue(null);
        });

        it('should return early without calling setters when not localhost and allowNonLocalhost is false', async () => {
            const nonLocalHandler = createNpcClickHandler({
                isLocalhost: false,
                campaignNpcs,
                campaignName: 'test-campaign',
                characters,
                setViewingMonster,
                setViewingMonsterCreatureName,
            });
            await nonLocalHandler({ name: 'Goblin' });
            expect(setViewingMonster).not.toHaveBeenCalled();
            expect(setViewingMonsterCreatureName).not.toHaveBeenCalled();
        });

        it('should proceed when allowNonLocalhost is true even if not localhost', async () => {
            const nonLocalHandler = createNpcClickHandler({
                isLocalhost: false,
                campaignNpcs,
                campaignName: 'test-campaign',
                characters,
                setViewingMonster,
                setViewingMonsterCreatureName,
            });
            const mockMonster = { index: 'goblin', name: 'Goblin' };
            vi.mocked(getMonsterData).mockResolvedValue(mockMonster);
            await nonLocalHandler({ name: 'Goblin' }, { allowNonLocalhost: true });
            expect(setViewingMonster).toHaveBeenCalledWith(mockMonster);
            expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('Goblin');
        });
    });

    describe('NPC stat block path', () => {
        beforeEach(() => {
            vi.mocked(loadMonsters).mockResolvedValue([]);
            vi.mocked(getCombatSummary).mockReturnValue(null);
            vi.mocked(getMonsterData).mockResolvedValue(null);
        });

        it('should format NPC via npcToMonsterFormat and set viewing monster', async () => {
            campaignNpcs = [
                {
                    name: 'Goblin Warrior',
                    armorClass: 15,
                    hitPoints: 7,
                    abilityScores: { str: 8, dex: 14, con: 10, int: 8, wis: 8, cha: 8 },
                    size: 'Small',
                    classRole: 'NPC',
                    speed: { walk: '30 ft.' },
                    savingThrowBonuses: { dex: 4 },
                    skillBonuses: {},
                    initiativeBonus: 2,
                    traits: [],
                    actions: [],
                    reactions: [],
                    damageResistances: [],
                    damageImmunities: [],
                    conditionImmunities: [],
                },
            ];
            handler = createNpcClickHandler({
                isLocalhost: true,
                campaignNpcs,
                campaignName: 'test-campaign',
                characters,
                setViewingMonster,
                setViewingMonsterCreatureName,
            });
            const formatted = { name: 'Goblin Warrior', armor_class: 15 };
            vi.mocked(npcToMonsterFormat).mockReturnValue(formatted);

            await handler({ name: 'Goblin Warrior' });

            expect(npcToMonsterFormat).toHaveBeenCalledWith(campaignNpcs[0]);
            expect(setViewingMonster).toHaveBeenCalledWith(formatted);
            expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('Goblin Warrior');
        });

        it('should skip npcToMonsterFormat path when it returns null', async () => {
            campaignNpcs = [
                {
                    name: 'Goblin Warrior',
                    // no armorClass, so npcHasStatBlock returns false and npcToMonsterFormat returns null
                },
            ];
            handler = createNpcClickHandler({
                isLocalhost: true,
                campaignNpcs,
                campaignName: 'test-campaign',
                characters,
                setViewingMonster,
                setViewingMonsterCreatureName,
            });
            vi.mocked(npcToMonsterFormat).mockReturnValue(null);
            const fallbackMonster = { index: 'goblin', name: 'Goblin' };
            vi.mocked(getMonsterData).mockResolvedValue(fallbackMonster);

            await handler({ name: 'Goblin Warrior' });

            expect(setViewingMonster).toHaveBeenCalledWith(fallbackMonster);
        });

        it('should do case-insensitive NPC name matching', async () => {
            campaignNpcs = [
                {
                    name: 'goblin warrior',
                    armorClass: 15,
                    hitPoints: 7,
                    abilityScores: { str: 8, dex: 14, con: 10, int: 8, wis: 8, cha: 8 },
                },
            ];
            handler = createNpcClickHandler({
                isLocalhost: true,
                campaignNpcs,
                campaignName: 'test-campaign',
                characters,
                setViewingMonster,
                setViewingMonsterCreatureName,
            });
            const formatted = { name: 'goblin warrior', armor_class: 15 };
            vi.mocked(npcToMonsterFormat).mockReturnValue(formatted);

            await handler({ name: 'GOBLIN WARRIOR' });

            expect(npcToMonsterFormat).toHaveBeenCalled();
            expect(setViewingMonster).toHaveBeenCalledWith(formatted);
        });
    });

    describe('Wild Shape form path', () => {
        beforeEach(() => {
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
                    actions: [{ name: 'Multiattack', attack_bonus: 5, damage_type_primary: 'Bludgeoning', description: 'The bear makes two attacks.' }],
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
            // CON save is base (5) + Moon Druid wis mod (floor((14-10)/2) = 2) = 7
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
            // CON save should be base (5) + wis mod (floor((14-10)/2) = 2) = 7
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
                setViewingMonsterCreatureName,
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
                setViewingMonsterCreatureName,
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

    describe('Polymorph form path', () => {
        beforeEach(() => {
            vi.mocked(getMonsterData).mockResolvedValue(null);
            vi.mocked(npcToMonsterFormat).mockReturnValue(null);
        });

        it('should load polymorph form with beast data', async () => {
            vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop, _campaign) => {
                if (prop === 'currentHitPoints') return 25;
                if (prop === 'polymorphTempHp') return 0;
                if (prop === 'circleFormsAC') return null;
                if (prop === 'shapechangeTempHp') return 0;
                return null;
            });
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'bear', challengeRating: 2 },
                        ac: 14,
                        size: 'Large',
                        speed: { walk: '40 ft.' },
                        currentHp: 25,
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

            await handler({ name: 'DruidAlice' });

            expect(setViewingMonster).toHaveBeenCalled();
            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.name).toBe('Brown Bear');
            expect(monster.hit_points).toBe(25);
            expect(monster.armor_class).toBe(14);
            expect(monster.type).toBe('beast');
            expect(monster.size).toBe('Large');
            expect(monster.challenge_rating).toBe(2);
            expect(monster.speed).toEqual({ walk: '40 ft.' });
        });

        it('should set polymorphTempHp when present', async () => {
            vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop, _campaign) => {
                if (prop === 'polymorphTempHp') return 10;
                if (prop === 'currentHitPoints') return 25;
                if (prop === 'circleFormsAC') return null;
                if (prop === 'shapechangeTempHp') return 0;
                return null;
            });
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'bear', challengeRating: 2 },
                        ac: 14,
                        currentHp: 25,
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

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.hit_points_temp).toBe(10);
        });

        it('should not set polymorphTempHp when zero or negative', async () => {
            vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop, _campaign) => {
                if (prop === 'polymorphTempHp') return 0;
                if (prop === 'currentHitPoints') return 25;
                if (prop === 'circleFormsAC') return null;
                if (prop === 'shapechangeTempHp') return 0;
                return null;
            });
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'bear', challengeRating: 2 },
                        ac: 14,
                        currentHp: 25,
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

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.hit_points_temp).toBeUndefined();
        });

        it('should apply druid abilities and languages to polymorph form', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'bear', challengeRating: 2 },
                        ac: 14,
                        currentHp: 25,
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

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.ability_scores.int).toBe(16);
            expect(monster.ability_scores.wis).toBe(14);
            expect(monster.ability_scores.cha).toBe(12);
            expect(monster.languages).toBe('Common, Elvish');
        });

        it('should change action damage types to Radiant for polymorph', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'bear', challengeRating: 2 },
                        ac: 14,
                        currentHp: 25,
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
                    actions: [
                        { name: 'Bite', attack_bonus: 5, damage_type_primary: 'Bludgeoning', description: '5 Bludgeoning damage' },
                    ],
                    size: 'Large',
                    type: 'Beast',
                    challenge_rating: 1,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.actions[0].damage_type_primary).toBe('Radiant');
        });

        it('should not set viewing monster when base monster not found', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'nonexistent', challengeRating: 2 },
                        ac: 14,
                        currentHp: 25,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([]);

            await handler({ name: 'DruidAlice' });

            expect(setViewingMonster).not.toHaveBeenCalled();
        });
    });

    describe('Shapechange form path', () => {
        beforeEach(() => {
            vi.mocked(getMonsterData).mockResolvedValue(null);
            vi.mocked(npcToMonsterFormat).mockReturnValue(null);
        });

        it('should load shapechange form with beast data', async () => {
            vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop, _campaign) => {
                if (prop === 'currentHitPoints') return 50;
                if (prop === 'shapechangeTempHp') return 0;
                if (prop === 'circleFormsAC') return null;
                if (prop === 'polymorphTempHp') return 0;
                return null;
            });
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'dragon', challengeRating: 5 },
                        ac: 18,
                        size: 'Large',
                        speed: { fly: '60 ft.', walk: '40 ft.' },
                        currentHp: 50,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 16 },
                    saving_throws: {},
                    actions: [],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            expect(setViewingMonster).toHaveBeenCalled();
            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.name).toBe('Dragon');
            expect(monster.hit_points).toBe(50);
            expect(monster.armor_class).toBe(18);
            expect(monster.size).toBe('Large');
            expect(monster.challenge_rating).toBe(5);
        });

        it('should set shapechangeTempHp when present', async () => {
            vi.mocked(runtimeState.getRuntimeValue).mockImplementation((key, prop, _campaign) => {
                if (prop === 'shapechangeTempHp') return 20;
                if (prop === 'currentHitPoints') return 50;
                if (prop === 'circleFormsAC') return null;
                if (prop === 'polymorphTempHp') return 0;
                return null;
            });
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'dragon', challengeRating: 5 },
                        ac: 18,
                        currentHp: 50,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 16 },
                    saving_throws: {},
                    actions: [],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.hit_points_temp).toBe(20);
        });

        it('should use formName from runtimeCreature when available', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'dragon', challengeRating: 5 },
                        formName: 'Ancient Red Dragon',
                        ac: 22,
                        currentHp: 80,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 16 },
                    saving_throws: {},
                    actions: [],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.name).toBe('Ancient Red Dragon');
        });

        it('should apply druid abilities to shapechange form', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'dragon', challengeRating: 5 },
                        ac: 18,
                        currentHp: 50,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 3, wis: 13, cha: 7 },
                    saving_throws: {},
                    actions: [],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.ability_scores.int).toBe(16);
            expect(monster.ability_scores.wis).toBe(14);
            expect(monster.ability_scores.cha).toBe(12);
        });

        it('should change action damage types to Radiant for shapechange', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'dragon', challengeRating: 5 },
                        ac: 18,
                        currentHp: 50,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 16 },
                    saving_throws: {},
                    actions: [{ name: 'Multiattack', attack_bonus: 8, damage_type_primary: 'Slashing', description: '8 Slashing damage' }],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.actions[0].damage_type_primary).toBe('Radiant');
        });

        it('should not set viewing monster when base monster not found', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'nonexistent', challengeRating: 5 },
                        ac: 18,
                        currentHp: 50,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([]);

            await handler({ name: 'DruidAlice' });

            expect(setViewingMonster).not.toHaveBeenCalled();
        });
    });

    describe('Regular monster from campaign data path', () => {
        it('should load monster by runtimeCreature.monsterIndex', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'Goblin',
                        type: 'npc',
                        monsterIndex: 'goblin',
                        ac: 15,
                        currentHp: 7,
                        size: 'Small',
                        speed: { walk: '30 ft.' },
                        saveBonuses: { dex: 4 },
                        resistances: 'cold',
                        immunities: '',
                        actions: [{ name: 'Scimitar', attack_bonus: 4, damage_type_primary: 'Slashing', description: '4 Slashing damage' }],
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'goblin',
                    name: 'Goblin',
                    armor_class: 15,
                    hit_points: 7,
                    ability_scores: { str: 8, dex: 14, con: 10, int: 8, wis: 8, cha: 8 },
                    saving_throws: { dex: { modifier: 4 } },
                    actions: [],
                    size: 'Small',
                    type: 'Humanoid',
                    challenge_rating: 0.25,
                },
            ]);

            await handler({ name: 'Goblin' });

            expect(setViewingMonster).toHaveBeenCalled();
            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.name).toBe('Goblin');
            expect(monster.armor_class).toBe(15);
            expect(monster.hit_points).toBe(7);
            expect(monster.type).toBe('npc');
            expect(monster.size).toBe('Small');
            expect(monster.speed).toEqual({ walk: '30 ft.' });
            expect(monster.saving_throws.dex.modifier).toBe(4);
            expect(monster.damage_resistances).toBe('cold');
            expect(monster.actions[0].name).toBe('Scimitar');
        });

        it('should apply druid abilities when runtimeCreature has wildShapeSource', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'Goblin',
                        type: 'npc',
                        monsterIndex: 'goblin',
                        ac: 15,
                        currentHp: 7,
                        size: 'Small',
                        wildShapeSource: 'DruidAlice',
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'goblin',
                    name: 'Goblin',
                    armor_class: 15,
                    hit_points: 7,
                    ability_scores: { str: 8, dex: 14, con: 10, int: 8, wis: 8, cha: 8 },
                    saving_throws: {},
                    actions: [],
                    size: 'Small',
                    type: 'Humanoid',
                    challenge_rating: 0.25,
                },
            ]);

            await handler({ name: 'Goblin' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.ability_scores.int).toBe(16);
            expect(monster.ability_scores.wis).toBe(14);
            expect(monster.ability_scores.cha).toBe(12);
        });

        it('should not set viewing monster when base monster not found', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'MysteryMonster',
                        type: 'npc',
                        monsterIndex: 'nonexistent',
                        ac: 10,
                        currentHp: 5,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([]);

            await handler({ name: 'MysteryMonster' });

            expect(setViewingMonster).not.toHaveBeenCalled();
        });
    });

    describe('Fallback to getMonsterData', () => {
        it('should call getMonsterData when no runtime creature matches', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'UnknownCreature',
                        type: 'npc',
                        // no wildShapeSource, polymorphSource, shapechangeSource, or monsterIndex
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            const fallbackMonster = { index: 'ogre', name: 'Ogre' };
            vi.mocked(getMonsterData).mockResolvedValue(fallbackMonster);

            await handler({ name: 'UnknownCreature' });

            expect(getMonsterData).toHaveBeenCalledWith('UnknownCreature');
            expect(setViewingMonster).toHaveBeenCalledWith(fallbackMonster);
            expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('UnknownCreature');
        });

        it('should do nothing when getMonsterData returns null', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'Ghost',
                        type: 'npc',
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(getMonsterData).mockResolvedValue(null);

            await handler({ name: 'Ghost' });

            expect(setViewingMonster).not.toHaveBeenCalled();
            expect(setViewingMonsterCreatureName).not.toHaveBeenCalled();
        });
    });

    describe('Creature name matching', () => {
        it('should match runtime creature by exact name', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'Goblin Leader',
                        type: 'npc',
                        monsterIndex: 'goblin',
                        ac: 15,
                        currentHp: 7,
                    },
                ],
            };
            vi.mocked(getCombatSummary).mockReturnValue(combatSummary);
            vi.mocked(loadMonsters).mockResolvedValue([
                {
                    index: 'goblin',
                    name: 'Goblin',
                    armor_class: 15,
                    hit_points: 7,
                    ability_scores: { str: 8, dex: 14, con: 10, int: 8, wis: 8, cha: 8 },
                    saving_throws: {},
                    actions: [],
                    size: 'Small',
                    type: 'Humanoid',
                    challenge_rating: 0.25,
                },
            ]);

            await handler({ name: 'Goblin Leader' });

            expect(setViewingMonster).toHaveBeenCalled();
        });

        it('should skip path when runtimeCreature is undefined', async () => {
            vi.mocked(getCombatSummary).mockReturnValue(null);
            const fallbackMonster = { index: 'ogre', name: 'Ogre' };
            vi.mocked(getMonsterData).mockResolvedValue(fallbackMonster);

            await handler({ name: 'Ogre' });

            expect(getMonsterData).toHaveBeenCalledWith('Ogre');
            expect(setViewingMonster).toHaveBeenCalledWith(fallbackMonster);
        });
    });

    describe('path priority', () => {
        it('should take wildShape path over polymorph when both are present', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        wildShapeSource: 'DruidAlice',
                        beastIndex: 'bear',
                        beastName: 'Brown Bear',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'dragon', challengeRating: 5 },
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
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 16 },
                    saving_throws: {},
                    actions: [],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.name).toBe('Brown Bear');
            expect(monster.type).toBe('Beast');
        });

        it('should take polymorph path over shapechange when both are present', async () => {
            const combatSummary = {
                creatures: [
                    {
                        name: 'DruidAlice',
                        polymorphSource: 'DruidAlice',
                        polymorphBeast: { index: 'bear', challengeRating: 2 },
                        ac: 14,
                        currentHp: 25,
                        shapechangeSource: 'DruidAlice',
                        shapechangeForm: { index: 'dragon', challengeRating: 5 },
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
                {
                    index: 'dragon',
                    name: 'Dragon',
                    armor_class: 18,
                    hit_points: 100,
                    ability_scores: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 16 },
                    saving_throws: {},
                    actions: [],
                    size: 'Large',
                    type: 'Dragon',
                    challenge_rating: 3,
                },
            ]);

            await handler({ name: 'DruidAlice' });

            const monster = setViewingMonster.mock.calls[0][0];
            expect(monster.name).toBe('Brown Bear');
            expect(monster.type).toBe('beast');
        });
    });
});

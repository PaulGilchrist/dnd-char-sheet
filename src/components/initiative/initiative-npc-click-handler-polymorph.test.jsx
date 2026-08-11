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

describe('createNpcClickHandler - Polymorph form path', () => {
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

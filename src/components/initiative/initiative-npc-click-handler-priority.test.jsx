// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNpcClickHandler } from './initiative-npc-click-handler.jsx';
import { loadMonsters } from '../../services/ui/dataLoader.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
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

describe('createNpcClickHandler - Path priority', () => {
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
                saving_throws: { str: { modifier: 6 }, dex: { modifier: 2 }, con: { modifier: 5 } },
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

        expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('DruidAlice');
        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.name).toBe('Brown Bear');
        expect(monster.hit_points).toBe(15);
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
                saving_throws: { str: { modifier: 6 }, dex: { modifier: 2 }, con: { modifier: 5 } },
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

        expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('DruidAlice');
        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.name).toBe('Brown Bear');
        expect(monster.type).toBe('beast');
    });

    it('should take wildShape path over both polymorph and shapechange when all three are present', async () => {
        const combatSummary = {
            creatures: [
                {
                    name: 'DruidAlice',
                    wildShapeSource: 'DruidAlice',
                    beastIndex: 'bear',
                    beastName: 'Brown Bear',
                    polymorphSource: 'DruidAlice',
                    polymorphBeast: { index: 'gargoyle', challengeRating: 2 },
                    shapechangeSource: 'DruidAlice',
                    shapechangeForm: { index: 'dragon', challengeRating: 5 },
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
            {
                index: 'gargoyle',
                name: 'Gargoyle',
                armor_class: 16,
                hit_points: 52,
                ability_scores: { str: 18, dex: 11, con: 16, int: 3, wis: 10, cha: 5 },
                saving_throws: {},
                actions: [],
                size: 'Medium',
                type: 'Elemental',
                challenge_rating: 2,
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

        expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('DruidAlice');
        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.name).toBe('Brown Bear');
        expect(monster.hit_points).toBe(15);
    });
});

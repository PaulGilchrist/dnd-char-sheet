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

describe('createNpcClickHandler - Shapechange form path', () => {
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

// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNpcClickHandler } from './initiative-npc-click-handler.jsx';
import { loadMonsters } from '../../services/ui/dataLoader.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMonsterData } from '../../services/npcs/monsterUtils.js';

vi.mock('../../services/ui/dataLoader.js', () => ({
    loadMonsters: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
}));
vi.mock('../../services/npcs/monsterUtils.js', () => ({
    getMonsterData: vi.fn(() => Promise.resolve(null)),
}));

describe('createNpcClickHandler - Creature name matching', () => {
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

    it('should merge runtime creature data with base monster and call setters with original creature name', async () => {
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
        expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('Goblin Leader');
        const monster = setViewingMonster.mock.calls[0][0];
        expect(monster.name).toBe('Goblin Leader');
        expect(monster.armor_class).toBe(15);
        expect(monster.hit_points).toBe(7);
    });

    it('should use case-sensitive matching for runtime creatures and fallback to getMonsterData on mismatch', async () => {
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
        const fallbackMonster = { index: 'ogre', name: 'Ogre' };
        vi.mocked(getMonsterData).mockResolvedValue(fallbackMonster);

        await handler({ name: 'goblin leader' });

        expect(getMonsterData).toHaveBeenCalledWith('goblin leader');
        expect(setViewingMonster).toHaveBeenCalledWith(fallbackMonster);
        expect(setViewingMonsterCreatureName).toHaveBeenCalledWith('goblin leader');
    });

});

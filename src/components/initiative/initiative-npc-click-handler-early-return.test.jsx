import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNpcClickHandler } from './initiative-npc-click-handler.jsx';
import { loadMonsters } from '../../services/ui/dataLoader.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMonsterData } from '../../services/npcs/monsterUtils.js';
import { npcToMonsterFormat } from '../../services/encounters/npcStatBlockUtils.js';

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

describe('createNpcClickHandler - early return for non-localhost', () => {
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
    });

    it('should return early without calling setters when not localhost and allowNonLocalhost is false', async () => {
        vi.mocked(loadMonsters).mockResolvedValue([]);
        vi.mocked(getCombatSummary).mockReturnValue(null);
        vi.mocked(getMonsterData).mockResolvedValue(null);
        vi.mocked(npcToMonsterFormat).mockReturnValue(null);

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
        vi.mocked(loadMonsters).mockResolvedValue([]);
        vi.mocked(getCombatSummary).mockReturnValue(null);
        vi.mocked(getMonsterData).mockResolvedValue(null);
        vi.mocked(npcToMonsterFormat).mockReturnValue(null);

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

import { handle, confirmSummonSpirit } from './summonSpiritHandler.js';

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

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
    addConcentration: vi.fn(),
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

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import { loadMonsters } from '../../../ui/dataLoader.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';

describe('summonSpiritHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue([]);
        getCombatSummary.mockReturnValue({
            creatures: [
                { name: 'TestCaster', initiative: '15', initiativeBonus: 3 },
            ],
        });
    });

    const mockPlayerStats = {
        name: 'TestCaster',
        level: 5,
        proficiency: 3,
        abilities: [{ name: 'Wisdom', bonus: 3 }],
        spellAbilities: { toHit: 6, saveDc: 13, modifier: 3 },
    };
    const mockCampaignName = 'test-campaign';

    const bestialVariants = [
        { name: 'Bestial Spirit (Air)', monsterIndex: 'bestial-spirit-air' },
        { name: 'Bestial Spirit (Land)', monsterIndex: 'bestial-spirit-land' },
        { name: 'Bestial Spirit (Water)', monsterIndex: 'bestial-spirit-water' },
    ];

    function makeAction(overrides = {}) {
        return {
            name: 'Summon Beast',
            automation: {
                type: 'summon_spirit',
                typeLabel: 'Bestial Spirit',
                baseLevel: 2,
                hpPerLevelAbove: 5,
                variants: bestialVariants,
                ...overrides.automation,
            },
            spell: { level: 2 },
            ...overrides,
        };
    }

    const mockMonsters = [
        {
            index: 'bestial-spirit-air', name: 'Bestial Spirit (Air)', type: 'beast',
            armor_class: 11, hit_points: 20, damage_resistances: [], damage_immunities: [], immunities: [],
            saving_throws: { str: { modifier: 4 }, dex: { modifier: 0 }, con: { modifier: 3 }, int: { modifier: -3 }, wis: { modifier: 2 }, cha: { modifier: -3 } },
            actions: [{
                name: "Beast's Strike",
                description: 'Melee Weapon Attack: +spell attack modifier, reach 5 ft. Hit: 1d8+2+WIS modifier Piercing damage.',
                attack_bonus: null,
                reach: '5 ft.',
                damage_dice_primary: '1d8+2+WIS modifier',
                damage_type_primary: 'piercing',
            }],
        },
        {
            index: 'bestial-spirit-land', name: 'Bestial Spirit (Land)', type: 'beast',
            armor_class: 11, hit_points: 30, damage_resistances: [], damage_immunities: [], immunities: [],
            saving_throws: { str: { modifier: 4 }, dex: { modifier: 0 }, con: { modifier: 3 }, int: { modifier: -3 }, wis: { modifier: 2 }, cha: { modifier: -3 } },
            actions: [
                {
                    name: "Beast's Strike",
                    description: 'Melee Weapon Attack: +spell attack modifier, reach 5 ft. Hit: 1d8+2+WIS modifier damage.',
                    attack_bonus: null,
                    reach: '5 ft.',
                    damage_dice_primary: '1d8+2+WIS modifier',
                    damage_type_primary: 'bludgeoning',
                },
                {
                    name: "Beast's Strike — Charge",
                    description: 'The target must succeed on a DC 20 Strength saving throw or be knocked prone.',
                    save_dc: 20,
                    save_type: 'Str',
                },
            ],
        },
        {
            index: 'bestial-spirit-water', name: 'Bestial Spirit (Water)', type: 'beast',
            armor_class: 11, hit_points: 30, damage_resistances: [], damage_immunities: [], immunities: [],
            saving_throws: { str: { modifier: 4 }, dex: { modifier: 0 }, con: { modifier: 3 }, int: { modifier: -3 }, wis: { modifier: 2 }, cha: { modifier: -3 } },
            actions: [{
                name: "Beast's Strike",
                description: 'Melee Weapon Attack: +spell attack modifier, reach 5 ft. Hit: 1d6+2+WIS modifier damage.',
                attack_bonus: null,
                reach: '5 ft.',
                damage_dice_primary: '1d6+2+WIS modifier',
                damage_type_primary: 'bludgeoning',
            }],
        },
        {
            index: 'animate-objects-medium', name: 'Animated Object (Medium)', type: 'construct',
            armor_class: 15, hit_points: 10, damage_resistances: [], damage_immunities: [], immunities: [],
            saving_throws: {}, actions: [{
                name: 'Slam',
                description: 'Melee Spell Attack: +spell attack modifier, reach 5 ft. Hit: 1d4+3 Force damage.',
                attack_bonus: null,
                reach: '5 ft.',
                damage_dice_primary: '1d4+3',
                damage_type_primary: 'force',
            }],
        },
    ];

    describe('handle', () => {
        it('returns a summonSpirit modal for multi-variant spells', async () => {
            const result = await handle(makeAction(), mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('summonSpirit');
            expect(result.payload.action).toBeDefined();
            expect(result.payload.playerStats).toBe(mockPlayerStats);
            expect(result.payload.campaignName).toBe(mockCampaignName);
        });

        it('summons directly for single-variant spells', async () => {
            loadMonsters.mockResolvedValue(mockMonsters);
            const action = makeAction({
                name: 'Fey Spirit',
                automation: { typeLabel: 'Fey Spirit', baseLevel: 3, variants: [{ name: 'Fey Spirit', monsterIndex: 'bestial-spirit-air' }] },
            });

            const result = await handle(action, mockPlayerStats, mockCampaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Fey Spirit');
        });
    });

    describe('confirmSummonSpirit', () => {
        it('adds the creature at caster initiative - 0.1 with summoned effect and concentration', async () => {
            loadMonsters.mockResolvedValue(mockMonsters);
            const combatSummary = getCombatSummary(mockCampaignName);

            const result = await confirmSummonSpirit(makeAction(), mockPlayerStats, mockCampaignName, 'Bestial Spirit (Air)');

            const added = combatSummary.creatures.find(c => c.name === 'Bestial Spirit (Air)');
            expect(added).toBeDefined();
            expect(added.initiative).toBe('14.9');
            expect(added.summonedBy).toBe('TestCaster');
            expect(added.summonSource).toBe('spell');
            expect(added.maxHp).toBe(20);
            expect(added.ac).toBe(11 + 2);

            const effect = getRuntimeValue('campaign', 'targetEffects').find(te => te.target === 'Bestial Spirit (Air)');
            expect(effect).toMatchObject({
                effect: 'summoned',
                source: 'TestCaster',
                summonSource: 'spell',
                duration: 'concentration',
            });

            expect(addConcentration).toHaveBeenCalledWith(combatSummary, 'TestCaster', 'Summon Beast', 13);
            expect(storage.set).toHaveBeenCalled();
            expect(addEntry).toHaveBeenCalledWith(mockCampaignName, expect.objectContaining({
                type: 'summons',
                characterName: 'TestCaster',
                summonName: 'Bestial Spirit',
                summonedCreatures: ['Bestial Spirit (Air)'],
            }));
            expect(result.type).toBe('popup');
        });

        it('scales AC and HP by the slot level used', async () => {
            loadMonsters.mockResolvedValue(mockMonsters);
            const combatSummary = getCombatSummary(mockCampaignName);
            const action = makeAction({ metaCtx: { slotLevel: 4 } });

            await confirmSummonSpirit(action, mockPlayerStats, mockCampaignName, 'Bestial Spirit (Air)');

            const added = combatSummary.creatures.find(c => c.name === 'Bestial Spirit (Air)');
            expect(added.ac).toBe(11 + 4);
            expect(added.maxHp).toBe(20 + 5 * (4 - 2));
        });

        it('does not scale AC/HP when automation.scale is false', async () => {
            loadMonsters.mockResolvedValue(mockMonsters);
            const combatSummary = getCombatSummary(mockCampaignName);
            const action = makeAction({
                name: 'Animate Objects',
                automation: { typeLabel: 'Animated Object', scale: false, variants: [{ name: 'Animated Object (Medium)', monsterIndex: 'animate-objects-medium' }] },
            });

            await confirmSummonSpirit(action, mockPlayerStats, mockCampaignName, 'Animated Object (Medium)');

            const added = combatSummary.creatures.find(c => c.name === 'Animated Object (Medium)');
            expect(added.ac).toBe(15);
            expect(added.maxHp).toBe(10);
        });

        it('resolves spell attack, WIS modifier, spell level and save DC placeholders', async () => {
            loadMonsters.mockResolvedValue(mockMonsters);
            const combatSummary = getCombatSummary(mockCampaignName);
            const action = makeAction({ metaCtx: { slotLevel: 3 } });

            await confirmSummonSpirit(action, mockPlayerStats, mockCampaignName, 'Bestial Spirit (Land)');

            const added = combatSummary.creatures.find(c => c.name === 'Bestial Spirit (Land)');
            expect(added.actions[0].description).toContain('+6');
            expect(added.actions[0].description).toContain('1d8+2+3');
            expect(added.actions[0].attack_bonus).toBe(6);
            expect(added.actions[1].save_dc).toBe(13);
        });

        it('returns a popup for an unknown variant', async () => {
            const result = await confirmSummonSpirit(makeAction(), mockPlayerStats, mockCampaignName, 'Unknown');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No summon variant selected.');
        });
    });
});

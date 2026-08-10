import {
    handle,
    handleTamedSurge,
    onTamedSurgeSelected,
    handleFeatsOfChaos,
    onDoubleRollSelected,
    onSurgeSelected,
    onFeatsOfChaosConsume,
} from './wildMagicSurgeHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';
import * as damageUtils from '../../../rules/combat/damageUtils.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => ({ round: 1, activeCreatureName: 'TestSorcerer' })),
}));

const surgeTable = [
    { min: 1, max: 4, effect: 'Surge effect 1' },
    { min: 5, max: 8, effect: 'Surge effect 2' },
    { min: 9, max: 12, effect: 'Surge effect 3' },
    { min: 13, max: 16, effect: 'Surge effect 4' },
    { min: 17, max: 20, effect: 'Surge effect 5' },
    { min: 21, max: 24, effect: 'Surge effect 6' },
    { min: 25, max: 28, effect: 'Surge effect 7' },
    { min: 29, max: 32, effect: 'Surge effect 8' },
    { min: 33, max: 36, effect: 'Surge effect 9' },
    { min: 37, max: 40, effect: 'Surge effect 10' },
    { min: 41, max: 44, effect: 'Surge effect 11' },
    { min: 45, max: 48, effect: 'Surge effect 12' },
    { min: 49, max: 52, effect: 'Surge effect 13' },
    { min: 53, max: 56, effect: 'Surge effect 14' },
    { min: 57, max: 60, effect: 'Surge effect 15' },
    { min: 61, max: 64, effect: 'Surge effect 16' },
    { min: 65, max: 68, effect: 'Surge effect 17' },
    { min: 69, max: 72, effect: 'Surge effect 18' },
    { min: 73, max: 76, effect: 'Surge effect 19' },
    { min: 77, max: 80, effect: 'Surge effect 20' },
    { min: 81, max: 84, effect: 'Surge effect 21' },
    { min: 85, max: 88, effect: 'Surge effect 22' },
    { min: 89, max: 92, effect: 'Surge effect 23' },
    { min: 93, max: 96, effect: 'Surge effect 24' },
    { min: 97, max: 100, effect: 'Surge effect 25' },
];

const makeAction = (auto = {}) => ({
    name: 'Wild Magic Surge',
    automation: { type: 'wild_magic_surge', ...auto },
    wildMagicSurgeTable: surgeTable,
});

const makeActionNoTable = (auto = {}) => ({
    name: 'Wild Magic Surge',
    automation: { type: 'wild_magic_surge', ...auto },
});

const makeFoCAction = (auto = {}) => ({
    name: 'Feats of Chaos',
    automation: { type: 'feats_of_chaos', ...auto },
});

const makePlayerStats = (overrides = {}) => ({
    name: 'TestSorcerer',
    ...overrides,
});

describe('wildMagicSurgeHandler', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        runtimeState.getRuntimeValue.mockReturnValue(null);
        damageUtils.getCombatContext.mockResolvedValue({ round: 1, activeCreatureName: 'TestSorcerer' });
    });

    describe('handle', () => {
        it('should return popup when already used this round', async () => {
            damageUtils.getCombatContext.mockResolvedValue({ round: 3, activeCreatureName: 'TestSorcerer' });
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'surgeUsedRound') return { round: 3, activeCreature: 'TestSorcerer' };
                return null;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('once per turn');
        });

        it('should return modal with controlled chaos when doubleRoll flag is true', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'wildMagicDoubleRoll') return true;
                return null;
            });
            vi.spyOn(global.Math, 'random').mockReturnValue(0.99);

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('wildMagicSurge');
            expect(result.payload.mode).toBe('controlledChaos');
            expect(result.payload.roll1).toBeGreaterThan(0);
            expect(result.payload.roll1).toBeLessThanOrEqual(100);
            expect(result.payload.roll2).toBeGreaterThan(0);
            expect(result.payload.roll2).toBeLessThanOrEqual(100);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'wildMagicDoubleRoll',
                false,
                'campaign',
                true,
            );
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'surgeUsedRound',
                { round: 1, activeCreature: 'TestSorcerer' },
                'campaign',
            );
        });

        it('should return info popup when roll is not 20', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);
            vi.spyOn(global.Math, 'random').mockReturnValue(0.5);

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('not a 20');
        });

        it('should return modal with roll mode when roll is 20 and table has matching entry', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);
            vi.spyOn(global.Math, 'random').mockReturnValue(0.99);

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('wildMagicSurge');
            expect(result.payload.mode).toBe('roll');
            expect(result.payload.roll).toBeGreaterThan(0);
            expect(result.payload.roll).toBeLessThanOrEqual(100);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'surgeUsedRound',
                { round: 1, activeCreature: 'TestSorcerer' },
                'campaign',
            );
        });

        it('should return info popup when roll is 20 but no surge table', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);
            vi.spyOn(global.Math, 'random').mockReturnValue(0.99);

            const result = await handle(makeActionNoTable(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('wildMagicSurge');
            expect(result.payload.surgeTable).toEqual([]);
        });

        it('should skip once-per-turn check when autoSurge is true', async () => {
            damageUtils.getCombatContext.mockResolvedValue({ round: 3, activeCreatureName: 'TestSorcerer' });
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'surgeUsedRound') return { round: 3, activeCreature: 'TestSorcerer' };
                return null;
            });
            vi.spyOn(global.Math, 'random').mockReturnValue(0.5);

            const result = await handle(
                { ...makeAction({ autoSurge: true }), name: 'Wild Magic Surge' },
                makePlayerStats(),
                'campaign',
                'map',
            );

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('roll');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'TestSorcerer',
                'surgeUsedRound',
                expect.anything(),
                'campaign',
            );
        });

        it('should skip markOncePerTurn when autoSurge is true in roll path', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);
            vi.spyOn(global.Math, 'random').mockReturnValue(0.99);

            const result = await handle(
                { ...makeAction({ autoSurge: true }), name: 'Wild Magic Surge' },
                makePlayerStats(),
                'campaign',
                'map',
            );

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('roll');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'TestSorcerer',
                'surgeUsedRound',
                expect.anything(),
                'campaign',
            );
        });

        it('should skip markOncePerTurn when autoSurge=true with doubleRoll', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'wildMagicDoubleRoll') return true;
                return null;
            });
            vi.spyOn(global.Math, 'random').mockReturnValue(0.99);

            const result = await handle(
                { ...makeAction({ autoSurge: true }), name: 'Wild Magic Surge' },
                makePlayerStats(),
                'campaign',
                'map',
            );

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('controlledChaos');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'TestSorcerer',
                'surgeUsedRound',
                expect.anything(),
                'campaign',
            );
        });

        it('should detect hasRollOnTableEffect from active effects', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'wildMagicSurgeEffects') {
                    return [{ effect: 'Roll on the surge table at the start of each turn' }];
                }
                return null;
            });

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('roll');
        });

        it('should use passives array to trigger double roll instead of flag', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);
            vi.spyOn(global.Math, 'random').mockReturnValue(0.99);

            const playerStats = makePlayerStats({
                automation: {
                    passives: [
                        { type: 'auto_effect', effect: 'wild_magic_double_roll' },
                    ],
                },
            });

            const result = await handle(makeAction(), playerStats, 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('controlledChaos');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'wildMagicDoubleRoll',
                false,
                'campaign',
                true,
            );
        });
    });

    describe('handleTamedSurge', () => {
        it('should return info popup when no uses remaining', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'tamedSurgeUses') return 0;
                return null;
            });

            const result = await handleTamedSurge(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no uses remaining');
        });

        it('should return modal with tamedSurge mode', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'tamedSurgeUses') return 1;
                return null;
            });

            const result = await handleTamedSurge(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('wildMagicSurge');
            expect(result.payload.mode).toBe('tamedSurge');
        });

        it('should default to 1 use when runtime value is null', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await handleTamedSurge(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('tamedSurge');
        });
    });

    describe('onTamedSurgeSelected', () => {
        it('should return null when no uses remaining', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'tamedSurgeUses') return 0;
                return null;
            });

            const result = await onTamedSurgeSelected(makeAction(), makePlayerStats(), 'campaign', { effect: 'Test effect' });

            expect(result).toBeNull();
        });

        it('should decrement uses and return popup with selected effect', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'tamedSurgeUses') return 1;
                return null;
            });

            const result = await onTamedSurgeSelected(makeAction(), makePlayerStats(), 'campaign', { effect: 'Test effect' });

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Tamed Surge');
            expect(result.payload.description).toContain('Test effect');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'tamedSurgeUses',
                0,
                'campaign',
                true,
            );
            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestSorcerer',
                abilityName: 'Wild Magic Surge',
            }));
        });

        it('should use default automation when action.automation is null', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'tamedSurgeUses') return 1;
                return null;
            });

            const action = { name: 'Tamed Surge', automation: null };
            const result = await onTamedSurgeSelected(action, makePlayerStats(), 'campaign', { effect: 'Test effect' });

            expect(result.type).toBe('popup');
            expect(result.payload.automation.type).toBe('wild_magic_tamed');
        });

        it('should default uses to 1 when runtime value is null/undefined', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await onTamedSurgeSelected(makeAction(), makePlayerStats(), 'campaign', { effect: 'Test effect' });

            expect(result.type).toBe('popup');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'tamedSurgeUses',
                0,
                'campaign',
                true,
            );
        });
    });

    describe('onSurgeSelected', () => {
        it('should store last surge and log to campaign log', async () => {
            const result = await onSurgeSelected(
                'Wild Magic Surge',
                makePlayerStats(),
                'campaign',
                42,
                { min: 41, max: 44, effect: 'Test surge effect' }
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('SURGE');
            expect(result.payload.description).toContain('42');
            expect(result.payload.description).toContain('Test surge effect');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'wildMagicSurgeEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        roll: 42,
                        effect: 'Test surge effect',
                    }),
                ]),
                'campaign',
                true,
            );
            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestSorcerer',
                abilityName: 'Wild Magic Surge',
                description: expect.stringContaining('42'),
            }));
        });

        it('should return null when surge already applied with same roll and effect', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'wildMagicSurgeEffects') {
                    return [
                        { roll: 42, effect: 'Test surge effect', duration: null, timestamp: 1000 },
                    ];
                }
                return null;
            });

            const result = await onSurgeSelected(
                'Wild Magic Surge',
                makePlayerStats(),
                'campaign',
                42,
                { min: 41, max: 44, effect: 'Test surge effect' }
            );

            expect(result).toBeNull();
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should use default auto when featureName is falsy', async () => {
            const result = await onSurgeSelected(
                null,
                makePlayerStats(),
                'campaign',
                50,
                { min: 49, max: 52, effect: 'Another effect' }
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('SURGE');
            expect(result.payload.automation.type).toBe('wild_magic_surge');
        });
    });

    describe('handleFeatsOfChaos', () => {
        it('should return info popup when no uses remaining', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'featsOfChaosUses') return 0;
                return null;
            });

            const result = await handleFeatsOfChaos(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no uses remaining');
        });

        it('should return popup with advantage description when uses available', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'featsOfChaosUses') return 1;
                return null;
            });

            const result = await handleFeatsOfChaos(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Advantage');
            expect(result.payload.description).toContain('Wild Magic Surge');
        });
    });

    describe('onDoubleRollSelected', () => {
        it('should return info popup when no surge table', async () => {
            const action = { featureName: 'Wild Magic Surge', surgeTable: [] };
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await onDoubleRollSelected(action, makePlayerStats(), 'campaign', 20);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Wild Magic Surge table');
        });

        it('should return info popup when surge table is undefined', async () => {
            const action = { featureName: 'Wild Magic Surge', surgeTable: undefined };
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await onDoubleRollSelected(action, makePlayerStats(), 'campaign', 20);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No Wild Magic Surge table');
        });

        it('should return info popup when no matching surge entry', async () => {
            const action = { featureName: 'Wild Magic Surge', surgeTable: [{ min: 1, max: 5, effect: 'Surge 1' }] };
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await onDoubleRollSelected(action, makePlayerStats(), 'campaign', 20);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no matching surge effect');
        });

        it('should return surge popup when matching entry found and reset runtime state', async () => {
            const action = { featureName: 'Wild Magic Surge', surgeTable: [{ min: 18, max: 20, effect: 'Big surge!' }] };
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await onDoubleRollSelected(action, makePlayerStats(), 'campaign', 20);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('SURGE');
            expect(result.payload.description).toContain('Big surge');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'wildMagicDoubleRoll',
                false,
                'campaign',
                true,
            );
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'surgeUsedRound',
                { round: 1, activeCreature: 'TestSorcerer' },
                'campaign',
            );
            expect(logService.addEntry).toHaveBeenCalledWith('campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestSorcerer',
                abilityName: 'Wild Magic Surge',
            }));
        });
    });

    describe('handleFeatsOfChaos', () => {
        it('should activate FoC when uses available', async () => {
            runtimeState.getRuntimeValue.mockImplementation((name, key) => {
                if (key === 'featsOfChaosUses') return 1;
                return null;
            });

            const result = await handleFeatsOfChaos(makeFoCAction(), makePlayerStats(), 'campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.name).toBe('Feats of Chaos');
            expect(result.payload.description).toContain('Advantage on next D20 test');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosUses',
                0,
                'campaign',
                true,
            );
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosActive',
                true,
                'campaign',
                true,
            );
        });

        it('should show no uses when already exhausted', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'featsOfChaosUses') return 0;
                return null;
            });

            const result = await handleFeatsOfChaos(makeFoCAction(), makePlayerStats(), 'campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no uses remaining');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should default uses to 1 when runtime value is null/undefined', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await handleFeatsOfChaos(makeFoCAction(), makePlayerStats(), 'campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Advantage');
        });
    });

    describe('onFeatsOfChaosConsume', () => {
        it('should deactivate FoC and return true flag when uses are 0', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'featsOfChaosUses') return 0;
                return null;
            });

            const result = await onFeatsOfChaosConsume(makeAction(), makePlayerStats(), 'campaign');

            expect(result.featsOfChaosConsumed).toBe(true);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosActive',
                false,
                'campaign',
                true,
            );
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosUses',
                expect.anything(),
                'campaign',
                true,
            );
        });

        it('should decrement uses when > 0 and deactivate FoC', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'featsOfChaosUses') return 2;
                return null;
            });

            const result = await onFeatsOfChaosConsume(makeAction(), makePlayerStats(), 'campaign');

            expect(result.featsOfChaosConsumed).toBe(true);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosUses',
                1,
                'campaign',
                true,
            );
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosActive',
                false,
                'campaign',
                true,
            );
        });

        it('should default uses to 0 when runtime value is null', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const result = await onFeatsOfChaosConsume(makeAction(), makePlayerStats(), 'campaign');

            expect(result.featsOfChaosConsumed).toBe(true);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestSorcerer',
                'featsOfChaosActive',
                false,
                'campaign',
                true,
            );
        });
    });

    describe('error handling - addEntry rejection', () => {
        it('should handle addEntry rejection in onSurgeSelected', async () => {
            logService.addEntry.mockRejectedValue(new Error('DB error'));

            const result = await onSurgeSelected(
                'Wild Magic Surge',
                makePlayerStats(),
                'campaign',
                42,
                { min: 41, max: 44, effect: 'Test surge effect' }
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('SURGE');
        });

        it('should handle addEntry rejection in onDoubleRollSelected', async () => {
            logService.addEntry.mockRejectedValue(new Error('DB error'));
            const action = { featureName: 'Wild Magic Surge', surgeTable: [{ min: 18, max: 20, effect: 'Big surge!' }] };

            const result = await onDoubleRollSelected(action, makePlayerStats(), 'campaign', 20);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('SURGE');
        });

        it('should handle addEntry rejection in onTamedSurgeSelected', async () => {
            logService.addEntry.mockRejectedValue(new Error('DB error'));
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'tamedSurgeUses') return 1;
                return null;
            });

            const result = await onTamedSurgeSelected(makeAction(), makePlayerStats(), 'campaign', { effect: 'Test effect' });

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Tamed Surge');
        });

        it('should handle addEntry rejection in handleFeatsOfChaos', async () => {
            logService.addEntry.mockRejectedValue(new Error('DB error'));
            runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
                if (key === 'featsOfChaosUses') return 1;
                return null;
            });

            const result = await handleFeatsOfChaos(makeFoCAction(), makePlayerStats(), 'campaign');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Advantage');
        });
    });
});

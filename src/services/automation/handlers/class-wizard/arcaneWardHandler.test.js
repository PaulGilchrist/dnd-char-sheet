// @improved-by-ai
import {
    handle,
} from './arcaneWardHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { getTargetFromAttacker } from '../../../rules/combat/damageUtils.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getTargetFromAttacker: vi.fn(),
}));

const campaignName = 'test-campaign';

function makeWizardStats(name, level, intBonus) {
    return {
        name,
        rules: '2024',
        level,
        abilities: [{ name: 'Intelligence', bonus: intBonus }],
    };
}

function setMocks(runtimeImpl, combatSummary = null, target = null) {
    getRuntimeValue.mockImplementation(runtimeImpl);
    if (combatSummary) getCombatSummary.mockReturnValue(combatSummary);
    if (target !== null) getTargetFromAttacker.mockReturnValue(target);
}

function wardRuntime(targetName, wardHp, wardMax, projectedDamage, targetCurrentHp, targetMaxHp) {
    return (player, key) => {
        if (key === 'arcaneWardActive') return true;
        if (key === 'arcaneWardHp') return wardHp;
        if (key === 'arcaneWardMax') return wardMax;
        if (player === targetName && key === 'projectedWardDamage') return projectedDamage;
        if (player === targetName && key === 'currentHitPoints') return targetCurrentHp;
        if (player === targetName && key === 'maxHitPoints') return targetMaxHp;
        return undefined;
    };
}

function combatContext(wizardName, targetName) {
    return {
        creatures: [
            { name: wizardName, targetName },
            { name: targetName },
        ],
        activeCreatureName: wizardName,
    };
}

describe('arcaneWardHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        describe('ward not active', () => {
            it('returns info popup directing user to cast an Abjuration spell', async () => {
                setMocks((player, key) => {
                    if (key === 'arcaneWardActive') return false;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', description: 'Create a magical ward...' },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.name).toBe('Arcane Ward');
                expect(result.payload.description).toContain('not active');
                expect(result.payload.description).toContain('Abjuration');
            });
        });

        describe('bonus action automation type', () => {
            it('returns modal to choose spell slot level', async () => {
                setMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'arcane_ward_bonus_action' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('modal');
                expect(result.modalName).toBe('arcaneWardRestore');
                expect(result.payload.action).toEqual(expect.objectContaining({ name: 'Arcane Ward' }));
            });
        });

        describe('projected ward - no combat context', () => {
            it('returns info popup when there is no combat summary', async () => {
                getCombatSummary.mockReturnValue(null);
                setMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 5;
                    if (key === 'arcaneWardMax') return 13;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.automationType).toBe('projected_ward');
                expect(result.payload.description).toContain('Arcane Ward is active');
                expect(result.payload.description).toContain('No combat context available');
            });
        });

        describe('projected ward - no target', () => {
            it('returns info popup when no target is selected', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue(null);
                setMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 8;
                    if (key === 'arcaneWardMax') return 13;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.automationType).toBe('projected_ward');
                expect(result.payload.description).toContain('No target selected');
            });
        });

        describe('projected ward - no damage', () => {
            it('returns info when projectedWardDamage is undefined', async () => {
                setMocks(
                    wardRuntime('Goblin', 8, 13, undefined, 5, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('No recent damage detected');
                expect(setRuntimeValue).not.toHaveBeenCalled();
                expect(addEntry).not.toHaveBeenCalled();
            });

            it('returns info when projectedWardDamage rawDamage is zero', async () => {
                setMocks(
                    wardRuntime('Goblin', 8, 13, { rawDamage: 0 }, 5, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('No recent damage detected');
            });
        });

        describe('projected ward - ward has no HP', () => {
            it('absorbs nothing when wardHp is 0, logs entries but makes no state changes', async () => {
                setMocks(
                    wardRuntime('Goblin', 0, 13, { rawDamage: 7 }, 5, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                // absorbed = min(7, 0) = 0, ward HP not reduced but target HP is still set (to same value)
                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 5, campaignName);
                expect(setRuntimeValue).not.toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', expect.any(Number), campaignName);
                // but logging still happens
                expect(addEntry).toHaveBeenCalledTimes(2);
                expect(addEntry).toHaveBeenNthCalledWith(
                    1,
                    campaignName,
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'TestWizard',
                        abilityName: 'Arcane Ward',
                    }),
                );
                expect(addEntry).toHaveBeenNthCalledWith(
                    2,
                    campaignName,
                    expect.objectContaining({
                        type: 'ward_absorbed',
                        targetName: 'Goblin',
                        damage: 0,
                        wizardName: 'TestWizard',
                        remainingWardHp: 0,
                    }),
                );
            });
        });

        describe('projected ward - full absorption', () => {
            it('absorbs all damage and restores target HP to max', async () => {
                setMocks(
                    wardRuntime('Goblin', 10, 15, { rawDamage: 7 }, 5, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.automationType).toBe('projected_ward');
                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 10, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 3, campaignName);
                expect(result.payload.description).toContain('All damage absorbed');
                expect(result.payload.description).toContain('absorbed 7');
            });

            it('caps target HP at maxHitPoints when restoration would exceed it', async () => {
                setMocks(
                    wardRuntime('Goblin', 10, 15, { rawDamage: 8 }, 9, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 10, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 2, campaignName);
            });

            it('absorbs exactly the ward HP when damage equals ward HP', async () => {
                setMocks(
                    wardRuntime('Goblin', 7, 15, { rawDamage: 7 }, 5, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 10, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 0, campaignName);
                expect(result.payload.description).toContain('All damage absorbed');
            });
        });

        describe('projected ward - partial absorption', () => {
            it('absorbs what ward has and lets the rest through', async () => {
                setMocks(
                    wardRuntime('Ogre', 5, 13, { rawDamage: 12 }, 8, 15),
                    combatContext('TestWizard', 'Ogre'),
                    { name: 'Ogre' },
                );

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(setRuntimeValue).toHaveBeenCalledWith('Ogre', 'currentHitPoints', 13, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 0, campaignName);
                expect(result.payload.description).toContain('absorbed 5');
                expect(result.payload.description).toContain('7 remaining damage');
            });
        });

        describe('projected ward - null target HP', () => {
            it('skips target HP restoration when currentHitPoints is null but still reduces ward and logs', async () => {
                setMocks(
                    wardRuntime('Goblin', 5, 13, { rawDamage: 4 }, null, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).not.toHaveBeenCalledWith('Goblin', 'currentHitPoints', expect.any(Number), campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 1, campaignName);
                expect(addEntry).toHaveBeenCalledTimes(2);
            });
        });

        describe('projected ward - null maxHitPoints', () => {
            it('caps target HP at currentHitPoints + absorbed when maxHitPoints is null', async () => {
                setMocks(
                    wardRuntime('Goblin', 5, 13, { rawDamage: 4 }, 8, null),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                // maxHitPoints is null, fallback is targetHp + absorbed = 8 + 4 = 12
                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 12, campaignName);
            });
        });

        describe('projected ward - logging', () => {
            it('logs ability_use and ward_absorbed entries with correct data', async () => {
                setMocks(
                    wardRuntime('Goblin', 5, 13, { rawDamage: 3 }, 6, 10),
                    combatContext('TestWizard', 'Goblin'),
                    { name: 'Goblin' },
                );

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(addEntry).toHaveBeenCalledTimes(2);
                expect(addEntry).toHaveBeenNthCalledWith(
                    1,
                    campaignName,
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'TestWizard',
                        abilityName: 'Arcane Ward',
                    }),
                );
                expect(addEntry).toHaveBeenNthCalledWith(
                    2,
                    campaignName,
                    expect.objectContaining({
                        type: 'ward_absorbed',
                        targetName: 'Goblin',
                        damage: 3,
                        wizardName: 'TestWizard',
                        remainingWardHp: 2,
                    }),
                );
            });
        });
    });
});

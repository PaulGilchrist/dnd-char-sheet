
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

function setWardMocks(getRuntimeValueImpl) {
    getRuntimeValue.mockImplementation(getRuntimeValueImpl);
}

function setCombatMocks(targetName, projectedDamage, currentHp, maxHp) {
    getCombatSummary.mockReturnValue({
        creatures: [
            { name: 'TestWizard', targetName },
            { name: targetName },
        ],
        activeCreatureName: 'TestWizard',
    });
    getTargetFromAttacker.mockReturnValue({ name: targetName });
    setWardMocks((player, key) => {
        if (key === 'arcaneWardActive') return true;
        if (key === 'arcaneWardHp') return 8;
        if (key === 'arcaneWardMax') return 13;
        if (player === targetName && key === 'projectedWardDamage') return projectedDamage;
        if (player === targetName && key === 'currentHitPoints') return currentHp;
        if (player === targetName && key === 'maxHitPoints') return maxHp;
        return undefined;
    });
}

describe('arcaneWardHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        describe('ward not active', () => {
            it('returns info popup directing user to cast an Abjuration spell', async () => {
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return false;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', description: 'Create a magical ward...' },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: expect.objectContaining({
                        type: 'automation_info',
                        name: 'Arcane Ward',
                        description: expect.stringContaining('not active'),
                    }),
                });
            });
        });

        describe('bonus action automation type', () => {
            it('returns modal to choose spell slot level', async () => {
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'arcane_ward_bonus_action' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result).toEqual({
                    type: 'modal',
                    modalName: 'arcaneWardRestore',
                    payload: { action: expect.objectContaining({ name: 'Arcane Ward' }) },
                });
            });
        });

        describe('projected ward - no combat context', () => {
            it('returns info popup when there is no combat summary', async () => {
                getCombatSummary.mockReturnValue(null);
                setWardMocks((player, key) => {
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
                setWardMocks((player, key) => {
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

                expect(result.payload.description).toContain('No target selected');
            });
        });

        describe('projected ward - no damage', () => {
            it('returns info when projectedWardDamage is undefined or zero', async () => {
                setCombatMocks('Goblin', undefined, 5, 10);

                let result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.payload.description).toContain('No recent damage detected');

                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard', targetName: 'Goblin' }, { name: 'Goblin' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 8;
                    if (key === 'arcaneWardMax') return 13;
                    if (player === 'Goblin' && key === 'projectedWardDamage') return { rawDamage: 0 };
                    return undefined;
                });

                result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(result.payload.description).toContain('No recent damage detected');
            });
        });

        describe('projected ward - full absorption', () => {
            it('absorbs all damage and restores target HP to max', async () => {
                setCombatMocks('Goblin', { rawDamage: 7 }, 5, 10);
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 10;
                    if (key === 'arcaneWardMax') return 15;
                    if (player === 'Goblin' && key === 'projectedWardDamage') return { rawDamage: 7 };
                    if (player === 'Goblin' && key === 'currentHitPoints') return 5;
                    if (player === 'Goblin' && key === 'maxHitPoints') return 10;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 10, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 3, campaignName);
                expect(result.payload.description).toContain('All damage absorbed');
                expect(result.payload.description).toContain('absorbed 7');
            });

            it('caps target HP at maxHitPoints when restoration would exceed it', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard', targetName: 'Goblin' }, { name: 'Goblin' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 10;
                    if (key === 'arcaneWardMax') return 15;
                    if (player === 'Goblin' && key === 'projectedWardDamage') return { rawDamage: 8 };
                    if (player === 'Goblin' && key === 'currentHitPoints') return 9;
                    if (player === 'Goblin' && key === 'maxHitPoints') return 10;
                    return undefined;
                });

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'currentHitPoints', 10, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 2, campaignName);
            });
        });

        describe('projected ward - partial absorption', () => {
            it('absorbs what ward has and lets the rest through', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard', targetName: 'Ogre' }, { name: 'Ogre' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue({ name: 'Ogre' });
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 5;
                    if (key === 'arcaneWardMax') return 13;
                    if (player === 'Ogre' && key === 'projectedWardDamage') return { rawDamage: 12 };
                    if (player === 'Ogre' && key === 'currentHitPoints') return 8;
                    if (player === 'Ogre' && key === 'maxHitPoints') return 15;
                    return undefined;
                });

                const result = await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).toHaveBeenCalledWith('Ogre', 'currentHitPoints', 13, campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 0, campaignName);
                expect(result.payload.description).toContain('absorbed 5');
                expect(result.payload.description).toContain('7 remaining damage');
            });
        });

        describe('projected ward - null target HP', () => {
            it('skips target HP restoration when currentHitPoints is null', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard', targetName: 'Goblin' }, { name: 'Goblin' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 5;
                    if (key === 'arcaneWardMax') return 13;
                    if (player === 'Goblin' && key === 'projectedWardDamage') return { rawDamage: 4 };
                    if (player === 'Goblin' && key === 'currentHitPoints') return null;
                    if (player === 'Goblin' && key === 'maxHitPoints') return 10;
                    return undefined;
                });

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(setRuntimeValue).not.toHaveBeenCalledWith('Goblin', 'currentHitPoints', expect.any(Number), campaignName);
                expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 1, campaignName);
            });
        });

        describe('projected ward - null maxHitPoints', () => {
            it('caps target HP at currentHitPoints + absorbed when maxHitPoints is null', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard', targetName: 'Goblin' }, { name: 'Goblin' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 5;
                    if (key === 'arcaneWardMax') return 13;
                    if (player === 'Goblin' && key === 'projectedWardDamage') return { rawDamage: 4 };
                    if (player === 'Goblin' && key === 'currentHitPoints') return 8;
                    if (player === 'Goblin' && key === 'maxHitPoints') return null;
                    return undefined;
                });

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
            it('logs ability_use and ward_absorbed entries', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestWizard', targetName: 'Goblin' }, { name: 'Goblin' }],
                    activeCreatureName: 'TestWizard',
                });
                getTargetFromAttacker.mockReturnValue({ name: 'Goblin' });
                setWardMocks((player, key) => {
                    if (key === 'arcaneWardActive') return true;
                    if (key === 'arcaneWardHp') return 5;
                    if (key === 'arcaneWardMax') return 13;
                    if (player === 'Goblin' && key === 'projectedWardDamage') return { rawDamage: 3 };
                    if (player === 'Goblin' && key === 'currentHitPoints') return 6;
                    if (player === 'Goblin' && key === 'maxHitPoints') return 10;
                    return undefined;
                });

                await handle(
                    { name: 'Arcane Ward', automation: { type: 'projected_ward' } },
                    makeWizardStats('TestWizard', 5, 3),
                    campaignName,
                );

                expect(addEntry).toHaveBeenCalledWith(
                    campaignName,
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'TestWizard',
                        abilityName: 'Arcane Ward',
                    }),
                );
                expect(addEntry).toHaveBeenCalledWith(
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

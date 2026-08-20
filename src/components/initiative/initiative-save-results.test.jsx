// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createFleshToStoneHandler,
    createPrismaticSprayIndigoHandler,
    createPrismaticSprayVioletHandler,
} from './initiative-save-result-handlers.jsx';
import * as logService from '../../services/ui/logService.js';
import { clearFleshToStonePrompt } from '../../services/combat/conditions/savePromptService.js';

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue({ id: 'log-entry-1' }),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
    clearFleshToStonePrompt: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => {
    const store = new Map();
    return {
        getRuntimeValue: vi.fn((key, prop, campaign) => {
            const k = `${key}::${prop}::${campaign ?? ''}`;
            return store.get(k) ?? null;
        }),
        setRuntimeValue: vi.fn((key, prop, value, campaign) => {
            const k = `${key}::${prop}::${campaign ?? ''}`;
            store.set(k, value);
        }),
        clearStore: vi.fn(() => store.clear()),
    };
});

import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

describe('initiative-save-result-handlers — flesh-to-stone', () => {
    let combatSummary;
    let setCombatSummary;
    let campaignName;
    let saveData;
    let conditions;
    let targetEffects;

    beforeEach(() => {
        vi.clearAllMocks();
        campaignName = 'test-campaign';
        setCombatSummary = vi.fn();
        combatSummary = {
            round: 1,
            creatures: [{ name: 'Alice', type: 'player' }],
        };
        saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
        conditions = ['restrained'];
        targetEffects = [{ target: 'Alice', effect: 'flesh_to_stone', source: 'Goblin' }];

        getRuntimeValue.mockImplementation((key, prop, _campaign) => {
            if (key === 'campaign' && prop === '_fleshToStone_Alice') return saveData;
            if (key === 'Alice' && prop === 'activeConditions') return conditions;
            if (key === 'campaign' && prop === 'targetEffects') return targetEffects;
            return null;
        });
    });

    function makeHandler() {
        return createFleshToStoneHandler(campaignName, combatSummary, setCombatSummary);
    }

    describe('early returns', () => {
        it('should return early when campaign name does not match', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName: 'other-campaign', targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should return early when combatSummary is null', async () => {
            const handler = createFleshToStoneHandler(campaignName, null, setCombatSummary);
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });

        it('should return early when result is missing', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: null },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });

        it('should return early when creature not found in combatSummary', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Bob', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });

        it('should return early when save tracking data is missing', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_fleshToStone_Alice') return null;
                return null;
            });
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });
    });

    describe('success path — less than 3 successes', () => {
        it('should increment successes and log the save result', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_fleshToStone_Alice',
                expect.objectContaining({ successes: 1 }),
                campaignName,
            );
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-flesh-to-stone',
                targetName: 'Alice',
                saveType: 'CON',
                success: true,
            }));
            expect(setCombatSummary).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should increment to 2 successes', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 1, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_fleshToStone_Alice',
                expect.objectContaining({ successes: 2 }),
                campaignName,
            );
        });
    });

    describe('success path — 3rd success (spell ends)', () => {
        it('should remove restrained condition, clean targetEffects, clear tracking, and call clearFleshToStonePrompt', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 2, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', [], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.not.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'flesh_to_stone', source: 'Goblin' }),
                ]),
                campaignName,
            );
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_fleshToStone_Alice', null, campaignName);
            expect(clearFleshToStonePrompt).toHaveBeenCalledWith(campaignName, 'Alice');
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-flesh-to-stone',
                targetName: 'Alice',
                success: true,
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'removed',
                condition: 'Restrained',
            }));
        });
    });

    describe('failure path — less than 3 failures', () => {
        it('should increment failures and log the save result', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_fleshToStone_Alice',
                expect.objectContaining({ failures: 1 }),
                campaignName,
            );
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-flesh-to-stone',
                targetName: 'Alice',
                success: false,
            }));
        });

        it('should increment to 2 failures', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 1 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_fleshToStone_Alice',
                expect.objectContaining({ failures: 2 }),
                campaignName,
            );
        });
    });

    describe('failure path — 3rd failure (petrified)', () => {
        it('should remove restrained, apply petrified, clean targetEffects, clear tracking, and call clearFleshToStonePrompt', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['petrified'], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.not.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'flesh_to_stone', source: 'Goblin' }),
                ]),
                campaignName,
            );
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_fleshToStone_Alice', null, campaignName);
            expect(clearFleshToStonePrompt).toHaveBeenCalledWith(campaignName, 'Alice');
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'applied',
                condition: 'Petrified',
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'removed',
                condition: 'Restrained',
            }));
        });

        it('should handle null activeConditions gracefully', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
            conditions = null;
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['petrified'], campaignName);
        });

        it('should handle null targetEffects gracefully', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
            targetEffects = null;
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['petrified'], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', [], campaignName);
        });
    });

    describe('name sanitization in tracking key', () => {
        it('should handle creature names with spaces in tracking key', async () => {
            const creatureSummary = {
                round: 1,
                creatures: [{ name: 'Alice the Brave', type: 'player' }],
            };
            const handler = createFleshToStoneHandler(campaignName, creatureSummary, setCombatSummary);
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_fleshToStone_Alice_the_Brave') return { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
                if (key === 'Alice the Brave' && prop === 'activeConditions') return ['restrained'];
                if (key === 'campaign' && prop === 'targetEffects') return [];
                return null;
            });

            await handler({
                detail: { campaignName, targetName: 'Alice the Brave', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_fleshToStone_Alice_the_Brave',
                expect.objectContaining({ successes: 1 }),
                campaignName,
            );
        });
    });

    describe('setCombatSummary always called', () => {
        it('should call setCombatSummary with a cloned object on success', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = setCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(combatSummary);
            expect(calledWith).not.toBe(combatSummary);
        });

        it('should call setCombatSummary with a cloned object on failure', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = setCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(combatSummary);
            expect(calledWith).not.toBe(combatSummary);
        });
    });
});

describe('initiative-save-result-handlers — prismatic-spray-indigo', () => {
    let combatSummary;
    let setCombatSummary;
    let campaignName;
    let saveData;
    let conditions;
    let targetEffects;

    beforeEach(() => {
        vi.clearAllMocks();
        campaignName = 'test-campaign';
        setCombatSummary = vi.fn();
        combatSummary = {
            round: 1,
            creatures: [{ name: 'Alice', type: 'player' }],
        };
        saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
        conditions = ['restrained'];
        targetEffects = [{ target: 'Alice', effect: 'prismatic_spray_indigo', source: 'Goblin' }];

        getRuntimeValue.mockImplementation((key, prop) => {
            if (key === 'campaign' && prop === '_prismaticSprayIndigo_Alice') return saveData;
            if (key === 'Alice' && prop === 'activeConditions') return conditions;
            if (key === 'campaign' && prop === 'targetEffects') return targetEffects;
            return null;
        });
    });

    function makeHandler() {
        return createPrismaticSprayIndigoHandler(campaignName, combatSummary, setCombatSummary);
    }

    describe('early returns', () => {
        it('should return early when campaign name does not match', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName: 'other-campaign', targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should return early when creature not found', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Bob', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });

        it('should return early when save tracking data is missing', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_prismaticSprayIndigo_Alice') return null;
                return null;
            });
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });
    });

    describe('success path — less than 3 successes', () => {
        it('should increment successes and log the save result', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_prismaticSprayIndigo_Alice',
                expect.objectContaining({ successes: 1 }),
                campaignName,
            );
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-prismatic-spray-indigo',
                targetName: 'Alice',
                saveType: 'CON',
                success: true,
            }));
        });
    });

    describe('success path — 3rd success (restrained ends)', () => {
        it('should remove restrained, clean targetEffects, clear tracking, and log both events', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 2, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', [], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.not.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'prismatic_spray_indigo', source: 'Goblin' }),
                ]),
                campaignName,
            );
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_prismaticSprayIndigo_Alice', null, campaignName);
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-prismatic-spray-indigo',
                targetName: 'Alice',
                success: true,
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'removed',
                condition: 'Restrained',
            }));
        });

        it('should handle null activeConditions gracefully', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 2, failures: 0 };
            conditions = null;
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', [], campaignName);
        });

        it('should handle non-matching targetEffects (different target)', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 2, failures: 0 };
            targetEffects = [{ target: 'Bob', effect: 'prismatic_spray_indigo', source: 'Goblin' }];
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_prismaticSprayIndigo_Alice', null, campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Bob', effect: 'prismatic_spray_indigo' }),
                ]),
                campaignName,
            );
        });
    });

    describe('failure path — less than 3 failures', () => {
        it('should increment failures and log the save result', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                '_prismaticSprayIndigo_Alice',
                expect.objectContaining({ failures: 1 }),
                campaignName,
            );
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-prismatic-spray-indigo',
                targetName: 'Alice',
                success: false,
            }));
        });
    });

    describe('failure path — 3rd failure (petrified)', () => {
        it('should remove restrained, apply petrified, clean targetEffects, clear tracking, and log events', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['petrified'], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.not.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'prismatic_spray_indigo', source: 'Goblin' }),
                ]),
                campaignName,
            );
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_prismaticSprayIndigo_Alice', null, campaignName);
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'applied',
                condition: 'Petrified',
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'removed',
                condition: 'Restrained',
            }));
        });

        it('should handle null activeConditions and targetEffects', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 2 };
            conditions = null;
            targetEffects = null;
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['petrified'], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', [], campaignName);
        });
    });

    describe('setCombatSummary always called', () => {
        it('should call setCombatSummary with a cloned object', async () => {
            saveData = { casterName: 'Goblin', dc: 15, successes: 0, failures: 0 };
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = setCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(combatSummary);
            expect(calledWith).not.toBe(combatSummary);
        });
    });
});

describe('initiative-save-result-handlers — prismatic-spray-violet', () => {
    let combatSummary;
    let setCombatSummary;
    let campaignName;
    let saveData;
    let conditions;
    let targetEffects;

    beforeEach(() => {
        vi.clearAllMocks();
        campaignName = 'test-campaign';
        setCombatSummary = vi.fn();
        combatSummary = {
            round: 1,
            creatures: [{ name: 'Alice', type: 'player' }],
        };
        saveData = { casterName: 'Goblin', dc: 15 };
        conditions = ['blinded'];
        targetEffects = [{ target: 'Alice', effect: 'prismatic_spray_violet', source: 'Goblin' }];

        getRuntimeValue.mockImplementation((key, prop, _campaign) => {
            if (key === 'campaign' && prop === '_prismaticSprayViolet_Alice') return saveData;
            if (key === 'Alice' && prop === 'activeConditions') return conditions;
            if (key === 'campaign' && prop === 'targetEffects') return targetEffects;
            return null;
        });
    });

    function makeHandler() {
        return createPrismaticSprayVioletHandler(campaignName, combatSummary, setCombatSummary);
    }

    describe('early returns', () => {
        it('should return early when campaign name does not match', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName: 'other-campaign', targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('should return early when creature not found', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Bob', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });

        it('should return early when save tracking data is missing', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === '_prismaticSprayViolet_Alice') return null;
                return null;
            });
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });
            expect(logService.addEntry).not.toHaveBeenCalled();
        });
    });

    describe('success path (blinded removed)', () => {
        it('should remove blinded, clean targetEffects, clear tracking, and log both events', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', [], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.not.arrayContaining([
                    expect.objectContaining({ target: 'Alice', effect: 'prismatic_spray_violet', source: 'Goblin' }),
                ]),
                campaignName,
            );
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_prismaticSprayViolet_Alice', null, campaignName);
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-prismatic-spray-violet',
                targetName: 'Alice',
                saveType: 'WIS',
                success: true,
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'removed',
                condition: 'Blinded',
            }));
        });

        it('should handle non-matching targetEffects (different target)', async () => {
            targetEffects = [{ target: 'Bob', effect: 'prismatic_spray_violet', source: 'Goblin' }];
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_prismaticSprayViolet_Alice', null, campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Bob', effect: 'prismatic_spray_violet' }),
                ]),
                campaignName,
            );
        });

        it('should handle null activeConditions and targetEffects', async () => {
            conditions = null;
            targetEffects = null;
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', [], campaignName);
        });
    });

    describe('failure path (banishment — incapacitated applied)', () => {
        it('should remove blinded, apply incapacitated, add banishment targetEffect, clear tracking, and log events', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['incapacitated'], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ effect: 'banishment', target: 'Alice', source: 'Goblin' }),
                ]),
                campaignName,
            );
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', '_prismaticSprayViolet_Alice', null, campaignName);
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'save_result',
                rollType: 'save-prismatic-spray-violet',
                targetName: 'Alice',
                saveType: 'WIS',
                success: false,
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'condition',
                action: 'applied',
                condition: 'Incapacitated',
            }));
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Goblin',
                abilityName: 'Prismatic Spray (Violet ray)',
            }));
        });

        it('should preserve non-banishment targetEffects when adding banishment and remove existing banishment', async () => {
            targetEffects = [
                { target: 'Bob', effect: 'prismatic_spray_violet', source: 'Goblin' },
                { effect: 'banishment', target: 'Bob', source: 'OtherCaster' },
            ];
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            const targetEffectsCall = setRuntimeValue.mock.calls.find(
                (call) => call[0] === 'campaign' && call[1] === 'targetEffects',
            );
            expect(targetEffectsCall).toBeDefined();
            const effects = targetEffectsCall[2];
            expect(effects).toHaveLength(2);
            expect(effects).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ target: 'Bob', effect: 'prismatic_spray_violet' }),
                    expect.objectContaining({ effect: 'banishment', target: 'Alice', source: 'Goblin' }),
                ]),
            );
        });

        it('should handle null activeConditions and targetEffects', async () => {
            conditions = null;
            targetEffects = null;
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeConditions', ['incapacitated'], campaignName);
            expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                expect.objectContaining({ effect: 'banishment', target: 'Alice', source: 'Goblin' }),
            ]), campaignName);
        });
    });

    describe('setCombatSummary always called', () => {
        it('should call setCombatSummary with a cloned object on success', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: true } },
            });

            expect(setCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = setCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(combatSummary);
            expect(calledWith).not.toBe(combatSummary);
        });

        it('should call setCombatSummary with a cloned object on failure', async () => {
            const handler = makeHandler();
            await handler({
                detail: { campaignName, targetName: 'Alice', result: { success: false } },
            });

            expect(setCombatSummary).toHaveBeenCalledTimes(1);
            const calledWith = setCombatSummary.mock.calls[0][0];
            expect(calledWith).toEqual(combatSummary);
            expect(calledWith).not.toBe(combatSummary);
        });
    });
});

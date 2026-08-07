import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue({ id: 1, timestamp: Date.now() }),
}));

vi.mock('../../common/buffToggle.js', () => ({
    toggleBuff: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────

import { handle, confirmZealousPresence } from './zealousPresenceHandler.js';

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';
import { toggleBuff } from '../../common/buffToggle.js';

// ── Helpers ────────────────────────────────────────────────────────

const campaignName = 'test-campaign';

function makeAction(auto = {}) {
    return {
        name: 'Zealous Presence',
        automation: {
            type: 'passive_rule',
            effect: 'zealous_presence',
            targets: 10,
            duration: 'until_start_of_next_turn',
            ...auto,
        },
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestBarbarian',
        level: 10,
        automation: { passives: [], actions: [] },
        ...overrides,
    };
}

function makeCombatSummary(creatures = []) {
    return { creatures };
}

// Default getRuntimeValue: returns null for zealousPresenceActive, undefined for everything else
function defaultGetRuntimeValue(_playerName, key, _campaignName) {
    if (key === 'zealousPresenceActive') return null;
    return undefined;
}

// ── handle() Tests ─────────────────────────────────────────────────

describe('zealousPresenceHandler.handle', () => {
    let action;
    let playerStats;

    beforeEach(() => {
        vi.clearAllMocks();

        action = makeAction();
        playerStats = makePlayerStats();

        useRuntimeState.getRuntimeValue.mockImplementation(defaultGetRuntimeValue);
        getCombatContext.mockResolvedValue(makeCombatSummary([
            { name: 'Enemy1' },
            { name: 'Enemy2' },
            { name: 'Ally1' },
        ]));
    });

    describe('already active', () => {
        it('returns info popup when zealousPresenceActive is already true', async () => {
            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return true;
                return undefined;
            });

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('Zealous Presence is already active.');
            expect(result.payload.name).toBe('Zealous Presence');
            expect(result.payload.automation).toEqual(action.automation);
            expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
            expect(getCombatContext).not.toHaveBeenCalled();
        });
    });

    describe('uses / resource management', () => {
        it('decrements uses when uses are available (uses=1, maxUses=1)', async () => {
            action.automation.uses = 1;
            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                if (key === 'zealouspresenceUses') return 1;
                return undefined;
            });

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'zealouspresenceUses',
                0,
                campaignName,
            );
        });

        it('returns popup when uses are exhausted and no recharge', async () => {
            action.automation.uses = 1;
            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                if (key === 'zealouspresenceUses') return 0;
                return undefined;
            });

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('has been used');
            expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'TestBarbarian',
                'zealouspresenceUses',
                expect.any(Number),
                campaignName,
            );
        });

        it('uses usesMax when uses is not set', async () => {
            action.automation.usesMax = 2;
            action.automation.uses = undefined;

            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                return undefined;
            });

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            // usesKey defaults to name-based key when no resourceKey
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'zealouspresenceUses',
                1,
                campaignName,
            );
        });

        it('uses custom resourceKey from automation when provided', async () => {
            action.automation.resourceKey = 'customUsesKey';
            action.automation.uses = 1;

            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                if (key === 'customUsesKey') return 1;
                return undefined;
            });

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'customUsesKey',
                0,
                campaignName,
            );
        });

        it('expend rage when recharge is long_rest_or_expend_rage and rage > 0', async () => {
            action.automation.uses = 1;
            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                if (key === 'zealouspresenceUses') return 0;
                if (key === 'ragePoints') return 3;
                return undefined;
            });
            action.automation.recharge = 'long_rest_or_expend_rage';

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'ragePoints',
                2,
                campaignName,
            );
        });

        it('returns popup when rage is 0 and recharge requires rage', async () => {
            action.automation.uses = 1;
            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                if (key === 'zealouspresenceUses') return 0;
                if (key === 'ragePoints') return 0;
                return undefined;
            });
            action.automation.recharge = 'long_rest_or_expend_rage';

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('cannot be used again');
            expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith(
                'TestBarbarian',
                'ragePoints',
                expect.any(Number),
                campaignName,
            );
        });

        it('uses playerStats._trackedResources.ragePoints as fallback', async () => {
            const stats = makePlayerStats({
                _trackedResources: { ragePoints: { current: 2 } },
            });
            action.automation.uses = 1;
            useRuntimeState.getRuntimeValue.mockImplementation((name, key, _campaign) => {
                if (key === 'zealousPresenceActive') return null;
                if (key === 'zealouspresenceUses') return 0;
                if (key === 'ragePoints') return null; // stored rage not set
                return undefined;
            });
            action.automation.recharge = 'long_rest_or_expend_rage';

            const result = await handle(action, stats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'ragePoints',
                1,
                campaignName,
            );
        });

        it('returns modal when uses is null/undefined but maxUses=0 (no resource tracking)', async () => {
            // maxUses defaults to 0 when neither usesMax nor uses is set
            useRuntimeState.getRuntimeValue.mockImplementation(defaultGetRuntimeValue);

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('creature target gathering', () => {
        it('returns modal with creatureTargets excluding self', async () => {
            getCombatContext.mockResolvedValue(makeCombatSummary([
                { name: 'TestBarbarian' },
                { name: 'Enemy1' },
                { name: 'Ally1' },
            ]));

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('zealousPresenceTarget');
            expect(result.payload.creatureTargets).toEqual([
                { name: 'Enemy1' },
                { name: 'Ally1' },
            ]);
        });

        it('returns modal with empty creatureTargets when no other creatures', async () => {
            getCombatContext.mockResolvedValue(makeCombatSummary([
                { name: 'TestBarbarian' },
            ]));

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.creatureTargets).toEqual([]);
        });

        it('returns modal with all non-self creatures when self not in list', async () => {
            getCombatContext.mockResolvedValue(makeCombatSummary([
                { name: 'Enemy1' },
                { name: 'Enemy2' },
            ]));

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.creatureTargets).toEqual([
                { name: 'Enemy1' },
                { name: 'Enemy2' },
            ]);
        });

        it('passes maxTargets from automation config', async () => {
            action.automation.targets = 5;

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.payload.maxTargets).toBe(5);
        });

        it('defaults maxTargets to 10 when not specified', async () => {
            delete action.automation.targets;

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.payload.maxTargets).toBe(10);
        });

        it('passes action and playerStats into payload', async () => {
            const result = await handle(action, playerStats, campaignName, null);

            expect(result.payload.action).toEqual(action);
            expect(result.payload.playerStats).toEqual(playerStats);
            expect(result.payload.campaignName).toBe(campaignName);
        });

        it('handles null/missing combatSummary gracefully', async () => {
            getCombatContext.mockResolvedValue(null);

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.creatureTargets).toEqual([]);
        });

        it('handles combatSummary with missing creatures property', async () => {
            getCombatContext.mockResolvedValue({});

            const result = await handle(action, playerStats, campaignName, null);

            expect(result.type).toBe('modal');
            expect(result.payload.creatureTargets).toEqual([]);
        });
    });
});

// ── confirmZealousPresence() Tests ─────────────────────────────────

describe('zealousPresenceHandler.confirmZealousPresence', () => {
    let action;
    let playerStats;

    beforeEach(() => {
        vi.clearAllMocks();

        action = makeAction();
        playerStats = makePlayerStats();

        useRuntimeState.getRuntimeValue.mockReturnValue(null);
        useRuntimeState.setRuntimeValue.mockResolvedValue(undefined);
        toggleBuff.mockReturnValue({ isActive: true });
        addExpiration.mockReturnValue(undefined);
        addEntry.mockResolvedValue({ id: 1 });
    });

    describe('activation', () => {
        it('sets zealousPresenceActive to true', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1']);

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'zealousPresenceActive',
                true,
                campaignName,
            );
        });

        it('applies buff to each selected target', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1', 'Enemy2']);

            expect(toggleBuff).toHaveBeenCalledWith(
                'Enemy1',
                'Zealous Presence',
                {
                    effect: 'advantage_attacks_and_saves',
                    duration: 'until_start_of_next_turn',
                },
                campaignName,
            );
            expect(toggleBuff).toHaveBeenCalledWith(
                'Enemy2',
                'Zealous Presence',
                {
                    effect: 'advantage_attacks_and_saves',
                    duration: 'until_start_of_next_turn',
                },
                campaignName,
            );
        });

        it('registers expiration for each target', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1', 'Enemy2']);

            expect(addExpiration).toHaveBeenCalledWith(
                'TestBarbarian',
                'Enemy1',
                [
                    { type: 'remove_active_buff', buffName: 'Zealous Presence' },
                    { type: 'clear_runtime_value', creatureName: 'TestBarbarian', key: 'zealousPresenceActive' },
                ],
                campaignName,
                undefined,
                'TestBarbarian',
            );
            expect(addExpiration).toHaveBeenCalledWith(
                'TestBarbarian',
                'Enemy2',
                [
                    { type: 'remove_active_buff', buffName: 'Zealous Presence' },
                    { type: 'clear_runtime_value', creatureName: 'TestBarbarian', key: 'zealousPresenceActive' },
                ],
                campaignName,
                undefined,
                'TestBarbarian',
            );
        });

        it('logs an ability_use entry', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1', 'Ally1']);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestBarbarian',
                abilityName: 'Zealous Presence',
                description: expect.stringContaining('Enemy1, Ally1'),
            }));
        });

        it('returns popup with confirmation details', async () => {
            const result = await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1', 'Enemy2']);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Zealous Presence');
            expect(result.payload.automationType).toBe('passive_rule');
            expect(result.payload.description).toContain('activated');
            expect(result.payload.description).toContain('2 target(s)');
            expect(result.payload.description).toContain('Enemy1, Enemy2');
            expect(result.payload.automation).toEqual(action.automation);
        });

        it('respects max targets from automation config', async () => {
            action.automation.targets = 2;

            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1', 'Enemy2', 'Enemy3']);

            expect(toggleBuff).toHaveBeenCalledTimes(2);
            expect(toggleBuff).toHaveBeenCalledWith('Enemy1', 'Zealous Presence', expect.any(Object), campaignName);
            expect(toggleBuff).toHaveBeenCalledWith('Enemy2', 'Zealous Presence', expect.any(Object), campaignName);
            expect(toggleBuff).not.toHaveBeenCalledWith('Enemy3', expect.anything(), expect.anything(), expect.anything());
        });

        it('defaults max targets to 10 when not specified', async () => {
            delete action.automation.targets;

            const manyTargets = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11'];
            await confirmZealousPresence(action, playerStats, campaignName, manyTargets);

            expect(toggleBuff).toHaveBeenCalledTimes(10);
        });

        it('handles empty targetNames array', async () => {
            const result = await confirmZealousPresence(action, playerStats, campaignName, []);

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'zealousPresenceActive',
                true,
                campaignName,
            );
            expect(toggleBuff).not.toHaveBeenCalled();
            expect(addExpiration).not.toHaveBeenCalled();
            expect(result.payload.description).toContain('0 target(s)');
            expect(result.payload.description).toContain('none');
        });

        it('handles undefined targetNames as empty array', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, undefined);

            expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'zealousPresenceActive',
                true,
                campaignName,
            );
            expect(toggleBuff).not.toHaveBeenCalled();
        });

        it('uses custom duration from automation when provided', async () => {
            action.automation.duration = 'one_round';

            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1']);

            expect(toggleBuff).toHaveBeenCalledWith(
                'Enemy1',
                'Zealous Presence',
                {
                    effect: 'advantage_attacks_and_saves',
                    duration: 'one_round',
                },
                campaignName,
            );
        });

        it('falls back to default duration when not in automation', async () => {
            delete action.automation.duration;

            await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1']);

            expect(toggleBuff).toHaveBeenCalledWith(
                'Enemy1',
                'Zealous Presence',
                {
                    effect: 'advantage_attacks_and_saves',
                    duration: 'until_start_of_next_turn',
                },
                campaignName,
            );
        });

        it('logs description with "no one" when no targets selected', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, []);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('to no one'),
            }));
        });

        it('logs description with target list when targets selected', async () => {
            await confirmZealousPresence(action, playerStats, campaignName, ['Goblin1', 'Goblin2']);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Goblin1, Goblin2'),
            }));
        });

        it('handles addEntry promise rejection gracefully', async () => {
            addEntry.mockRejectedValue(new Error('Log service unavailable'));

            const spy = vi.spyOn(console, 'error').mockReturnValue(undefined);

            const result = await confirmZealousPresence(action, playerStats, campaignName, ['Enemy1']);

            expect(result.type).toBe('popup');
            expect(spy).toHaveBeenCalledWith('[zealousPresence] Error:', expect.any(Error));

            spy.mockRestore();
        });
    });
});

// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './psychicTeleportationHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';
import * as automationService from '../../../combat/automation/automationService.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

const campaignName = 'test-campaign';
const playerName = 'TestSorcerer';

function stubRandom(value) {
    Object.defineProperty(globalThis.Math, 'random', {
        value: () => value,
        writable: true,
        configurable: true,
    });
}

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        level: 9,
        abilities: [
            { name: 'Dexterity', bonus: 4 },
            { name: 'Intelligence', bonus: 3 },
        ],
        proficiency: 3,
        _trackedResources: { psionicEnergy: { max: 8 } },
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Soul Blades',
        automation: {
            type: 'auto_effect',
            effect: 'psychic_teleportation',
            trigger: 'psychic_teleportation',
            uses: '1',
            recharge: 'short_rest',
            ...overrides.automation,
        },
        ...overrides,
    };
}

describe('psychicTeleportationHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        runtimeState.getRuntimeValue.mockImplementation(() => undefined);
        automationService.evaluateAutoExpression.mockReturnValue(8);
        runtimeState.setRuntimeValue.mockResolvedValue(undefined);
        logService.addEntry.mockResolvedValue(undefined);
        stubRandom(0);
    });

    describe('when psionic energy is available', () => {
        beforeEach(() => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => 5);
            automationService.evaluateAutoExpression.mockReturnValue(8);
        });

        it('returns popup with teleport description including distance and remaining energy', async () => {
            stubRandom(0.875);
            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Soul Blades');
            expect(result.payload.description).toContain('Psionic Energy');
            expect(result.payload.description).toContain('Teleport');
            expect(result.payload.description).toContain('80 feet');
            expect(result.payload.description).toContain('4/8');
            expect(result.payload.automation).toEqual(makeAction().automation);
        });

        it('uses action name fallback when action has no name', async () => {
            const action = { automation: makeAction().automation };
            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result.payload.name).toBe('Psychic Teleportation');
            expect(result.payload.description).toContain('Psychic Teleportation');
        });

        it('spends one psionic energy via setRuntimeValue', async () => {
            await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'psionicEnergy',
                4,
                campaignName,
            );
        });

        it('logs the ability use via addEntry', async () => {
            stubRandom(0.875);
            await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: playerName,
                abilityName: 'Soul Blades',
                description: expect.stringContaining('80 feet'),
            }));
        });

        it('uses default max of 6 when runtime value is undefined and tracked resources config is missing', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => undefined);
            automationService.evaluateAutoExpression.mockReturnValue(8);

            const playerStats = makePlayerStats({ _trackedResources: undefined });
            const result = await handle(makeAction(), playerStats, campaignName, null);

            expect(result.payload.description).toContain('5/6');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'psionicEnergy',
                5,
                campaignName,
            );
        });

        it('uses default max of 6 when tracked resources is null', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => undefined);
            automationService.evaluateAutoExpression.mockReturnValue(8);

            const playerStats = makePlayerStats({ _trackedResources: null });
            const result = await handle(makeAction(), playerStats, campaignName, null);

            expect(result.payload.description).toContain('5/6');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'psionicEnergy',
                5,
                campaignName,
            );
        });

        it('uses tracked resource max when runtime value is undefined', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => undefined);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('7/8');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'psionicEnergy',
                7,
                campaignName,
            );
        });

        it('uses correct teleport distance when die size differs', async () => {
            automationService.evaluateAutoExpression.mockReturnValue(6);
            stubRandom(0.834);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('60 feet');
            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Rolled 6 for 6'),
            }));
        });

        it('uses correct teleport distance when die size is 1', async () => {
            automationService.evaluateAutoExpression.mockReturnValue(1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('10 feet');
        });
    });

    describe('when psionic energy is zero', () => {
        beforeEach(() => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => 0);
        });

        it('returns popup indicating no energy remaining', async () => {
            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No Psionic Energy remaining');
            expect(result.payload.description).toContain('Recharges on a Short or Long Rest');
        });

        it('does not call setRuntimeValue', async () => {
            await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('does not call addEntry', async () => {
            await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(logService.addEntry).not.toHaveBeenCalled();
        });
    });

    describe('when psionic energy is negative', () => {
        it('returns popup indicating no energy remaining', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => -1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No Psionic Energy remaining');
        });

        it('does not call setRuntimeValue or addEntry', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => -3);

            await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
            expect(logService.addEntry).not.toHaveBeenCalled();
        });
    });

    describe('when addEntry fails', () => {
        it('does not throw (fire-and-forget logging)', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => 5);
            automationService.evaluateAutoExpression.mockReturnValue(8);
            runtimeState.setRuntimeValue.mockResolvedValue(undefined);
            const testError = new Error('Log service unavailable');
            logService.addEntry.mockRejectedValue(testError);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('still spends psionic energy even when logging fails', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => 5);
            automationService.evaluateAutoExpression.mockReturnValue(8);
            runtimeState.setRuntimeValue.mockResolvedValue(undefined);
            logService.addEntry.mockRejectedValue(new Error('Log service unavailable'));

            await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                'psionicEnergy',
                4,
                campaignName,
            );
        });
    });

    describe('when evaluateAutoExpression returns 0', () => {
        it('produces a teleport distance of 10 feet (minimum)', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => 5);
            automationService.evaluateAutoExpression.mockReturnValue(0);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('10 feet');
        });
    });
});

// @cleaned-by-ai
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

        it('uses default max of 6 when runtime value is undefined and tracked resources config is missing', async () => {
            runtimeState.getRuntimeValue.mockImplementation((_player, _key, _campaign) => undefined);
            automationService.evaluateAutoExpression.mockReturnValue(8);

            const playerStats = makePlayerStats({ _trackedResources: undefined });
            const result = await handle(makeAction(), playerStats, campaignName, null);

            expect(result.payload.description).toContain('5/6');
        });

        it.each([
            { dieSize: 8, random: 0.875, expectedDistance: '80 feet' },
            { dieSize: 6, random: 0.834, expectedDistance: '60 feet' },
            { dieSize: 1, random: 0, expectedDistance: '10 feet' },
        ])('uses correct teleport distance based on die size ($dieSize-sided die)', async ({ dieSize, random, expectedDistance }) => {
            automationService.evaluateAutoExpression.mockReturnValue(dieSize);
            stubRandom(random);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain(expectedDistance);
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
    });
});

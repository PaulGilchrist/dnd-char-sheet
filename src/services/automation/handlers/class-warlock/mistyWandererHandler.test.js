// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle, confirmMistyWanderer } from './mistyWandererHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn().mockImplementation(async () => {}),
}));

vi.mock('../../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { evaluateAutoExpression } = await import('../../../combat/automation/automationExpressions.js');

function makeAction(overrides = {}) {
    return {
        name: 'Misty Wanderer',
        description: 'Cast Misty Step without spell slot.',
        automation: {
            type: 'misty_wanderer',
            uses_expression: 'WIS modifier_min_1',
            recharge: 'long_rest',
            range: '5_ft',
            casting_time: '1 bonus action',
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'Test Character',
        abilities: [
            { name: 'Strength', bonus: 0 },
            { name: 'Dexterity', bonus: 0 },
            { name: 'Constitution', bonus: 0 },
            { name: 'Intelligence', bonus: 0 },
            { name: 'Wisdom', bonus: 3 },
            { name: 'Charisma', bonus: 0 },
        ],
        ...overrides,
    };
}

describe('mistyWandererHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        evaluateAutoExpression.mockReturnValue(3);
    });

    describe('handle', () => {
        it('returns modal with payload when free casts are available', async () => {
            getRuntimeValue.mockReturnValue(3);

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('mistyWanderer');
            expect(result.payload.usesMax).toBe(3);
            expect(result.payload.action).toBeDefined();
            expect(result.payload.playerStats).toBeDefined();
            expect(result.payload.campaignName).toBe('campaign');
        });

        it('returns info popup when no free casts remaining', async () => {
            getRuntimeValue.mockReturnValue(0);

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Misty Wanderer');
            expect(result.payload.description).toBe('No free casts remaining. Finish a Long Rest to regain them.');
            expect(result.payload.automation).toBeDefined();
        });

        it('falls back to usesMax of 1 when expression evaluation returns falsy', async () => {
            evaluateAutoExpression.mockReturnValue(null);
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), 'campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.usesMax).toBe(1);
        });

        it('evaluates custom uses_expression from automation config', async () => {
            evaluateAutoExpression.mockReturnValue(5);
            getRuntimeValue.mockReturnValue(5);

            const customAction = makeAction({ automation: { uses_expression: 'WIS modifier' } });

            const result = await handle(customAction, makePlayerStats(), 'campaign', 'map');

            expect(result.payload.usesMax).toBe(5);
            expect(evaluateAutoExpression).toHaveBeenCalledWith('WIS modifier', expect.any(Object));
        });

        it('uses custom feature name for the runtime key', async () => {
            getRuntimeValue.mockReturnValue(2);

            const customAction = makeAction({ name: 'Shadow Blink' });

            const result = await handle(customAction, makePlayerStats(), 'campaign', 'map');

            expect(result.payload.usesMax).toBe(3);
            expect(getRuntimeValue).toHaveBeenCalledWith(
                'Test Character',
                '_Shadow_Blink_freeCastCount',
                'campaign',
            );
        });
    });

    describe('confirmMistyWanderer', () => {
        it('decrements counter and returns success popup without ally', async () => {
            getRuntimeValue.mockReturnValue(3);

            const result = await confirmMistyWanderer(makeAction(), makePlayerStats(), 'campaign', false, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Test Character',
                '_Misty_Wanderer_freeCastCount',
                2,
                'campaign',
            );
            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Misty Wanderer');
            expect(result.payload.description).toBe('Misty Wanderer: Cast Misty Step (2 remaining).');
            expect(result.payload.triggerMistyStep).toBe(true);
            expect(result.payload.automation).toBeDefined();
        });

        it('includes ally description when bringing an ally', async () => {
            getRuntimeValue.mockReturnValue(3);

            const result = await confirmMistyWanderer(makeAction(), makePlayerStats(), 'campaign', true, 'Ally Name');

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Test Character',
                '_Misty_Wanderer_freeCastCount',
                2,
                'campaign',
            );
            expect(result.payload.description).toBe(
                'Misty Wanderer: Cast Misty Step (2 remaining). Brought Ally Name to an unoccupied space within 5 feet of your destination.',
            );
        });

        it('omits ally text when bringAlly is true but allyName is null', async () => {
            getRuntimeValue.mockReturnValue(3);

            const result = await confirmMistyWanderer(makeAction(), makePlayerStats(), 'campaign', true, null);

            expect(result.payload.description).toBe('Misty Wanderer: Cast Misty Step (2 remaining).');
            expect(result.payload.description).not.toContain('Brought');
        });

        it('returns info popup when no free casts remaining', async () => {
            getRuntimeValue.mockReturnValue(0);

            const result = await confirmMistyWanderer(makeAction(), makePlayerStats(), 'campaign', false, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('No free casts remaining. Finish a Long Rest to regain them.');
            expect(result.payload.triggerMistyStep).toBeUndefined();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('decrements to 0 remaining and reports correctly', async () => {
            getRuntimeValue.mockReturnValue(1);

            const result = await confirmMistyWanderer(makeAction(), makePlayerStats(), 'campaign', false, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Test Character',
                '_Misty_Wanderer_freeCastCount',
                0,
                'campaign',
            );
            expect(result.payload.description).toBe('Misty Wanderer: Cast Misty Step (0 remaining).');
        });

        it('uses custom feature name in the output', async () => {
            getRuntimeValue.mockReturnValue(2);

            const customAction = makeAction({ name: 'Custom Feature' });

            const result = await confirmMistyWanderer(customAction, makePlayerStats(), 'campaign', false, null);

            expect(result.payload.name).toBe('Custom Feature');
            expect(result.payload.description).toBe('Custom Feature: Cast Misty Step (1 remaining).');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Test Character',
                '_Custom_Feature_freeCastCount',
                1,
                'campaign',
            );
        });
    });
});

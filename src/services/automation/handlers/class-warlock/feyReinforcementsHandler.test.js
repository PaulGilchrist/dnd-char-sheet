// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handle, confirmFeyReinforcement } from './feyReinforcementsHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

const { getRuntimeValue, setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');

const campaignName = 'test-campaign';
const playerName = 'TestCharacter';

function makeAction(overrides = {}) {
    return {
        name: 'Fey Reinforcements',
        description: 'Cast Summon Fey without Material component.',
        automation: {
            type: 'fey_reinforcements',
            spell: 'Summon Fey',
            usesMax: 1,
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        ...overrides,
    };
}

function mockFreeCastCount(value) {
    getRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key.includes('_freeCastCount')) return value;
        return null;
    });
}

// ── handle ────────────────────────────────────────────────────────

describe('feyReinforcementsHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('handle', () => {
        it('returns modal when free casts are available', async () => {
            mockFreeCastCount(1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('feyReinforcements');
            expect(result.payload.action).toEqual(expect.objectContaining({ name: 'Fey Reinforcements' }));
            expect(result.payload.playerStats).toEqual(expect.objectContaining({ name: playerName }));
            expect(result.payload.campaignName).toBe(campaignName);
            expect(result.payload.noConcentrationOption).toBe(true);
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('returns modal when free cast count is greater than 1', async () => {
            mockFreeCastCount(3);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('feyReinforcements');
        });

        it('returns modal when count falls back to usesMax (runtime value is null)', async () => {
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('feyReinforcements');
        });

        it('returns modal when count is a positive string that coerces to a number', async () => {
            mockFreeCastCount('2');

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
        });

        it('returns popup when no free casts remain', async () => {
            mockFreeCastCount(0);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Fey Reinforcements');
            expect(result.payload.description).toBe('No free casts remaining. Finish a Long Rest to regain them.');
            expect(result.payload.automation).toEqual(makeAction().automation);
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('returns popup when free cast count is negative', async () => {
            mockFreeCastCount(-1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No free casts remaining');
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('returns modal when count is NaN (NaN <= 0 is false in JS)', async () => {
            mockFreeCastCount(NaN);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
        });

        it('returns modal when count is a positive float less than 1', async () => {
            mockFreeCastCount(0.5);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
        });

        it('returns popup when count is a negative string', async () => {
            mockFreeCastCount('-1');

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
        });

        it('falls back to usesMax when runtime value is null and usesMax is defined', async () => {
            getRuntimeValue.mockReturnValue(null);

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
        });

        it('uses feature name from action.name for the runtime key', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ name: 'Custom Fey Power' });

            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(getRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Custom_Fey_Power_freeCastCount',
                campaignName
            );
        });

        it('uses default name "Fey Reinforcements" when action.name is undefined', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ name: undefined });

            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(getRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                campaignName
            );
        });

        it('uses default name when action is missing name entirely', async () => {
            mockFreeCastCount(1);
            const action = { automation: { type: 'fey_reinforcements', usesMax: 1 } };

            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(getRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                campaignName
            );
        });
    });

    // ── confirmFeyReinforcement ────────────────────────────────────

    describe('confirmFeyReinforcement', () => {
        it('decrements counter and returns info popup with noConcentration=false', async () => {
            mockFreeCastCount(1);

            const result = await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                0,
                campaignName
            );
            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Fey Reinforcements');
            expect(result.payload.description).toContain('Free cast of Summon Fey');
            expect(result.payload.description).toContain('(0 remaining)');
            expect(result.payload.description).not.toContain('Does not require Concentration');
            expect(result.payload.description).not.toContain('Duration: 1 minute');
            expect(result.payload.automation.noConcentration).toBe(false);
            expect(result.payload.automation.type).toBe('fey_reinforcements');
            expect(result.payload.automation.spell).toBe('Summon Fey');
        });

        it('decrements counter and includes concentration info when noConcentration=true', async () => {
            mockFreeCastCount(1);

            const result = await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, true);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                0,
                campaignName
            );
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Does not require Concentration');
            expect(result.payload.description).toContain('Duration: 1 minute');
            expect(result.payload.automation.noConcentration).toBe(true);
        });

        it('returns info popup when no free casts remain', async () => {
            mockFreeCastCount(0);

            const result = await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Fey Reinforcements');
            expect(result.payload.description).toBe('No free casts remaining. Finish a Long Rest to regain them.');
            expect(result.payload.automation).toEqual(makeAction().automation);
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('returns info popup when free cast count is negative', async () => {
            mockFreeCastCount(-2);

            const result = await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No free casts remaining');
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('uses correct runtime key derived from custom action name', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ name: 'Custom Fey Power' });

            await confirmFeyReinforcement(action, makePlayerStats(), campaignName, false);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Custom_Fey_Power_freeCastCount',
                0,
                campaignName
            );
        });

        it('uses default name runtime key when action.name is undefined', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ name: undefined });

            await confirmFeyReinforcement(action, makePlayerStats(), campaignName, false);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                0,
                campaignName
            );
        });

        it('uses custom spell name from automation when provided', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ automation: { spell: 'Summon Greater Fey' } });

            const result = await confirmFeyReinforcement(action, makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('Free cast of Summon Greater Fey');
            expect(result.payload.automation.spell).toBe('Summon Greater Fey');
        });

        it('uses default spell name when automation.spell is undefined', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ automation: { spell: undefined } });

            const result = await confirmFeyReinforcement(action, makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('Free cast of Summon Fey');
        });

        it('passes through original automation fields in the result', async () => {
            mockFreeCastCount(1);
            const action = makeAction({
                automation: { type: 'fey_reinforcements', spell: 'Summon Fey', usesMax: 1, extraField: 'value' },
            });

            const result = await confirmFeyReinforcement(action, makePlayerStats(), campaignName, true);

            expect(result.payload.automation.type).toBe('fey_reinforcements');
            expect(result.payload.automation.extraField).toBe('value');
            expect(result.payload.automation.noConcentration).toBe(true);
        });

        it('decrements from usesMax when runtime value is null', async () => {
            getRuntimeValue.mockReturnValue(null);

            await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                0,
                campaignName
            );
        });

        it('decrements by 1 regardless of current count value', async () => {
            mockFreeCastCount(5);

            await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Fey_Reinforcements_freeCastCount',
                4,
                campaignName
            );
        });

        it('includes remaining count in description after decrement', async () => {
            mockFreeCastCount(3);

            const result = await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('(2 remaining)');
        });
    });
});

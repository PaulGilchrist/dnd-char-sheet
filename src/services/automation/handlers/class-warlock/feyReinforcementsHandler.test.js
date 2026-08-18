// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
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
        });

        it('returns popup when no free casts remain', async () => {
            mockFreeCastCount(0);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Fey Reinforcements');
            expect(result.payload.description).toBe('No free casts remaining. Finish a Long Rest to regain them.');
            expect(result.payload.automation).toEqual(makeAction().automation);
        });

        it('falls back to usesMax when runtime value is null', async () => {
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
        });

        it('uses feature name from action.name for the runtime key', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ name: 'Custom Fey Power' });

            await handle(action, makePlayerStats(), campaignName);

            expect(getRuntimeValue).toHaveBeenCalledWith(
                playerName,
                '_Custom_Fey_Power_freeCastCount',
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

        it('includes concentration info when noConcentration=true', async () => {
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

        it('uses custom spell name from automation when provided', async () => {
            mockFreeCastCount(1);
            const action = makeAction({ automation: { spell: 'Summon Greater Fey' } });

            const result = await confirmFeyReinforcement(action, makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('Free cast of Summon Greater Fey');
            expect(result.payload.automation.spell).toBe('Summon Greater Fey');
        });

        it('includes remaining count in description after decrement', async () => {
            mockFreeCastCount(3);

            const result = await confirmFeyReinforcement(makeAction(), makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('(2 remaining)');
        });
    });
});

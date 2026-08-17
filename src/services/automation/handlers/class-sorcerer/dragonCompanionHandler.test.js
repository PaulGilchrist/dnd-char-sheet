// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle, confirmDragonCompanion, modalName, confirmType } from './dragonCompanionHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

const campaignName = 'test-campaign';

function makeAction(overrides = {}) {
    return {
        name: 'Dragon Companion',
        automation: { type: 'dragon_companion', action: 'action', spell: 'Summon Dragon', usesMax: 1, recharge: 'long_rest', ...overrides.automation },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'SorcererBoy',
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.getRuntimeValue.mockReturnValue(null);
    runtimeState.setRuntimeValue.mockResolvedValue(undefined);
});

describe('dragonCompanionHandler', () => {
    describe('exports', () => {
        it('exports modalName as dragonCompanion', () => {
            expect(modalName).toBe('dragonCompanion');
        });

        it('exports confirmType as dragon_companion_confirm', () => {
            expect(confirmType).toBe('dragon_companion_confirm');
        });
    });

    describe('handle', () => {
        it('returns popup when no uses remaining (count 0)', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Dragon Companion');
            expect(result.payload.description).toContain('No free casts remaining');
            expect(result.payload.description).toContain('Long Rest');
            expect(result.payload.automation).toEqual(makeAction().automation);
        });

        it('returns popup when runtime value is negative', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(-1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No free casts remaining');
        });

        it('returns modal when uses are available', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const action = makeAction();
            const playerStats = makePlayerStats();
            const result = await handle(action, playerStats, campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('dragonCompanion');
            expect(result.payload.noConcentrationOption).toBe(true);
            expect(result.payload.action).toBe(action);
            expect(result.payload.playerStats).toBe(playerStats);
            expect(result.payload.campaignName).toBe(campaignName);
        });

        it('falls through to usesMax when runtime value is null', async () => {
            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
        });

        it('uses custom action name in popup when runtime value is depleted', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const action = makeAction({ name: 'Custom Dragon' });
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.payload.name).toBe('Custom Dragon');
            expect(result.payload.description).toContain('No free casts remaining');
        });
    });

    describe('confirmDragonCompanion', () => {
        it('decrements counter and returns success popup', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const result = await confirmDragonCompanion(makeAction(), makePlayerStats(), campaignName, false);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Dragon Companion');
            expect(result.payload.description).toContain('Free cast of Summon Dragon (0 remaining)');
            expect(result.payload.description).not.toContain('Does not require Concentration');
            expect(result.payload.description).not.toContain('Duration: 1 minute');
            expect(result.payload.description).toContain('no spell slot or material components');
            expect(result.payload.automation.type).toBe('dragon_companion');
            expect(result.payload.automation.noConcentration).toBe(false);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'SorcererBoy',
                '_Dragon_Companion_freeCastCount',
                0,
                campaignName
            );
        });

        it('includes no-concentration info when noConcentration=true', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const result = await confirmDragonCompanion(makeAction(), makePlayerStats(), campaignName, true);

            expect(result.payload.description).toContain('Does not require Concentration');
            expect(result.payload.description).toContain('Duration: 1 minute');
            expect(result.payload.automation.noConcentration).toBe(true);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalled();
        });

        it('returns error popup and does not decrement when no uses remaining', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const result = await confirmDragonCompanion(makeAction(), makePlayerStats(), campaignName, false);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No free casts remaining');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('uses custom spell name from automation', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const action = makeAction({ automation: { spell: 'Call Wyrm' } });
            const result = await confirmDragonCompanion(action, makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('Free cast of Call Wyrm');
        });

        it('uses custom action name in popup description', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const action = makeAction({ name: 'Custom Dragon' });
            const result = await confirmDragonCompanion(action, makePlayerStats(), campaignName, false);

            expect(result.payload.name).toBe('Custom Dragon');
            expect(result.payload.description).toContain('Custom Dragon: Free cast');
        });

        it('decrements from usesMax when runtime value is null', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const action = makeAction({ automation: { usesMax: 3 } });
            const result = await confirmDragonCompanion(action, makePlayerStats(), campaignName, false);

            expect(result.payload.description).toContain('Free cast of Summon Dragon (2 remaining)');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'SorcererBoy',
                '_Dragon_Companion_freeCastCount',
                2,
                campaignName
            );
        });
    });
});

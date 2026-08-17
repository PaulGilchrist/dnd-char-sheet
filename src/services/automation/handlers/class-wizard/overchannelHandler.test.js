// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    handle,
    getOverchannelUses,
    hasOverchannelRemaining,
    consumeOverchannelUse,
    restoreOverchannelOnLongRest,
    getOverchannelNecroticDamage,
} from './overchannelHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
    getRuntimeValue: vi.fn(),
}));

const mockPlayerStats = { name: 'TestWizard' };
const campaignName = 'test-campaign';

beforeEach(() => {
    vi.clearAllMocks();
});

function makeAction(overrides = {}) {
    return {
        name: 'Overchannel',
        automation: { type: 'overchannel', ...overrides.automation },
        ...overrides,
    };
}

describe('overchannelHandler', () => {
    describe('handle', () => {
        it('returns popup with automation_info type and correct payload structure', async () => {
            const result = await handle(makeAction(), mockPlayerStats, campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Overchannel');
            expect(result.payload.automation).toEqual(makeAction().automation);
        });

        it('describes first use as having no adverse effect', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const result = await handle(makeAction(), mockPlayerStats, campaignName, null);

            expect(result.payload.description).toContain('First use');
            expect(result.payload.description).toContain('no adverse effect');
        });

        it('describes subsequent uses with escalating necrotic damage', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(5);

            const result = await handle(makeAction(), mockPlayerStats, campaignName, null);

            expect(result.payload.description).toContain('Use #6');
            expect(result.payload.description).toContain('12d12 necrotic damage');
        });

        it('uses custom action name when provided', async () => {
            const result = await handle(
                makeAction({ name: 'Custom Overchannel' }),
                mockPlayerStats,
                campaignName,
                null
            );

            expect(result.payload.name).toBe('Custom Overchannel');
            expect(result.payload.description).toContain('Custom Overchannel');
        });

        it('passes through automation object unchanged', async () => {
            const customAutomation = { type: 'overchannel', customField: true };
            const result = await handle(
                makeAction({ automation: customAutomation }),
                mockPlayerStats,
                campaignName,
                null
            );

            expect(result.payload.automation).toBe(customAutomation);
        });

        it('handles missing action.name gracefully', async () => {
            const result = await handle(
                { automation: { type: 'overchannel' } },
                mockPlayerStats,
                campaignName,
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.name).toBeUndefined();
            expect(result.payload.description).toContain('undefined');
        });

        it('handles missing action.automation', async () => {
            const result = await handle(
                { name: 'Overchannel' },
                mockPlayerStats,
                campaignName,
                null
            );

            expect(result.payload.automation).toBeUndefined();
        });
    });

    describe('getOverchannelUses', () => {
        it('returns 0 when no stored value exists', () => {
            runtimeState.getRuntimeValue.mockReturnValue(undefined);

            const result = getOverchannelUses(mockPlayerStats, campaignName);

            expect(result).toBe(0);
        });

        it('returns the stored use count as a number', () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const result = getOverchannelUses(mockPlayerStats, campaignName);

            expect(result).toBe(3);
        });

        it('passes campaignName to getRuntimeValue', () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            getOverchannelUses(mockPlayerStats, campaignName);

            expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith(
                'TestWizard',
                'Overchannel_useCount',
                campaignName
            );
        });
    });

    describe('hasOverchannelRemaining', () => {
        it('always returns true (unlimited uses feature)', () => {
            expect(hasOverchannelRemaining(mockPlayerStats, campaignName)).toBe(true);
        });
    });

    describe('consumeOverchannelUse', () => {
        it('increments the use count and persists it', async () => {
            const setRuntimeValue = runtimeState.setRuntimeValue.mockResolvedValue(undefined);
            runtimeState.getRuntimeValue.mockReturnValue(4);

            const result = await consumeOverchannelUse(mockPlayerStats, campaignName);

            expect(result).toBe(true);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestWizard',
                'Overchannel_useCount',
                5,
                campaignName
            );
        });
    });

    describe('restoreOverchannelOnLongRest', () => {
        it('resets use count to 0', async () => {
            const setRuntimeValue = runtimeState.setRuntimeValue.mockResolvedValue(undefined);

            await restoreOverchannelOnLongRest(mockPlayerStats, campaignName);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestWizard',
                'Overchannel_useCount',
                0,
                campaignName
            );
        });
    });

    describe('getOverchannelNecroticDamage', () => {
        it('returns 0 when useCount is 0', () => {
            expect(getOverchannelNecroticDamage(3, 0)).toBe(0);
        });

        it('returns 0 when useCount is 1', () => {
            expect(getOverchannelNecroticDamage(3, 1)).toBe(0);
        });

        it('returns 0 for negative useCount', () => {
            expect(getOverchannelNecroticDamage(3, -1)).toBe(0);
        });

        it('returns correct formula for first additional use (useCount=2)', () => {
            const result = getOverchannelNecroticDamage(3, 2);

            expect(result.formula).toBe('3d12');
            expect(result.damageType).toBe('Necrotic');
            expect(result.ignoresResistance).toBe(true);
            expect(result.ignoresImmunity).toBe(true);
            expect(result.perSpellLevel).toBe(true);
            expect(result.expression).toBe('9d12');
        });

        it('increments the formula based on useCount', () => {
            const result2 = getOverchannelNecroticDamage(3, 2);
            const result3 = getOverchannelNecroticDamage(3, 3);
            const result4 = getOverchannelNecroticDamage(3, 4);

            expect(result2.formula).toBe('3d12');
            expect(result3.formula).toBe('4d12');
            expect(result4.formula).toBe('5d12');

            expect(result2.expression).toBe('9d12');
            expect(result3.expression).toBe('12d12');
            expect(result4.expression).toBe('15d12');
        });

        it('defaults spellLevel to 1 when falsy', () => {
            expect(getOverchannelNecroticDamage(null, 2).expression).toBe('3d12');
            expect(getOverchannelNecroticDamage(undefined, 2).expression).toBe('3d12');
            expect(getOverchannelNecroticDamage(0, 2).expression).toBe('3d12');
        });

        it('uses provided spellLevel for expression calculation', () => {
            const result = getOverchannelNecroticDamage(5, 2);

            expect(result.expression).toBe('15d12');
        });
    });
});

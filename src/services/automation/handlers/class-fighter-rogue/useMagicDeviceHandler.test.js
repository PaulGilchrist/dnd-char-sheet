// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './useMagicDeviceHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

const { getRuntimeValue, setRuntimeValue } = await import(
    '../../../../hooks/runtime/useRuntimeState.js'
);

function makeAction(overrides = {}) {
    return {
        name: 'Use Magic Device',
        automation: {
            type: 'use_magic_device',
            attunementLimit: 4,
            chargeReroll: '1d6',
            chargeRerollSuccess: 6,
            scrollAbility: 'INT',
            scrollCheckDC: '10 + spell_level',
            scrollDisintegratesOnFail: true,
            casting_time: 'passive',
            ...overrides.automation,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestRogue',
        level: 13,
        ...overrides,
    };
}

function makeGetRuntime(activeBuffs) {
    return vi.fn((_, key) =>
        key === 'activeBuffs' ? activeBuffs : undefined
    );
}

describe('useMagicDeviceHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('activation', () => {
        it('toggles on when not already active, sets buff, and returns info popup', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Use Magic Device');
            expect(result.payload.automationType).toBe('use_magic_device');
            expect(result.payload.automation).toEqual(makeAction().automation);

            expect(setRuntimeValue).toHaveBeenCalledTimes(1);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Use Magic Device',
                        effect: 'use_magic_device',
                        duration: '1_minute',
                        hasAutomation: true,
                    }),
                ]),
                'test-campaign'
            );
        });
    });

    describe('deactivation', () => {
        it('toggles off when already active, removes buff, and returns info popup', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Use Magic Device', effect: 'use_magic_device' },
            ]));

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Use Magic Device');
            expect(result.payload.automationType).toBe('use_magic_device');
            expect(result.payload.automation).toEqual(makeAction().automation);

            expect(setRuntimeValue).toHaveBeenCalledTimes(1);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                [],
                'test-campaign'
            );
        });
    });

    describe('custom parameters', () => {
        it('uses custom duration, attunementLimit, and chargeRerollSuccess from automation config', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                makeAction({
                    automation: {
                        duration: '10_minutes',
                        attunementLimit: 6,
                        chargeRerollSuccess: 5,
                    },
                }),
                makePlayerStats(),
                'test-campaign'
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                expect.any(String),
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ duration: '10_minutes' }),
                ]),
                expect.any(String)
            );
            expect(result.payload.description).toContain('6 magic items');
            expect(result.payload.description).toContain('5 use without expending');
        });
    });

    describe('buff preservation', () => {
        it('preserves other buffs when activating', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Other Buff', effect: 'other' },
            ]));

            await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Other Buff' }),
                    expect.objectContaining({ name: 'Use Magic Device' }),
                ]),
                'test-campaign'
            );
        });

        it('preserves other buffs when deactivating', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Buff A', effect: 'buff_a' },
                { name: 'Use Magic Device', effect: 'use_magic_device' },
                { name: 'Buff B', effect: 'buff_b' },
            ]));

            await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            const callArgs = setRuntimeValue.mock.calls[0];
            const buffs = callArgs[2];
            expect(buffs.map(b => b.name)).toEqual(['Buff A', 'Buff B']);
        });
    });

    describe('edge cases', () => {
        it('treats null/undefined/non-array activeBuffs as empty array', async () => {
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Use Magic Device' }),
                ]),
                'test-campaign'
            );
        });

        it('uses default values when automation object is missing', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                { name: 'Use Magic Device' },
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                expect.any(String),
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ duration: '1_minute' }),
                ]),
                expect.any(String)
            );
        });
    });
});

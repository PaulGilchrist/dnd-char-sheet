// @improved-by-ai
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
        it('activates the feature and returns info popup when not already active', async () => {
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
            expect(result.payload.description).toContain('activated');
            expect(result.payload.description).toContain('4 magic items');
            expect(result.payload.description).toContain('roll 1d6');
            expect(result.payload.description).toContain('6 use without expending');
            expect(result.payload.description).toContain('Intelligence');
            expect(result.payload.description).toContain('Arcana check DC 10 + spell level');
            expect(result.payload.description).toContain('scroll disintegrates');
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

        it('uses default duration when automation.duration is absent', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                expect.any(String),
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ duration: '1_minute' }),
                ]),
                expect.any(String)
            );
        });

        it('uses custom duration from automation config', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            await handle(
                makeAction({ automation: { duration: '10_minutes' } }),
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
        });

        it('uses default attunementLimit of 4 when absent', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                makeAction({ automation: { type: 'use_magic_device' } }),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.description).toContain('4 magic items');
        });

        it('uses custom attunementLimit from automation config', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                makeAction({ automation: { attunementLimit: 6 } }),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.description).toContain('6 magic items');
        });

        it('uses custom chargeRerollSuccess from automation config', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                makeAction({ automation: { chargeRerollSuccess: 5 } }),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.description).toContain('5 use without expending');
        });

        it('passes playerName and campaignName to setRuntimeValue', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            await handle(
                makeAction(),
                makePlayerStats({ name: 'CustomPlayer' }),
                'custom-campaign'
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'CustomPlayer',
                'activeBuffs',
                expect.any(Array),
                'custom-campaign'
            );
        });
    });

    describe('deactivation', () => {
        it('deactivates the feature and returns info popup when already active', async () => {
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
            expect(result.payload.description).toBe(
                'Use Magic Device ended. Attunement limit returns to normal.'
            );
            expect(result.payload.automation).toEqual(makeAction().automation);

            expect(setRuntimeValue).toHaveBeenCalledTimes(1);
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                [],
                'test-campaign'
            );
        });

        it('preserves other buffs when deactivating', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Other Buff', effect: 'other' },
                { name: 'Use Magic Device', effect: 'use_magic_device' },
            ]));

            await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                [expect.objectContaining({ name: 'Other Buff' })],
                'test-campaign'
            );
        });

        it('removes only the matching buff by name', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Use Magic Device', effect: 'some_other_effect' },
                { name: 'Use Magic Device', effect: 'use_magic_device' },
            ]));

            await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                [],
                'test-campaign'
            );
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

        it('preserves other buffs when deactivating with multiple others', async () => {
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

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Buff A' }),
                    expect.objectContaining({ name: 'Buff B' }),
                ]),
                'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                expect.not.arrayContaining([
                    expect.objectContaining({ name: 'Use Magic Device' }),
                ]),
                'test-campaign'
            );
        });
    });

    describe('edge cases', () => {
        it('treats null activeBuffs as empty array', async () => {
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('activated');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestRogue',
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Use Magic Device' }),
                ]),
                'test-campaign'
            );
        });

        it('treats undefined activeBuffs as empty array', async () => {
            getRuntimeValue.mockReturnValue(undefined);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('activated');
        });

        it('treats non-array activeBuffs as empty array', async () => {
            getRuntimeValue.mockReturnValue('not-an-array');

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('activated');
        });

        it('uses default values when automation is missing', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                { name: 'Use Magic Device' },
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('4 magic items');
            expect(result.payload.description).toContain('1d6');
            expect(result.payload.description).toContain('6 use without expending');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                expect.any(String),
                'activeBuffs',
                expect.arrayContaining([
                    expect.objectContaining({ duration: '1_minute' }),
                ]),
                expect.any(String)
            );
        });

        it('uses default chargeRerollSuccess when absent from automation', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const result = await handle(
                makeAction({ automation: { type: 'use_magic_device', attunementLimit: 2 } }),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.description).toContain('6 use without expending');
        });

        it('uses empty array for activeBuffs when deactivating with null stored value', async () => {
            getRuntimeValue.mockReturnValue(null);

            // If somehow the name check passes with null (it won't, but test the behavior)
            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign'
            );

            // With null stored, activeBuffs becomes [] and the name won't match, so it activates
            expect(result.payload.description).toContain('activated');
        });
    });

    describe('payload structure', () => {
        it('includes automation object in popup payload on activation', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([]));

            const action = makeAction({ automation: { customField: 'customValue' } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.payload.automation).toEqual(action.automation);
        });

        it('includes automation object in popup payload on deactivation', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Use Magic Device', effect: 'use_magic_device' },
            ]));

            const action = makeAction({ automation: { customField: 'customValue' } });
            const result = await handle(action, makePlayerStats(), 'test-campaign');

            expect(result.payload.automation).toEqual(action.automation);
        });

        it('uses the action name for buff matching and popup name', async () => {
            getRuntimeValue.mockImplementation(makeGetRuntime([
                { name: 'Use Magic Device', effect: 'use_magic_device' },
            ]));

            const result = await handle(
                makeAction({ name: 'Use Magic Device' }),
                makePlayerStats(),
                'test-campaign'
            );

            expect(result.payload.name).toBe('Use Magic Device');
            expect(result.payload.description).toBe(
                'Use Magic Device ended. Attunement limit returns to normal.'
            );
        });
    });
});

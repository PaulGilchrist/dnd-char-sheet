// @improved-by-ai
import { handle, applyTelekineticLeap } from './telekineticLeapHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

const campaignName = 'test-campaign';
const playerName = 'TestHero';

function makeAction(auto = {}) {
    return {
        name: 'Telekinetic Leap',
        automation: { type: 'telekinetic_leap', flySpeed: '2x_speed', ...auto },
    };
}

function makeActionCustomSpeed(flySpeed, auto = {}) {
    return {
        name: 'Telekinetic Leap',
        automation: { type: 'telekinetic_leap', flySpeed, ...auto },
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        speed: 30,
        ...overrides,
    };
}

describe('telekineticLeapHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        describe('initial activation (not already active)', () => {
            it('returns popup with automation_info type and correct payload fields', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.name).toBe('Telekinetic Leap');
                expect(result.payload.automationType).toBe('telekinetic_leap');
                expect(result.payload.automation).toEqual(makeAction().automation);
            });

            it('returns popup with activated description and fly speed', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.payload.description).toContain('activated');
                expect(result.payload.description).toContain('Fly Speed 60');
            });

            it('sets activeBuffs with telekinetic_leap buff on activation', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Telekinetic Leap',
                            effect: 'telekinetic_leap',
                            flySpeed: 60,
                            leapEffect: true,
                        }),
                    ]),
                    campaignName,
                );
            });

            it('computes fly speed as 2x player base speed when base speed differs', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(makeAction(), { name: playerName, speed: 40 }, campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 80 }),
                    ]),
                    campaignName,
                );
            });

            it('defaults to 30 base speed when playerStats.speed is zero', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(makeAction(), { name: playerName, speed: 0 }, campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 60 }),
                    ]),
                    campaignName,
                );
            });

            it('defaults to 30 base speed when playerStats.speed is undefined', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(makeAction(), { name: playerName }, campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 60 }),
                    ]),
                    campaignName,
                );
            });

            it('defaults to 30 base speed when playerStats.speed is null', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(makeAction(), { name: playerName, speed: null }, campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 60 }),
                    ]),
                    campaignName,
                );
            });

            it('uses custom flySpeed value directly when not 2x_speed', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                const result = await handle(
                    makeActionCustomSpeed(45),
                    makePlayerStats(),
                    campaignName,
                    'map',
                );

                expect(result.payload.description).toContain('Fly Speed 45');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 45 }),
                    ]),
                    campaignName,
                );
            });

            it('uses custom flySpeed string value directly when not 2x_speed', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(
                    makeActionCustomSpeed('75'),
                    makePlayerStats(),
                    campaignName,
                    'map',
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: '75' }),
                    ]),
                    campaignName,
                );
            });

            it('uses custom duration from automation when specified', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await handle(
                    makeAction({ duration: '1_minute' }),
                    makePlayerStats(),
                    campaignName,
                    'map',
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ duration: '1_minute' }),
                    ]),
                    campaignName,
                );
            });

            it('uses existing activeBuffs and appends new buff', async () => {
                const existingBuffs = [
                    { name: 'Other Buff', effect: 'other' },
                ];
                runtimeState.getRuntimeValue.mockReturnValue(existingBuffs);

                await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'Other Buff' }),
                    ]),
                    campaignName,
                );
            });

            it('handles non-array activeBuffs by treating it as empty', async () => {
                runtimeState.getRuntimeValue.mockReturnValue('not-an-array');

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('activated');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'Telekinetic Leap' }),
                    ]),
                    campaignName,
                );
            });
        });

        describe('already active — psionic energy refresh', () => {
            function mockAlreadyActive(psionicEnergy) {
                runtimeState.getRuntimeValue
                    .mockReturnValueOnce([
                        { name: 'Telekinetic Leap', effect: 'telekinetic_leap', leapEffect: true },
                    ])
                    .mockReturnValueOnce(psionicEnergy);
            }

            it('shows popup when already active and no psionic energy remaining (0)', async () => {
                mockAlreadyActive(0);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.description).toContain('already active');
                expect(result.payload.description).toContain('Psionic Energy Die');
                expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
            });

            it('shows popup when already active and psionic energy is negative', async () => {
                mockAlreadyActive(-1);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('already active');
                expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
            });

            it('spends a psionic energy die and shows refresh popup when energy is 1', async () => {
                mockAlreadyActive(1);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('refreshed');
                expect(result.payload.description).toContain('spent 1 Psionic Energy Die');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'psionicEnergy',
                    0,
                    campaignName,
                );
            });

            it('spends a psionic energy die and decrements correctly when energy is 3', async () => {
                mockAlreadyActive(3);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.payload.description).toContain('refreshed');
                expect(result.payload.description).toContain('spent 1 Psionic Energy Die');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'psionicEnergy',
                    2,
                    campaignName,
                );
            });

            it('includes fly speed in refresh popup description', async () => {
                mockAlreadyActive(2);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.payload.description).toContain('Fly Speed 60');
            });

            it('uses default max psionic energy (6) when no tracked resources exist', async () => {
                mockAlreadyActive(undefined);

                const playerStats = { name: playerName };

                const result = await handle(makeAction(), playerStats, campaignName, 'map');

                expect(result.payload.description).toContain('refreshed');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'psionicEnergy',
                    5,
                    campaignName,
                );
            });

            it('uses _trackedResources max when getRuntimeValue returns undefined', async () => {
                mockAlreadyActive(undefined);

                const playerStats = {
                    name: playerName,
                    _trackedResources: { psionicEnergy: { max: 8 } },
                };

                const result = await handle(makeAction(), playerStats, campaignName, 'map');

                expect(result.payload.description).toContain('refreshed');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'psionicEnergy',
                    7,
                    campaignName,
                );
            });

            it('uses _trackedResources max when getRuntimeValue returns null', async () => {
                runtimeState.getRuntimeValue
                    .mockReturnValueOnce([
                        { name: 'Telekinetic Leap', effect: 'telekinetic_leap', leapEffect: true },
                    ])
                    .mockReturnValueOnce(null);

                const playerStats = {
                    name: playerName,
                    _trackedResources: { psionicEnergy: { max: 4 } },
                };

                await handle(makeAction(), playerStats, campaignName, 'map');

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'psionicEnergy',
                    3,
                    campaignName,
                );
            });

            it('defaults max psionic energy to 6 when tracked resources is undefined', async () => {
                runtimeState.getRuntimeValue
                    .mockReturnValueOnce([
                        { name: 'Telekinetic Leap', effect: 'telekinetic_leap', leapEffect: true },
                    ])
                    .mockReturnValueOnce(undefined);

                const playerStats = { name: playerName, _trackedResources: undefined };

                const result = await handle(makeAction(), playerStats, campaignName, 'map');

                expect(result.payload.description).toContain('refreshed');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'psionicEnergy',
                    5,
                    campaignName,
                );
            });
        });

        describe('already active — does not match', () => {
            it('treats buff as not active when leapEffect is missing', async () => {
                runtimeState.getRuntimeValue
                    .mockReturnValueOnce([
                        { name: 'Telekinetic Leap', effect: 'telekinetic_leap' },
                    ])
                    .mockReturnValueOnce(null);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.payload.description).toContain('activated');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.anything(),
                    campaignName,
                );
            });

            it('treats buff as not active when name differs', async () => {
                runtimeState.getRuntimeValue
                    .mockReturnValueOnce([
                        { name: 'Other Leap', effect: 'telekinetic_leap', leapEffect: true },
                    ])
                    .mockReturnValueOnce(null);

                const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

                expect(result.payload.description).toContain('activated');
            });
        });
    });

    describe('applyTelekineticLeap', () => {
        describe('basic behavior', () => {
            it('returns popup with automation_info type and correct payload fields', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                const result = await applyTelekineticLeap(
                    makeAction(),
                    makePlayerStats(),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.name).toBe('Telekinetic Leap');
                expect(result.payload.automationType).toBe('telekinetic_leap');
                expect(result.payload.automation).toEqual(makeAction().automation);
            });

            it('returns popup with activated description and fly speed', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                const result = await applyTelekineticLeap(
                    makeAction(),
                    makePlayerStats(),
                    campaignName,
                );

                expect(result.payload.description).toContain('activated');
                expect(result.payload.description).toContain('Fly Speed 60');
            });

            it('adds new buff to activeBuffs when none exists', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(makeAction(), makePlayerStats(), campaignName);

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Telekinetic Leap',
                            effect: 'telekinetic_leap',
                            flySpeed: 60,
                            leapEffect: true,
                            duration: 'until_end_of_turn',
                        }),
                    ]),
                    campaignName,
                );
            });
        });

        describe('existing buff replacement', () => {
            it('replaces existing Telekinetic Leap buff with updated values', async () => {
                const existingBuffs = [
                    { name: 'Telekinetic Leap', effect: 'telekinetic_leap', flySpeed: 30, leapEffect: true },
                    { name: 'Other Buff', effect: 'other' },
                ];
                runtimeState.getRuntimeValue.mockReturnValue(existingBuffs);

                await applyTelekineticLeap(makeAction(), makePlayerStats(), campaignName);

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Telekinetic Leap',
                            effect: 'telekinetic_leap',
                            flySpeed: 60,
                            leapEffect: true,
                            duration: 'until_end_of_turn',
                        }),
                    ]),
                    campaignName,
                );
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'Other Buff' }),
                    ]),
                    campaignName,
                );
            });

            it('updates flySpeed when replacing an existing buff', async () => {
                const existingBuffs = [
                    { name: 'Telekinetic Leap', effect: 'telekinetic_leap', flySpeed: 40, leapEffect: true },
                ];
                runtimeState.getRuntimeValue.mockReturnValue(existingBuffs);

                await applyTelekineticLeap(makeAction(), makePlayerStats(), campaignName);

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 60 }),
                    ]),
                    campaignName,
                );
            });

            it('does not add a duplicate when replacing an existing buff', async () => {
                const existingBuffs = [
                    { name: 'Telekinetic Leap', effect: 'telekinetic_leap', flySpeed: 30, leapEffect: true },
                ];
                runtimeState.getRuntimeValue.mockReturnValue(existingBuffs);

                await applyTelekineticLeap(makeAction(), makePlayerStats(), campaignName);

                const callArgs = runtimeState.setRuntimeValue.mock.calls[0][2];
                const leapBuffs = callArgs.filter(
                    (b) => b.name === 'Telekinetic Leap' && b.leapEffect,
                );
                expect(leapBuffs).toHaveLength(1);
            });
        });

        describe('edge cases', () => {
            it('handles non-array stored value by treating it as empty', async () => {
                runtimeState.getRuntimeValue.mockReturnValue('not-an-array');

                const result = await applyTelekineticLeap(
                    makeAction(),
                    makePlayerStats(),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('activated');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.anything(),
                    campaignName,
                );
            });

            it('uses custom flySpeed from action when not 2x_speed', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(
                    makeActionCustomSpeed(90),
                    makePlayerStats(),
                    campaignName,
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 90 }),
                    ]),
                    campaignName,
                );
            });

            it('uses duration from automation when specified', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(
                    makeAction({ duration: '1_minute' }),
                    makePlayerStats(),
                    campaignName,
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ duration: '1_minute' }),
                    ]),
                    campaignName,
                );
            });

            it('defaults duration to until_end_of_turn when not specified', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(makeAction(), makePlayerStats(), campaignName);

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ duration: 'until_end_of_turn' }),
                    ]),
                    campaignName,
                );
            });

            it('computes flySpeed from playerStats when action uses 2x_speed', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(
                    makeAction(),
                    { name: playerName, speed: 40 },
                    campaignName,
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 80 }),
                    ]),
                    campaignName,
                );
            });

            it('defaults to 30 base speed when playerStats.speed is undefined', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(
                    makeAction(),
                    { name: playerName },
                    campaignName,
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 60 }),
                    ]),
                    campaignName,
                );
            });

            it('defaults to 30 base speed when playerStats.speed is zero', async () => {
                runtimeState.getRuntimeValue.mockReturnValue(null);

                await applyTelekineticLeap(
                    makeAction(),
                    { name: playerName, speed: 0 },
                    campaignName,
                );

                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ flySpeed: 60 }),
                    ]),
                    campaignName,
                );
            });

            it('handles empty array of existing buffs', async () => {
                runtimeState.getRuntimeValue.mockReturnValue([]);

                const result = await applyTelekineticLeap(
                    makeAction(),
                    makePlayerStats(),
                    campaignName,
                );

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain('activated');
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                    playerName,
                    'activeBuffs',
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'Telekinetic Leap' }),
                    ]),
                    campaignName,
                );
            });
        });
    });
});

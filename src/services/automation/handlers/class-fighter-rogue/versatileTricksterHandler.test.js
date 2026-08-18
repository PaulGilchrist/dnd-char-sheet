// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

const { getRuntimeValue, setRuntimeValue } = await import(
    '../../../../hooks/runtime/useRuntimeState.js'
);
const { getCombatContext } = await import(
    '../../../rules/combat/damageUtils.js'
);
const { addEntry } = await import('../../../ui/logService.js');

import { applyVersatileTrickster } from './versatileTricksterHandler.js';

beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
});

function makeAction(overrides = {}) {
    return {
        name: 'Versatile Trickster',
        automation: { type: 'versatile_trickster', ...overrides.automation },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestRogue',
        ...overrides,
    };
}

function makeCombatContext(creatures) {
    return { creatures };
}

describe('versatileTricksterHandler', () => {
    describe('applyVersatileTrickster', () => {
        describe('no secondary target', () => {
            it('returns an automation_info popup with default name and description', async () => {
                const result = await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    null
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.name).toBe('Versatile Trickster');
                expect(result.payload.automationType).toBe('versatile_trickster');
                expect(result.payload.description).toBe(
                    'Versatile Trickster: No secondary target selected.'
                );
                expect(result.payload.automation).toEqual({
                    type: 'versatile_trickster',
                });
                expect(setRuntimeValue).not.toHaveBeenCalled();
                expect(addEntry).not.toHaveBeenCalled();
            });

            it('uses custom action name and automation type when provided', async () => {
                const result = await applyVersatileTrickster(
                    makeAction({
                        name: 'MyFeature',
                        automation: { type: 'custom_type', extra: 'data' },
                    }),
                    makePlayerStats(),
                    'test-campaign',
                    null
                );

                expect(result.payload.name).toBe('MyFeature');
                expect(result.payload.automationType).toBe('custom_type');
                expect(result.payload.automation).toEqual({
                    type: 'custom_type',
                    extra: 'data',
                });
            });
        });

        describe('size validation', () => {
            it('applies Trip to targets up to Large size', async () => {
                const sizes = [
                    { name: 'TinyCreature', size: 'Tiny' },
                    { name: 'SmallGoblin', size: 'Small' },
                    { name: 'HumanGuard', size: 'Medium' },
                    { name: 'Ogre', size: 'Large' },
                ];

                for (const creature of sizes) {
                    getCombatContext.mockResolvedValue(
                        makeCombatContext([creature])
                    );

                    const result = await applyVersatileTrickster(
                        makeAction(),
                        makePlayerStats(),
                        'test-campaign',
                        creature.name
                    );

                    expect(result.type).toBe('popup');
                    expect(result.payload.type).toBe('automation_info');
                    expect(result.payload.description).toContain(
                        `Trip also applied to ${creature.name}`
                    );
                    expect(result.payload.description).toContain('Dexterity');
                    expect(setRuntimeValue).toHaveBeenCalledWith(
                        'campaign',
                        'targetEffects',
                        expect.arrayContaining([
                            expect.objectContaining({
                                target: creature.name,
                                effect: 'prone',
                                sizeLimit: 'large_or_smaller',
                                saveType: 'DEX',
                            }),
                        ]),
                        'test-campaign'
                    );
                    expect(addEntry).toHaveBeenCalledWith(
                        'test-campaign',
                        expect.objectContaining({
                            type: 'ability_use',
                            abilityName: 'Versatile Trickster',
                            description: expect.stringContaining(
                                `Trip applied to ${creature.name}`
                            ),
                        })
                    );
                }
            });

            it.each([
                { name: 'T-Rex', size: 'Huge' },
                { name: 'Titan', size: 'Gargantuan' },
            ])('blocks Trip on $size targets ($name)', async ({ name, size }) => {
                getCombatContext.mockResolvedValue(
                    makeCombatContext([{ name, size }])
                );

                const result = await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    name
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.description).toContain(
                    `<b>Trip</b> cannot be used on ${name}`
                );
                expect(result.payload.description).toContain(
                    `${size} (too large for Trip`
                );
                expect(setRuntimeValue).not.toHaveBeenCalled();
                expect(addEntry).not.toHaveBeenCalled();
            });
        });

        describe('missing or unknown target in combat context', () => {
            it('applies Trip when target is not found in creatures array', async () => {
                getCombatContext.mockResolvedValue(
                    makeCombatContext([
                        { name: 'OtherCreature', size: 'Small' },
                    ])
                );

                const result = await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    'UnknownCreature'
                );

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain(
                    'Trip also applied to UnknownCreature'
                );
                expect(setRuntimeValue).toHaveBeenCalled();
            });

            it('applies Trip when combat context is null or creatures array is missing', async () => {
                getCombatContext.mockResolvedValue(null);

                const result = await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    'UnknownTarget'
                );

                expect(result.type).toBe('popup');
                expect(result.payload.description).toContain(
                    'Trip also applied to UnknownTarget'
                );
                expect(setRuntimeValue).toHaveBeenCalled();
            });
        });

        describe('targetEffects persistence', () => {
            it('appends the Trip effect to existing targetEffects', async () => {
                const existingEffect = {
                    target: 'OldTarget',
                    effect: 'blinded',
                };
                getRuntimeValue.mockReturnValue([existingEffect]);
                getCombatContext.mockResolvedValue(
                    makeCombatContext([
                        { name: 'NewTarget', size: 'Medium' },
                    ])
                );

                await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    'NewTarget'
                );

                const effectCalls = setRuntimeValue.mock.calls.filter(
                    (c) => c[1] === 'targetEffects'
                );
                expect(effectCalls).toHaveLength(1);
                const newEffects = effectCalls[0][2];
                expect(newEffects).toHaveLength(2);
                expect(newEffects[0]).toEqual(existingEffect);
                expect(newEffects[1]).toEqual(
                    expect.objectContaining({
                        target: 'NewTarget',
                        effect: 'prone',
                    })
                );
            });

            it('uses custom source name from action in the effect', async () => {
                getCombatContext.mockResolvedValue(
                    makeCombatContext([
                        { name: 'Goblin', size: 'Small' },
                    ])
                );

                await applyVersatileTrickster(
                    makeAction({ name: 'Trickster Maneuver' }),
                    makePlayerStats(),
                    'test-campaign',
                    'Goblin'
                );

                const effectCalls = setRuntimeValue.mock.calls.filter(
                    (c) => c[1] === 'targetEffects'
                );
                expect(effectCalls[0][2][0].source).toBe('Trickster Maneuver');
            });
        });

        describe('logging', () => {
            it('logs ability_use entry with correct fields', async () => {
                getCombatContext.mockResolvedValue(
                    makeCombatContext([
                        { name: 'Goblin', size: 'Small' },
                    ])
                );

                await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    'Goblin'
                );

                expect(addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'TestRogue',
                        abilityName: 'Versatile Trickster',
                        description: expect.stringContaining(
                            'Trip applied to Goblin'
                        ),
                    })
                );
            });

            it('gracefully handles log failure without throwing', async () => {
                addEntry.mockRejectedValueOnce(new Error('network error'));
                getCombatContext.mockResolvedValue(
                    makeCombatContext([
                        { name: 'Goblin', size: 'Small' },
                    ])
                );

                const result = await applyVersatileTrickster(
                    makeAction(),
                    makePlayerStats(),
                    'test-campaign',
                    'Goblin'
                );

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
            });
        });
    });
});

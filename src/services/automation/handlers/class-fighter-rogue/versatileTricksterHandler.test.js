import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
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
    getRuntimeValue.mockReset();
    setRuntimeValue.mockReset();
    getCombatContext.mockReset();
    addEntry.mockReset();
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
        it('returns popup when no secondary target is provided', async () => {
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
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('returns popup with custom action name when no secondary target', async () => {
            const result = await applyVersatileTrickster(
                makeAction({ name: 'MyFeature' }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.name).toBe('MyFeature');
        });

        it('returns popup with custom automation type when no secondary target', async () => {
            const result = await applyVersatileTrickster(
                makeAction({ automation: { type: 'custom_type' } }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.automationType).toBe('custom_type');
        });

        it('allows Trip on a Small target', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'SmallGoblin', size: 'Small' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'SmallGoblin'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain(
                'Trip also applied to SmallGoblin'
            );
            expect(result.payload.description).toContain('Dexterity');

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'SmallGoblin',
                        source: 'Versatile Trickster',
                        option: 'Trip',
                        effect: 'prone',
                        condition: 'prone',
                        sizeLimit: 'large_or_smaller',
                        saveType: 'DEX',
                        saveDc: 'ability',
                        saveAbility: 'DEX',
                        duration: 'until_start_of_next_turn',
                    }),
                ]),
                'test-campaign'
            );

            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign',
                expect.objectContaining({
                    type: 'ability_use',
                    characterName: 'TestRogue',
                    abilityName: 'Versatile Trickster',
                    description: expect.stringContaining(
                        'Trip applied to SmallGoblin'
                    ),
                })
            );
        });

        it('allows Trip on a Medium target', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'HumanGuard', size: 'Medium' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'HumanGuard'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                'Trip also applied to HumanGuard'
            );
        });

        it('allows Trip on a Large target', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'Ogre', size: 'Large' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'Ogre'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                'Trip also applied to Ogre'
            );
        });

        it('blocks Trip on a Huge target', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'T-Rex', size: 'Huge' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'T-Rex'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain(
                '<b>Trip</b> cannot be used on T-Rex'
            );
            expect(result.payload.description).toContain(
                'Huge (too large for Trip'
            );
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('blocks Trip on a Gargantuan target', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'Titan', size: 'Gargantuan' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'Titan'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                '<b>Trip</b> cannot be used on Titan'
            );
            expect(result.payload.description).toContain(
                'Gargantuan (too large for Trip'
            );
        });

        it('does not apply Trip when secondary target is not found in combat context', async () => {
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

            // Target not found in cs.creatures, so secondaryTarget is undefined
            // The size check is skipped (undefined size index is -1, which is not > index of Large)
            // Trip is still applied
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                'Trip also applied to UnknownCreature'
            );
            expect(setRuntimeValue).toHaveBeenCalled();
        });

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

        it('uses custom source name when action has a custom name', async () => {
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

        it('handles combat context returning null', async () => {
            getCombatContext.mockResolvedValue(null);

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'UnknownTarget'
            );

            // When cs is null, secondaryTarget is undefined, size check is skipped
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                'Trip also applied to UnknownTarget'
            );
            expect(setRuntimeValue).toHaveBeenCalled();
        });

        it('handles combat context with no creatures array', async () => {
            getCombatContext.mockResolvedValue({});

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
        });

        it('handles target with unknown size (treated as trip-able)', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'Mystery', size: 'UnknownSize' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'Mystery'
            );

            // UnknownSize returns -1 from indexOf, so the size check is skipped
            // Trip is applied
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                'Trip also applied to Mystery'
            );
        });

        it('preserves all Trip effect fields with correct defaults', async () => {
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

            const effectCalls = setRuntimeValue.mock.calls.filter(
                (c) => c[1] === 'targetEffects'
            );
            const newEffect = effectCalls[0][2][0];
            expect(newEffect).toEqual({
                target: 'Goblin',
                source: 'Versatile Trickster',
                option: 'Trip',
                effect: 'prone',
                value: null,
                noOpportunityAttacks: false,
                duration: 'until_start_of_next_turn',
                saveType: 'DEX',
                saveDc: 'ability',
                saveAbility: 'DEX',
                condition: 'prone',
                repeatingSave: false,
                requires: null,
                sizeLimit: 'large_or_smaller',
                movement: null,
                cost: null,
                ignoreResistance: false,
                restoreCost: null,
            });
        });

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
            vi.mocked(addEntry).mockRejectedValueOnce(new Error('network error'));
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

        it('uses playerStats name in log entry', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'Goblin', size: 'Small' },
                ])
            );

            await applyVersatileTrickster(
                makeAction(),
                makePlayerStats({ name: 'ShadowCaster' }),
                'test-campaign',
                'Goblin'
            );

            expect(addEntry).toHaveBeenCalledWith(
                'test-campaign',
                expect.objectContaining({
                    characterName: 'ShadowCaster',
                })
            );
        });

        it('returns payload with correct automation fields', async () => {
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

            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Versatile Trickster');
            expect(result.payload.automationType).toBe('versatile_trickster');
            expect(result.payload.automation).toEqual({
                type: 'versatile_trickster',
            });
        });

        it('returns payload with custom automation fields', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'Goblin', size: 'Small' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction({
                    automation: {
                        type: 'versatile_trickster',
                        customField: 'customValue',
                    },
                }),
                makePlayerStats(),
                'test-campaign',
                'Goblin'
            );

            expect(result.payload.automation).toEqual({
                type: 'versatile_trickster',
                customField: 'customValue',
            });
        });

        it('handles Tiny target (allowed)', async () => {
            getCombatContext.mockResolvedValue(
                makeCombatContext([
                    { name: 'Pip', size: 'Tiny' },
                ])
            );

            const result = await applyVersatileTrickster(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                'Pip'
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain(
                'Trip also applied to Pip'
            );
        });
    });
});

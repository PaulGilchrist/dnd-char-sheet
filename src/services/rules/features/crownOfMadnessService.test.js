// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerCrownOfMadness } from './crownOfMadnessService.js';
import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';

vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(),
}));

vi.mock('../combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../npcs/monsterUtils.js', () => ({
    getMonsterData: vi.fn(),
}));

describe('crownOfMadnessService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const campaignName = 'TestCampaign';
    const mapName = 'testMap';
    const baseSpell = { name: 'Crown of Madness' };
    const baseStats = {
        name: 'Wizard',
        spellAbilities: { saveDc: 15, modifier: 4, spellCastingAbility: 'Intelligence' },
        proficiency: 4,
    };

    describe('triggerCrownOfMadness', () => {
        describe('spell name matching', () => {
            it.each([
                ['Crown of Madness'],
                ['crown of madness'],
                ['CROWN OF MADNESS'],
                ['CrOwN oF mAdNeSs'],
            ])('triggers for "%s" spell name (case-insensitive)', async (name) => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });

                const result = await triggerCrownOfMadness(
                    { name, level: 2 },
                    {},
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledTimes(1);
                expect(result).toEqual({ type: 'popup' });
            });

            it.each([
                'Crown of Sorrow',
                'Madness',
                'Crown',
                'Burning Hands',
                '',
                undefined,
                null,
            ])('returns null for non-Crown of Madness spell: "%s"', async (name) => {
                const result = await triggerCrownOfMadness(
                    { name, level: 1 },
                    {},
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toBeNull();
                expect(executeHandler).not.toHaveBeenCalled();
            });
        });

        describe('target resolution', () => {
            it('uses metaCtx.targetName when provided', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ targetName: 'Goblin' }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('returns popup when no targetName and no combat context', async () => {
                getCombatContext.mockResolvedValue(null);

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: null },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Crown of Madness',
                        description: 'No target selected for Crown of Madness.',
                    },
                });
                expect(executeHandler).not.toHaveBeenCalled();
            });

            it('returns popup when no targetName and empty creatures list', async () => {
                getCombatContext.mockResolvedValue({ creatures: [] });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: null },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Crown of Madness',
                        description: 'No target selected for Crown of Madness.',
                    },
                });
                expect(executeHandler).not.toHaveBeenCalled();
            });

            it('auto-selects first non-caster creature from combat context when targetName is missing', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Goblin', type: 'npc' },
                    ],
                });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: null },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ targetName: 'Goblin' }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('returns popup when all creatures match the caster name', async () => {
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Wizard', type: 'npc' },
                    ],
                });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: null },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Crown of Madness',
                        description: 'No target selected for Crown of Madness.',
                    },
                });
                expect(executeHandler).not.toHaveBeenCalled();
            });

            it('handles null metaCtx by falling back to combat context', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [{ name: 'Goblin', type: 'npc' }],
                });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    null,
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });

            it('handles undefined metaCtx by falling back to combat context', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [{ name: 'Goblin', type: 'npc' }],
                });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    undefined,
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        describe('humanoid check', () => {
            it('returns popup when target is not a Humanoid', async () => {
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Wolf', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Beast' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Wolf' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Crown of Madness',
                        description: 'No effect. Wolf is not a Humanoid.',
                    },
                });
                expect(executeHandler).not.toHaveBeenCalled();
            });

            it('proceeds when target is a Humanoid NPC', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Shopkeeper', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Shopkeeper' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });

            it('treats player-type creatures as Humanoid without calling getMonsterData', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Cleric', type: 'player' },
                    ],
                });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Cleric' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(getMonsterData).not.toHaveBeenCalled();
                expect(executeHandler).toHaveBeenCalled();
            });

            it('defaults to Humanoid when getMonsterData throws', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [{ name: 'Mystery', type: 'npc' }],
                });
                getMonsterData.mockRejectedValue(new Error('Failed to load'));

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Mystery' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });

            it('defaults to Humanoid when creature not found in combat context', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [] });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Unknown' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });

            it('defaults to Humanoid when combat context is null', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue(null);

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Unknown' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });

            it('skips getMonsterData when target is not in combat context (defaults to Humanoid)', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [{ name: 'Wizard', type: 'player' }],
                });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'UnknownTarget' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(getMonsterData).not.toHaveBeenCalled();
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        describe('advantage logic', () => {
            it('sets advantage:true when target is in combat and not the caster', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Goblin', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ advantage: true }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('sets advantage:false when target is the caster', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Goblin', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Wizard' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ advantage: false }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('sets advantage:false when target is not in combat context', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [{ name: 'Goblin', type: 'npc' }],
                });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'UnknownTarget' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ advantage: false }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('sets advantage:false when combat context is null', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue(null);
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ advantage: false }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });
        });

        describe('save DC resolution', () => {
            it('uses metaCtx.spellSaveDc when provided', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin', spellSaveDc: 18 },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ saveDc: 18 }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('falls back to playerStats.spellAbilities.saveDc', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ saveDc: 15 }),
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('computes saveDc from proficiency when spellAbilities is missing', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });
                const stats = { name: 'Wizard', proficiency: 3 };

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    stats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ saveDc: 11 }),
                    }),
                    stats,
                    campaignName,
                    mapName,
                );
            });

            it('uses default saveDc of 10 when stats are minimal (8 + default proficiency 2)', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    {},
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        automation: expect.objectContaining({ saveDc: 10 }),
                    }),
                    {},
                    campaignName,
                    mapName,
                );
            });
        });

        describe('slot level resolution', () => {
            it('uses metaCtx.slotLevel when provided', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin', slotLevel: 5 },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({ spellSlotLevel: 5 }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('falls back to spell.level when metaCtx has no slotLevel', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    { name: 'Crown of Madness', level: 3 },
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({ spellSlotLevel: 3 }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('defaults slotLevel to 2 when neither metaCtx nor spell has level', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    { name: 'Crown of Madness' },
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({ spellSlotLevel: 2 }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });
        });

        describe('action structure', () => {
            it('constructs action with correct type and fields', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Goblin', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: 'Crown of Madness',
                        automation: expect.objectContaining({
                            type: 'crown_of_madness',
                            saveDc: 15,
                            targetName: 'Goblin',
                            advantage: true,
                        }),
                        spell: baseSpell,
                        spellSlotLevel: 2,
                    }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });

            it('passes the spell object into the action', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });
                const spell = { name: 'Crown of Madness', level: 2, school: 'Enchantment' };

                await triggerCrownOfMadness(
                    spell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.objectContaining({ spell }),
                    baseStats,
                    campaignName,
                    mapName,
                );
            });
        });

        describe('return value', () => {
            it('returns result from executeHandler on success', async () => {
                const expectedResult = {
                    type: 'popup',
                    payload: { type: 'automation_info', name: 'Crown of Madness', description: 'Crown of Madness affects target.' },
                };
                executeHandler.mockResolvedValue(expectedResult);
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toBe(expectedResult);
            });

            it('returns null when executeHandler returns null', async () => {
                executeHandler.mockResolvedValue(null);
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toBeNull();
            });

            it('returns error popup when executeHandler throws', async () => {
                executeHandler.mockRejectedValue(new Error('Handler failed'));
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Crown of Madness',
                        description: 'Failed to execute Crown of Madness.',
                    },
                });
            });
        });

        describe('mapName passthrough', () => {
            it('passes mapName to executeHandler', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    'otherMap',
                );

                expect(executeHandler).toHaveBeenCalledWith(
                    expect.anything(),
                    baseStats,
                    campaignName,
                    'otherMap',
                );
            });
        });

        describe('metaCtx handling', () => {
            it('handles metaCtx with only partial fields', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Goblin' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(executeHandler).toHaveBeenCalled();
            });

            it('handles empty metaCtx by falling back to combat context', async () => {
                executeHandler.mockResolvedValue({ type: 'popup' });
                getCombatContext.mockResolvedValue({
                    creatures: [{ name: 'Goblin', type: 'npc' }],
                });
                getMonsterData.mockResolvedValue({ type: 'Humanoid' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    {},
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({ type: 'popup' });
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        describe('non-humanoid popup description', () => {
            it('includes the target name in the non-humanoid popup', async () => {
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Oozy', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Ooze' });

                const result = await triggerCrownOfMadness(
                    baseSpell,
                    { targetName: 'Oozy' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Crown of Madness',
                        description: 'No effect. Oozy is not a Humanoid.',
                    },
                });
            });

            it('uses correct spell name in popup when spell has different casing', async () => {
                getCombatContext.mockResolvedValue({
                    creatures: [
                        { name: 'Wizard', type: 'player' },
                        { name: 'Wolf', type: 'npc' },
                    ],
                });
                getMonsterData.mockResolvedValue({ type: 'Beast' });

                const result = await triggerCrownOfMadness(
                    { name: 'CROWN OF MADNESS' },
                    { targetName: 'Wolf' },
                    baseStats,
                    campaignName,
                    mapName,
                );

                expect(result.payload.name).toBe('Crown of Madness');
            });
        });
    });
});

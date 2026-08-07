import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerCalmEmotions } from './calmEmotionsService.js';
import { executeHandler } from '../../automation/index.js';

vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(),
}));

describe('calmEmotionsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const campaignName = 'test-campaign';
    const mapName = 'testMap';
    const playerStats = {
        name: 'Bard',
        spellAbilities: { saveDc: 15, modifier: 4, spellCastingAbility: 'Charisma' },
        proficiency: 4,
    };

    describe('triggerCalmEmotions', () => {
        it('returns null when spell name is not "calm emotions"', async () => {
            const spell = { name: 'Fireball', level: 3 };

            const result = await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('returns null when spell name is not "calm emotions" (case insensitive)', async () => {
            const spell = { name: 'Calm Emoticons', level: 0 };

            const result = await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('returns null when spell.name is null', async () => {
            const spell = { name: null, level: 4 };

            const result = await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('triggers for exact match "calm emotions" (lowercase)', async () => {
            executeHandler.mockResolvedValue({ type: 'popup', payload: { text: 'OK' } });
            const spell = { name: 'calm emotions', level: 4 };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalled();
        });

        it('triggers for mixed case "Calm Emotions"', async () => {
            executeHandler.mockResolvedValue({ type: 'popup', payload: { text: 'OK' } });
            const spell = { name: 'Calm Emotions', level: 4 };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalled();
        });

        it('uses metaCtx.spellSaveDc when provided', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };
            const metaCtx = { spellSaveDc: 18 };

            await triggerCalmEmotions(spell, metaCtx, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    automation: expect.objectContaining({ saveDc: 18 }),
                }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('uses playerStats.spellAbilities.saveDc when metaCtx.spellSaveDc is null', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };
            const metaCtx = { spellSaveDc: null };

            await triggerCalmEmotions(spell, metaCtx, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    automation: expect.objectContaining({ saveDc: 15 }),
                }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('uses playerStats.spellAbilities.saveDc when metaCtx.spellSaveDc is undefined', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };
            const metaCtx = {};

            await triggerCalmEmotions(spell, metaCtx, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    automation: expect.objectContaining({ saveDc: 15 }),
                }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('computes spellSaveDc as 8 + proficiency when spellAbilities.saveDc is missing', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };
            const statsNoSaveDc = {
                name: 'Bard',
                proficiency: 4,
            };

            await triggerCalmEmotions(spell, {}, statsNoSaveDc, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    automation: expect.objectContaining({ saveDc: 12 }),
                }),
                statsNoSaveDc,
                campaignName,
                mapName,
            );
        });

        it('throws when proficiency is missing and no saveDc available', async () => {
            const spell = { name: 'Calm Emotions', level: 4 };
            const statsNoProficiency = {
                name: 'Bard',
                spellAbilities: {},
            };

            await expect(
                triggerCalmEmotions(spell, {}, statsNoProficiency, campaignName, mapName),
            ).rejects.toThrow('playerStats.proficiency is required for Calm Emotions');
        });

        it('passes saveType as CHA in the action', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    automation: expect.objectContaining({ saveType: 'CHA' }),
                }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('passes the spell object through in the action', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4, duration: 'Concentration, up to 1 minute' };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({ spell }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('passes action.name as spell.name to executeHandler', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Calm Emotions' }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('returns executeHandler result on success', async () => {
            const expectedResult = { type: 'popup', payload: { type: 'automation_info', description: 'Done' } };
            executeHandler.mockResolvedValue(expectedResult);
            const spell = { name: 'Calm Emotions', level: 4 };

            const result = await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(result).toEqual(expectedResult);
        });

        it('returns null when executeHandler throws', async () => {
            executeHandler.mockRejectedValue(new Error('Handler failed'));
            const spell = { name: 'Calm Emotions', level: 4 };

            const result = await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(result).toBeNull();
        });

        it('logs error via console.error when handler throws', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            executeHandler.mockRejectedValue(new Error('Handler failed'));
            const spell = { name: 'Calm Emotions', level: 4 };

            const result = await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                '[calmEmotionsService] Failed to execute Calm Emotions handler:',
                expect.any(Error),
            );
            consoleSpy.mockRestore();
        });

        it('logs error with correct spell name when handler throws', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            executeHandler.mockRejectedValue(new Error('Handler failed'));
            const spell = { name: 'calm emotions', level: 4 };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[calmEmotionsService] Failed to execute calm emotions handler:',
                expect.any(Error),
            );
            consoleSpy.mockRestore();
        });

        it('handles empty metaCtx object', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };

            await triggerCalmEmotions(spell, {}, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalled();
        });

        it('handles undefined metaCtx', async () => {
            executeHandler.mockRejectedValue(new Error('metaCtx is missing'));
            const spell = { name: 'Calm Emotions', level: 4 };

            const result = await triggerCalmEmotions(spell, undefined, playerStats, campaignName, mapName);

            expect(result).toBeNull();
        });

        it('does not throw when proficiency is 0 and saveDc is missing', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });
            const spell = { name: 'Calm Emotions', level: 4 };
            const statsZeroProf = {
                name: 'Bard',
                proficiency: 0,
            };

            await triggerCalmEmotions(spell, {}, statsZeroProf, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    automation: expect.objectContaining({ saveDc: 8 }),
                }),
                statsZeroProf,
                campaignName,
                mapName,
            );
        });
    });
});

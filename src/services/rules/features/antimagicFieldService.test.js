// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerAntimagicField } from './antimagicFieldService.js';
import { executeHandler } from '../../automation/index.js';

vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(),
}));

describe('antimagicFieldService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('triggerAntimagicField', () => {
        const campaignName = 'test-campaign';
        const mapName = 'testMap';
        const playerStats = {
            name: 'TestWizard',
            spellAbilities: { saveDc: 15 },
            proficiency: 4,
        };

        it('returns null for non-AMF spells', async () => {
            const result = await triggerAntimagicField(
                { name: 'Fireball', level: 3 },
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('returns null for empty or missing spell name', async () => {
            const result = await triggerAntimagicField(
                { name: null },
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('returns null for spell name without "field"', async () => {
            const result = await triggerAntimagicField(
                { name: 'Antimagic Shell' },
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('matches spell name case-insensitively', async () => {
            executeHandler.mockResolvedValue({ type: 'popup', payload: {} });

            const result = await triggerAntimagicField(
                { name: 'ANTIMAGIC FIELD' },
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(executeHandler).toHaveBeenCalled();
            expect(result).toEqual({ type: 'popup', payload: {} });

            vi.clearAllMocks();

            const result2 = await triggerAntimagicField(
                { name: 'Antimagic Field' },
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(executeHandler).toHaveBeenCalled();
            expect(result2).toEqual({ type: 'popup', payload: {} });

            vi.clearAllMocks();

            await triggerAntimagicField(
                { name: 'antimagic field' },
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(executeHandler).toHaveBeenCalled();
        });

        it('returns null when spell name is undefined', async () => {
            const result = await triggerAntimagicField(
                {},
                {},
                playerStats,
                campaignName,
                mapName,
            );
            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it('builds action with correct automation structure and calls executeHandler', async () => {
            executeHandler.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } });

            const spell = { name: 'Antimagic Field', level: 9 };
            const metaCtx = { creatures: ['Goblin'] };

            await triggerAntimagicField(spell, metaCtx, playerStats, campaignName, mapName);

            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Antimagic Field',
                    automation: {
                        type: 'antimagic_field',
                        duration: 'Concentration, up to 1 minute',
                        auraRange: 10,
                    },
                    spell,
                    metaCtx,
                }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('passes spell and metaCtx through the action', async () => {
            executeHandler.mockResolvedValue({ type: 'popup' });

            const spell = { name: 'Antimagic Field', level: 9 };
            const metaCtx = { creatures: ['Orc'], someOtherKey: 'value' };

            await triggerAntimagicField(spell, metaCtx, playerStats, campaignName, mapName);

            const [action] = executeHandler.mock.calls[0];
            expect(action.spell).toBe(spell);
            expect(action.metaCtx).toBe(metaCtx);
        });

        it('returns executeHandler result on success', async () => {
            const expectedResult = {
                type: 'popup',
                payload: { type: 'automation_info', name: 'Antimagic Field', description: 'AMF activated' },
            };
            executeHandler.mockResolvedValue(expectedResult);

            const result = await triggerAntimagicField(
                { name: 'Antimagic Field' },
                {},
                playerStats,
                campaignName,
                mapName,
            );

            expect(result).toBe(expectedResult);
        });

        it('returns null and logs error when executeHandler throws', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();
            executeHandler.mockRejectedValue(new Error('Handler failed'));

            const result = await triggerAntimagicField(
                { name: 'Antimagic Field' },
                {},
                playerStats,
                campaignName,
                mapName,
            );

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[antimagicField] Failed to execute handler'),
                expect.any(Error),
            );
            consoleSpy.mockRestore();
        });

        it('returns null when executeHandler returns null', async () => {
            executeHandler.mockResolvedValue(null);

            const result = await triggerAntimagicField(
                { name: 'Antimagic Field' },
                {},
                playerStats,
                campaignName,
                mapName,
            );

            expect(result).toBeNull();
        });
    });
});

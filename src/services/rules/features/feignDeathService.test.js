import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerFeignDeath } from './feignDeathService.js';
import { executeHandler } from '../../automation/index.js';

vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(),
}));

describe('feignDeathService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const campaignName = 'TestCampaign';
    const mapName = 'testMap';
    const playerStats = { name: 'Wizard' };

    describe('triggerFeignDeath', () => {
        it.each([
            { name: 'Fire Bolt', level: 0 },
            { name: null },
            { name: undefined },
            {},
        ])('returns null for non-Feign Death spell: $name', async (spell) => {
            const result = await triggerFeignDeath(spell, {}, playerStats, campaignName, mapName);
            expect(result).toBeNull();
            expect(executeHandler).not.toHaveBeenCalled();
        });

        it.each(['fEiGn dEaTh', 'feign death', 'FEIGN DEATH'])('matches "%s" case-insensitively', async (name) => {
            executeHandler.mockResolvedValue({ type: 'modal' });
            const result = await triggerFeignDeath({ name, duration: '1 hour' }, {}, playerStats, campaignName, mapName);
            expect(executeHandler).toHaveBeenCalled();
            expect(result).toEqual({ type: 'modal' });
        });

        it('passes spell object to executeHandler', async () => {
            executeHandler.mockResolvedValue({ type: 'modal' });
            await triggerFeignDeath({ name: 'Feign Death', duration: '1 hour' }, {}, playerStats, campaignName, mapName);
            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Feign Death',
                    automation: { type: 'feign_death' },
                    spell: { name: 'Feign Death', duration: '1 hour' },
                }),
                playerStats,
                campaignName,
                mapName,
            );
        });

        it('returns handler result on success, null when handler returns null or throws', async () => {
            const expectedResult = {
                type: 'modal',
                modalName: 'feignDeathTargetSelection',
                payload: {},
            };
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            executeHandler.mockResolvedValue(expectedResult);
            let result = await triggerFeignDeath({ name: 'Feign Death', duration: '1 hour' }, {}, playerStats, campaignName, mapName);
            expect(result).toBe(expectedResult);

            executeHandler.mockResolvedValue(null);
            result = await triggerFeignDeath({ name: 'Feign Death', duration: '1 hour' }, {}, playerStats, campaignName, mapName);
            expect(result).toBeNull();

            executeHandler.mockRejectedValue(new Error('Handler failed'));
            result = await triggerFeignDeath({ name: 'Feign Death', duration: '1 hour' }, {}, playerStats, campaignName, mapName);
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                '[feignDeath] Failed to execute Feign Death handler:',
                expect.any(Error),
            );

            consoleSpy.mockRestore();
        });
    });
});

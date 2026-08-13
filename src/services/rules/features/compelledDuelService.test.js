import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerCompelledDuel } from './compelledDuelService.js';
import { executeHandler } from '../../automation/index.js';

vi.mock('../../automation/index.js', () => ({
    executeHandler: vi.fn(),
}));

describe('compelledDuelService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const campaignName = 'TestCampaign';
    const mapName = 'testMap';
    const playerStats = {
        name: 'Paladin',
        spellAbilities: { saveDc: 15, modifier: 4, spellCastingAbility: 'Charisma', toHit: 9 },
        proficiency: 4,
    };

    describe('triggerCompelledDuel', () => {
        it('executes handler with correct automation type, saveDc and targetName', async () => {
            executeHandler.mockResolvedValue(null);
            await triggerCompelledDuel({ name: 'Compelled Duel', level: 1 }, { targetName: 'Goblin', spellSaveDc: 15 }, playerStats, campaignName, mapName);
            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Compelled Duel',
                    automation: { type: 'compelled_duel', saveDc: 15, saveType: 'WIS', targetName: 'Goblin' },
                }),
                playerStats, campaignName, mapName,
            );
        });

        it('passes the spell through to the action', async () => {
            executeHandler.mockResolvedValue(null);
            const spell = { name: 'Compelled Duel', level: 1 };
            await triggerCompelledDuel(spell, { targetName: 'Goblin' }, playerStats, campaignName, mapName);
            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({ spell }),
                playerStats, campaignName, mapName,
            );
        });

        it.each([null, {}])('falls back to "Unknown" when metaCtx is %s', async (metaCtx) => {
            executeHandler.mockResolvedValue(null);
            await triggerCompelledDuel({ name: 'Compelled Duel', level: 1 }, metaCtx, playerStats, campaignName, mapName);
            expect(executeHandler).toHaveBeenCalledWith(
                expect.objectContaining({ automation: expect.objectContaining({ targetName: 'Unknown' }) }),
                playerStats, campaignName, mapName,
            );
        });

        it('re-throws when executeHandler rejects', async () => {
            executeHandler.mockRejectedValue(new Error('Handler failed'));
            await expect(triggerCompelledDuel({ name: 'Compelled Duel', level: 1 }, { targetName: 'Goblin' }, playerStats, campaignName, mapName)).rejects.toThrow('Handler failed');
        });
    });
});

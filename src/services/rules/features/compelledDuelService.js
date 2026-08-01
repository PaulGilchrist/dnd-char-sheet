import { executeHandler } from '../../automation/index.js';

export async function triggerCompelledDuel(spell, metaCtx, playerStats, campaignName, mapName) {
    const action = {
        name: 'Compelled Duel',
        spell: spell,
        automation: {
            type: 'compelled_duel',
            saveDc: metaCtx?.spellSaveDc,
            saveType: 'WIS',
            targetName: metaCtx?.targetName || 'Unknown',
        },
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[compelledDuelService] Failed to execute Compelled Duel handler:', e);
        throw e;
    }
}

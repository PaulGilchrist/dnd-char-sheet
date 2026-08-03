import { executeHandler } from '../../automation/index.js';

export async function triggerConfusion(spell, metaCtx, playerStats, campaignName, mapName) {
    const isConfusion = (spell.name || '').toLowerCase() === 'confusion';
    if (!isConfusion) return null;

    let spellSaveDc;
    if (metaCtx?.spellSaveDc == null) {
        if (playerStats.spellAbilities?.saveDc == null) {
            if (playerStats.proficiency == null) {
                console.error('[confusionService] triggerConfusion: playerStats.proficiency is missing');
                throw new Error('playerStats.proficiency is required for confusion');
            }
            spellSaveDc = 8 + playerStats.proficiency;
        } else {
            spellSaveDc = playerStats.spellAbilities.saveDc;
        }
    } else {
        spellSaveDc = metaCtx.spellSaveDc;
    }

    const action = {
        name: spell.name,
        automation: {
            type: 'confusion',
            saveDc: spellSaveDc,
            saveType: 'WIS',
        },
        spell,
        spellSlotLevel: metaCtx?.slotLevel || spell.level,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[confusionService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}

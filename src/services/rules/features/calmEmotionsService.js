import { executeHandler } from '../../automation/index.js';

export async function triggerCalmEmotions(spell, metaCtx, playerStats, campaignName, mapName) {
    const isCalmEmotions = (spell.name || '').toLowerCase() === 'calm emotions';
    if (!isCalmEmotions) return null;

    let spellSaveDc;
    if (metaCtx?.spellSaveDc == null) {
        if (playerStats.spellAbilities?.saveDc == null) {
            if (playerStats.proficiency == null) {
                console.error('[calmEmotionsService] triggerCalmEmotions: playerStats.proficiency is missing')
                throw new Error('playerStats.proficiency is required for Calm Emotions')
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
            type: 'calm_emotions',
            saveDc: spellSaveDc,
            saveType: 'CHA',
        },
        spell,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[calmEmotionsService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}

import { executeHandler } from '../../automation/index.js';

export async function triggerRayOfEnfeeblement(spell, metaCtx, playerStats, campaignName, mapName) {
    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);

    const action = {
        name: 'Ray of Enfeeblement',
        spell: spell,
        automation: {
            type: 'ray_of_enfeeblement',
            saveDc: spellSaveDc,
            targetName: metaCtx?.targetName || 'Unknown',
        },
    };

    try {
        await executeHandler(action, playerStats, campaignName, mapName);
    } catch (e) {
        console.error('[rayOfEnfeeblement] Trigger failed:', e);
        throw e;
    }
}

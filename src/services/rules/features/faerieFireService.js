import { executeHandler } from '../../automation/index.js';

export async function triggerFaerieFire(spell, metaCtx, playerStats, campaignName, mapName) {
    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 1;

    const action = {
        name: spell.name,
        automation: {
            type: 'faerie_fire',
            saveDc: spellSaveDc,
            saveType: 'DEX',
        },
        spell,
        spellSlotLevel: slotLevel,
        metaCtx: { ...(metaCtx || {}) },
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[faerieFireService] Failed to execute Faerie Fire handler:', e);
        return null;
    }
}

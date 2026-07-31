import { executeHandler } from '../../automation/index.js';

export async function triggerAntimagicField(spell, metaCtx, playerStats, campaignName, mapName) {
    const isAmf = (spell.name || '').toLowerCase() === 'antimagic field';
    if (!isAmf) return null;

    const action = {
        name: 'Antimagic Field',
        automation: {
            type: 'antimagic_field',
            duration: 'Concentration, up to 1 minute',
            auraRange: 10,
        },
        spell,
        metaCtx,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[antimagicField] Failed to execute handler:', e);
        return null;
    }
}

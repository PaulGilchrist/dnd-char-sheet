import { executeHandler } from '../../automation/index.js';

export async function triggerFeignDeath(spell, metaCtx, playerStats, campaignName, mapName) {
    const isFeignDeath = (spell.name || '').toLowerCase() === 'feign death';
    if (!isFeignDeath) return null;

    const action = {
        name: 'Feign Death',
        automation: {
            type: 'feign_death',
        },
        spell,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[feignDeath] Failed to execute Feign Death handler:', e);
        return null;
    }
}

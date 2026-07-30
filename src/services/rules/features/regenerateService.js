import { executeHandler, applyRegenerateEffect } from '../../automation/index.js';

export async function triggerRegenerate(spell, metaCtx, playerStats, campaignName, mapName) {
    const isRegenerate = (spell.name || '') === 'Regenerate';
    if (!isRegenerate) return null;

    const action = {
        name: 'Regenerate',
        automation: {
            type: 'regenerate',
            range: spell.range || 'Touch',
        },
        spell,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[regenerate] Failed to execute Regenerate handler:', e);
        return null;
    }
}

export async function confirmRegenerate(action, playerStats, campaignName, mapName, targetName) {
    try {
        const appliedResult = await applyRegenerateEffect(action, playerStats, campaignName, mapName, targetName);
        return appliedResult;
    } catch (e) {
        console.error('[regenerate] Failed to apply Regenerate effect:', e);
        return null;
    }
}

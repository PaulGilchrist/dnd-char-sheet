import { executeHandler } from '../../automation/index.js';

export async function triggerForcecage(spell, metaCtx, playerStats, campaignName, mapName) {
    const isForcecage = (spell.name || '').toLowerCase() === 'forcecage';
    if (!isForcecage) return null;

    const slotLevel = metaCtx?.slotLevel || spell.level || 7;

    const action = {
        name: 'Forcecage',
        automation: {
            type: 'forcecage',
            saveDc: 'ability',
            saveAbility: 'CHA',
            duration: 'Concentration, up to 1 hour',
            concentration: true,
            ruleset: '2024',
            range: spell.range || '100 feet',
        },
        spell,
        spellSlotLevel: slotLevel,
        metaCtx: metaCtx,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[forcecage] Failed to execute handler:', e);
        return null;
    }
}

import { executeHandler } from '../../automation/index.js';
import { applyBeaconOfHopeEffect } from '../../automation/handlers/spells/beaconOfHopeHandler.js';

export async function triggerBeaconOfHope(spell, metaCtx, playerStats, campaignName, mapName) {
    const isBeacon = (spell.name || '').toLowerCase() === 'beacon of hope';
    if (!isBeacon) return null;

    const slotLevel = metaCtx?.slotLevel || spell.level || 3;

    const action = {
        name: 'Beacon of Hope',
        automation: {
            type: 'beacon_of_hope',
            range: spell.range || '30 feet',
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[beaconOfHope] Failed to execute Beacon of Hope handler:', e);
        return null;
    }
}

export async function confirmBeaconOfHope(action, playerStats, campaignName, mapName, targetNames) {
    try {
        const result = await applyBeaconOfHopeEffect(action, playerStats, campaignName, mapName, targetNames);
        return result;
    } catch (e) {
        console.error('[beaconOfHope] Failed to apply Beacon of Hope effect:', e);
        return null;
    }
}

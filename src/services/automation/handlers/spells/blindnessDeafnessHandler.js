import { buildSaveDc } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import * as mapsService from '../../../maps/mapsService.js';
import { rangeToFeet } from '../../../rules/combat/rangeValidation.js';

const BLINDNESS_DEAFNESS_OPTIONS = [
    { key: 'blinded', label: 'Blinded', condition: 'blinded' },
    { key: 'deafened', label: 'Deafened', condition: 'deafened' },
];

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;
    const saveDc = buildSaveDc(auto, playerStats);
    if (saveDc == null || saveDc === 10) {
        console.error(`[blindnessDeafnessHandler] Could not compute spell save DC for ${playerStats.name}. Check automation.saveDc in spell data.`);
    }
    const rangeFeet = rangeToFeet(auto.range) || 120;

    const cs = await getCombatContext(campaignName);

    let attackerPos = null;
    let mapData = null;
    if (_mapName) {
        try {
            mapData = await mapsService.loadMapData(campaignName, _mapName);
            const attackerPlayer = mapData?.players?.find(p => p.name === playerStats.name);
            if (attackerPlayer) {
                attackerPos = { gridX: attackerPlayer.gridX, gridY: attackerPlayer.gridY };
            }
        } catch (error) { console.warn('[blindnessDeafnessHandler] Attacker position unavailable:', error); }
    }

    return {
        type: 'modal',
        modalName: 'blindnessDeafness',
        payload: {
            combatSummary: cs,
            attackerName: playerStats.name,
            attackerPos,
            saveDc,
            campaignName,
            mapData,
            featureName: action.name,
            rangeFeet,
        },
    };
}

export function getEffectOptions() {
    return BLINDNESS_DEAFNESS_OPTIONS;
}

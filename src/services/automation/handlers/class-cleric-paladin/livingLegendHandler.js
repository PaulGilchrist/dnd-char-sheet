import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

const LIVING_LEGEND_KEY = 'livingLegendActive';
const UNERRING_STRIKE_KEY = 'unerringStrikeUsed';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;
    const playerName = playerStats.name;

    // Activate Living Legend buff
    const result = await activateLivingLegend(action, playerStats, campaignName);
    if (result && result.type === 'popup') return result;

    await setRuntimeValue(playerName, LIVING_LEGEND_KEY, true, campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerName,
        abilityName: action.name,
        description: `${playerName} activated ${action.name}. Charisma checks have advantage, can reroll failed saving throws, and missed weapon attacks once per turn hit automatically.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[livingLegend] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: auto.type,
            description: `${action.name} activated! Charisma checks have advantage, can reroll failed saving throws (Reaction), and missed weapon attacks hit once per turn.`,
            automation: auto,
        },
    };
}

async function activateLivingLegend(action, playerStats, campaignName) {
    const playerName = playerStats.name;
    const isActive = await getRuntimeValue(playerName, LIVING_LEGEND_KEY, campaignName);
    if (isActive) {
        return {
            type: 'popup',
            payload: {
                type: 'warning',
                name: action.name,
                description: `${action.name} is already active.`,
            },
        };
    }
    return null;
}

export async function setUnerringStrikeUsed(playerName, campaignName, used) {
    await setRuntimeValue(playerName, UNERRING_STRIKE_KEY, used, campaignName);
}

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { GIANT_ANCESTRY_KEY, GIANT_OPTIONS, getOptionByName } from './giantAncestryOptions.js';

export async function confirmGiantAncestry(playerStats, chosenOption, campaignName) {
    await setRuntimeValue(playerStats.name, GIANT_ANCESTRY_KEY, chosenOption, campaignName);

    const option = getOptionByName(chosenOption);
    if (!option) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: 'Giant Ancestry',
                description: 'No option selected.',
                automation: { type: 'resource_pool' },
            },
        };
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: 'Giant Ancestry',
            description: `Selected ${chosenOption}. Uses equal to Proficiency Bonus. Recharges on a Long Rest.`,
            automation: { type: 'resource_pool' },
        },
    };
}

export function getGiantAncestrySelection(playerStats, campaignName) {
    return getRuntimeValue(playerStats.name, GIANT_ANCESTRY_KEY, campaignName);
}

export function getGiantAncestryOptions() {
    return GIANT_OPTIONS;
}

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import {
    handleCloudsJaunt,
    handleFiresBurn,
    handleFrostsChill,
    handleHillsTumble,
    handleStonesEndurance,
    handleStormsThunder,
} from './giantAncestryDispatch.js';
import { GIANT_ANCESTRY_KEY, getOptionByName } from './giantAncestryOptions.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const storedSelection = getRuntimeValue(playerStats.name, GIANT_ANCESTRY_KEY, campaignName);

    // If no selection made yet, show the selection modal
    if (!storedSelection) {
        return {
            type: 'modal',
            modalName: 'giantAncestry',
            payload: {
                action,
                playerStats,
                campaignName,
            },
        };
    }

    const option = getOptionByName(storedSelection);
    if (!option) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `Giant Ancestry: ${storedSelection} (already selected).`,
                automation: action.automation,
            },
        };
    }

    // Dispatch to the appropriate handler based on the selected option type
    switch (option.type) {
    case 'teleport':
        return await handleCloudsJaunt(action, playerStats, campaignName, option);
    case 'damage':
        return await handleFiresBurn(action, playerStats, campaignName, option);
    case 'damage_with_condition':
        return await handleFrostsChill(action, playerStats, campaignName, option);
    case 'auto_effect':
        return await handleHillsTumble(action, playerStats, campaignName, option);
    case 'damage_reduction':
        return await handleStonesEndurance(action, playerStats, campaignName, option);
    case 'reaction_damage':
        return await handleStormsThunder(action, playerStats, campaignName, option);
    default:
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `Giant Ancestry: Unknown option type "${option.type}".`,
                automation: action.automation,
            },
        };
    }
}

export async function handleDirectType(action, playerStats, campaignName, _mapName) {
    const storedSelection = getRuntimeValue(playerStats.name, GIANT_ANCESTRY_KEY, campaignName);

    if (!storedSelection) {
        return {
            type: 'modal',
            modalName: 'giantAncestry',
            payload: {
                action,
                playerStats,
                campaignName,
            },
        };
    }

    const option = getOptionByName(storedSelection);
    if (!option) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `Giant Ancestry: ${storedSelection} (already selected).`,
                automation: action.automation,
            },
        };
    }

    const directType = action.automation?.type || '';

    // If the automation type matches the selected option type, dispatch directly
    if (directType === option.type) {
        switch (option.type) {
        case 'teleport':
            return await handleCloudsJaunt(action, playerStats, campaignName, option);
        case 'damage':
            return await handleFiresBurn(action, playerStats, campaignName, option);
        case 'damage_with_condition':
            return await handleFrostsChill(action, playerStats, campaignName, option);
        case 'auto_effect':
            return await handleHillsTumble(action, playerStats, campaignName, option);
        case 'damage_reduction':
            return await handleStonesEndurance(action, playerStats, campaignName, option);
        case 'reaction_damage':
            return await handleStormsThunder(action, playerStats, campaignName, option);
        default:
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: action.name,
                    description: `Giant Ancestry: Unknown option type "${option.type}".`,
                    automation: action.automation,
                },
            };
        }
    }

    // Type doesn't match - show info that wrong option was selected
    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: `Giant Ancestry: ${storedSelection} is selected. To use ${directType}, change your selection.`,
            automation: action.automation,
        },
    };
}

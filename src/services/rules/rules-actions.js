import { uniqBy } from 'lodash';
import { is2024 } from './rules-helpers.js';
import { getSubModules } from './rules-core.js';
import { categorizeFeatures } from '../character/featureCategorizationUtils.js';

/**
 * Get actions for a character (ruleset-specific).
 */
export function getActions(playerStats, playerSummary) {
    const { classRules: cr, raceRules: rr } = getSubModules(playerStats, playerSummary);
    const features = cr.getFeatures(playerStats);
    const traits = rr.getTraits(playerStats);

    // Process character-level features array (e.g., Deflect Attacks from character JSON)
    const characterFeatures = playerSummary?.features && Array.isArray(playerSummary.features)
        ? categorizeFeatures(playerSummary.features, cr.featureCategories || {})
        : { actions: [], bonusActions: [], reactions: [], specialActions: [], characterAdvancement: [] };

    if (is2024(playerStats, playerSummary)) {
        return getActions2024(playerStats, features, traits, characterFeatures);
    }

    return getActions5e(playerStats, features, traits, characterFeatures);
}

function getActions2024(playerStats, features, traits, characterFeatures = {}) {
    // 2024: normalize string actions, include magic/utilize/craft actions
    const playerActions = playerStats.actions;
    if (!Array.isArray(playerActions)) {
        console.error('rules: expected actions to be an array for', playerStats.name);
        throw new Error('Missing array: actions for ' + playerStats.name);
    }
    const playerActionsMapped = playerActions.map(action =>
        typeof action === 'string' ? { name: action, description: '', details: null } : action
    );

    const actions = uniqBy([
         ...playerActionsMapped,
         ...features.actions,
         ...characterFeatures.actions,
         ...traits.actions,
         ...(playerStats.magicActions ? playerStats.magicActions : []),
         ...(playerStats.utilizeActions ? playerStats.utilizeActions : []),
         ...(playerStats.craftActions ? playerStats.craftActions : [])
     ], 'name').sort((a, b) => a.name.localeCompare(b.name));

    const bonusActions = uniqBy([
         ...(playerStats.bonusActions ? playerStats.bonusActions : []),
         ...features.bonusActions,
         ...characterFeatures.bonusActions,
         ...traits.bonusActions
     ], 'name').sort((a, b) => a.name.localeCompare(b.name));

    const reactions = uniqBy([
         ...(playerStats.reactions ? playerStats.reactions : []),
         ...features.reactions,
         ...characterFeatures.reactions,
         ...traits.reactions
     ], 'name').sort((a, b) => a.name.localeCompare(b.name));

    const playerSpecialActions = playerStats.specialActions;
    if (!Array.isArray(playerSpecialActions)) {
        console.error('rules: expected specialActions to be an array for', playerStats.name);
        throw new Error('Missing array: specialActions for ' + playerStats.name);
    }
    const playerSpecialActionsMapped = playerSpecialActions.map(action =>
        typeof action === 'string' ? { name: action, description: '', details: null } : action
    );

     const specialActions = uniqBy([
           ...features.specialActions,
           ...characterFeatures.specialActions,
           ...traits.specialActions,
           ...playerSpecialActionsMapped,
          ...(playerStats.magicSpecialActions ? playerStats.magicSpecialActions : []),
          ...(playerStats.utilizeSpecialActions ? playerStats.utilizeSpecialActions : []),
          ...(playerStats.craftSpecialActions ? playerStats.craftSpecialActions : [])
      ], 'name').sort((a, b) => a.name.localeCompare(b.name));

    const characterAdvancement = uniqBy([...features.characterAdvancement, ...characterFeatures.characterAdvancement, ...traits.characterAdvancement], 'name').sort((a, b) => a.name.localeCompare(b.name));

    return [actions, bonusActions, reactions, specialActions, characterAdvancement];
}

function getActions5e(playerStats, features, traits, characterFeatures = {}) {
    // 5e: original action handling
    const actions = playerStats.actions;
    if (!Array.isArray(actions)) {
        console.error('rules: expected actions to be an array for', playerStats.name);
        throw new Error('Missing array: actions for ' + playerStats.name);
    }
    const bonusActions = playerStats.bonusActions;
    if (!Array.isArray(bonusActions)) {
        console.error('rules: expected bonusActions to be an array for', playerStats.name);
        throw new Error('Missing array: bonusActions for ' + playerStats.name);
    }
    const reactions = playerStats.reactions;
    if (!Array.isArray(reactions)) {
        console.error('rules: expected reactions to be an array for', playerStats.name);
        throw new Error('Missing array: reactions for ' + playerStats.name);
    }
    const specialActions = playerStats.specialActions;
    if (!Array.isArray(specialActions)) {
        console.error('rules: expected specialActions to be an array for', playerStats.name);
        throw new Error('Missing array: specialActions for ' + playerStats.name);
    }
    const actionsResult = uniqBy([...actions, ...features.actions, ...characterFeatures.actions, ...traits.actions], 'name').sort((a, b) => a.name.localeCompare(b.name));
    const bonusActionsResult = uniqBy([...bonusActions, ...features.bonusActions, ...characterFeatures.bonusActions, ...traits.bonusActions], 'name').sort((a, b) => a.name.localeCompare(b.name));
    const reactionsResult = uniqBy([...reactions, ...features.reactions, ...characterFeatures.reactions, ...traits.reactions], 'name').sort((a, b) => a.name.localeCompare(b.name));
    const specialActionsResult = uniqBy([...specialActions, ...features.specialActions, ...characterFeatures.specialActions, ...traits.specialActions], 'name').sort((a, b) => a.name.localeCompare(b.name));
    const characterAdvancement = uniqBy([...features.characterAdvancement, ...characterFeatures.characterAdvancement, ...traits.characterAdvancement], 'name').sort((a, b) => a.name.localeCompare(b.name));

    return [actionsResult, bonusActionsResult, reactionsResult, specialActionsResult, characterAdvancement];
}

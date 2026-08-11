import { getRuntimeValue } from '../runtime/useRuntimeState.js';

const SELECTION_KEY = 'BattleMasterManeuvers_selection';

export { SELECTION_KEY };

export function getKnownManeuvers(characterName, campaignName) {
    const stored = getRuntimeValue(characterName, SELECTION_KEY, campaignName);
    return Array.isArray(stored) ? stored : [];
}

export function getSuperiorityDice(characterName, campaignName) {
    const usesKey = 'superiorityDice';
    const defaultMax = 4;
    return Number(getRuntimeValue(characterName, usesKey, campaignName) ?? defaultMax);
}

import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js';

export function consumeFeatsOfChaos(characterName, campaignName) {
    const focActive = getRuntimeValue(characterName, 'featsOfChaosActive', campaignName);
    if (focActive === true) {
        setRuntimeValue(characterName, 'featsOfChaosActive', false, campaignName, true);
    }
}

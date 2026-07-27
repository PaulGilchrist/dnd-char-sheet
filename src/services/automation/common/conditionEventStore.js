import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

export async function storeConditionEvent(campaignName, targetName, conditionKey) {
    await setRuntimeValue('campaign', 'lastAttack', {
        attackerName: null,
        targetName,
        rollType: 'condition',
        conditionKey,
        timestamp: Date.now(),
    }, campaignName);
}

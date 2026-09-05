import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';

/**
 * CLA-307 Self-Restoration (and any `condition_removal` effect collected from
 * `end_of_turn_condition_removal` passive rules): remove the listed conditions
 * from the OWNER's own activeConditions at the END of the owner's turn.
 *
 * Called from navigationHandlers.handleNextCreature (outgoing owner, sync POST)
 * and the sseHandlers activeCreatureName echo (remote clients, skipSync=true —
 * the server already holds the GM's removal; re-POSTing would loop).
 *
 * Idempotent: only writes/logs when a matching condition is actually present,
 * so Previous/rewind re-entry never double-removes or double-logs.
 */
export async function applyTurnEndConditionRemoval(ownerName, playerStats, campaignName, skipSync = false) {
    if (!ownerName || !playerStats) return;

    const turnStartEffects = Array.isArray(playerStats.turnStartEffects) ? playerStats.turnStartEffects : [];
    const removalEffects = turnStartEffects.filter(e => e && e.type === 'condition_removal' && Array.isArray(e.conditions) && e.conditions.length > 0);
    if (removalEffects.length === 0) return;

    const storedConds = getRuntimeValue(ownerName, 'activeConditions', campaignName);
    const conditions = Array.isArray(storedConds) ? storedConds : [];
    if (conditions.length === 0) return;

    const removalSet = new Set();
    for (const effect of removalEffects) {
        effect.conditions.forEach(c => removalSet.add(String(c).toLowerCase()));
    }

    const removed = conditions.filter(c => removalSet.has(String(c).toLowerCase()));
    if (removed.length === 0) return;

    const filtered = conditions.filter(c => !removalSet.has(String(c).toLowerCase()));
    await setRuntimeValue(ownerName, 'activeConditions', filtered, campaignName, skipSync);

    for (const condition of removed) {
        const condKey = String(condition).toLowerCase();
        const featureNames = removalEffects
            .filter(e => e.conditions.some(c => String(c).toLowerCase() === condKey))
            .map(e => e.name)
            .filter(Boolean)
            .join(', ') || 'Self-Restoration';
        const label = String(condition).charAt(0).toUpperCase() + String(condition).slice(1);
        await addEntry(campaignName, {
            type: 'condition',
            action: 'removed',
            characterName: ownerName,
            condition: label,
            reason: featureNames,
            timestamp: Date.now(),
        }).catch((e) => { console.error('[turnEndConditionRemoval] Error:', e); });
    }
}

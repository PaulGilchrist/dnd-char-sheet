import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import utils from '../../ui/utils.js';
import { getCurrentCombatRound, getActiveCreatureName, getCombatSummary } from '../../encounters/combatData.js';
import { expireForCreature, expireForTarget } from './expirationQueue.js';
import { processSleetStormAreaSave } from '../../automation/handlers/spells/sleetStormHandler.js';

/**
 * Expire stale pendingExpirations at the start of each creature's turn.
 */
export async function expireStaleEffects(campaignName, overrideActiveName) {
    const currentRound = getCurrentCombatRound(campaignName);
    const activeName = overrideActiveName || getActiveCreatureName(campaignName);
    if (!activeName) return;

    try {
        const combatData = getCombatSummary(campaignName);
        if (!combatData || typeof combatData !== 'object') return;
        const creatures = combatData.creatures;
        if (!Array.isArray(creatures)) return;

        // Phase 1: Process entries owned by the active creature
        for (const attacker of creatures) {
            if (utils.getName(attacker.name) !== utils.getName(activeName)) continue;
            expireForCreature(attacker.name, currentRound, campaignName);

            // Wild Magic Surge: expire effects with "end of your current turn" duration
            const surgeEffects = getRuntimeValue(attacker.name, 'wildMagicSurgeEffects', campaignName);
            if (Array.isArray(surgeEffects) && surgeEffects.length > 0) {
                const filtered = surgeEffects.filter(e => {
                    if (!e || !e.duration) return true;
                    return e.duration.trim().toLowerCase() !== 'end of your current turn';
                });
                if (filtered.length !== surgeEffects.length) {
                    setRuntimeValue(attacker.name, 'wildMagicSurgeEffects', filtered, campaignName, true);
                    console.error(`[expirations] Removed ${surgeEffects.length - filtered.length} "end of current turn" surge effects for ${attacker.name}`);
                }
            }
        }

        // Phase 2: Scan all stores for entries targeting the active creature
        // This handles self-targeted effects (e.g. Nature's Veil, Misty Escape)
        // stored on the character's own pendingExpirations — they fire whenever
        // the target becomes active, regardless of who owns the entry.
        expireForTarget(activeName, currentRound, campaignName);

        // Phase 3: Check for recurring Sleet Storm area saves
        // When a creature starts its turn in the sleet storm area, it must make a DEX save
        // Only run if the active creature is actually in the combat summary (i.e., is a caster)
        const activeCreature = creatures.find(c => utils.getName(c.name) === utils.getName(activeName));
        if (activeCreature) {
            const sleetStormTrackingKey = `_sleetStorm_${activeName.replace(/\s+/g, '_')}`;
            const sleetStormTracking = getRuntimeValue(activeName, sleetStormTrackingKey, campaignName);
            if (sleetStormTracking && sleetStormTracking.saveDc) {
                // The active creature is the caster — check all other creatures for sleet storm effects
                const allTargetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
                const sleetEffects = Array.isArray(allTargetEffects)
                    ? allTargetEffects.filter(te => te.effect === 'sleet_storm' && te.source === activeName)
                    : [];
                for (const te of sleetEffects) {
                    const teTargetName = te.target;
                    if (teTargetName === activeName) continue;
                    // Skip if already Prone (no need to re-save)
                    const targetConditions = getRuntimeValue(teTargetName, 'activeConditions', campaignName) || [];
                    const isAlreadyProne = Array.isArray(targetConditions) && targetConditions.some(c => String(c).toLowerCase() === 'prone');
                    if (isAlreadyProne) continue;
                    // Trigger recurring save
                    try {
                        await processSleetStormAreaSave(activeName, teTargetName, campaignName, sleetStormTracking.mapName);
                    } catch (_e) { /* ignore per-creature errors */ }
                }
            }
        }
    } catch (_e) { /* ignore */ }
}

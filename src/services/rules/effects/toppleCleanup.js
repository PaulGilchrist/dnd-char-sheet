import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCurrentCombatRound } from '../../encounters/combatData.js';

/**
 * Clean up Topple weapon mastery Prone condition at start of target's next turn.
 */
export function cleanUpToppleConditions(activeName, campaignName) {
    const allTargetEffectsTopple = getRuntimeValue('campaign', 'targetEffects') || [];
    if (allTargetEffectsTopple.length > 0) {
        const currentRound = getCurrentCombatRound(campaignName);
        const toppleTargets = new Set();
        for (const te of allTargetEffectsTopple) {
            if (te.effect !== 'topple') continue;
            if (!te.target) continue;
            if (te.appliedRound == null) continue;
            if (currentRound >= te.appliedRound + 1) {
                toppleTargets.add(te.target);
            }
        }
        if (toppleTargets.size > 0) {
            for (const toppleTarget of toppleTargets) {
                const storedConditions = getRuntimeValue(toppleTarget, 'activeConditions') || [];
                const conditions = Array.isArray(storedConditions) ? storedConditions : [];
                const filtered = conditions.filter(c => String(c).toLowerCase() !== 'prone');
                if (filtered.length !== conditions.length) {
                    setRuntimeValue(toppleTarget, 'activeConditions', filtered, campaignName);
                }
            }
            const hadRecklessBefore = allTargetEffectsTopple.some(te => te.effect === 'reckless_attack' && te.target === 'Thulgar');
            const cleanedTopple = allTargetEffectsTopple.filter(te => {
                if (te.effect !== 'topple') return true;
                if (!te.appliedRound) return true;
                if (toppleTargets.has(te.target) && currentRound >= te.appliedRound + 1) {
                    return false;
                }
                return true;
            });
            const hadRecklessAfter = cleanedTopple.some(te => te.effect === 'reckless_attack' && te.target === 'Thulgar');
            if (cleanedTopple.length !== allTargetEffectsTopple.length && hadRecklessBefore && !hadRecklessAfter) {
                // Reckless Attack cleared by topple logic
            }
            if (cleanedTopple.length !== allTargetEffectsTopple.length) {
                setRuntimeValue('campaign', 'targetEffects', cleanedTopple, campaignName);
            }
        }
    }
}

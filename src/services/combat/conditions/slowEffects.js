// SP-109: Slow target-effect registry helpers. Kept dependency-light (runtime
// store only) so initiative/sheet save-end cleanup can strip Slow's target
// effects without pulling in the automation execution graph.
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

export const SLOW_TE_EFFECTS = [
    'no_reactions',
    'dex_save_disadvantage',
    'ac_penalty',
    'action_limit',
    'single_attack_limit',
    'somatic_failure_chance',
];

export function removeSlowEffectsForTarget(targetName, campaignName) {
    const storedEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const effects = Array.isArray(storedEffects) ? storedEffects : [];
    const remaining = effects.filter(
        te => !(te.target === targetName && SLOW_TE_EFFECTS.includes(te.effect))
    );
    if (remaining.length !== effects.length) {
        setRuntimeValue('campaign', 'targetEffects', remaining, campaignName);
        return true;
    }
    return false;
}

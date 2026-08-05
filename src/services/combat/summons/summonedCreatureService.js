import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../encounters/combatData.js';
import storage from '../../ui/storage.js';

const SUMMONED_EFFECT = 'summoned';

export function isSpellSummon(creature) {
    return Boolean(creature && creature.summonSource === 'spell');
}

export function removeSummonedCreatures(sourceName, campaignName) {
    if (!sourceName || !campaignName) return;

    const combatSummary = getCombatSummary(campaignName);
    if (combatSummary && Array.isArray(combatSummary.creatures)) {
        const keptCreatures = combatSummary.creatures.filter(
            c => !(c.summonedBy === sourceName && c.summonSource === 'spell')
        );
        if (keptCreatures.length !== combatSummary.creatures.length) {
            combatSummary.creatures = keptCreatures;
            storage.set('combatSummary', combatSummary, campaignName);
            window.dispatchEvent(new CustomEvent('combat-summary-updated'));
        }
    }

    const targetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = targetEffects.filter(
        te => !(te.effect === SUMMONED_EFFECT && te.source === sourceName && te.summonSource === 'spell')
    );
    if (filtered.length !== targetEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    }
}

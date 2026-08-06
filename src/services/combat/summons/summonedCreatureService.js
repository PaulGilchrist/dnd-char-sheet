import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary, setCombatSummaryCache } from '../../encounters/combatData.js';
import storage from '../../ui/storage.js';

const SUMMONED_EFFECT = 'summoned';

export function isSpellSummon(creature) {
    return Boolean(creature && creature.summonSource === 'spell');
}

export function removeSummonedCreatures(sourceName, campaignName) {
    if (!sourceName || !campaignName) return;

    console.log('[removeSummonedCreatures] sourceName:', sourceName, 'campaignName:', campaignName);

    const combatSummary = getCombatSummary(campaignName);
    if (combatSummary && Array.isArray(combatSummary.creatures)) {
        const summonedCreatures = combatSummary.creatures.filter(
            c => c.summonedBy === sourceName && (c.summonSource === 'spell' || c.summonSource === 'true_polymorph')
        );
        console.log('[removeSummonedCreatures] creatures matching:', summonedCreatures.map(c => c.name + ' (summonSource: ' + c.summonSource + ')'));
        const keptCreatures = combatSummary.creatures.filter(
            c => !(c.summonedBy === sourceName && (c.summonSource === 'spell' || c.summonSource === 'true_polymorph'))
        );
        if (keptCreatures.length !== combatSummary.creatures.length) {
            console.log('[removeSummonedCreatures] REMOVING creatures from combatSummary:', summonedCreatures.map(c => c.name));
            const updated = { ...combatSummary, creatures: keptCreatures };
            storage.set('combatSummary', updated, campaignName);
            setCombatSummaryCache(updated, campaignName);
            window.dispatchEvent(new CustomEvent('combat-summary-updated'));
        } else {
            console.log('[removeSummonedCreatures] No creatures removed from combatSummary (no change)');
        }
    }

    const targetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const summonedEffects = targetEffects.filter(
        te => te.effect === SUMMONED_EFFECT && te.source === sourceName && (te.summonSource === 'spell' || te.summonSource === 'true_polymorph')
    );
    console.log('[removeSummonedCreatures] targetEffects matching:', summonedEffects.map(te => te.effect + ' on ' + te.target + ' (summonSource: ' + te.summonSource + ')'));
    const filtered = targetEffects.filter(
        te => !(te.effect === SUMMONED_EFFECT && te.source === sourceName && (te.summonSource === 'spell' || te.summonSource === 'true_polymorph'))
    );
    if (filtered.length !== targetEffects.length) {
        console.log('[removeSummonedCreatures] REMOVING targetEffects:', summonedEffects.map(te => te.effect));
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    } else {
        console.log('[removeSummonedCreatures] No targetEffects removed (no change)');
    }
}

import { isWithinRange } from '../../rules/combat/rangeCheck.js';
import { getCombatContext } from '../../rules/combat/damageUtils.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

export async function getDuplicityAdvantageAgainst({ attackerName, campaignName, mapData, skipRangeCheck }) {
    let allCreatures = [];
    if (mapData) {
        const players = mapData.players?.length ? mapData.players : [];
        const placedItems = mapData.placedItems || [];
        allCreatures = [...players];
        const existingNames = new Set(allCreatures.map(c => c.name));
        for (const item of placedItems) {
            if (!existingNames.has(item.name)) {
                allCreatures.push({ name: item.name, gridX: item.gridX, gridY: item.gridY });
            }
        }
    } else {
        const combatSummary = await getCombatContext(campaignName);
        allCreatures = (combatSummary?.creatures || []).filter(c => c.type === 'player');
    }

    if (!allCreatures.length) return { advantage: false };

    for (const creature of allCreatures) {
        if (creature.name === attackerName) continue;
        const buffs = getRuntimeValue(creature.name, 'activeBuffs', campaignName) || [];
        const illusionBuff = Array.isArray(buffs) ? buffs.find(b => b.effect === 'create_illusion' && b.isImprovedDuplicity) : null;
        if (!illusionBuff) continue;

        const grantedTargets = getRuntimeValue(creature.name, 'invokeDuplicityAdvantageTargets', campaignName) || [];
        if (!Array.isArray(grantedTargets) || !grantedTargets.includes(attackerName)) continue;

        if (skipRangeCheck) {
            return { advantage: true, source: creature.name };
        }

        const inRange = await isWithinRange(creature.name, attackerName, 5);
        if (!inRange) continue;

        return { advantage: true, source: creature.name };
    }
    return { advantage: false };
}

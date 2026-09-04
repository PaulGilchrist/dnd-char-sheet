import { isWithinRange } from '../../rules/combat/rangeCheck.js';
import { getCombatContext } from '../../rules/combat/damageUtils.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

export async function getLionDisadvantageAgainst({ attackerName, campaignName, mapData, skipRangeCheck }) {
    let allCreatures = [];
    if (mapData) {
        allCreatures = mapData.players?.length ? mapData.players : [];
    } else {
        const combatSummary = await getCombatContext(campaignName);
        allCreatures = (combatSummary?.creatures || []).filter(c => c.type === 'player');
    }

    for (const player of allCreatures) {
        if (player.name === attackerName) continue;
        const buffs = getRuntimeValue(player.name, 'activeBuffs', campaignName) || [];
        const lionBuff = Array.isArray(buffs) ? buffs.find(b => b.optionName === 'Lion') : null;
        if (!lionBuff) continue;

        const range = lionBuff.range || '5 ft';
        const rangeNum = parseInt(range) || 5;

        if (skipRangeCheck) {
            return { disadvantage: true, source: player.name };
        }

        const inRange = await isWithinRange(player.name, attackerName, rangeNum);
        if (!inRange) continue;

        return { disadvantage: true, source: player.name };
    }
    return { disadvantage: false };
}

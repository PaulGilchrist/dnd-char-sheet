import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { rangeToFeet } from '../../../rules/combat/rangeValidation.js';
import { resolveMapPositions } from '../../common/targetResolver.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const spell = action.spell || {};
    const slotLevel = action.spellSlotLevel || spell.level || 1;

    const rangeFt = rangeToFeet(auto.range || spell.range || '30 feet');
    const maxTargets = Math.max(3, 3 + (slotLevel - 1));

    const positions = _mapName ? await resolveMapPositions(campaignName, _mapName, playerStats.name) : null;
    const attackerPos = positions?.attackerPos || null;

    const combatSummary = await getCombatContext(campaignName);
    if (!combatSummary) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `No combat context found. Cannot apply ${action.name}.`,
            },
        };
    }

    const creatureTargets = combatSummary.creatures.map(c => c.name);

    return {
        type: 'popup',
        payload: {
            type: 'bless_target_selection',
            name: action.name,
            creatureTargets,
            range: auto.range || spell.range || '30 feet',
            rangeFt,
            maxTargets,
            slotLevel,
            attackerPos,
            automation: auto,
        },
    };
}

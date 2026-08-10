import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { rangeToFeet } from '../../../../services/rules/combat/rangeValidation.js';
import { resolveMapPositions } from '../../common/targetResolver.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';

const DEATH_WARD_BUFF_NAME = 'Death Ward';

function getDeathWardDuration(spell) {
    return spell.duration || '8 hours';
}

export async function handle(action, playerStats, campaignName, _mapName, _characters) {
    const spell = action.spell || {};
    const rangeFt = rangeToFeet(spell.range || 'Touch');

    const positions = _mapName ? await resolveMapPositions(campaignName, _mapName, playerStats.name) : null;
    const attackerPos = positions?.attackerPos || null;

    const combatSummary = getCombatSummary(campaignName);
    const allCreatures = combatSummary?.creatures || [];

    const creatureTargets = allCreatures.map(c => c.name);

    return {
        type: 'popup',
        payload: {
            type: 'death_ward_target_selection',
            name: action.name,
            creatureTargets,
            range: spell.range || 'Touch',
            rangeFt,
            duration: getDeathWardDuration(spell),
            attackerPos,
        },
    };
}

export async function applyDeathWard(action, playerStats, campaignName, _mapName, targetNames) {
    if (!targetNames || !Array.isArray(targetNames) || targetNames.length === 0) {
        return null;
    }

    const spell = action.spell || {};
    const duration = getDeathWardDuration(spell);

    for (const targetName of targetNames) {
        const activeBuffs = getRuntimeValue(targetName, 'activeBuffs', campaignName) || [];
        const buffs = Array.isArray(activeBuffs) ? activeBuffs : [];
        const existingDeathWard = buffs.some(b => b.name === DEATH_WARD_BUFF_NAME);
        if (!existingDeathWard) {
            buffs.push({
                name: DEATH_WARD_BUFF_NAME,
                effect: 'death_ward',
                duration,
                sourceCharacter: playerStats.name,
            });
            setRuntimeValue(targetName, 'activeBuffs', buffs, campaignName);
        }

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: DEATH_WARD_BUFF_NAME,
            description: `${playerStats.name} cast ${DEATH_WARD_BUFF_NAME} on ${targetName}. Target is protected from death.`,
        }).catch((e) => { console.error("[deathWard] Error:", e); });
    }

    const targetsList = targetNames.length === 1 ? targetNames[0] : targetNames.join(', ');
    const description = targetNames.length === 1
        ? `${targetNames[0]} gained Death Ward protection from ${action.name}.`
        : `${targetNames.length} targets gained Death Ward protection from ${action.name}: ${targetsList}.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description,
        },
    };
}

export function isDeathWardActive(playerName, campaignName) {
    const stored = getRuntimeValue(playerName, 'activeBuffs', campaignName);
    const activeBuffs = Array.isArray(stored) ? stored : [];
    return activeBuffs.some(b => b.name === DEATH_WARD_BUFF_NAME && b.effect === 'death_ward');
}

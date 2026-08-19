import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { buildStarryFormLuminousArrow } from '../../../rules/core/starryFormDamage.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';

export async function handle(action, playerStats, campaignName, _mapName, _characters) {
    const storedBuffs = getRuntimeValue(playerStats.name, 'activeBuffs', campaignName);
    const activeBuffs = Array.isArray(storedBuffs) ? storedBuffs : [];
    const starryFormBuff = activeBuffs.find(b => b.name === 'Starry Form' && b.constellation === 'Archer');
    if (!starryFormBuff) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'Starry Form (Archer constellation) is not active.',
                automation: action.automation,
            },
        };
    }

    const attack = buildStarryFormLuminousArrow(playerStats, activeBuffs);
    if (!attack) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No Archer constellation active.',
                automation: action.automation,
            },
        };
    }

    const cs = getCombatSummary(campaignName);
    let targetName = null;

    if (cs && cs.turnOrder?.length > 0) {
        const currentActor = cs.turnOrder.find(a => a.name === playerStats.name);
        if (currentActor && currentActor.targetName) {
            targetName = currentActor.targetName;
        }
    }

    if (!targetName) {
        const lastAttack = getRuntimeValue('campaign', 'lastAttack', campaignName);
        if (lastAttack?.targetName) {
            targetName = lastAttack.targetName;
        }
    }

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: action.name,
        description: `${playerStats.name} fired a Starry Form Luminous Arrow at ${targetName || 'a target'}.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[starryFormArrowHandler:log-error]", e); });

    return {
        type: 'attack_roll',
        payload: {
            attack,
            targetName,
            sourceName: action.name,
        },
    };
}

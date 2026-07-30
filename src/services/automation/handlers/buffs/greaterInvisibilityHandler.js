import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { rangeToFeet } from '../../../rules/combat/rangeValidation.js';
import { resolveMapPositions } from '../../common/targetResolver.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';

const GREATER_INVISIBILITY_BUFF_NAME = 'GreaterInvisibility';

function getGreaterInvisibilityDuration(spell) {
    return spell.duration || 'Concentration, up to 1 minute';
}

export async function handle(action, playerStats, campaignName, mapName, _characters) {
    const spell = action.spell || {};

    const rangeFt = rangeToFeet(spell.range || 'Touch');

    const positions = mapName ? await resolveMapPositions(campaignName, mapName, playerStats.name) : null;
    const attackerPos = positions?.attackerPos || null;

    const combatSummary = getCombatSummary(campaignName);
    const allCreatures = combatSummary?.creatures || [];

    const creatureTargets = allCreatures.map(c => c.name);

    return {
        type: 'popup',
        payload: {
            type: 'greater_invisibility_target_selection',
            name: action.name,
            creatureTargets,
            range: spell.range || 'Touch',
            rangeFt,
            duration: getGreaterInvisibilityDuration(spell),
            attackerPos,
        },
    };
}

export async function applyGreaterInvisibility(action, playerStats, campaignName, mapName, targetNames) {
    if (!targetNames || !Array.isArray(targetNames) || targetNames.length === 0) {
        return null;
    }

    const spell = action.spell || {};
    const duration = getGreaterInvisibilityDuration(spell);
    const targets = [];

    for (const targetName of targetNames) {
        const activeBuffs = getRuntimeValue(targetName, 'activeBuffs', campaignName) || [];
        const buffs = Array.isArray(activeBuffs) ? activeBuffs : [];
        const existingGreaterInvisibility = buffs.some(b => b.name === GREATER_INVISIBILITY_BUFF_NAME);

        if (!existingGreaterInvisibility) {
            buffs.push({
                name: GREATER_INVISIBILITY_BUFF_NAME,
                effect: 'invisible',
                duration,
                sourceCharacter: playerStats.name,
            });
            setRuntimeValue(targetName, 'activeBuffs', buffs, campaignName);
        }

        const conditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
        const condArray = Array.isArray(conditions) ? conditions : [];
        if (!condArray.some(c => String(c).toLowerCase() === 'invisible')) {
            setRuntimeValue(targetName, 'activeConditions', [...condArray, 'invisible'], campaignName);
        }

        const invisKey = `_activeGreaterInvisibility_${targetName}`;
        setRuntimeValue('campaign', invisKey, playerStats.name, campaignName);

        const targetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const invisEffect = {
            target: targetName,
            effect: 'invisible',
            source: playerStats.name,
            condition: 'invisible',
            duration: 'concentration',
        };
        setRuntimeValue('campaign', 'targetEffects', [...targetEffects, invisEffect], campaignName);

        addExpiration(playerStats.name, targetName, [
            { type: 'remove_active_buff', buffName: GREATER_INVISIBILITY_BUFF_NAME }
        ], campaignName);

        const isSelf = targetName === playerStats.name;
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: 'Greater Invisibility',
            description: `${playerStats.name} cast Greater Invisibility on ${isSelf ? 'themself' : targetName}. Target gains the Invisible condition. Spell ends if target makes an attack roll, deals damage, casts a spell, or rolls initiative.`,
        }).catch((e) => { console.error('[greater-invisibility] Error logging:', e); });

        targets.push(targetName);
    }

    const targetsList = targets.length === 1 ? targets[0] : targets.join(', ');
    const description = targets.length === 1
        ? `${playerStats.name} gained Greater Invisibility from ${action.name}.`
        : `${targets.length} targets gained Greater Invisibility from ${action.name}: ${targetsList}.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description,
        },
    };
}

export function isGreaterInvisibilityActive(playerName, campaignName) {
    const stored = getRuntimeValue(playerName, 'activeBuffs', campaignName);
    const activeBuffs = Array.isArray(stored) ? stored : [];
    return activeBuffs.some(b => b.name === GREATER_INVISIBILITY_BUFF_NAME && b.effect === 'invisible');
}

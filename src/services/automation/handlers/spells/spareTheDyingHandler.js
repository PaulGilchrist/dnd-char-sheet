import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { rangeToFeet } from '../../../rules/combat/rangeValidation.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const spell = action.spell || {};

    const rangeFt = rangeToFeet(spell.range || '15 feet');

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

    const creatureTargets = combatSummary.creatures
        .map(c => {
            const hp = getRuntimeValue(c.name, 'currentHitPoints', campaignName) || 0;
            const isDead = getRuntimeValue(c.name, 'isDead', campaignName) || false;
            const isUndead = c.type && String(c.type).toLowerCase().includes('undead');
            const isConstruct = c.type && String(c.type).toLowerCase().includes('construct');
            const isValidTarget = hp === 0 && !isDead && !isUndead && !isConstruct;
            return {
                name: c.name,
                isValidTarget,
                hp,
                isDead,
                type: c.type,
            };
        })
        .filter(c => c.isValidTarget);

    if (creatureTargets.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No valid targets found. Target must have 0 HP, not be dead, and not be undead or a construct.',
            },
        };
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: 'Select a creature with 0 HP to make stable.',
            automation: spell.automation || {},
            targets: creatureTargets,
            range: spell.range || '15 feet',
            rangeFt,
        },
    };
}

export async function applySpareTheDying(action, playerStats, campaignName, _mapName, result) {
    if (!result || !result.targetName) {
        return null;
    }

    const targetName = result.targetName;

    setRuntimeValue(targetName, 'deathSaves', [true, true, true], campaignName);
    setRuntimeValue(targetName, 'deathFailures', getRuntimeValue(targetName, 'deathFailures', campaignName) || [false, false, false], campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: action.name,
        description: `${playerStats.name} cast ${action.name} on ${targetName}: Made the creature stable.`,
        targetName,
        timestamp: Date.now(),
    });

    await addEntry(campaignName, {
        type: 'spell_effect',
        characterName: playerStats.name,
        spellName: action.name,
        targetName,
        effects: ['Target became stable'],
        timestamp: Date.now(),
    }).catch((e) => { console.error('[spareTheDying] Error:', e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: `${targetName} became stable.`,
        },
    };
}

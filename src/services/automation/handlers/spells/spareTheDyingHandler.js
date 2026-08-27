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

    const casterName = playerStats?.name;
    const creatureTargets = combatSummary.creatures
        .filter(c => c.name !== casterName)
        .map(c => {
            const hp = getRuntimeValue(c.name, 'currentHitPoints', campaignName) || 0;
            const isDead = getRuntimeValue(c.name, 'isDead', campaignName) || false;
            const isUndead = c.monsterType && String(c.monsterType).toLowerCase().includes('undead');
            const isConstruct = c.monsterType && String(c.monsterType).toLowerCase().includes('construct');
            const isValidTarget = hp === 0 && !isDead && !isUndead && !isConstruct;
            return {
                name: c.name,
                isValidTarget,
                hp,
                isDead,
                type: c.monsterType,
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
    const casterName = playerStats.name;

    const targetHp = getRuntimeValue(targetName, 'currentHitPoints', campaignName) || 0;
    const isDead = getRuntimeValue(targetName, 'isDead', campaignName) || false;
    if (targetHp !== 0 || isDead) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${targetName} is no longer a valid target for Spare the Dying.`,
            },
        };
    }

    setRuntimeValue(targetName, 'currentHitPoints', 1, campaignName);
    setRuntimeValue(targetName, 'deathSaves', [true, true, true], campaignName);
    setRuntimeValue(targetName, 'deathFailures', getRuntimeValue(targetName, 'deathFailures', campaignName) || [false, false, false], campaignName);

    const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    const conditions = Array.isArray(storedConditions) ? storedConditions : [];
    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'unconscious');
    setRuntimeValue(targetName, 'activeConditions', [...filtered, 'unconscious'], campaignName);

    const existingMeta = getRuntimeValue(targetName, 'activeConditionMeta', campaignName) || {};
    setRuntimeValue(targetName, 'activeConditionMeta', {
        ...existingMeta,
        unconscious: {
            ...(existingMeta.unconscious || {}),
            source: casterName,
            reason: action.name,
        },
    }, campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: action.name,
        description: `${casterName} cast ${action.name} on ${targetName}: Target rose to 1 HP and gained the Unconscious condition.`,
        targetName,
        timestamp: Date.now(),
    });

    await addEntry(campaignName, {
        type: 'spell_effect',
        characterName: casterName,
        spellName: action.name,
        targetName,
        effects: ['Target rose to 1 HP', 'Target gained Unconscious condition'],
        timestamp: Date.now(),
    }).catch((e) => { console.error('[spareTheDying] Error:', e); });

    await addEntry(campaignName, {
        type: 'condition',
        action: 'applied',
        characterName: targetName,
        condition: 'unconscious',
        reason: action.name,
        sourceName: casterName,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[spareTheDying] Error logging condition:', e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: `${targetName} rose to 1 HP and gained the Unconscious condition.`,
        },
    };
}

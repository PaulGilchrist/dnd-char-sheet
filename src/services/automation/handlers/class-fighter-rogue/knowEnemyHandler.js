import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { rollExpression } from '../../../dice/diceRoller.js';
import { evaluateAutoExpression } from '../../../combat/automation/automationService.js';
import { getMonsterData } from '../../../../services/npcs/monsterUtils.js';
import { getCombatContext, getTargetFromAttacker } from '../../../../services/rules/combat/damageUtils.js';
import { getCurrentCombatRound } from '../../../../services/encounters/combatData.js';
import { addEntry } from '../../../ui/logService.js';

// Canonical source mirrors the CONDITIONS labels in
// src/services/combat/conditions/conditionUtils.js (kept inline to avoid adding
// a conditionUtils import to this module's test-graph — many suites partial-mock it).
// Exhaustion/Diseased are legacy 5e conditions that still appear inside the mixed
// `immunities` list of older monsters.json statblocks but were dropped from CONDITIONS.
const LEGACY_CONDITION_NAMES = new Set([
    'blinded', 'charmed', 'cursed', 'deafened', 'frightened', 'grappled',
    'incapacitated', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
    'slow', 'stunned', 'unconscious', 'exhaustion', 'diseased',
]);

function hasEntries(list) {
    return Array.isArray(list) && list.length > 0;
}

/**
 * monsters.json stores IRV under two schemas:
 *  - 2024-batch monsters: damage_immunities / damage_resistances / damage_vulnerabilities / condition_immunities
 *  - legacy monsters: immunities / resistances / vulnerabilities, with damage types AND condition
 *    names mixed together inside `immunities` (CLA-207).
 * Resolve either shape into the split lists the popup/log expects.
 */
function resolveMonsterIRV(monsterData) {
    const resistances = hasEntries(monsterData.damage_resistances)
        ? monsterData.damage_resistances
        : (monsterData.resistances || []);
    const vulnerabilities = hasEntries(monsterData.damage_vulnerabilities)
        ? monsterData.damage_vulnerabilities
        : (monsterData.vulnerabilities || []);

    if (hasEntries(monsterData.damage_immunities)) {
        return {
            immunities: monsterData.damage_immunities,
            resistances,
            vulnerabilities,
            conditionImmunities: monsterData.condition_immunities || [],
        };
    }

    const legacyImmunities = monsterData.immunities || [];
    const conditionImmunities = legacyImmunities.filter(v => LEGACY_CONDITION_NAMES.has(String(v).toLowerCase()));
    const immunities = legacyImmunities.filter(v => !LEGACY_CONDITION_NAMES.has(String(v).toLowerCase()));
    if (!hasEntries(conditionImmunities) && hasEntries(monsterData.condition_immunities)) {
        return { immunities, resistances, vulnerabilities, conditionImmunities: monsterData.condition_immunities };
    }
    return { immunities, resistances, vulnerabilities, conditionImmunities };
}

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;
    const usesKey = 'superiorityDice';
    const defaultMax = auto.uses_max || 4;

    const storedUses = getRuntimeValue(playerStats.name, usesKey, campaignName);
    const currentUses = storedUses != null ? Number(storedUses) : defaultMax;

    const hasRelentless = (playerStats.automation?.passives ?? []).some(p => p.type === 'passive_rule' && p.effect === 'relentless');
    const storedRound = getRuntimeValue(playerStats.name, 'relentlessUsedRound', campaignName);
    const currentRound = getCurrentCombatRound();
    const relentlessUsed = hasRelentless && storedRound === currentRound;

    if (currentUses <= 0 && !(hasRelentless && !relentlessUsed)) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${action.name}: No Superiority Dice remaining. Recharges on a Short or Long Rest.`,
                automation: auto,
            },
        };
    }

    let dieValue = 0;
    let usedRelentless = false;

    if (hasRelentless && !relentlessUsed && currentUses <= 0) {
        const superiorityDieSize = evaluateAutoExpression(auto.dieExpression || 'superiority_die', playerStats);
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        await setRuntimeValue(playerStats.name, 'relentlessUsedRound', currentRound, campaignName);
        usedRelentless = true;
    } else {
        await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);
    }

    // Get target from combat context
    let targetName = null;
    try {
        const combatContext = await getCombatContext(campaignName);
        if (combatContext) {
            const target = getTargetFromAttacker(combatContext, playerStats.name);
            if (target) {
                targetName = target.name;
            }
        }
    } catch (error) { console.warn('[knowEnemyHandler] No combat context:', error); }

    // Look up monster data for target
    let irvInfo = null;
    if (targetName) {
        try {
            const monsterData = await getMonsterData(targetName, null);
            if (monsterData) {
                irvInfo = resolveMonsterIRV(monsterData);
            }
        } catch (error) { console.warn('[knowEnemyHandler] Monster data not found for target:', error); }
    }

    let description = `${action.name}: Expend 1 Superiority Die to discern enemy strengths and weaknesses.\n`;
    if (usedRelentless) {
        description += `Rolled d${dieValue} for ${dieValue} (Relentless).\n`;
    }
    description += `Target: ${targetName || 'None (not in combat)'}.\n`;
    description += `Range: ${auto.range || '30 ft'}.\n\n`;

    if (irvInfo) {
        if (irvInfo.immunities.length > 0) {
            description += `Immunities: ${irvInfo.immunities.join(', ')}\n`;
        }
        if (irvInfo.resistances.length > 0) {
            description += `Resistances: ${irvInfo.resistances.join(', ')}\n`;
        }
        if (irvInfo.vulnerabilities.length > 0) {
            description += `Vulnerabilities: ${irvInfo.vulnerabilities.join(', ')}\n`;
        }
        if (irvInfo.conditionImmunities.length > 0) {
            description += `Condition Immunities: ${irvInfo.conditionImmunities.join(', ')}\n`;
        }
        if (irvInfo.immunities.length === 0 && irvInfo.resistances.length === 0 && irvInfo.vulnerabilities.length === 0 && irvInfo.conditionImmunities.length === 0) {
            description += `No immunities, resistances, vulnerabilities, or condition immunities.\n`;
        }
    } else {
        description += `No monster data found for target. The target may be a player character or a custom NPC.\n`;
    }

    let logDescription = `Know Your Enemy used by ${playerStats.name}`;
    if (targetName) {
        logDescription += ` against ${targetName}`;
    }
    if (usedRelentless) {
        logDescription += ` (Relentless - free d${dieValue} die)`;
    }
    logDescription += `.\nRange: ${auto.range || '30 ft'}.\n`;
    if (irvInfo) {
        if (irvInfo.immunities.length > 0) {
            logDescription += `Immunities: ${irvInfo.immunities.join(', ')}\n`;
        }
        if (irvInfo.resistances.length > 0) {
            logDescription += `Resistances: ${irvInfo.resistances.join(', ')}\n`;
        }
        if (irvInfo.vulnerabilities.length > 0) {
            logDescription += `Vulnerabilities: ${irvInfo.vulnerabilities.join(', ')}\n`;
        }
        if (irvInfo.conditionImmunities.length > 0) {
            logDescription += `Condition Immunities: ${irvInfo.conditionImmunities.join(', ')}\n`;
        }
        if (irvInfo.immunities.length === 0 && irvInfo.resistances.length === 0 && irvInfo.vulnerabilities.length === 0 && irvInfo.conditionImmunities.length === 0) {
            logDescription += `No immunities, resistances, vulnerabilities, or condition immunities.\n`;
        }
    }

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: action.name,
        description: logDescription,
    }).catch((e) => { console.error("[knowEnemyHandler:log-error]", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description,
            automation: auto,
        },
    };
}

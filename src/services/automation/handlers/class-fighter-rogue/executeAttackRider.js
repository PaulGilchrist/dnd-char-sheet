import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCurrentCombatRound } from '../../../../services/encounters/combatData.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { applyDamageToTarget } from '../../../rules/combat/applyDamage.js';
import { getManeuversForRules } from './combatSuperiorityQueries.js';
import {
    applyConditionToTarget,
    hasRelentless,
    getRelentlessUsedRound,
    getSuperiorityDice,
    rollManeuverDie,
} from './combatSuperiorityUtils.js';
import { validateSizeLimit } from './executeManeuver.js';

export async function executeAttackRiderManeuver(action, playerStats, campaignName, maneuverName, attackInfo) {
    const auto = action.automation || {};
    const allManeuvers = await getManeuversForRules(playerStats.rules);
    const maneuver = allManeuvers.find(m => m.name === maneuverName);

    if (!maneuver) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: maneuverName,
                description: `Maneuver "${maneuverName}" not found.`,
            },
        };
    }

    const superiorityDice = getSuperiorityDice(playerStats, campaignName);
    const relentless = hasRelentless(playerStats);
    const storedRound = getRelentlessUsedRound(playerStats, campaignName);
    const currentRound = getCurrentCombatRound();
    const relentlessUsed = relentless && storedRound === currentRound;

    if (superiorityDice <= 0 && !(relentless && !relentlessUsed)) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: maneuver.name,
                description: `${maneuver.name}: No Superiority Dice remaining. Recharges on a Short or Long Rest.`,
            },
        };
    }

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || attackInfo?.targetName || null;

    if (targetName && maneuver.sizeLimit) {
        const sizeCheck = await validateSizeLimit(maneuver, targetName, campaignName, playerStats);
        if (!sizeCheck.valid) {
            await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice, campaignName);
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: sizeCheck.description,
                },
            };
        }
    }

    let description = dieDescription;

    if (targetName) {
        description += ` Target: ${targetName}.`;
    }

    // Handle attack_rider maneuvers with options (Brutal Strike)
    const riderOptions = maneuver.automation?.options || [];
    if (riderOptions.length > 0 && maneuver.automation?.type === 'attack_rider') {
        const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const newEffect = {
            target: targetName,
            source: maneuver.name,
            effect: 'secondary_damage',
            value: dieValue,
            damageType: maneuver.damageType || 'force',
            duration: 'instant',
            saveType: null,
            saveDc: null,
            saveAbility: null,
        };
        const updatedEffects = [...storedEffects, newEffect];
        setRuntimeValue('campaign', 'targetEffects', updatedEffects, campaignName);

        const cs = await getCombatContext(campaignName);
        const characters = getRuntimeValue('characters', 'characters', campaignName) || [];
        if (cs && targetName) {
            const result = applyDamageToTarget(cs, targetName, dieValue, [maneuver.damageType || 'force'], campaignName, characters, false, playerStats.name);
            if (result.finalDamage > 0) {
                description += ` ${targetName} takes ${result.finalDamage} ${maneuver.damageType || 'force'} damage.`;
            }
        }

        const logEntry = {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: maneuver.name,
            description: `${maneuver.name}: ${dieDescription} ${targetName} takes ${dieValue} ${maneuver.damageType || 'force'} damage.`,
        };

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: maneuver.name,
                description,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.saveType && targetName) {
        const saveDc = buildSaveDc(auto, playerStats);
        const { promise } = createSaveListener(campaignName, {
            targetName,
            saveType: maneuver.saveType,
            saveDc,
        });

        const saveResult = await promise;
        const success = saveResult.success;

        description += ` Target made ${maneuver.saveType} save DC ${saveDc}: ${success ? 'Success' : 'Failure'}.`;

        if (!success) {
            if (maneuver.effect === 'frightened') {
                description += ` ${targetName} is Frightened until the end of your next turn.`;
                const cs = await getCombatContext(campaignName);
                applyConditionToTarget(targetName, 'frightened', campaignName, cs, saveDc, maneuver.saveType, playerStats);
                await addExpiration(playerStats.name, targetName, [
                    { type: 'condition', condition: 'frightened' },
                ], campaignName, 2);
            } else if (maneuver.effect === 'disarm') {
                description += ` ${targetName} dropped the object it was holding.`;
            } else if (maneuver.effect === 'push') {
                const pushDistance = maneuver.value || 15;
                description += ` ${targetName} was pushed ${pushDistance} feet away.`;
                await addEntry(campaignName, {
                    type: 'ability_use',
                    characterName: playerStats.name,
                    abilityName: maneuver.name,
                    description: `${playerStats.name} pushed ${targetName} ${pushDistance} feet away.`,
                    targetName: targetName,
                }).catch(() => {});
            } else if (maneuver.effect === 'goad') {
                description += ` ${targetName} has Disadvantage on attacks against targets other than you.`;
                const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
                const newEffect = {
                    target: targetName,
                    source: playerStats.name,
                    effect: 'taunting_step',
                    duration: 'until_end_of_user_next_turn',
                };
                const updatedEffects = [...storedEffects, newEffect];
                setRuntimeValue('campaign', 'targetEffects', updatedEffects, campaignName);
            } else if (maneuver.effect === 'prone') {
                description += ` ${targetName} fell Prone.`;
                const cs = await getCombatContext(campaignName);
                applyConditionToTarget(targetName, 'prone', campaignName, cs, saveDc, maneuver.saveType, playerStats);
            } else if (maneuver.conditionInflicted) {
                description += ` ${targetName} gained the ${maneuver.conditionInflicted} condition.`;
            } else {
                description += ` The effect was applied to ${targetName}.`;
            }
        }
    }
    else if (maneuver.saveType) {
        const saveDc = buildSaveDc(auto, playerStats);
        description += ` Target must make a ${maneuver.saveType} save DC ${saveDc}`;
        if (maneuver.conditionInflicted) {
            description += ` or gain ${maneuver.conditionInflicted} condition`;
        } else if (maneuver.effect === 'disarm') {
            description += ` or drop one object it's holding`;
        } else if (maneuver.effect === 'push') {
            description += ` or be pushed ${maneuver.value || 15} feet away (no lingering effect)`;
        } else if (maneuver.effect === 'goad') {
            description += ` or have Disadvantage on attacks against targets other than you`;
        } else {
            description += ` or suffer the effect`;
        }
        description += '.';
    }

    if (maneuver.effect === 'next_attack_advantage' || maneuver.effect === 'distracting_strike_advantage') {
        description += ` The next attack against ${targetName || 'the target'} by an ally has Advantage.`;
        if (targetName) {
            const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            const newEffect = {
                target: targetName,
                source: playerStats.name,
                effect: 'distracting_strike_advantage',
                value: null,
                duration: 'until_end_of_turn',
            };
            await setRuntimeValue('campaign', 'targetEffects', [...storedEffects, newEffect], campaignName);
        }
    }

    if (maneuver.effect === 'ally_movement') {
        description += ` An ally can use its Reaction to move up to half its Speed without provoking Opportunity Attacks.`;
    }

    if (maneuver.effect === 'secondary_damage') {
        description += ` A second creature within 5 feet of the target takes ${dieValue} damage (same type as the original attack).`;
        const cs = await getCombatContext(campaignName);
        const secondaryTargets = cs?.creatures?.filter(c =>
            c.name !== targetName && c.name !== playerStats.name
        ) || [];
        const options = secondaryTargets.map(t => ({ label: t.name, value: t.name }));

        if (options.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description,
                    automation: auto,
                },
            };
        }

        const logEntry = {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: maneuver.name,
            description,
        };
        return {
            type: 'modal',
            modalName: 'sweepingAttackTarget',
            payload: {
                playerStats,
                campaignName,
                dieValue,
                damageType: attackInfo?.damageType || 'slashing',
                targetName,
                secondaryTargets: options,
                description,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.damageBonus) {
        description += ` Added ${dieValue} to the damage roll.`;
        const logEntry = {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: maneuver.name,
            description: `${maneuver.name}: ${dieDescription} Added ${dieValue} to the damage roll.`,
        };

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: maneuver.name,
                description,
            },
            logEntries: [logEntry],
        };
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `${maneuver.name}: ${dieDescription}`,
    };

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: maneuver.name,
            description,
        },
        logEntries: [logEntry],
    };
}

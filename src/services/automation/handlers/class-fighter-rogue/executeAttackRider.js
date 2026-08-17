import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { applyDamageToTarget } from '../../../rules/combat/applyDamage.js';
import { getManeuversForRules } from './combatSuperiorityQueries.js';
import {
    checkSuperiorityDice,
    expendSuperiorityDie,
    rollManeuverDie,
    buildManeuverNotFoundPopup,
    buildNoDiceRemainingPopup,
    processManeuverSaveResult,
    buildManeuverSaveDescription,
} from './combatSuperiorityUtils.js';
import { validateSizeLimit } from './executeManeuver.js';

export async function executeAttackRiderManeuver(action, playerStats, campaignName, maneuverName, attackInfo) {
    const auto = action.automation || {};
    const allManeuvers = await getManeuversForRules(playerStats.rules);
    const maneuver = allManeuvers.find(m => m.name === maneuverName);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

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

        const saveEffectDesc = await processManeuverSaveResult(maneuver, targetName, saveDc, success, playerStats, campaignName);
        description += saveEffectDesc;
    }
    else if (maneuver.saveType) {
        const saveDc = buildSaveDc(auto, playerStats);
        description += buildManeuverSaveDescription(maneuver, saveDc);
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

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { rollExpression } from '../../../dice/diceRoller.js';
import { evaluateAutoExpression } from '../../../combat/automation/automationService.js';
import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCurrentCombatRound } from '../../../../services/encounters/combatData.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { applyDamageToTarget } from '../../../rules/combat/applyDamage.js';
import { loadManeuvers } from '../../../ui/dataLoader.js';
import {
    applyConditionToTarget,
    hasRelentless,
    getRelentlessUsedRound,
    setRelentlessUsed,
    getKnownManeuvers,
    getSuperiorityDice,
    computeMaxOptions,
    rollManeuverDie,
    executeBaitAndSwitchChoice,
    executeCommanderStrikeChoice,
    executeRallyChoice,
    executeSweepingAttack,
} from './combatSuperiorityUtils.js';
import {
    getManeuversForRules,
    getManeuversByType,
    getAvailableAttackRiderManeuvers,
    getAvailableAttackRiderManeuversByTrigger,
    getAvailableSkillCheckManeuvers,
    getSkillCheckManeuversForSkill,
    handleAttackRiderPrompt,
    handleSkillCheckPrompt,
} from './combatSuperiorityQueries.js';

// Re-export everything for consumers
export {
    applyConditionToTarget,
    hasRelentless,
    getRelentlessUsedRound,
    setRelentlessUsed,
    getKnownManeuvers,
    getSuperiorityDice,
    computeMaxOptions,
    rollManeuverDie,
    executeBaitAndSwitchChoice,
    executeCommanderStrikeChoice,
    executeRallyChoice,
    executeSweepingAttack,
    getManeuversForRules,
    getManeuversByType,
    getAvailableAttackRiderManeuvers,
    getAvailableAttackRiderManeuversByTrigger,
    getAvailableSkillCheckManeuvers,
    getSkillCheckManeuversForSkill,
    handleAttackRiderPrompt,
    handleSkillCheckPrompt,
};

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;

    if (auto?.maneuverName) {
        return executeManeuver(action, playerStats, campaignName, auto.maneuverName);
    }

    if (auto?.actionType === 'bonus_action') {
        return handleCombatSuperiorityBonusAction(action, playerStats, campaignName, _mapName);
    }

    if (auto?.actionType === 'reaction') {
        if (auto?.reactionType === 'grant_attack') {
            return handleCombatSuperiorityGrantAttack(action, playerStats, campaignName, _mapName);
        }
        if (auto?.reactionType === 'commanding_presence') {
            return handleCombatSuperiorityCommandingPresenceReaction(action, playerStats, campaignName, _mapName);
        }
        return handleCombatSuperiorityReaction(action, playerStats, campaignName, _mapName);
    }

    if (auto?.actionType === 'sweeping_attack') {
        return handleCombatSuperioritySweepingAttack(action, playerStats, campaignName, _mapName);
    }

    if (auto?.actionType === 'movement') {
        return handleCombatSuperiorityMovement(action, playerStats, campaignName, _mapName);
    }

    if (auto?.actionType === 'skill_check') {
        return handleCombatSuperioritySkillCheck(action, playerStats, campaignName, _mapName);
    }

    if (auto?.trigger === 'attack_rider') {
        return handleAttackRiderPrompt(action, playerStats, campaignName, _mapName);
    }

    if (auto?.trigger === 'skill_check') {
        return handleSkillCheckPrompt(action, playerStats, campaignName, _mapName);
    }

    const allManeuvers = await loadManeuvers(playerStats.rules || '2024');

    if (allManeuvers.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver data available.',
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
                name: action.name,
                description: 'No Superiority Dice remaining. Recharges on a Short or Long Rest.',
            },
        };
    }

    const knownManeuvers = getKnownManeuvers(playerStats, campaignName);
    const availableForAction = allManeuvers.filter(m => knownManeuvers.includes(m.name));
    const forceSelectionMode = auto?.forceSelectionMode === true;
    const selectionMode = forceSelectionMode || knownManeuvers.length !== allManeuvers.length;

    return {
        type: 'modal',
        modalName: 'combatSuperiority',
        payload: {
            action,
            playerStats,
            campaignName,
            allManeuvers,
            knownManeuvers: availableForAction.map(m => m.name),
            maxOptions: computeMaxOptions(playerStats, auto),
            selectionMode,
            saveDc: auto?.saveDc || 'ability',
            saveType: auto?.saveType || 'WIS',
            dieExpression: auto?.dieExpression || 'superiority_die',
        },
    };
}

export async function onCombatSuperioritySelected(action, playerStats, campaignName, selectedManeuverNames, singleUseManeuverName) {
    const auto = action.automation;

    if (Array.isArray(selectedManeuverNames) && selectedManeuverNames.length === 0 && !singleUseManeuverName) {
        await setRuntimeValue(playerStats.name, 'BattleMasterManeuvers_selection', [], campaignName);
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'Battle Master selection cleared.',
            },
        };
    }

    if (Array.isArray(selectedManeuverNames) && selectedManeuverNames.length > 0 && !singleUseManeuverName) {
        const allManeuvers = await loadManeuvers(playerStats.rules || '2024');
        const allNames = allManeuvers.map(m => m.name);
        const validManeuvers = selectedManeuverNames.filter(name => allNames.includes(name));

        await setRuntimeValue(playerStats.name, 'BattleMasterManeuvers_selection', validManeuvers, campaignName);

        if (validManeuvers.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: action.name,
                    description: 'No valid maneuvers selected.',
                },
            };
        }

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `Maneuvers selected: ${validManeuvers.join(', ')}.`,
            },
        };
    }

    const selectedName = singleUseManeuverName || (selectedManeuverNames && selectedManeuverNames[0]);

    if (!selectedName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver selected.',
            },
        };
    }

    const stored = getRuntimeValue(playerStats.name, 'BattleMasterManeuvers_selection', campaignName);
    const knownManeuvers = Array.isArray(stored) ? stored : [];

    if (auto?.singleUseManeuver === selectedName && !auto?.isReload) {
        const newKnown = knownManeuvers.filter(n => n !== selectedName);
        await setRuntimeValue(playerStats.name, 'BattleMasterManeuvers_selection', newKnown, campaignName);
    }

    if (auto?.actionType === 'attack_rider') {
        return executeAttackRiderManeuver(action, playerStats, campaignName, selectedName, auto?.attackContext || null);
    }

    if (auto?.actionType === 'skill_check') {
        return executeSkillCheckManeuver(action, playerStats, campaignName, selectedName);
    }

    if (auto?.actionType === 'grant_attack') {
        return executeGrantAttackManeuver(action, playerStats, campaignName, selectedName);
    }

    if (auto?.actionType === 'movement') {
        return executeMovementManeuver(action, playerStats, campaignName, selectedName);
    }

    if (auto?.actionType === 'reaction') {
        return executeReactionManeuver(action, playerStats, campaignName, selectedName);
    }

    if (auto?.actionType === 'bonus_action') {
        return executeBonusActionManeuver(action, playerStats, campaignName, selectedName);
    }

    return executeManeuver(action, playerStats, campaignName, selectedName);
}

export async function getAttackRiderOptions(playerStats, campaignName, attackInfo) {
    const maneuvers = getAvailableAttackRiderManeuvers(playerStats, campaignName, attackInfo);
    return maneuvers.map(m => ({
        name: m.name,
        effect: m.effect || null,
        damageBonus: m.damageBonus || false,
        saveType: m.saveType || null,
        saveAbility: m.saveAbility || null,
        conditionInflicted: m.conditionInflicted || null,
        value: m.value || null,
        range: m.range || null,
        dieExpression: m.dieExpression || 'superiority_die',
    }));
}

export async function getAttackRiderOptionsByContext(playerStats, campaignName, attackInfo, context) {
    const maneuvers = getAvailableAttackRiderManeuversByTrigger(playerStats, campaignName, attackInfo);
    return maneuvers.map(m => ({
        name: m.name,
        dieExpression: m.dieExpression || 'superiority_die',
        trigger: m.trigger || 'any',
        actionType: m.actionType,
        context,
        saveType: m.saveType || null,
        saveDc: m.saveDc || null,
        saveAbility: m.saveAbility || null,
        conditionInflicted: m.conditionInflicted || null,
        value: m.value || null,
        range: m.range || null,
    }));
}

export async function validateSizeLimit(maneuver, targetName, campaignName, playerStats) {
    if (!maneuver.sizeLimit || !targetName) return { valid: true };
    const sizeOrder = ['Fine', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    let maxAllowed;
    if (maneuver.sizeLimit === 'large_or_smaller') {
        maxAllowed = sizeOrder.indexOf('Large');
    }
    else if (maneuver.sizeLimit === 'medium_or_smaller') {
        maxAllowed = sizeOrder.indexOf('Medium');
    }
    else if (maneuver.sizeLimit === 'one_size_larger') {
        maxAllowed = sizeOrder.indexOf(playerStats?.size || 'Medium') + 1;
    }
    if (maxAllowed == null) return { valid: true };
    const cs = await getCombatContext(campaignName);
    if (!cs) return { valid: true };
    const target = cs.creatures?.find(c => c.name === targetName);
    if (!target) return { valid: true };
    const targetSizeIndex = sizeOrder.indexOf(target.size || 'Medium');
    if (targetSizeIndex > maxAllowed) {
        const sizeLabel = maneuver.sizeLimit === 'large_or_smaller'
            ? 'Large or smaller'
            : maneuver.sizeLimit === 'medium_or_smaller'
                ? 'Medium or smaller'
                : `up to one size larger than you`;
        return {
            valid: false,
            description: `${maneuver.name}: Target is ${target.size} (too large — only ${sizeLabel} affected).`,
        };
    }
    return { valid: true };
}

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

export async function executeBonusActionManeuver(action, playerStats, campaignName, maneuverName) {
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

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || null;

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name} as a bonus action. ${dieDescription} ${maneuver.description}`,
    };
    await addEntry(campaignName, logEntry).catch(() => {});

    let description = `<b>${maneuver.name}</b> (Bonus Action)<br/>${dieDescription}`;

    if (targetName && maneuver.effect !== 'ac_bonus_disengage' && maneuver.effect !== 'dash_and_damage') {
        description += ` Target: ${targetName}.`;
    }

    if (maneuver.saveType) {
        description += ` Target must make a ${maneuver.saveType} save or suffer the effect.`;
    }

    if (maneuver.effect === 'temp_hp') {
        const fighterLevel = playerStats.level || 1;
        const extraHpRaw = maneuver.extraHpExpression
            ? evaluateAutoExpression(maneuver.extraHpExpression, playerStats)
            : Math.floor(fighterLevel / 2);
        const extraHp = typeof extraHpRaw === 'number' ? Math.floor(extraHpRaw) : Math.floor(fighterLevel / 2);
        const totalHp = dieValue + extraHp;
        const cs = await getCombatContext(campaignName);
        const allies = cs?.creatures?.filter(c => c.name !== playerStats.name) || [];
        if (allies.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No allies available to receive Rally.`,
                },
            };
        }
        const allyOptions = allies.map(a => ({ label: a.name, value: a.name }));
        const logEntry = {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: maneuver.name,
            description: `${maneuver.name}: Choose an ally to gain temporary hit points.`,
        };
        return {
            type: 'modal',
            modalName: 'rallyChoice',
            payload: {
                playerStats,
                campaignName,
                dieValue,
                maneuverName: maneuver.name,
                allyOptions,
                totalHp,
                extraHp,
                description,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.effect === 'ac_bonus_disengage') {
        description += ` You take the Disengage action and gain +${dieValue} AC until the start of your next turn.`;
        await setRuntimeValue(playerStats.name, 'baitAndSwitchActive', true, campaignName);
        await setRuntimeValue(playerStats.name, 'baitAndSwitchBonus', dieValue, campaignName);
        await setRuntimeValue(playerStats.name, 'baitAndSwitchSource', maneuver.name, campaignName);
        await addExpiration(playerStats.name, playerStats.name, [
            { type: 'bait_and_switch_clear' }
        ], campaignName, undefined, playerStats.name);
    }

    if (maneuver.effect === 'advantage_and_damage') {
        await setRuntimeValue(playerStats.name, 'feintingAttackDieValue', dieValue, campaignName);
        const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const currentRound = getCurrentCombatRound();
        const newEffect = {
            target: playerStats.name,
            source: maneuver.name,
            effect: 'next_attack_advantage',
            vexTarget: targetName || null,
            value: null,
            duration: 'until_end_of_turn',
            appliedRound: currentRound,
        };
        await setRuntimeValue('campaign', 'targetEffects', [...storedEffects, newEffect], campaignName);
        addExpiration(playerStats.name, playerStats.name, [
            { type: 'remove_target_effect', effectKey: 'next_attack_advantage', source: maneuver.name, target: playerStats.name }
        ], campaignName, 2);
        description += ` You have Advantage on your next attack roll against the target. If it hits, add ${dieValue} to the damage roll.`;
    }

    if (maneuver.effect === 'dash_and_damage') {
        await setRuntimeValue(playerStats.name, 'lungingAttackDieValue', dieValue, campaignName);
        description += ` You take the Dash action. Add ${dieValue} to the damage roll of your next melee hit this turn.`;
    }

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

export async function handleCombatSuperiorityBonusAction(action, playerStats, campaignName, _mapName) {
    const maneuverName = action.automation?.maneuverName;
    if (!maneuverName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver specified.',
            },
        };
    }
    return executeBonusActionManeuver(action, playerStats, campaignName, maneuverName);
}

export async function handleCombatSuperiorityReaction(action, playerStats, campaignName, _mapName) {
    const maneuverName = action.automation?.maneuverName;
    if (!maneuverName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver specified.',
            },
        };
    }
    return executeReactionManeuver(action, playerStats, campaignName, maneuverName);
}

export async function handleCombatSuperiorityGrantAttack(action, playerStats, campaignName, _mapName) {
    const maneuverName = action.automation?.maneuverName;
    if (!maneuverName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver specified.',
            },
        };
    }
    return executeGrantAttackManeuver(action, playerStats, campaignName, maneuverName);
}

export async function executeGrantAttackManeuver(action, playerStats, campaignName, maneuverName) {
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

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    const cs = await getCombatContext(campaignName);
    const allies = (cs?.creatures || []).filter(c => c.name !== playerStats.name);
    const options = allies.map(a => ({ label: a.name, value: a.name }));

    if (options.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: maneuver.name,
                description: `${maneuver.name}: No allies available to receive the attack.`,
            },
        };
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name}. ${dieDescription} Choose an ally to add this to their next attack.`,
    };
    await addEntry(campaignName, logEntry).catch(() => {});

    const description = `<b>${maneuver.name}</b><br/>${dieDescription} Choose a willing ally to add ${dieValue} to their next attack's damage roll.`;

    return {
        type: 'modal',
        modalName: 'commanderStrikeChoice',
        payload: {
            playerStats,
            campaignName,
            dieValue,
            maneuverName: maneuver.name,
            options,
            description,
        },
        logEntries: [logEntry],
    };
}

export async function handleCombatSuperioritySweepingAttack(action, playerStats, campaignName, _mapName) {
    const secondaryTargetName = action.automation?.secondaryTargetName;
    if (!secondaryTargetName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'Sweeping Attack: No secondary target selected.',
            },
        };
    }
    return executeSweepingAttack(action, playerStats, campaignName, secondaryTargetName);
}

export async function handleCombatSuperiorityMovement(action, playerStats, campaignName, _mapName) {
    const maneuverName = action.automation?.maneuverName;
    if (!maneuverName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver specified.',
            },
        };
    }
    return executeMovementManeuver(action, playerStats, campaignName, maneuverName);
}

export async function executeMovementManeuver(action, playerStats, campaignName, maneuverName) {
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

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name}. ${dieDescription} You or the ally gains +${dieValue} AC until the start of your next turn.`,
    };
    await addEntry(campaignName, logEntry).catch(() => {});

    const description = `<b>${maneuver.name}</b><br/>${dieDescription} You or the ally gains +${dieValue} AC until the start of your next turn.`;

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

export async function executeReactionManeuver(action, playerStats, campaignName, maneuverName) {
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

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || null;

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name} as a reaction. ${dieDescription} ${maneuver.description}`,
    };
    await addEntry(campaignName, logEntry).catch(() => {});

    let description = `<b>${maneuver.name}</b> (Reaction)<br/>${dieDescription}`;

    if (targetName && maneuver.effect !== 'damage_reduction') {
        description += ` Target: ${targetName}.`;
    }

    if (maneuver.effect === 'melee_attack_reaction') {
        await setRuntimeValue(playerStats.name, 'pendingRiposteDieValue', dieValue, campaignName);

        const meleeAttacks = (playerStats.attacks || []).filter(a => {
            if (a.weaponType === 'melee' || a.attackType === 'melee') return true;
            if (a.range === 5 || a.range === '5' || a.range === '5 ft' || a.range === '5_ft') return a.type === 'Action' || a.actionType === 'Action';
            if (a.isRanged === false) return true;
            if (Array.isArray(a.properties) && a.properties.some(p => String(p).toLowerCase() === 'melee')) return true;
            return false;
        });
        const attack = meleeAttacks.length > 0 ? meleeAttacks[0] : (playerStats.attacks || [])[0];

        if (!attack) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No melee attack available.`,
                },
                logEntries: [logEntry],
            };
        }

        return {
            type: 'attack_roll',
            payload: {
                attack,
                targetName,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.effect === 'damage_reduction') {
        const strMod = (playerStats.abilities || []).find(a => a.name === 'Strength')?.bonus || 0;
        const dexMod = (playerStats.abilities || []).find(a => a.name === 'Dexterity')?.bonus || 0;
        const mod = Math.max(strMod, dexMod);
        const reduction = dieValue + mod;
        description += ` Damage reduced by ${reduction} (${dieValue} + ${mod} from STR/DEX modifier).`;
        const storedMaxHp = getRuntimeValue(playerStats.name, 'hitPoints', campaignName);
        const storedCurrentHp = getRuntimeValue(playerStats.name, 'currentHitPoints', campaignName);
        const maxHp = storedMaxHp != null ? Number(storedMaxHp) : (storedCurrentHp || 10);
        const currentHp = storedCurrentHp != null ? Number(storedCurrentHp) : 10;
        const newHp = Math.min(maxHp, currentHp + reduction);
        if (newHp !== currentHp) {
            await setRuntimeValue(playerStats.name, 'currentHitPoints', newHp, campaignName);
        }
        description += ` HP restored: ${currentHp} → ${newHp}.`;
    }

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

export async function handleCombatSuperioritySkillCheck(action, playerStats, campaignName, _mapName) {
    const maneuverName = action.automation?.maneuverName;
    if (!maneuverName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver specified.',
            },
        };
    }
    return executeSkillCheckManeuver(action, playerStats, campaignName, maneuverName);
}

export async function executeSkillCheckManeuver(action, playerStats, campaignName, maneuverName) {
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

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    await setRuntimeValue(playerStats.name, 'pendingSkillCheckBonus', dieValue, campaignName);

    const skills = maneuver.skills || [];
    let skillList = '';
    if (maneuver.initiativeBonus) {
        skillList = 'Initiative or Stealth';
    } else if (skills.length > 0) {
        skillList = skills.join(' / ');
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name}. ${dieDescription} Added ${dieValue} to the next ${skillList || 'skill'} check.`,
    };
    await addEntry(campaignName, logEntry).catch(() => {});

    let description = `<b>${maneuver.name}</b><br/>${dieDescription}`;

    if (maneuver.initiativeBonus) {
        description += ` Add ${dieValue} to your next Initiative roll or Dexterity (Stealth) check.`;
    } else {
        const ability = maneuver.ability || 'the ability';
        description += ` Add ${dieValue} to your next ${ability} (${skillList || 'skill check'}).`;
    }

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

export async function handleCombatSuperiorityCommandingPresenceReaction(action, playerStats, campaignName, _mapName) {
    const maneuverName = action.automation?.maneuverName;
    if (!maneuverName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No maneuver specified.',
            },
        };
    }
    return executeCommandingPresenceReaction(action, playerStats, campaignName, maneuverName);
}

export async function executeCommandingPresenceReaction(action, playerStats, campaignName, maneuverName) {
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

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', superiorityDice - 1, campaignName);
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name} as a reaction. ${dieDescription}`,
    };
    await addEntry(campaignName, logEntry).catch(() => {});

    const auto = action.automation || {};
    const targetName = auto.targetName;
    const reactionEffect = auto.reactionEffect || 'disadvantage_next_attack';
    const reactionDuration = auto.reactionDuration || 'until_end_of_next_turn';

    let description = `<b>${maneuver.name}</b> (Reaction)<br/>${dieDescription}`;

    if (targetName) {
        description += ` Target: ${targetName}.`;
    }

    if (reactionEffect === 'disadvantage_next_attack') {
        const durationInTurns = reactionDuration === 'until_end_of_next_turn' ? 2 : 1;
        description += ` ${targetName || 'The target'} has Disadvantage on their next attack roll.`;
        if (targetName) {
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const hasDisadvantage = conditions.some(c => String(c).toLowerCase() === 'disadvantage');
            if (!hasDisadvantage) {
                await setRuntimeValue(targetName, 'activeConditions', [...conditions, 'disadvantage'], campaignName);
            }
            await addExpiration(playerStats.name, targetName, [
                { type: 'condition', condition: 'disadvantage' },
            ], campaignName, durationInTurns);
        }
    } else if (reactionEffect === 'attack_roll_disadvantage') {
        description += ` ${targetName || 'The target'} has Disadvantage on their next attack roll.`;
        if (targetName) {
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const hasDisadvantage = conditions.some(c => String(c).toLowerCase() === 'disadvantage');
            if (!hasDisadvantage) {
                await setRuntimeValue(targetName, 'activeConditions', [...conditions, 'disadvantage'], campaignName);
            }
            await addExpiration(playerStats.name, targetName, [
                { type: 'condition', condition: 'disadvantage' },
            ], campaignName, 2);
        }
    } else if (reactionEffect === 'save_disadvantage') {
        description += ` ${targetName || 'The target'} has Disadvantage on their next saving throw.`;
    }

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

export async function executeManeuver(action, playerStats, campaignName, maneuverName) {
    const auto = action.automation;
    const allManeuvers = await loadManeuvers(playerStats.rules || '2024');
    const maneuver = allManeuvers.find(m => m.name === maneuverName);

    if (!maneuver) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `Maneuver "${maneuverName}" not found.`,
                automation: auto,
            },
        };
    }

    const usesKey = 'superiorityDice';
    const defaultMax = auto.uses_max || 4;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? defaultMax);

    const relentless = hasRelentless(playerStats);
    const storedRound = getRelentlessUsedRound(playerStats, campaignName);
    const currentRound = getCurrentCombatRound();
    const relentlessUsed = relentless && storedRound === currentRound;

    if (currentUses <= 0 && !(relentless && !relentlessUsed)) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: maneuver.name,
                description: `${maneuver.name}: No Superiority Dice remaining. Recharges on a Short or Long Rest.`,
                automation: auto,
            },
        };
    }

    const superiorityDieSize = evaluateAutoExpression(maneuver.dieExpression || 'superiority_die', playerStats);

    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || null;

    if (targetName && maneuver.sizeLimit) {
        const sizeCheck = await validateSizeLimit(maneuver, targetName, campaignName, playerStats);
        if (!sizeCheck.valid) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: sizeCheck.description,
                    automation: auto,
                },
            };
        }
    }

    let dieValue;
    let dieDescription;
    let expendedDie = true;

    if (relentless && !relentlessUsed) {
        const relentlessRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = relentlessRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue} (Relentless).`;
        setRelentlessUsed(playerStats, campaignName);
        expendedDie = false;
    } else {
        const dieRoll = rollExpression(`1d${superiorityDieSize}`);
        dieValue = dieRoll?.total || superiorityDieSize;
        dieDescription = `Rolled d${superiorityDieSize} for ${dieValue}.`;
    }

    if (expendedDie) {
        await setRuntimeValue(playerStats.name, 'superiorityDice', currentUses - 1, campaignName);
    }

    let description = `${maneuver.name}: ${dieDescription}`;

    if (targetName && maneuver.effect !== 'ac_bonus_disengage' && maneuver.effect !== 'ac_bonus_and_swap' && maneuver.effect !== 'damage_reduction' && maneuver.effect !== 'dash_and_damage') {
        description += ` Target: ${targetName}.`;
    }

    if (maneuver.damageBonus) {
        description += ` Added ${dieValue} to the damage roll.`;
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
    } else if (maneuver.saveType) {
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

    if (maneuver.actionType === 'grant_attack') {
        description += ` Choose a willing ally to add ${dieValue} to their next attack's damage roll.`;
        const cs = await getCombatContext(campaignName);
        const allies = (cs?.creatures || []).filter(c => c.name !== playerStats.name);
        const options = allies.map(a => ({ label: a.name, value: a.name }));

        if (options.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No allies available to receive the attack.`,
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
            modalName: 'commanderStrikeChoice',
            payload: {
                playerStats,
                campaignName,
                dieValue,
                maneuverName: maneuver.name,
                options,
                description,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.effect === 'ac_bonus_and_swap') {
        description += ` You or an ally gains +${dieValue} AC until the start of your next turn.`;
        const cs = await getCombatContext(campaignName);
        const allies = cs?.creatures?.filter(c =>
            c.name !== playerStats.name
        ) || [];
        const options = [
            { label: `Myself (${playerStats.name})`, value: playerStats.name },
            ...allies.map(a => ({ label: a.name, value: a.name })),
        ];
        const logEntry = {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: maneuver.name,
            description,
        };
        return {
            type: 'modal',
            modalName: 'baitAndSwitchChoice',
            payload: {
                playerStats,
                campaignName,
                dieValue,
                maneuverName: maneuver.name,
                options,
                description,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.effect === 'ac_bonus_disengage') {
        description += ` You take the Disengage action and gain +${dieValue} AC until the start of your next turn.`;
        await setRuntimeValue(playerStats.name, 'baitAndSwitchActive', true, campaignName);
        await setRuntimeValue(playerStats.name, 'baitAndSwitchBonus', dieValue, campaignName);
        await setRuntimeValue(playerStats.name, 'baitAndSwitchSource', maneuver.name, campaignName);
        await addExpiration(playerStats.name, playerStats.name, [
            { type: 'bait_and_switch_clear' }
        ], campaignName, undefined, playerStats.name);
    }

    if (maneuver.effect === 'advantage_and_damage') {
        await setRuntimeValue(playerStats.name, 'feintingAttackDieValue', dieValue, campaignName);
        const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const currentRound = getCurrentCombatRound();
        const newEffect = {
            target: playerStats.name,
            source: maneuver.name,
            effect: 'next_attack_advantage',
            vexTarget: targetName || null,
            value: null,
            duration: 'until_end_of_turn',
            appliedRound: currentRound,
        };
        await setRuntimeValue('campaign', 'targetEffects', [...storedEffects, newEffect], campaignName);
        addExpiration(playerStats.name, playerStats.name, [
            { type: 'remove_target_effect', effectKey: 'next_attack_advantage', source: maneuver.name, target: playerStats.name }
        ], campaignName, 2);
        description += ` You have Advantage on your next attack roll against the target. If it hits, add ${dieValue} to the damage roll.`;
    }

    if (maneuver.effect === 'dash_and_damage') {
        await setRuntimeValue(playerStats.name, 'lungingAttackDieValue', dieValue, campaignName);
        description += ` You take the Dash action. Add ${dieValue} to the damage roll of your next melee hit this turn.`;
    }

    if (maneuver.effect === 'temp_hp') {
        const fighterLevel = playerStats.level || 1;
        const extraHpRaw = maneuver.extraHpExpression
            ? evaluateAutoExpression(maneuver.extraHpExpression, playerStats)
            : Math.floor(fighterLevel / 2);
        const extraHp = typeof extraHpRaw === 'number' ? Math.floor(extraHpRaw) : Math.floor(fighterLevel / 2);
        const totalHp = dieValue + extraHp;
        const cs = await getCombatContext(campaignName);
        const allies = cs?.creatures?.filter(c => c.name !== playerStats.name) || [];
        if (allies.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No allies available to receive Rally.`,
                },
            };
        }
        const allyOptions = allies.map(a => ({ label: a.name, value: a.name }));
        const logEntry = {
            type: 'ability_use',
            characterName: playerStats.name,
            abilityName: maneuver.name,
            description: `${maneuver.name}: Choose an ally to gain temporary hit points.`,
        };
        return {
            type: 'modal',
            modalName: 'rallyChoice',
            payload: {
                playerStats,
                campaignName,
                dieValue,
                maneuverName: maneuver.name,
                allyOptions,
                totalHp,
                extraHp,
                description,
            },
            logEntries: [logEntry],
        };
    }

    if (maneuver.effect === 'damage_reduction') {
        const strMod = (playerStats.abilities || []).find(a => a.name === 'Strength')?.bonus || 0;
        const dexMod = (playerStats.abilities || []).find(a => a.name === 'Dexterity')?.bonus || 0;
        const mod = Math.max(strMod, dexMod);
        const reduction = dieValue + mod;
        description += ` Damage reduced by ${reduction} (${dieValue} + ${mod} from STR/DEX modifier).`;
        const storedMaxHp = getRuntimeValue(playerStats.name, 'hitPoints', campaignName);
        const storedCurrentHp = getRuntimeValue(playerStats.name, 'currentHitPoints', campaignName);
        const maxHp = storedMaxHp != null ? Number(storedMaxHp) : (storedCurrentHp || 10);
        const currentHp = storedCurrentHp != null ? Number(storedCurrentHp) : 10;
        const newHp = Math.min(maxHp, currentHp + reduction);
        if (newHp !== currentHp) {
            await setRuntimeValue(playerStats.name, 'currentHitPoints', newHp, campaignName);
        }
        description += ` HP restored: ${currentHp} → ${newHp}.`;
    }

    if (maneuver.effect === 'melee_attack_reaction') {
        await setRuntimeValue(playerStats.name, 'pendingRiposteDieValue', dieValue, campaignName);

        const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName);
        const riposteTarget = lastAttack?.attackerName || targetName;

        if (riposteTarget && riposteTarget !== targetName && maneuver.effect !== 'ac_bonus_disengage' && maneuver.effect !== 'ac_bonus_and_swap' && maneuver.effect !== 'damage_reduction') {
            description = description.replace(`Target: ${targetName}.`, `Target: ${riposteTarget}.`);
        }

        const meleeAttacks = (playerStats.attacks || []).filter(a => {
            if (a.weaponType === 'melee' || a.attackType === 'melee') return true;
            if (a.range === 5 || a.range === '5' || a.range === '5 ft' || a.range === '5_ft') return a.type === 'Action' || a.actionType === 'Action';
            if (a.isRanged === false) return true;
            if (Array.isArray(a.properties) && a.properties.some(p => String(p).toLowerCase() === 'melee')) return true;
            return false;
        });
        const attack = meleeAttacks.length > 0 ? meleeAttacks[0] : (playerStats.attacks || [])[0];

        if (!attack) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No melee attack available.`,
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
        const popupPayload = {
            type: 'automation_info',
            name: maneuver.name,
            description,
            automation: auto,
        };
        return {
            type: 'attack_roll',
            payload: {
                attack,
                targetName: riposteTarget,
            },
            context: {
                superiorityDieValue: dieValue,
                superiorityDieSize: superiorityDieSize,
                baseDamageFormula: attack.damage,
                baseDamageType: attack.damageType,
            },
            logEntries: [logEntry],
            popup: popupPayload,
        };
    }

    if (maneuver.effect === 'secondary_damage') {
        description += ` A second creature within 5 feet of the target takes ${dieValue} damage (same type as the original attack).`;
    }

    if (maneuver.effect === 'attack_roll_bonus') {
        description += ` Add ${dieValue} to the attack roll.`;
    }

    if (maneuver.actionType === 'skill_check') {
        description += ` Add ${dieValue} to the ability check.`;
    }

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description,
    };

    return {
        type: 'popup',
        effect: maneuver.effect,
        dieValue,
        payload: {
            type: 'automation_info',
            name: maneuver.name,
            description,
            automation: auto,
        },
        logEntries: [logEntry],
    };
}

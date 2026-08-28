import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { evaluateAutoExpression } from '../../../combat/automation/automationService.js';
import { getCurrentCombatRound } from '../../../../services/encounters/combatData.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';
import {
    findManeuver,
    checkSuperiorityDice,
    expendSuperiorityDie,
    rollManeuverDie,
    buildManeuverNotFoundPopup,
    buildNoDiceRemainingPopup,
    filterMeleeAttacks,
} from './combatSuperiorityUtils.js';

// ── Bonus Action Maneuvers ──────────────────────────────────────────────

export async function executeBonusActionManeuver(action, playerStats, campaignName, maneuverName) {
    const maneuver = await findManeuver(maneuverName, playerStats.rules);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || null;

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name} as a bonus action. ${dieDescription} ${maneuver.description}`,
    };

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
                logEntries: [{
                    type: 'ability_use',
                    characterName: playerStats.name,
                    abilityName: maneuver.name,
                    description: `${maneuver.name}: No allies available to receive Rally.`,
                }],
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

// ── Grant Attack Maneuvers ──────────────────────────────────────────────

export async function executeGrantAttackManeuver(action, playerStats, campaignName, maneuverName) {
    const maneuver = await findManeuver(maneuverName, playerStats.rules);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

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

// ── Movement Maneuvers ──────────────────────────────────────────────────

export async function executeMovementManeuver(action, playerStats, campaignName, maneuverName) {
    const maneuver = await findManeuver(maneuverName, playerStats.rules);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name}. ${dieDescription} You or the ally gains +${dieValue} AC until the start of your next turn.`,
    };

    let description = `<b>${maneuver.name}</b><br/>${dieDescription}`;

    if (maneuver.effect === 'ac_bonus_and_swap') {
        description += ` You or an ally gains +${dieValue} AC until the start of your next turn.`;
        const cs = await getCombatContext(campaignName);
        const allies = cs?.creatures?.filter(c => c.name !== playerStats.name) || [];
        const options = [
            { label: `Myself (${playerStats.name})`, value: playerStats.name },
            ...allies.map(a => ({ label: a.name, value: a.name })),
        ];
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

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: maneuver.name,
            description: `${description} You or the ally gains +${dieValue} AC until the start of your next turn.`,
        },
        logEntries: [logEntry],
    };
}

// ── Skill Check Maneuvers ───────────────────────────────────────────────

export async function executeSkillCheckManeuver(action, playerStats, campaignName, maneuverName) {
    const maneuver = await findManeuver(maneuverName, playerStats.rules);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

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

// ── Reaction Maneuvers ──────────────────────────────────────────────────

export async function executeReactionManeuver(action, playerStats, campaignName, maneuverName) {
    const maneuver = await findManeuver(maneuverName, playerStats.rules);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const targetInfo = await resolveTarget(campaignName, playerStats.name);
    const targetName = targetInfo?.target?.name || null;

    const { dieValue, dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name} as a reaction. ${dieDescription} ${maneuver.description}`,
    };

    let description = `<b>${maneuver.name}</b> (Reaction)<br/>${dieDescription}`;

    if (targetName && maneuver.effect !== 'damage_reduction') {
        description += ` Target: ${targetName}.`;
    }

    if (maneuver.effect === 'melee_attack_reaction') {
        await setRuntimeValue(playerStats.name, 'pendingRiposteDieValue', dieValue, campaignName);

        const meleeAttacks = filterMeleeAttacks(playerStats.attacks);
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

// ── Commanding Presence Reaction ────────────────────────────────────────

export async function executeCommandingPresenceReaction(action, playerStats, campaignName, maneuverName) {
    const maneuver = await findManeuver(maneuverName, playerStats.rules);

    if (!maneuver) {
        return buildManeuverNotFoundPopup(maneuverName, maneuverName);
    }

    const { superiorityDice, hasDiceRemaining } = checkSuperiorityDice(playerStats, campaignName);

    if (!hasDiceRemaining) {
        return buildNoDiceRemainingPopup(maneuver.name);
    }

    const auto = action.automation || {};
    const targetName = auto.targetName;
    const reactionEffect = auto.reactionEffect || 'disadvantage_next_attack';
    const reactionDuration = auto.reactionDuration || 'until_end_of_next_turn';

    // If no target is pre-set, show a modal to select one
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (!cs || !cs.creatures || cs.creatures.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No creatures available to target.`,
                },
            };
        }

        const rangeFt = auto.reactionRange === '30_ft' ? 30 : 30;
        const validTargets = [];
        for (const creature of cs.creatures) {
            if (creature.name === playerStats.name) continue;
            const inRange = await isWithinRange(playerStats.name, creature.name, rangeFt);
            if (inRange) {
                const hp = creature.type === 'player'
                    ? { currentHp: getRuntimeValue(creature.name, 'currentHitPoints') ?? getRuntimeValue(creature.name, 'hitPoints') ?? 0, maxHp: getRuntimeValue(creature.name, 'hitPoints') ?? 0 }
                    : { currentHp: creature.currentHp ?? creature.maxHp, maxHp: creature.maxHp };
                validTargets.push({ ...creature, ...hp });
            }
        }

        if (validTargets.length === 0) {
            return {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: maneuver.name,
                    description: `${maneuver.name}: No creatures within 30 feet to target.`,
                },
            };
        }

        const saveDc = auto.saveDc === 'ability' ? playerStats.abilityDc || 8 : (auto.saveDc || 8);
        const saveType = auto.saveType || auto.reactionSaveType || 'WIS';

        return {
            type: 'modal',
            modalName: 'commandingPresenceReaction',
            payload: {
                title: `${maneuver.name} — Choose Target`,
                targets: validTargets,
                confirmLabel: 'Force Save',
                confirmIcon: 'fa-wand-sparkles',
                featureDescription: `Target must make a ${saveType} save (DC ${saveDc}) or have Disadvantage on their next attack roll.`,
                description: `You use your Reaction to intimidate a creature within 30 feet.`,
                action: action,
                playerStats: playerStats,
                campaignName: campaignName,
                maneuverName: maneuverName,
                onTargetSelected: async (selectedTargetName) => {
                    const result = await executeCommandingPresenceReaction({ ...action, automation: { ...auto, targetName: selectedTargetName } }, playerStats, campaignName, maneuverName);
                    return result;
                },
                onSkip: async () => {
                    await addEntry(campaignName, {
                        type: 'ability_use',
                        characterName: playerStats.name,
                        abilityName: maneuver.name,
                        description: `${playerStats.name} used ${maneuver.name} as a reaction but chose not to target a creature.`,
                    }).catch((e) => { console.error("[executeActionManeuvers:log-error]", e); });
                },
            },
        };
    }

    const { dieDescription, expendedDie } = rollManeuverDie(maneuver, playerStats, campaignName);
    await expendSuperiorityDie(playerStats, campaignName, expendedDie, superiorityDice);

    const logEntry = {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: maneuver.name,
        description: `Used ${maneuver.name} as a reaction on ${targetName}. ${dieDescription}`,
    };

    let description = `<b>${maneuver.name}</b> (Reaction)<br/>${dieDescription}<br/>Target: ${targetName}.`;

    if (reactionEffect === 'disadvantage_next_attack' || reactionEffect === 'attack_roll_disadvantage') {
        const durationInTurns = reactionDuration === 'until_end_of_next_turn' ? 2 : 1;
        description += ` ${targetName} has Disadvantage on their next attack roll.`;
        const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
        const conditions = Array.isArray(storedConditions) ? storedConditions : [];
        const hasDisadvantage = conditions.some(c => String(c).toLowerCase() === 'disadvantage');
        if (!hasDisadvantage) {
            await setRuntimeValue(targetName, 'activeConditions', [...conditions, 'disadvantage'], campaignName);
        }
        await addExpiration(playerStats.name, targetName, [
            { type: 'condition', condition: 'disadvantage' },
        ], campaignName, durationInTurns);
    } else if (reactionEffect === 'save_disadvantage') {
        description += ` ${targetName} has Disadvantage on their next saving throw.`;
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

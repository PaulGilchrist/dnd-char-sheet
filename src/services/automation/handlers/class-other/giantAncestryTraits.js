import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { rollExpression } from '../../../dice/diceRoller.js';
import { addEntry } from '../../../ui/logService.js';
import { findLastAttack } from '../../common/damageRollback.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { applyDamageToTarget } from '../../../rules/combat/applyDamage.js';
import { applyHealingToTarget } from '../../../rules/combat/applyHealing.js';
import { getRuntimeUsesKey } from './giantAncestryOptions.js';

export async function handleCloudsJauntDirect(action, playerStats, campaignName) {
    const usesKey = getRuntimeUsesKey("Cloud's Jaunt");
    const usesMax = playerStats.proficiency || 0;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);

    if (currentUses <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Cloud's Jaunt",
                description: "Cloud's Jaunt has no uses remaining. Uses will reset on the next Long Rest.",
                automation: action.automation,
            },
        };
    }

    await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: "Cloud's Jaunt",
        description: `${playerStats.name} used Cloud's Jaunt to teleport up to 30 feet to an unoccupied space they can see.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: "Cloud's Jaunt",
            automationType: 'teleport',
            description: `Cloud's Jaunt: Teleported up to 30 feet to an unoccupied space they can see.`,
            automation: action.automation,
        },
    };
}

export async function handleFiresBurnDirect(action, playerStats, campaignName) {
    const usesKey = getRuntimeUsesKey("Fire's Burn");
    const usesMax = playerStats.proficiency || 0;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);

    if (currentUses <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Fire's Burn",
                description: "Fire's Burn has no uses remaining. Uses will reset on the next Long Rest.",
                automation: action.automation,
            },
        };
    }

    const lastAttack = await findLastAttack(campaignName);
    if (!lastAttack?.attackEvent) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Fire's Burn",
                description: "Fire's Burn requires a recent attack. Use it after hitting a creature.",
                automation: action.automation,
            },
        };
    }

    if (lastAttack.attackerName !== playerStats.name) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Fire's Burn",
                description: "Fire's Burn can only be used after you make an attack. Wait for your turn.",
                automation: action.automation,
            },
        };
    }

    if (lastAttack.attackEvent.rollType !== 'attack') {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Fire's Burn",
                description: "Fire's Burn can only be used after an attack roll.",
                automation: action.automation,
            },
        };
    }

    const targetName = lastAttack.targetName;
    if (!targetName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Fire's Burn",
                description: "Fire's Burn requires a target. No target found from the last attack.",
                automation: action.automation,
            },
        };
    }

    const damageResult = rollExpression(action.automation.damage || '1d10');
    const damageType = action.automation.damageType || 'Fire';

    await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);

    const cs = await getCombatContext(campaignName);
    const characters = cs?.creatures?.filter(c => c.type === 'player') || [];
    const applyResult = applyDamageToTarget(cs, targetName, damageResult?.total ?? 0, [damageType], campaignName, characters, false, playerStats.name);
    const actualDamage = applyResult?.finalDamage ?? damageResult?.total ?? 0;
    const newHp = applyResult?.newHp;

    await addEntry(campaignName, {
        type: 'roll',
        characterName: playerStats.name,
        rollType: 'damage',
        name: "Fire's Burn" + ' Damage',
        targetName,
        damageType,
        total: actualDamage,
        formula: action.automation.damage || '1d10',
        rolls: damageResult?.rolls,
        description: `${playerStats.name} used Fire's Burn to deal ${actualDamage} fire damage to ${targetName}.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'damage',
            name: "Fire's Burn",
            formula: action.automation.damage || '1d10',
            rolls: damageResult?.rolls,
            total: actualDamage,
            finalDamage: actualDamage,
            damageApplied: true,
            targetName,
            targetCurrentHp: newHp,
            damageType,
        },
    };
}

export async function handleFrostsChillDirect(action, playerStats, campaignName) {
    const usesKey = getRuntimeUsesKey("Frost's Chill");
    const usesMax = playerStats.proficiency || 0;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);

    if (currentUses <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Frost's Chill",
                description: "Frost's Chill has no uses remaining. Uses will reset on the next Long Rest.",
                automation: action.automation,
            },
        };
    }

    const lastAttack = await findLastAttack(campaignName);
    if (!lastAttack?.attackEvent) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Frost's Chill",
                description: "Frost's Chill requires a recent attack. Use it after hitting a creature.",
                automation: action.automation,
            },
        };
    }

    if (lastAttack.attackerName !== playerStats.name) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Frost's Chill",
                description: "Frost's Chill can only be used after you make an attack. Wait for your turn.",
                automation: action.automation,
            },
        };
    }

    if (lastAttack.attackEvent.rollType !== 'attack') {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Frost's Chill",
                description: "Frost's Chill can only be used after an attack roll.",
                automation: action.automation,
            },
        };
    }

    const targetName = lastAttack.targetName;
    if (!targetName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: "Frost's Chill",
                description: "Frost's Chill requires a target. No target found from the last attack.",
                automation: action.automation,
            },
        };
    }

    const damageResult = rollExpression(action.automation.damage || '1d6');
    const damageType = action.automation.damageType || 'Cold';
    const speedReduction = parseInt(action.automation.value?.replace('_ft', ''), 10) || 10;

    await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);

    const cs = await getCombatContext(campaignName);
    const characters = cs?.creatures?.filter(c => c.type === 'player') || [];
    const applyResult = applyDamageToTarget(cs, targetName, damageResult?.total ?? 0, [damageType], campaignName, characters, false, playerStats.name);
    const actualDamage = applyResult?.finalDamage ?? damageResult?.total ?? 0;
    const newHp = applyResult?.newHp;

    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filteredEffects = storedEffects.filter(te => !(te.target === targetName && te.effect === 'speed_reduction'));
    const speedEffect = {
        target: targetName,
        source: "Frost's Chill",
        effect: 'speed_reduction',
        value: speedReduction,
        duration: 'until_end_of_next_turn',
    };
    await setRuntimeValue('campaign', 'targetEffects', [...filteredEffects, speedEffect], campaignName);

    await addEntry(campaignName, {
        type: 'roll',
        characterName: playerStats.name,
        rollType: 'damage',
        name: "Frost's Chill" + ' Damage',
        targetName,
        damageType,
        total: actualDamage,
        formula: action.automation.damage || '1d6',
        rolls: damageResult?.rolls,
        description: `${playerStats.name} used Frost's Chill to deal ${actualDamage} cold damage to ${targetName}.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    await addEntry(campaignName, {
        type: 'condition',
        characterName: playerStats.name,
        targetName,
        condition: 'speed_reduction',
        source: "Frost's Chill",
        description: `${playerStats.name} used Frost's Chill to reduce ${targetName}'s speed by ${speedReduction} ft until the end of their next turn.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'damage',
            name: "Frost's Chill",
            formula: action.automation.damage || '1d6',
            rolls: damageResult?.rolls,
            total: actualDamage,
            finalDamage: actualDamage,
            damageApplied: true,
            targetName,
            targetCurrentHp: newHp,
            damageType,
        },
    };
}

export async function handleHillsTumbleDirect(action, playerStats, campaignName) {
    const optName = "Hill's Tumble";
    const usesKey = getRuntimeUsesKey(optName);
    const usesMax = playerStats.proficiency || 0;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);

    if (currentUses <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} has no uses remaining. Uses will reset on the next Long Rest.`,
                automation: action.automation,
            },
        };
    }

    const lastAttack = await findLastAttack(campaignName);
    if (!lastAttack?.attackEvent) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires a recent attack. Use it after hitting a creature.`,
                automation: action.automation,
            },
        };
    }

    if (lastAttack.attackerName !== playerStats.name) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} can only be used after you make an attack. Wait for your turn.`,
                automation: action.automation,
            },
        };
    }

    if (lastAttack.attackEvent.rollType !== 'attack') {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} can only be used after an attack roll.`,
                automation: action.automation,
            },
        };
    }

    const targetName = lastAttack.targetName;
    if (!targetName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires a target. No target found from the last attack.`,
                automation: action.automation,
            },
        };
    }

    const storedConds = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    if (storedConds.includes('prone')) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${targetName} is already prone.`,
                automation: action.automation,
            },
        };
    }

    await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);

    const newConds = Array.isArray(storedConds) ? [...storedConds, 'prone'] : ['prone'];
    await setRuntimeValue(targetName, 'activeConditions', newConds, campaignName);

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: optName,
        description: `${playerStats.name} used ${optName} to knock ${targetName} prone.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    await addEntry(campaignName, {
        type: 'condition',
        characterName: playerStats.name,
        targetName,
        condition: 'prone',
        source: optName,
        description: `${playerStats.name} used ${optName} to apply the prone condition to ${targetName}.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: optName,
            automationType: 'hills_tumble',
            description: `${optName}: Knocked <strong>${targetName}</strong> prone.`,
            automation: action.automation,
        },
    };
}

export async function handleStonesEnduranceDirect(action, playerStats, campaignName) {
    const optName = "Stone's Endurance";
    const usesKey = getRuntimeUsesKey(optName);
    const usesMax = playerStats.proficiency || 0;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);

    if (currentUses <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} has no uses remaining. Uses will reset on the next Long Rest.`,
                automation: action.automation,
            },
        };
    }

    const lastAttack = await findLastAttack(campaignName);
    if (!lastAttack?.attackEvent) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires a recent attack where you were the target and took damage.`,
                automation: action.automation,
            },
        };
    }

    if (lastAttack.targetName !== playerStats.name) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} can only be used when you were the target of the attack and took damage.`,
                automation: action.automation,
            },
        };
    }

    const totalDamage = lastAttack.totalDamage || 0;
    if (totalDamage <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires that you took damage from the attack. No damage was dealt.`,
                automation: action.automation,
            },
        };
    }

    const enduranceRoll = rollExpression('1d12');
    const conMod = playerStats.abilities?.find(a => a.name === 'Constitution')?.bonus || 0;
    const totalHeal = enduranceRoll.total + conMod;
    const actualHeal = Math.min(totalHeal, totalDamage);

    await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);

    const cs = await getCombatContext(campaignName);
    const healResult = applyHealingToTarget(cs, playerStats.name, actualHeal, campaignName);
    const finalHeal = healResult?.actualHeal ?? actualHeal;

    await addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerStats.name,
        abilityName: optName,
        description: `${playerStats.name} used ${optName} to heal ${finalHeal} HP (rolled ${enduranceRoll.total} + ${conMod} CON modifier, capped at ${totalDamage} damage).`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    await addEntry(campaignName, {
        type: 'healing',
        characterName: playerStats.name,
        targetName: playerStats.name,
        amount: finalHeal,
        source: optName,
        description: `${playerStats.name} used ${optName} to heal ${finalHeal} HP.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: optName,
            automationType: 'stones_endurance',
            description: `${optName}: Rolled <strong>${enduranceRoll.total}</strong> + ${conMod} CON = <strong>${totalHeal}</strong> (capped at ${totalDamage} damage). Healed <strong>${finalHeal}</strong> HP.`,
            automation: action.automation,
        },
    };
}

export async function handleStormsThunderDirect(action, playerStats, campaignName, _mapName) {
    const optName = "Storm's Thunder";
    const usesKey = getRuntimeUsesKey(optName);
    const usesMax = playerStats.proficiency || 0;
    const currentUses = Number(getRuntimeValue(playerStats.name, usesKey, campaignName) ?? usesMax);

    if (currentUses <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} has no uses remaining. Uses will reset on the next Long Rest.`,
                automation: action.automation,
            },
        };
    }

    const lastAttack = await findLastAttack(campaignName);
    if (!lastAttack?.attackEvent) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires a recent attack where you were the target and took damage.`,
                automation: action.automation,
            },
        };
    }

    if (lastAttack.targetName !== playerStats.name) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} can only be used when you were the target of the attack and took damage.`,
                automation: action.automation,
            },
        };
    }

    const totalDamage = lastAttack.totalDamage || 0;
    if (totalDamage <= 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires that you took damage from the attack. No damage was dealt.`,
                automation: action.automation,
            },
        };
    }

    const attackerName = lastAttack.attackerName;
    if (!attackerName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: optName,
                description: `${optName} requires a target. No attacker found from the last attack.`,
                automation: action.automation,
            },
        };
    }

    await setRuntimeValue(playerStats.name, usesKey, currentUses - 1, campaignName);

    const damageResult = rollExpression(action.automation.damage || '1d8');
    const damageType = action.automation.damageType || 'Thunder';

    const cs = await getCombatContext(campaignName);
    const characters = cs?.creatures?.filter(c => c.type === 'player') || [];
    const applyResult = applyDamageToTarget(cs, attackerName, damageResult?.total ?? 0, [damageType], campaignName, characters, false, playerStats.name);
    const actualDamage = applyResult?.finalDamage ?? damageResult?.total ?? 0;
    const newHp = applyResult?.newHp;

    await addEntry(campaignName, {
        type: 'roll',
        characterName: playerStats.name,
        rollType: 'damage',
        name: optName + ' Damage',
        targetName: attackerName,
        damageType,
        total: actualDamage,
        formula: action.automation.damage || '1d8',
        rolls: damageResult?.rolls,
        description: `${playerStats.name} used ${optName} to deal ${actualDamage} thunder damage to ${attackerName}.`,
    }).catch((e) => { console.error("[giantAncestry] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'damage',
            name: optName,
            formula: action.automation.damage || '1d8',
            rolls: damageResult?.rolls,
            total: actualDamage,
            finalDamage: actualDamage,
            damageApplied: true,
            targetName: attackerName,
            targetCurrentHp: newHp,
            damageType,
        },
    };
}

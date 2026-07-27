import { getCombatContext } from '../../rules/combat/damageUtils.js';
import { applyHealingToTarget } from '../../rules/combat/applyHealing.js';
import { addEntry } from '../../ui/logService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { removeCondition } from '../../combat/conditions/conditionSaveService.js';

/**
 * Get the last attack from the root-level lastAttack key.
 *
 * @param {string} [campaignName] - Campaign name for fetching combat context
 * @returns {{ attackEvent: Object|null, attackerName: string|null, targetName: string|null, primaryDamage: number, secondaryDamage: number, totalDamage: number, damageTypes: string[] }}
 */
export async function findLastAttack(campaignName) {
    const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName);
    if (!lastAttack) {
        return { attackEvent: null, attackerName: null, targetName: null, primaryDamage: 0, secondaryDamage: 0, totalDamage: 0, damageTypes: [] };
    }

    const a = lastAttack;
    const primary = a.primaryDamage || a.rawDamage || 0;
    const secondary = a.secondaryDamage || 0;
    const actualDamage = a.actualDamage ?? (primary + secondary);

    return {
        attackEvent: {
            ...(a.affectedTargets == null ? { affectedTargets: [a.targetName] } : {}),
            ...(a.statusEffects == null ? { statusEffects: null } : {}),
            ...a,
        },
        attackerName: a.attackerName,
        targetName: a.targetName,
        primaryDamage: primary,
        secondaryDamage: secondary,
        totalDamage: actualDamage,
        damageTypes: a.damageTypes || [],
        primaryDamageType: a.primaryDamageType || a.damageType || null,
        secondaryDamageType: a.secondaryDamageType || null,
    };
}

/**
 * Find the last attack roll targeting a specific player.
 * Uses combatSummary.lastAttack which is the single source of truth.
 *
 * @param {string} targetName - Name of the target to find attacks against
 * @param {string} [campaignName] - Campaign name for fetching combat context
 * @returns {{ attackEvent: Object|null, attackerName: string|null }}
 */
export async function findAttackRollAgainstTarget(targetName, campaignName) {
    const result = await findLastAttack(campaignName);
    if (!result.attackEvent) return { attackEvent: null, attackerName: null };
    if (result.targetName === targetName) {
        return { attackEvent: result.attackEvent, attackerName: result.attackerName };
    }
    return { attackEvent: null, attackerName: null };
}

/**
 * Rollback damage by healing the target for the last attack's total damage (primary + secondary).
 * Logs the rollback to the campaign log.
 *
 * @returns {number} The amount that was actually healed (may be 0 if target is at max HP)
 */
export async function rollbackDamage(attackerName, targetName, campaignName, featureName) {
    const result = await findLastAttack(campaignName);
    if (!result.attackEvent) return 0;

    const a = result.attackEvent;
    if (a.attackerName !== attackerName || a.targetName !== targetName) return 0;
    if (!result.totalDamage || result.totalDamage <= 0) return 0;

    const cs = await getCombatContext(campaignName);
    if (!cs) return 0;

    const healResult = applyHealingToTarget(cs, targetName, result.totalDamage, campaignName);
    if (healResult?.newHp != null) {
        await addEntry(campaignName, {
            type: 'ability_use',
            characterName: targetName,
            abilityName: featureName,
            description: `${targetName} used ${featureName} — ${attackerName}'s attack misses due to illusory duplicate. The attack is retroactively negated and ${targetName} is healed for ${result.totalDamage} HP.`,
            targetName: attackerName,
            timestamp: Date.now(),
        }).catch((e) => { console.error(`[${featureName}] Error:`, e); throw e; });
        return result.totalDamage;
    }

    return 0;
}

/**
 * Find the most recent roll (attack, ability check, or save) for each creature.
 * Reads from the root-level lastAttack — the single source of truth for the most recent roll.
 * Since reactions can only target the most recent roll, this returns the same lastAttack
 * data for all creatures. Handlers should check attackerName/targetName to determine relevance.
 *
 * @returns {Promise<Object|null>} Map of { creatureName: { attackEvent, abilityEvent, saveEvent, rollType } } or null
 */
export async function findRollsByCreature(campaignName) {
    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures) return null;

    const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName);
    const result = {};
    for (const creature of cs.creatures) {
        const name = creature.name;
        result[name] = {
            attackEvent: lastAttack?.rollType === 'attack' ? lastAttack : null,
            abilityEvent: lastAttack?.rollType === 'check' || lastAttack?.rollType === 'skill' ? lastAttack : null,
            saveEvent: lastAttack?.rollType === 'save' ? lastAttack : null,
            rollType: lastAttack?.rollType || null,
        };
    }
    return result;
}

/**
 * Find the most recent roll across all creatures (used by Portent).
 * Returns the single most recent event regardless of creature type.
 *
 * @returns {Promise<{ creatureName: string, eventType: string, eventData: Object, isStale: boolean }|null>}
 */
export async function findMostRecentRollAcrossCreatures(campaignName) {
    const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName);
    if (!lastAttack) return null;

    let eventType = 'attack';
    if (lastAttack.rollType === 'check' || lastAttack.rollType === 'skill') {
        eventType = 'ability';
    } else if (lastAttack.rollType === 'save') {
        eventType = 'save';
    }

    return {
        creatureName: lastAttack.attackerName || lastAttack.targetName || null,
        eventType,
        eventData: lastAttack,
        isStale: false,
    };
}

/**
 * Store damage rolls in the root-level lastAttack for later access by features like Piercer.
 * Called after damage resolves for plain weapon attacks.
 *
 * @param {string} campaignName - Campaign name
 * @param {Object} lastAttack - The lastAttack object to update
 */
export async function storeDamageRolls(campaignName, lastAttack) {
    if (!lastAttack) return;
    const existing = await getRuntimeValue('campaign', 'lastAttack', campaignName);
    if (!existing) return;

    const updatedLastAttack = {
        ...existing,
        ...lastAttack,
    };

    await setRuntimeValue('campaign', 'lastAttack', updatedLastAttack, campaignName);
}

/**
 * Rollback all effects of a countered spell.
 * Heals damage, removes conditions, and cleans targetEffects for all affected targets.
 * Returns summary of what was rolled back.
 *
 * @param {Object} lastAttack - The lastAttack object from the spell being countered
 * @param {string} campaignName - Campaign name
 * @param {string} featureName - Name of the feature (e.g. 'Counterspell')
 * @param {Object} [existingCombatContext] - Pre-fetched combat context (avoids redundant re-fetch)
 * @returns {Promise<{targetsHealed: number, conditionsRemoved: Array, effectsRemoved: number, damageHealed: number, logDescription: string}>}
 */
export async function rollbackSpellEffects(lastAttack, campaignName, featureName, existingCombatContext) {
    const targets = lastAttack.affectedTargets || [lastAttack.targetName];
    const attackerName = lastAttack.attackerName || 'Unknown';
    const spellName = lastAttack.attackName || lastAttack.damageName || 'unknown spell';

    const cs = existingCombatContext || await getCombatContext(campaignName);
    if (!cs) {
        console.error(`[${featureName}] No combat context for rollback`);
        return { targetsHealed: 0, conditionsRemoved: [], effectsRemoved: 0, damageHealed: 0, logDescription: '' };
    }

    let rolledBack = {
        targetsHealed: 0,
        conditionsRemoved: [],
        effectsRemoved: 0,
        damageHealed: 0,
        logDescription: '',
    };

    const totalDamage = lastAttack.actualDamage ?? ((lastAttack.primaryDamage || 0) + (lastAttack.secondaryDamage || 0));
    const conditionKeys = lastAttack.statusEffects || [];

    for (const targetName of targets) {
        // Heal damage
        if (totalDamage > 0) {
            const healResult = applyHealingToTarget(cs, targetName, totalDamage, campaignName);
            if (healResult?.newHp != null) {
                rolledBack.damageHealed += totalDamage;
                rolledBack.targetsHealed++;
            }
        }

        // Remove conditions
        for (const condition of conditionKeys) {
            try {
                removeCondition(cs, targetName, condition, getRuntimeValue, setRuntimeValue, campaignName);
                rolledBack.conditionsRemoved.push({ targetName, condition });
            } catch (e) {
                console.error(`[${featureName}] Failed to remove condition '${condition}' from ${targetName}:`, e);
            }
        }
    }

    // Remove targetEffects for this attacker
    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = storedEffects.filter(te => !(te.target && targets.includes(te.target) && te.source === attackerName));
    if (filtered.length < storedEffects.length) {
        rolledBack.effectsRemoved = storedEffects.length - filtered.length;
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName);
    }

    // Build log description
    const damageStr = rolledBack.damageHealed > 0 ? `${rolledBack.damageHealed} HP healed` : 'no damage dealt';
    const conditionStr = rolledBack.conditionsRemoved.length > 0
        ? `${rolledBack.conditionsRemoved.length} condition(s) removed`
        : 'no conditions to remove';
    const effectStr = rolledBack.effectsRemoved > 0 ? `${rolledBack.effectsRemoved} target effect(s) cleared` : 'no target effects to clear';
    const affectedList = targets.join(', ');

    rolledBack.logDescription = `${attackerName}'s spell '${spellName}' was countered — ${damageStr}, ${conditionStr}, ${effectStr} on ${affectedList}.`;

    return rolledBack;
}

/**
 * Update lastAttack with statusEffects for counterspell rollback.
 * Call this from automation handlers after applying conditions on failed save.
 *
 * @param {string} campaignName - Campaign name
 * @param {Array} statusEffects - Array of condition keys applied
 * @param {string} [targetName] - Target name (defaults to lastAttack.targetName)
 */
export async function updateLastAttackWithEffects(campaignName, statusEffects, targetName) {
    const existingLastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName);
    if (!existingLastAttack) return;

    const updatedLastAttack = {
        ...existingLastAttack,
        statusEffects: statusEffects,
        affectedTargets: existingLastAttack.affectedTargets || [targetName || existingLastAttack.targetName],
    };

    setRuntimeValue('campaign', 'lastAttack', updatedLastAttack, campaignName);
}

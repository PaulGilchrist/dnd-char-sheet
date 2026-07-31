import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';

/**
 * Web spell handler for 2024 ruleset.
 * Mechanics:
 * - 60-foot range, 20-foot Cube of sticky webbing
 * - Difficult Terrain, Lightly Obscured
 * - Concentration, up to 1 hour
 * - DEX save on entry or start of turn — Restrained on failure
 * - STR save each turn — Restrained on failure
 * - Restrained creature can use Action for STR (Athletics) check vs spell DC to break free
 * - Flammable: 5-ft cube exposed to fire burns in 1 round, 2d4 Fire damage to creatures starting turn in fire
 */

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const dc = buildSaveDc(auto, playerStats);
    const casterName = playerStats.name;

    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures || cs.creatures.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No creatures in combat. Web has no effect.',
            },
        };
    }

    // Get selected targets from metaCtx — includes ALL creatures (including caster)
    const selectedTargetNames = action.metaCtx?.targets || cs.creatures.map(c => c.name);
    const targets = cs.creatures.filter(c => selectedTargetNames.includes(c.name));

    if (targets.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No creatures selected for Web.',
            },
        };
    }

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'DEX',
        saveDc: dc,
        attackScope: 'aoe',
    });

    // Register concentration for this spell
    const combatSummary = getCombatSummary(campaignName);
    if (combatSummary) {
        const concentrationDc = playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
        addConcentration(combatSummary, casterName, 'Web', concentrationDc);
        storage.set('combatSummary', combatSummary, campaignName);
        window.dispatchEvent(new CustomEvent('combat-summary-updated'));
    }

    let affectedCount = 0;
    let savedCount = 0;
    const results = [];

    for (const target of targets) {
        const targetName = target.name;

        const { promptId, promise } = createSaveListener(campaignName, {
            targetName,
            saveType: 'DEX',
            saveDc: dc,
            dcSuccess: 'none',
            disadvantage: action.metaCtx?.heightenTarget === targetName,
        });

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: casterName,
            abilityName: action.name,
            description: `${casterName} casts Web! ${targetName} must make a DEX save (DC ${dc}) or become Restrained by sticky webbing.`,
            promptId,
        }).catch((e) => { console.error("[web] Error:", e); });

        const saveResult = await promise;

        if (saveResult.success) {
            savedCount++;
            await addTargetResult(campaignName, {
                targetName,
                saveResult: 'success',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: [],
                appliedDamage: 0,
            });
            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-web',
                targetName,
                saveDc: dc,
                saveType: 'DEX',
                success: true,
                description: `${targetName} succeeded on DEX save against Web.`,
            }).catch((e) => { console.error("[web] Error:", e); });
        } else {
            affectedCount++;

            // Apply Restrained condition
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const filtered = conditions.filter(c => String(c).toLowerCase() !== 'restrained');
            setRuntimeValue(targetName, 'activeConditions', [...filtered, 'restrained'], campaignName);

            // Store condition metadata with DC and ability for recurring STR save
            const existingMeta = getRuntimeValue(targetName, 'activeConditionMeta', campaignName) || {};
            setRuntimeValue(targetName, 'activeConditionMeta', {
                ...existingMeta,
                restrained: {
                    ...(existingMeta.restrained || {}),
                    dc,
                    ability: 'str',
                },
            }, campaignName);

            await addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: ['restrained'],
                appliedDamage: 0,
            });

            // Add expiration for concentration — Restrained removed when concentration breaks
            addExpiration(casterName, targetName, [
                { type: 'condition', condition: 'restrained' },
            ], campaignName);

            // Also expire restrained on initiative roll
            addExpiration(casterName, targetName, [
                { type: 'condition', condition: 'restrained' },
            ], campaignName, undefined, casterName);

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Restrained',
                reason: 'Web spell',
                note: `${targetName} is Restrained by Web: Speed is 0, attack rolls against you have Advantage, your attack rolls have Disadvantage, and you have Disadvantage on Dexterity saving throws. STR save (DC ${dc}) each turn or remain Restrained.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[web] Error:", e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-web',
                targetName,
                saveDc: dc,
                saveType: 'DEX',
                success: false,
                description: `${targetName} failed DEX save against Web. Becomes Restrained by sticky webbing.`,
            }).catch((e) => { console.error("[web] Error:", e); });

            results.push(`${targetName} is Restrained.`);
        }
    }

    const summary = affectedCount > 0
        ? `Web affects ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. Affected creatures are Restrained (Speed 0, attack rolls against them have Advantage, their attacks have Disadvantage, Disadvantage on DEX saves). Restrained creatures can use their action to make a STR (Athletics) check vs DC ${dc} to break free.`
        : `No creatures affected by Web. ${savedCount} creature(s) saved.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

export async function processWebAreaSave(casterName, targetName, campaignName, mapName) {
    const trackingKey = `_web_${casterName.replace(/\s+/g, '_')}`;
    const tracking = getRuntimeValue(casterName, trackingKey, campaignName);

    if (!tracking || !tracking.saveDc) {
        return null;
    }

    if (mapName) {
        try {
            const { isWithinRange } = await import('../../../rules/combat/rangeCheck.js');
            const inArea = await isWithinRange(casterName, targetName, tracking.radius);
            if (!inArea) return null;
        } catch {
            // If map data unavailable, proceed with save
        }
    }

    const existingConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    const isAlreadyRestrained = existingConditions.some(c => String(c).toLowerCase() === 'restrained');
    if (isAlreadyRestrained) return null;

    const { playerIsImmuneToCondition } = await import('../../../combat/automation/automationImmunities.js');
    const { getCombatContext: getCtx } = await import('../../../rules/combat/damageUtils.js');
    const targetCharacter = (await getCtx(campaignName))?.creatures?.find(c => c.name === targetName);
    if (targetCharacter?.type === 'player') {
        const targetStats = {
            computedStats: getRuntimeValue(targetName, 'computedStats', campaignName),
        };
        if (playerIsImmuneToCondition({
            conditionKey: 'restrained',
            playerStats: targetStats,
            getRuntimeValue,
            campaignName,
        })) {
            return null;
        }
    }

    const { promptId, promise } = createSaveListener(campaignName, {
        targetName,
        saveType: 'STR',
        saveDc: tracking.saveDc,
    });

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: 'Web',
        description: `${targetName} must make a STR save (DC ${tracking.saveDc}) or become Restrained (Web area).`,
        promptId,
    }).catch((e) => { console.error("[webAreaSave] Error:", e); });

    const saveResult = await promise;

    if (!saveResult.success) {
        const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
        const conditions = Array.isArray(storedConditions) ? storedConditions : [];
        const filtered = conditions.filter(c => String(c).toLowerCase() !== 'restrained');
        setRuntimeValue(targetName, 'activeConditions', [...filtered, 'restrained'], campaignName);

        await addTargetResult(campaignName, {
            targetName,
            saveResult: 'failure',
            roll: saveResult.roll ?? 0,
            total: saveResult.total ?? 0,
            conditions: ['restrained'],
            appliedDamage: 0,
        });

        addEntry(campaignName, {
            type: 'save_result',
            characterName: casterName,
            rollType: 'save-web',
            targetName,
            saveDc: tracking.saveDc,
            saveType: 'STR',
            success: false,
            description: `${targetName} failed STR save against Web. Becomes Restrained.`,
        }).catch((e) => { console.error("[webAreaSave] Error:", e); });
    } else {
        await addTargetResult(campaignName, {
            targetName,
            saveResult: 'success',
            roll: saveResult.roll ?? 0,
            total: saveResult.total ?? 0,
            conditions: [],
            appliedDamage: 0,
        });
        addEntry(campaignName, {
            type: 'save_result',
            characterName: casterName,
            rollType: 'save-web',
            targetName,
            saveDc: tracking.saveDc,
            saveType: 'STR',
            success: true,
            description: `${targetName} succeeded on STR save against Web.`,
        }).catch((e) => { console.error("[webAreaSave] Error:", e); });
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: 'Web',
            description: `${targetName} ${saveResult.success ? 'succeeded' : 'failed'} the STR save (DC ${tracking.saveDc}). ${!saveResult.success ? 'Becomes Restrained.' : 'Unaffected.'}`,
        },
    };
}

import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';
import { isSleepImmune, stageSleepTargets } from '../../../rules/features/sleepService.js';

/**
 * Sleep spell handler for 2024 ruleset.
 * Mechanics:
 * - Each target makes a WIS save or becomes Incapacitated until the end of its
 *   next turn (staged via the 'sleep_staged' target effect), at which point it
 *   repeats the save (sleepService.applySleepTurnEnd). Failing the repeat save
 *   escalates to Unconscious for the spell's duration.
 * - The spell ends on a target that takes damage (applyDamage wake hook) or that
 *   is shaken awake.
 * - Creatures that don't sleep (elves, undead, constructs) or that are immune to
 *   Exhaustion automatically succeed.
 */
export async function handle(action, playerStats, campaignName, _mapName, characters) {
    const auto = action.automation || {};
    const dc = action.metaCtx?.spellSaveDc ?? buildSaveDc(auto, playerStats);
    const casterName = playerStats.name;

    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures || cs.creatures.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No creatures in combat. Sleep has no effect.',
            },
        };
    }

    const selectedNames = Array.isArray(action.metaCtx?.selectedTargets) && action.metaCtx.selectedTargets.length > 0
        ? action.metaCtx.selectedTargets
        : null;

    const targets = cs.creatures.filter(c => {
        if (c.name === casterName) return false;
        if (selectedNames && !selectedNames.includes(c.name)) return false;
        return true;
    });

    if (targets.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No valid targets selected.',
            },
        };
    }

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'WIS',
        saveDc: dc,
        attackScope: 'aoe',
    });

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: action.name,
        description: `${casterName} casts ${action.name}! ${targets.length} target(s) must make a WIS save (DC ${dc}) or become Incapacitated until the end of their next turn.`,
    }).catch((e) => { console.error('[sleep] Error logging cast:', e); });

    const failedTargets = [];
    let autoSuccessCount = 0;

    for (const target of targets) {
        const targetName = target.name;

        if (await isSleepImmune(campaignName, target, characters)) {
            autoSuccessCount++;
            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-sleep',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: true,
                description: `${targetName} automatically succeeds on the save against ${action.name} (doesn't sleep or is immune to Exhaustion).`,
            }).catch((e) => { console.error('[sleep] Error logging auto save:', e); });
            addTargetResult(campaignName, {
                targetName,
                saveResult: 'success',
                roll: null,
                total: null,
                conditions: [],
                appliedDamage: 0,
            });
            continue;
        }

        let success;
        let roll = null;
        let total = null;
        let saveBonus = 0;

        if (target.type === 'npc') {
            saveBonus = target.saveBonuses?.wis ?? 0;
            roll = Math.floor(Math.random() * 20) + 1;
            total = roll + saveBonus;
            success = total >= dc;
        } else {
            const { promptId, promise } = createSaveListener(campaignName, {
                targetName,
                saveType: 'WIS',
                saveDc: dc,
                dcSuccess: 'none',
                disadvantage: action.metaCtx?.heightenTarget === targetName,
                sourceName: casterName,
                condition: 'Sleep',
            });

            addEntry(campaignName, {
                type: 'ability_use',
                characterName: casterName,
                abilityName: action.name,
                description: `${casterName} casts ${action.name}! ${targetName} must make a WIS save (DC ${dc}) or become Incapacitated.`,
                promptId,
            }).catch((e) => { console.error('[sleep] Error logging prompt:', e); });

            const saveResult = await promise;
            success = saveResult.success;
            roll = saveResult.roll ?? 0;
            total = saveResult.total ?? 0;
            saveBonus = saveResult.saveBonus ?? 0;
        }

        addEntry(campaignName, {
            type: 'save_result',
            characterName: casterName,
            rollType: 'save-sleep',
            targetName,
            saveDc: dc,
            saveType: 'WIS',
            success,
            roll,
            total,
            saveBonus,
            description: success
                ? `${targetName} succeeded on its WIS save (DC ${dc}) against ${action.name}.`
                : `${targetName} failed its WIS save (DC ${dc}) against ${action.name}.`,
        }).catch((e) => { console.error('[sleep] Error logging save result:', e); });

        if (success) {
            addTargetResult(campaignName, {
                targetName,
                saveResult: 'success',
                roll,
                total,
                conditions: [],
                appliedDamage: 0,
            });
        } else {
            failedTargets.push(targetName);
            addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll,
                total,
                conditions: ['incapacitated'],
                appliedDamage: 0,
            });
        }
    }

    if (failedTargets.length > 0) {
        await stageSleepTargets(campaignName, casterName, failedTargets, dc);

        for (const targetName of failedTargets) {
            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Incapacitated',
                reason: `${action.name} spell`,
                sourceName: casterName,
                note: `${targetName} falls Incapacitated until the end of its next turn, when it repeats the WIS save (DC ${dc}).`,
            }).catch((e) => { console.error('[sleep] Error logging condition:', e); });
        }
    }

    const affectedCount = failedTargets.length;
    const savedCount = targets.length - affectedCount;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: `${action.name} (DC ${dc}): ${affectedCount} Incapacitated until end of next turn, ${savedCount} succeeded${autoSuccessCount > 0 ? ` (${autoSuccessCount} auto-succeeded)` : ''}.`,
            automation: auto,
        },
    };
}

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
 * Forcecage spell handler (2024 ruleset).
 * Mechanics:
 * - 100-foot range, cube-shaped prison (cage or box)
 * - Creatures completely inside the area are trapped
 * - Creatures partially inside or too large are pushed outside
 * - Trapped creatures can't leave by nonmagical means
 * - If trapped creature tries teleportation/interplanar travel → CHA save
 * - On successful save → can exit via teleportation
 * - On failed save → doesn't exit, wastes the spell/effect
 * - Cage extends into the Ethereal Plane (blocks ethereal travel)
 * - Can't be dispelled by Dispel Magic
 * - Concentration, up to 1 hour (2024) / 1 hour (5e, no concentration)
 */

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const dc = buildSaveDc(auto, playerStats);

    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures || cs.creatures.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No creatures in combat. Forcecage has no effect.',
            },
        };
    }

    const casterName = playerStats.name;

    // Determine if this is 2024 rules (concentration) or 5e (no concentration)
    const is2024 = action.automation?.ruleset === '2024' || action.automation?.concentration === true;

    // Register concentration for 2024 rules
    if (is2024) {
        const combatSummary = getCombatSummary(campaignName);
        if (combatSummary) {
            const concentrationDc = playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
            addConcentration(combatSummary, casterName, 'Forcecage', concentrationDc);
            storage.set('combatSummary', combatSummary, campaignName);
            window.dispatchEvent(new CustomEvent('combat-summary-updated'));
        }
    }

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'CHA',
        saveDc: dc,
        attackScope: 'aoe',
    });

    const targets = cs.creatures.filter(c => c.name !== casterName);

    let affectedCount = 0;
    let savedCount = 0;
    const results = [];

    for (const target of targets) {
        const targetName = target.name;

        const { promptId, promise } = createSaveListener(campaignName, {
            targetName,
            saveType: 'CHA',
            saveDc: dc,
            dcSuccess: 'none',
            disadvantage: action.metaCtx?.heightenTarget === targetName,
        });

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: casterName,
            abilityName: action.name,
            description: `${casterName} casts Forcecage! ${targetName} must make a CHA save (DC ${dc}) or be trapped in the cage.`,
            promptId,
        }).catch((e) => { console.error("[forcecage] Error:", e); });

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
                rollType: 'save-forcecage',
                targetName,
                saveDc: dc,
                saveType: 'CHA',
                success: true,
                description: `${targetName} succeeded on CHA save against Forcecage.`,
            }).catch((e) => { console.error("[forcecage] Error:", e); });
        } else {
            affectedCount++;

            // Track Forcecage effect with DC for cleanup and escape checks
            const targetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            const effects = Array.isArray(targetEffects) ? [...targetEffects] : [];
            const forcecageEffect = {
                target: targetName,
                effect: 'forcecage',
                source: casterName,
                dc: dc,
                duration: is2024 ? 'concentration' : '1_hour',
                concentration: is2024,
            };
            const existingIdx = effects.findIndex(
                te => te.target === targetName && te.effect === 'forcecage'
            );
            if (existingIdx >= 0) {
                effects[existingIdx] = forcecageEffect;
            } else {
                effects.push(forcecageEffect);
            }
            setRuntimeValue('campaign', 'targetEffects', effects, campaignName);

            // Store forcecage metadata for escape trigger tracking
            setRuntimeValue(targetName, 'forcecageData', {
                casterName,
                dc,
                timestamp: Date.now(),
            }, campaignName);

            await addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: ['forcecage'],
                appliedDamage: 0,
            });

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Forcecaged',
                reason: 'Forcecage spell',
                note: `${targetName} is trapped in a Forcecage. Cannot leave by nonmagical means. Must make CHA save (DC ${dc}) to use teleportation or interplanar travel. Cage extends into the Ethereal Plane. Can't be dispelled by Dispel Magic.${is2024 ? ' Concentration, up to 1 hour.' : ' Duration: 1 hour.'}`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[forcecage] Error:", e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-forcecage',
                targetName,
                saveDc: dc,
                saveType: 'CHA',
                success: false,
                description: `${targetName} failed CHA save against Forcecage and is trapped.`,
            }).catch((e) => { console.error("[forcecage] Error:", e); });

            addExpiration(casterName, targetName, [
                { type: 'remove_target_effect', effectKey: 'forcecage', target: targetName, source: casterName },
            ], campaignName);

            results.push(`${targetName} is trapped in the Forcecage.`);
        }
    }

    const summary = affectedCount > 0
        ? `Forcecage traps ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. Trapped creatures can't leave by nonmagical means and must make a CHA save (DC ${dc}) to use teleportation or interplanar travel to exit.`
        : `No creatures trapped by Forcecage. ${savedCount} creature(s) saved.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

/**
 * forcecageEscapeHandler — triggered when a forcecaged creature attempts
 * teleportation or interplanar travel to escape.
 * Mechanics:
 * - CHA saving throw against the caster's DC
 * - On success: creature can use that magic to exit the cage
 * - On failure: creature doesn't exit and wastes the spell/effect
 */
export async function handleEscape(action, playerStats, campaignName, _mapName) {
    const targetName = action.metaCtx?.forcecageTargetName;

    if (!targetName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: 'Forcecage Escape',
                description: 'No target specified for Forcecage escape check.',
            },
        };
    }

    const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const forcecageEffect = targetEffects.find(
        te => te.effect === 'forcecage' && te.target === targetName
    );

    if (!forcecageEffect) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: 'Forcecage Escape',
                description: `${targetName} is not trapped by Forcecage.`,
            },
        };
    }

    const targetCreature = (action.metaCtx?.creatures || []).find(c => c.name === targetName);
    const chaBonus = targetCreature?.abilities?.CHA?.bonus ?? 0;
    const chaProficiency = targetCreature?.proficiency ?? 0;
    const saveDc = forcecageEffect.dc || 15;

    // Roll the CHA saving throw
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + chaBonus + chaProficiency;
    const success = total >= saveDc;

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: targetName,
        abilityName: 'Forcecage Escape Attempt',
        description: `${targetName} attempts to escape Forcecage using teleportation/interplanar travel. CHA save: ${roll} + ${chaBonus + chaProficiency} = ${total} vs DC ${saveDc}.`,
    }).catch((e) => { console.error("[forcecageEscape] Error:", e); });

    if (success) {
        addEntry(campaignName, {
            type: 'save_result',
            characterName: targetName,
            rollType: 'save-forcecage-escape',
            targetName,
            saveDc,
            saveType: 'CHA',
            success: true,
            description: `${targetName} succeeded on CHA save and escaped the Forcecage.`,
        }).catch((e) => { console.error("[forcecageEscape] Error:", e); });

        // Remove the forcecage effect
        const remainingEffects = targetEffects.filter(
            te => !(te.effect === 'forcecage' && te.target === targetName)
        );
        setRuntimeValue('campaign', 'targetEffects', remainingEffects, campaignName);

        // Clear forcecage metadata
        setRuntimeValue(targetName, 'forcecageData', null, campaignName);

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: 'Forcecage Escape',
                description: `${targetName} succeeded on CHA save (${total} vs DC ${saveDc}) and escaped the Forcecage using teleportation/interplanar travel.`,
            },
        };
    } else {
        addEntry(campaignName, {
            type: 'save_result',
            characterName: targetName,
            rollType: 'save-forcecage-escape',
            targetName,
            saveDc,
            saveType: 'CHA',
            success: false,
            description: `${targetName} failed CHA save and remains trapped in Forcecage.`,
        }).catch((e) => { console.error("[forcecageEscape] Error:", e); });

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: 'Forcecage Escape',
                description: `${targetName} failed CHA save (${total} vs DC ${saveDc}) and remains trapped in the Forcecage. The teleportation/interplanar travel spell or effect is wasted.`,
            },
        };
    }
}

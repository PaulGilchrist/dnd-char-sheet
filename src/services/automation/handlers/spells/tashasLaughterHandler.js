import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';

/**
 * Tasha's Hideous Laughter spell handler for 2024 ruleset.
 * Mechanics:
 * - WIS save or Prone + Incapacitated conditions for duration
 * - Successful save ends the spell
 * - Concentration, up to 1 minute
 * - Higher level: one additional creature per slot level above 1
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
                description: "No creatures in combat. Tasha's Hideous Laughter has no effect.",
            },
        };
    }

    const casterName = playerStats.name;

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'WIS',
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
            saveType: 'WIS',
            saveDc: dc,
            dcSuccess: 'none',
            disadvantage: action.metaCtx?.heightenTarget === targetName,
        });

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: casterName,
            abilityName: action.name,
            description: `${casterName} casts Tasha's Hideous Laughter! ${targetName} must make a WIS save (DC ${dc}) or become Prone and Incapacitated.`,
            promptId,
        }).catch((e) => { console.error("[tashasLaughter] Error:", e); });

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
                rollType: 'save-tashas-laughter',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: true,
                description: `${targetName} succeeded on WIS save against Tasha's Hideous Laughter.`,
            }).catch((e) => { console.error("[tashasLaughter] Error:", e); });
        } else {
            affectedCount++;

            // Apply Prone + Incapacitated conditions
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const filtered = conditions.filter(c =>
                String(c).toLowerCase() !== 'prone' &&
                String(c).toLowerCase() !== 'incapacitated'
            );
            setRuntimeValue(targetName, 'activeConditions', [...filtered, 'prone', 'incapacitated'], campaignName);

            await addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: ['prone', 'incapacitated'],
                appliedDamage: 0,
            });

            // Add expiration for concentration - conditions removed after duration
            addExpiration(casterName, targetName, [
                { type: 'condition', condition: 'prone' },
                { type: 'condition', condition: 'incapacitated' },
                { type: 'tashas_laughter_expiration' },
            ], campaignName);

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Prone, Incapacitated',
                reason: "Tasha's Hideous Laughter spell",
                note: `${targetName} is Prone and Incapacitated by Tasha's Hideous Laughter. The target can't end the Prone condition on itself.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[tashasLaughter] Error:", e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-tashas-laughter',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: false,
                description: `${targetName} failed WIS save against Tasha's Hideous Laughter and is Prone and Incapacitated.`,
            }).catch((e) => { console.error("[tashasLaughter] Error:", e); });

            results.push(`${targetName} is Prone and Incapacitated.`);
        }
    }

    const summary = affectedCount > 0
        ? `Tasha's Hideous Laughter affects ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. Affected creatures are Prone and Incapacitated.`
        : `No creatures affected by Tasha's Hideous Laughter. ${savedCount} creature(s) saved.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

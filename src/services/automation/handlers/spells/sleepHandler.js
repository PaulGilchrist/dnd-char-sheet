import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';

/**
 * Sleep spell handler for 2024 ruleset.
 * Mechanics:
 * - WIS save or Incapacitated until end of target's next turn
 * - Spell ends if target takes damage
 * - Spell ends if someone within 5ft takes action to shake target
 * - Creatures with "Magical Sleep" or "Exhaustion" immunity auto-succeed
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
                description: 'No creatures in combat. Sleep has no effect.',
            },
        };
    }

    const casterName = playerStats.name;
    const targets = cs.creatures.filter(c => c.name !== casterName);

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'WIS',
        saveDc: dc,
        attackScope: 'aoe',
    });

    let affectedCount = 0;
    let savedCount = 0;
    let immunityCount = 0;
    const results = [];

    for (const target of targets) {
        const targetName = target.name;

        const targetImmunities = target.immunities || [];
        const hasMagicalSleepImmunity = targetImmunities.some(
            imm => String(imm).toLowerCase() === 'magical sleep'
        );
        const hasExhaustionImmunity = targetImmunities.some(
            imm => String(imm).toLowerCase() === 'exhaustion'
        );

        if (hasMagicalSleepImmunity || hasExhaustionImmunity) {
            immunityCount++;
            addEntry(campaignName, {
                type: 'ability_use',
                characterName: casterName,
                abilityName: action.name,
                description: `${targetName} is immune to Sleep (does not sleep / Exhaustion immunity).`,
            }).catch((e) => { console.error("[sleep] Error:", e); });
            results.push(`${targetName} is immune to Sleep.`);

            addTargetResult(campaignName, {
                targetName,
                saveResult: 'immune',
                roll: 0,
                total: 0,
                conditions: [],
                appliedDamage: 0,
            });
            continue;
        }

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
            description: `${casterName} casts Sleep! ${targetName} must make a WIS save (DC ${dc}) or become Incapacitated.`,
            promptId,
        }).catch((e) => { console.error("[sleep] Error:", e); });

        const saveResult = await promise;

        if (saveResult.success) {
            savedCount++;
            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-sleep',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: true,
                description: `${targetName} succeeded on WIS save against Sleep.`,
            }).catch((e) => { console.error("[sleep] Error:", e); });

            addTargetResult(campaignName, {
                targetName,
                saveResult: 'success',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: [],
                appliedDamage: 0,
            });
        } else {
            affectedCount++;

            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const filtered = conditions.filter(c => String(c).toLowerCase() !== 'incapacitated');
            setRuntimeValue(targetName, 'activeConditions', [...filtered, 'incapacitated'], campaignName);

            addExpiration(casterName, targetName, [
                { type: 'incapacitated', condition: 'incapacitated' },
            ], campaignName);

            addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: ['incapacitated'],
                appliedDamage: 0,
            });

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Incapacitated',
                reason: 'Sleep spell',
                note: `${targetName} is Incapacitated by Sleep. The spell ends if the target takes damage or someone within 5ft shakes it.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[sleep] Error:", e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-sleep',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: false,
                description: `${targetName} failed WIS save against Sleep and is Incapacitated.`,
            }).catch((e) => { console.error("[sleep] Error:", e); });

            results.push(`${targetName} is Incapacitated.`);
        }
    }

    const summary = affectedCount > 0
        ? `Sleep affects ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. ${immunityCount} creature(s) immune. Affected creatures are Incapacitated until the end of their next turn. The spell ends if a target takes damage or someone within 5ft shakes it.`
        : `No creatures affected by Sleep. ${savedCount} creature(s) saved. ${immunityCount} creature(s) immune.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

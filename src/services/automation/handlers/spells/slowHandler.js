import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';

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
                description: 'No creatures in combat. Slow has no effect.',
            },
        };
    }

    const casterName = playerStats.name;

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'WIS',
        saveDc: dc,
        attackScope: action.metaCtx?.targets ? 'single' : 'aoe',
    });

    const selectedTargets = action.metaCtx?.targets;
    let targets;
    if (selectedTargets && Array.isArray(selectedTargets) && selectedTargets.length > 0) {
        targets = selectedTargets.map(name => ({ name }));
    } else {
        targets = cs.creatures.filter(c => c.name !== casterName);
    }

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
            description: `${casterName} casts Slow! ${targetName} must make a WIS save (DC ${dc}) or be slowed.`,
            promptId,
        }).catch((e) => { console.error("[slow] Error:", e); });

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
                rollType: 'save-slow',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: true,
                description: `${targetName} succeeded on WIS save against Slow.`,
            }).catch((e) => { console.error("[slow] Error:", e); });
        } else {
            affectedCount++;

            // Apply slow condition
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const filtered = conditions.filter(c => String(c).toLowerCase() !== 'slow');
            setRuntimeValue(targetName, 'activeConditions', [...filtered, 'slow'], campaignName);

            await addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: ['slow'],
                appliedDamage: 0,
            });

            // Add expiration for concentration (up to 10 rounds = 1 minute)
            addExpiration(casterName, targetName, [
                { type: 'condition', condition: 'slow' },
            ], campaignName);

            // Store target effects for the slow debuffs
            const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
            const effects = Array.isArray(targetEffects) ? targetEffects : [];
            const noReactionEffect = {
                target: targetName,
                effect: 'no_reactions',
                source: casterName,
                duration: 'concentration',
            };
            const dexSaveDisadvantageEffect = {
                target: targetName,
                effect: 'dex_save_disadvantage',
                source: casterName,
                duration: 'concentration',
            };
            const actionLimitEffect = {
                target: targetName,
                effect: 'action_limit',
                source: casterName,
                duration: 'concentration',
            };
            const singleAttackEffect = {
                target: targetName,
                effect: 'single_attack_limit',
                source: casterName,
                duration: 'concentration',
            };
            const somaticFailureEffect = {
                target: targetName,
                effect: 'somatic_failure_chance',
                source: casterName,
                chance: 25,
                duration: 'concentration',
            };

            // Remove existing slow effects from this caster for this target
            const existingFiltered = effects.filter(
                te => !(te.target === targetName && te.source === casterName &&
                    ['no_reactions', 'dex_save_disadvantage',
                     'action_limit', 'single_attack_limit', 'somatic_failure_chance']
                        .includes(te.effect))
            );

            const allEffects = [
                ...existingFiltered,
                noReactionEffect,
                dexSaveDisadvantageEffect,
                actionLimitEffect,
                singleAttackEffect,
                somaticFailureEffect,
            ];
            setRuntimeValue('campaign', 'targetEffects', allEffects, campaignName);

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Slow',
                reason: 'Slow spell',
                note: `${targetName} is affected by Slow: Speed halved, -2 AC penalty, disadvantage on DEX saves, no reactions, action OR bonus action (not both), one attack max, 25% somatic spell failure.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[slow] Error:", e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-slow',
                targetName,
                saveDc: dc,
                saveType: 'WIS',
                success: false,
                description: `${targetName} failed WIS save against Slow. Speed halved, -2 AC, disadvantage on DEX saves, no reactions, action/bonus action (not both), one attack max, and 25% somatic spell failure chance.`,
            }).catch((e) => { console.error("[slow] Error:", e); });

            results.push(`${targetName} is slowed.`);
        }
    }

    const summary = affectedCount > 0
        ? `Slow affects ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. Affected creatures have Speed halved, -2 AC penalty, disadvantage on DEX saves, no reactions, action or bonus action (not both), one attack max, and 25% somatic spell failure chance.`
        : `No creatures affected by Slow. ${savedCount} creature(s) saved.`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

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
 * Stinking Cloud spell handler.
 * Mechanics:
 * - 20-foot-radius Sphere of yellow, nauseating gas, Heavily Obscured
 * - Concentration, up to 1 minute
 * - CON save or Poisoned condition until end of current turn
 * - While Poisoned by Stinking Cloud: can't take Action or Bonus Action
 * - Expires on concentration loss, initiative roll, short rest, long rest
 * - Strong wind (Gust of Wind) disperses the cloud
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
                description: 'No creatures in combat. Stinking Cloud has no effect.',
            },
        };
    }

    // Get selected targets from metaCtx; if none, use all creatures
    const selectedTargetNames = action.metaCtx?.targets || cs.creatures.map(c => c.name);
    const targets = cs.creatures.filter(c => selectedTargetNames.includes(c.name));

    if (targets.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No creatures selected for Stinking Cloud.',
            },
        };
    }

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'CON',
        saveDc: dc,
        attackScope: 'aoe',
    });

    // Register concentration for this spell
    const combatSummary = getCombatSummary(campaignName);
    if (combatSummary) {
        const concentrationDc = playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
        addConcentration(combatSummary, casterName, 'Stinking Cloud', concentrationDc);
        storage.set('combatSummary', combatSummary, campaignName);
        window.dispatchEvent(new CustomEvent('combat-summary-updated'));
    }

    let affectedCount = 0;
    let savedCount = 0;
    let immuneCount = 0;
    const results = [];

    for (const target of targets) {
        const targetName = target.name;

        // Check for poison immunity on each target individually
        const targetImmunities = target.weaknessesAndResistivities?.immunities || [];
        if (Array.isArray(targetImmunities) && targetImmunities.length > 0) {
            const hasPoisonImmunity = targetImmunities.some(
                imm => String(imm).toLowerCase() === 'poison'
            );
            if (hasPoisonImmunity) {
                addEntry(campaignName, {
                    type: 'ability_use',
                    characterName: casterName,
                    abilityName: action.name,
                    description: `${targetName} is immune to Stinking Cloud (Poison immunity).`,
                }).catch((e) => { console.error("[stinkingCloud] Error:", e); });
                results.push(`${targetName} is immune.`);
                immuneCount++;
                continue;
            }
        }

        const { promptId, promise } = createSaveListener(campaignName, {
            targetName,
            saveType: 'CON',
            saveDc: dc,
            dcSuccess: 'none',
            disadvantage: action.metaCtx?.heightenTarget === targetName,
        });

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: casterName,
            abilityName: action.name,
            description: `${casterName} casts Stinking Cloud! ${targetName} must make a CON save (DC ${dc}) or become Poisoned.`,
            promptId,
        }).catch((e) => { console.error("[stinkingCloud] Error:", e); });

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
                rollType: 'save-stinking-cloud',
                targetName,
                saveDc: dc,
                saveType: 'CON',
                success: true,
                description: `${targetName} succeeded on CON save against Stinking Cloud.`,
            }).catch((e) => { console.error("[stinkingCloud] Error:", e); });
        } else {
            affectedCount++;

            // Apply Poisoned condition
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const filtered = conditions.filter(c => String(c).toLowerCase() !== 'poisoned');
            setRuntimeValue(targetName, 'activeConditions', [...filtered, 'poisoned'], campaignName);

            // Store condition metadata with DC and ability for recurring CON save
            const existingMeta = getRuntimeValue(targetName, 'activeConditionMeta', campaignName) || {};
            setRuntimeValue(targetName, 'activeConditionMeta', {
                ...existingMeta,
                poisoned: {
                    ...(existingMeta.poisoned || {}),
                    dc,
                    ability: 'con',
                },
            }, campaignName);

            await addTargetResult(campaignName, {
                targetName,
                saveResult: 'failure',
                roll: saveResult.roll ?? 0,
                total: saveResult.total ?? 0,
                conditions: ['poisoned'],
                appliedDamage: 0,
            });

            // Add expiration for concentration — Poisoned removed when concentration breaks
            addExpiration(casterName, targetName, [
                { type: 'condition', condition: 'poisoned' },
            ], campaignName);

            // Note: initiative-rolled event has nothing to do with turn/round expiration.
            // It fires once at the start of a new combat to reset once-per-combat trackers.
            // Turn/round-based expiration is handled by expireStaleEffects in the initiative component.

            addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Poisoned',
                reason: 'Stinking Cloud spell',
                note: `${targetName} is Poisoned by Stinking Cloud. While Poisoned, the creature can't take an Action or Bonus Action.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[stinkingCloud] Error:", e); });

            addEntry(campaignName, {
                type: 'save_result',
                characterName: casterName,
                rollType: 'save-stinking-cloud',
                targetName,
                saveDc: dc,
                saveType: 'CON',
                success: false,
                description: `${targetName} failed CON save against Stinking Cloud and is Poisoned.`,
            }).catch((e) => { console.error("[stinkingCloud] Error:", e); });

            // Track Stinking Cloud effect with concentration duration for cleanup
            const targetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
            const effects = Array.isArray(targetEffects) ? [...targetEffects] : [];
            const stinkingEffect = {
                target: targetName,
                effect: 'stinking_cloud',
                source: casterName,
                conditions: ['poisoned'],
                dc: dc,
                duration: 'concentration',
            };
            const existingIdx = effects.findIndex(
                te => te.target === targetName && te.effect === 'stinking_cloud'
            );
            if (existingIdx >= 0) {
                effects[existingIdx] = stinkingEffect;
            } else {
                effects.push(stinkingEffect);
            }
            setRuntimeValue('campaign', 'targetEffects', effects, campaignName);

            results.push(`${targetName} is Poisoned.`);
        }
    }

    const summary = affectedCount > 0
        ? `Stinking Cloud affects ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. ${immuneCount > 0 ? `${immuneCount} creature(s) immune.` : ''} Affected creatures are Poisoned (can't take Actions or Bonus Actions) until the end of their current turn.`
        : `No creatures affected by Stinking Cloud. ${savedCount} creature(s) saved. ${immuneCount > 0 ? `${immuneCount} creature(s) immune.` : ''}`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addEntry } from '../../../ui/logService.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';

/**
 * Prismatic Spray spell handler (2024 ruleset).
 * Mechanics:
 * - 60-foot Cone AoE
 * - DEX save (dc_success: none — all effects happen on fail)
 * - For each target, roll 1d8 to determine ray:
 *   1=Red: 10d6 Fire damage (half on save)
 *   2=Orange: 10d6 Acid damage (half on save)
 *   3=Yellow: 10d6 Lightning damage (half on save)
 *   4=Green: 10d6 Poison damage (half on save)
 *   5=Blue: 10d6 Cold damage (half on save)
 *   6=Indigo: Restrained; recurring CON saves (3 successes=end, 3 failures=Petrified)
 *   7=Violet: Blinded; WIS save at start of caster's next turn (success=end, fail=banished)
 *   8=Self: Ray fizzles, no effect
 */

const PRISMATIC_RAYS = {
    1: { name: 'Red', type: 'fire', damage: '10d6', saveType: 'DEX' },
    2: { name: 'Orange', type: 'acid', damage: '10d6', saveType: 'DEX' },
    3: { name: 'Yellow', type: 'lightning', damage: '10d6', saveType: 'DEX' },
    4: { name: 'Green', type: 'poison', damage: '10d6', saveType: 'DEX' },
    5: { name: 'Blue', type: 'cold', damage: '10d6', saveType: 'DEX' },
    6: { name: 'Indigo', type: 'restrained', saveType: 'DEX' },
    7: { name: 'Violet', type: 'blinded', saveType: 'DEX' },
    8: { name: 'Self', type: 'fizzle' },
};

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
                description: 'No creatures in combat. Prismatic Spray has no effect.',
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

    const targets = cs.creatures.filter(c => c.name !== casterName);

    if (targets.length === 0) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: 'No creatures other than self in range. Prismatic Spray has no effect.',
            },
        };
    }

    let fizzleCount = 0;
    let savedCount = 0;
    let affectedCount = 0;
    let immuneCount = 0;
    const results = [];

    for (const target of targets) {
        const targetName = target.name;
        const targetCreature = cs.creatures.find(c => c.name === targetName);

        // Roll 1d8 to determine ray
        const rayRoll = Math.floor(Math.random() * 8) + 1;
        const ray = PRISMATIC_RAYS[rayRoll];

        // Check for immunities before processing
        const targetImmunities = targetCreature?.weaknessesAndResistivities?.immunities || [];
        const immunityList = Array.isArray(targetImmunities) ? targetImmunities.map(i => String(i).toLowerCase()) : [];

        // Handle ray 8 (fizzle)
        if (ray.type === 'fizzle') {
            fizzleCount++;
            results.push(`${targetName}: Ray fizzled (rolled ${rayRoll}/8).`);
            continue;
        }

        // Check elemental immunity for damage rays (1-5)
        if (ray.type === 'fire' && immunityList.includes('fire')) {
            immuneCount++;
            results.push(`${targetName} is immune to Red ray (Fire immunity).`);
            continue;
        }
        if (ray.type === 'acid' && immunityList.includes('acid')) {
            immuneCount++;
            results.push(`${targetName} is immune to Orange ray (Acid immunity).`);
            continue;
        }
        if (ray.type === 'lightning' && immunityList.includes('lightning')) {
            immuneCount++;
            results.push(`${targetName} is immune to Yellow ray (Lightning immunity).`);
            continue;
        }
        if (ray.type === 'poison' && immunityList.includes('poison')) {
            immuneCount++;
            results.push(`${targetName} is immune to Green ray (Poison immunity).`);
            continue;
        }
        if (ray.type === 'cold' && immunityList.includes('cold')) {
            immuneCount++;
            results.push(`${targetName} is immune to Blue ray (Cold immunity).`);
            continue;
        }

        // Handle damage rays (1-5) — DEX save for half damage
        if (ray.type === 'fire' || ray.type === 'acid' || ray.type === 'lightning' || ray.type === 'poison' || ray.type === 'cold') {
            const { promptId, promise } = createSaveListener(campaignName, {
                targetName,
                saveType: 'DEX',
                saveDc: dc,
                dcSuccess: 'half',
                disadvantage: action.metaCtx?.heightenTarget === targetName,
                damageFormula: auto.damage || '10d6',
                damageType: ray.type,
            });

            addEntry(campaignName, {
                type: 'ability_use',
                characterName: casterName,
                abilityName: action.name,
                description: `${casterName} casts Prismatic Spray! ${targetName} hit by ${ray.name} ray — DEX save (DC ${dc}) or take ${auto.damage || '10d6'} ${ray.type} damage.`,
                promptId,
            }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });

            const saveResult = await promise;

            if (saveResult.success) {
                savedCount++;
                await addTargetResult(campaignName, {
                    targetName,
                    saveResult: 'success',
                    roll: saveResult.roll ?? 0,
                    total: saveResult.total ?? 0,
                    conditions: [],
                    appliedDamage: saveResult.appliedDamage || 0,
                });
                addEntry(campaignName, {
                    type: 'save_result',
                    characterName: casterName,
                    rollType: 'save-prismatic-spray',
                    targetName,
                    saveDc: dc,
                    saveType: 'DEX',
                    success: true,
                    description: `${targetName} succeeded on DEX save against ${ray.name} ray, taking half damage.`,
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });
            } else {
                affectedCount++;
                await addTargetResult(campaignName, {
                    targetName,
                    saveResult: 'failure',
                    roll: saveResult.roll ?? 0,
                    total: saveResult.total ?? 0,
                    conditions: [],
                    appliedDamage: saveResult.appliedDamage || 0,
                });
                addEntry(campaignName, {
                    type: 'save_result',
                    characterName: casterName,
                    rollType: 'save-prismatic-spray',
                    targetName,
                    saveDc: dc,
                    saveType: 'DEX',
                    success: false,
                    description: `${targetName} failed DEX save against ${ray.name} ray, taking full ${auto.damage || '10d6'} ${ray.type} damage.`,
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });
            }

            results.push(`${targetName} hit by ${ray.name} ray (${saveResult.success ? 'saved' : 'failed'} DEX save).`);
            continue;
        }

        // Handle Indigo ray (6) — Restrained + recurring CON saves
        if (ray.type === 'restrained') {
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
                description: `${casterName} casts Prismatic Spray! ${targetName} hit by Indigo ray — DEX save (DC ${dc}) or become Restrained.`,
                promptId,
            }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });

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
                    rollType: 'save-prismatic-spray',
                    targetName,
                    saveDc: dc,
                    saveType: 'DEX',
                    success: true,
                    description: `${targetName} succeeded on DEX save against Indigo ray.`,
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });
            } else {
                affectedCount++;

                // Apply Restrained condition
                const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
                const conditions = Array.isArray(storedConditions) ? storedConditions : [];
                const filtered = conditions.filter(c => String(c).toLowerCase() !== 'restrained');
                setRuntimeValue(targetName, 'activeConditions', [...filtered, 'restrained'], campaignName);

                // Store condition metadata for recurring CON saves
                const existingMeta = getRuntimeValue(targetName, 'activeConditionMeta', campaignName) || {};
                setRuntimeValue(targetName, 'activeConditionMeta', {
                    ...existingMeta,
                    restrained: {
                        ...(existingMeta.restrained || {}),
                        dc,
                        ability: 'con',
                    },
                }, campaignName);

                // Register prismatic_spray targetEffect for Indigo ray tracking
                const allTargetEffects = [...getRuntimeValue('campaign', 'targetEffects') || []];
                const existingIndex = allTargetEffects.findIndex(
                    te => te.target === targetName && te.effect === 'prismatic_spray_indigo' && te.source === casterName
                );
                const indigoEffect = {
                    target: targetName,
                    effect: 'prismatic_spray_indigo',
                    source: casterName,
                    dc,
                };
                if (existingIndex >= 0) {
                    allTargetEffects[existingIndex] = indigoEffect;
                } else {
                    allTargetEffects.push(indigoEffect);
                }
                setRuntimeValue('campaign', 'targetEffects', allTargetEffects, campaignName);

                // Set up recurring save tracking
                const saveTrackingKey = `_prismaticSprayIndigo_${targetName.replace(/\s+/g, '_')}`;
                setRuntimeValue('campaign', saveTrackingKey, {
                    successes: 0,
                    failures: 0,
                    dc,
                    casterName,
                }, campaignName);

                await addTargetResult(campaignName, {
                    targetName,
                    saveResult: 'failure',
                    roll: saveResult.roll ?? 0,
                    total: saveResult.total ?? 0,
                    conditions: ['restrained'],
                    appliedDamage: 0,
                });

                addExpiration(casterName, targetName, [
                    { type: 'condition', condition: 'restrained' },
                ], campaignName);

                addEntry(campaignName, {
                    type: 'condition',
                    action: 'applied',
                    characterName: targetName,
                    condition: 'Restrained',
                    reason: 'Prismatic Spray (Indigo ray)',
                    note: `${targetName} is Restrained by Prismatic Spray. At end of each turn, make CON save (DC ${dc}). 3 successes = spell ends. 3 failures = Petrified.`,
                    timestamp: Date.now(),
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });

                addEntry(campaignName, {
                    type: 'save_result',
                    characterName: casterName,
                    rollType: 'save-prismatic-spray',
                    targetName,
                    saveDc: dc,
                    saveType: 'DEX',
                    success: false,
                    description: `${targetName} failed DEX save against Indigo ray and is Restrained.`,
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });
            }

            results.push(`${targetName} hit by Indigo ray (${saveResult.success ? 'saved' : 'failed'} DEX save, ${!saveResult.success ? 'Restrained' : 'unaffected'}).`);
            continue;
        }

        // Handle Violet ray (7) — Blinded + WIS save at start of caster's next turn
        if (ray.type === 'blinded') {
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
                description: `${casterName} casts Prismatic Spray! ${targetName} hit by Violet ray — DEX save (DC ${dc}) or become Blinded.`,
                promptId,
            }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });

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
                    rollType: 'save-prismatic-spray',
                    targetName,
                    saveDc: dc,
                    saveType: 'DEX',
                    success: true,
                    description: `${targetName} succeeded on DEX save against Violet ray.`,
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });
            } else {
                affectedCount++;

                // Apply Blinded condition
                const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
                const conditions = Array.isArray(storedConditions) ? storedConditions : [];
                const filtered = conditions.filter(c => String(c).toLowerCase() !== 'blinded');
                setRuntimeValue(targetName, 'activeConditions', [...filtered, 'blinded'], campaignName);

                // Register prismatic_spray_violet targetEffect for WIS save tracking
                const allTargetEffects = [...getRuntimeValue('campaign', 'targetEffects') || []];
                const existingIndex = allTargetEffects.findIndex(
                    te => te.target === targetName && te.effect === 'prismatic_spray_violet' && te.source === casterName
                );
                const violetEffect = {
                    target: targetName,
                    effect: 'prismatic_spray_violet',
                    source: casterName,
                    dc,
                };
                if (existingIndex >= 0) {
                    allTargetEffects[existingIndex] = violetEffect;
                } else {
                    allTargetEffects.push(violetEffect);
                }
                setRuntimeValue('campaign', 'targetEffects', allTargetEffects, campaignName);

                // Track violet ray banishment timing
                const violetTrackingKey = `_prismaticSprayViolet_${targetName.replace(/\s+/g, '_')}`;
                setRuntimeValue('campaign', violetTrackingKey, {
                    casterName,
                    dc,
                    blindedAt: Date.now(),
                }, campaignName);

                await addTargetResult(campaignName, {
                    targetName,
                    saveResult: 'failure',
                    roll: saveResult.roll ?? 0,
                    total: saveResult.total ?? 0,
                    conditions: ['blinded'],
                    appliedDamage: 0,
                });

                addExpiration(casterName, targetName, [
                    { type: 'condition', condition: 'blinded' },
                ], campaignName);

                addEntry(campaignName, {
                    type: 'condition',
                    action: 'applied',
                    characterName: targetName,
                    condition: 'Blinded',
                    reason: 'Prismatic Spray (Violet ray)',
                    note: `${targetName} is Blinded by Prismatic Spray. At start of ${casterName}'s next turn, make WIS save (DC ${dc}). Success = blinded ends. Failure = banished to another plane.`,
                    timestamp: Date.now(),
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });

                addEntry(campaignName, {
                    type: 'save_result',
                    characterName: casterName,
                    rollType: 'save-prismatic-spray',
                    targetName,
                    saveDc: dc,
                    saveType: 'DEX',
                    success: false,
                    description: `${targetName} failed DEX save against Violet ray and is Blinded.`,
                }).catch((e) => { console.error(`[prismaticSpray] Error:`, e); });
            }

            results.push(`${targetName} hit by Violet ray (${saveResult.success ? 'saved' : 'failed'} DEX save, ${!saveResult.success ? 'Blinded' : 'unaffected'}).`);
            continue;
        }
    }

    const summary = affectedCount > 0
        ? `Prismatic Spray affects ${affectedCount} creature(s). ${results.join(' ')} ${savedCount} creature(s) saved. ${immuneCount > 0 ? `${immuneCount} creature(s) immune.` : ''} ${fizzleCount > 0 ? `${fizzleCount} ray(s) fizzled.` : ''}`
        : `No creatures affected by Prismatic Spray. ${savedCount} creature(s) saved. ${immuneCount > 0 ? `${immuneCount} creature(s) immune.` : ''} ${fizzleCount > 0 ? `${fizzleCount} ray(s) fizzled.` : ''}`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: summary,
        },
    };
}

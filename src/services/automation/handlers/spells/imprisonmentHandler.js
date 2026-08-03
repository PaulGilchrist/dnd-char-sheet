import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';

const PRISON_TYPES = ['Burial', 'Chaining', 'Hedged Prison', 'Minimus Containment', 'Slumber'];

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
                description: `No creatures in combat. ${action.name} has no effect.`,
            },
        };
    }

    const casterName = playerStats.name;
    const casterCreature = cs.creatures.find(c => c.name === casterName);

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'WIS',
        saveDc: dc,
        attackScope: 'single',
    });

    const targetInfo = await resolveTarget(campaignName, casterName);
    const targetName = targetInfo?.target?.name;

    if (!targetName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `No target selected. ${action.name} has no effect.`,
            },
        };
    }

    const targetCreature = cs.creatures.find(c => c.name === targetName);
    if (!targetCreature) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `Target "${targetName}" not found in combat. ${action.name} has no effect.`,
            },
        };
    }

    const targetConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    const targetImmunities = targetCreature?.immunities || [];
    const allImmunities = [...new Set([...targetImmunities, ...(targetConditions.includes('petrified') ? ['paralyzed'] : [])])];
    if (allImmunities.some(i => String(i).toLowerCase() === 'imprisonment')) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${targetName} is immune to Imprisonment.`,
            },
        };
    }

    const targetInvisible = targetConditions.some(c => String(c).toLowerCase() === 'invisible');
    const casterSenses = casterCreature?.senses || [];
    const hasTruesight = casterSenses.some(s => String(s.name || s.type || '').toLowerCase() === 'truesight');
    const hasBlindsight = casterSenses.some(s => String(s.name || s.type || '').toLowerCase() === 'blindsight');
    if (targetInvisible && !hasTruesight && !hasBlindsight) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${targetName} is invisible. You can't see the target. ${action.name} has no effect.`,
            },
        };
    }

    const { promptId, promise } = createSaveListener(campaignName, {
        targetName,
        saveType: 'WIS',
        saveDc: dc,
        dcSuccess: 'none',
        disadvantage: !!action.metaCtx?.metamagicHeighten,
    });

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: action.name,
        description: `${casterName} casts ${action.name} on ${targetName}! ${targetName} must make a WIS save (DC ${dc}) or be imprisoned.`,
        promptId,
    }).catch((e) => { console.error("[imprisonment] Error:", e); });

    const saveResult = await promise;

    if (saveResult.success) {
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
            rollType: 'save-imprisonment',
            targetName,
            saveDc: dc,
            saveType: 'WIS',
            success: true,
            description: `${targetName} succeeded on WIS save against ${action.name}.`,
        }).catch((e) => { console.error("[imprisonment] Error:", e); });

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${targetName} succeeded on WIS save against ${action.name}.`,
            },
        };
    }

    // Failed save: determine prison type from automation options
    const options = auto.options || PRISON_TYPES;
    const prisonType = options[0] || 'Slumber'; // Default to Slumber if no options

    // Apply the chosen prison effect
    const prisonConditions = [];
    const prisonEffects = [];

    switch (prisonType) {
        case 'Burial':
            // Target is entombed: nothing can pass in or out
            prisonEffects.push({
                effect: 'imprisonment',
                target: targetName,
                source: casterName,
                prisonType: 'Burial',
                description: 'Target is entombed in a hollow globe of magical force. Nothing can pass into or out of the globe.',
            });
            break;

        case 'Chaining':
            // Target has Restrained condition and can't be moved by any means
            prisonConditions.push('restrained');
            prisonEffects.push({
                effect: 'imprisonment',
                target: targetName,
                source: casterName,
                prisonType: 'Chaining',
                description: 'Target is restrained by chains and can\'t be moved by any means.',
            });
            break;

        case 'Hedged Prison':
            // Target is trapped in a demiplane warded against teleportation
            prisonEffects.push({
                effect: 'imprisonment',
                target: targetName,
                source: casterName,
                prisonType: 'Hedged Prison',
                description: 'Target is trapped in a demiplane warded against teleportation and planar travel.',
            });
            break;

        case 'Minimus Containment':
            // Target becomes 1 inch tall inside an indestructible gemstone
            prisonEffects.push({
                effect: 'imprisonment',
                target: targetName,
                source: casterName,
                prisonType: 'Minimus Containment',
                description: 'Target is 1 inch tall and trapped inside an indestructible gemstone. Light can pass through but nothing else.',
            });
            break;

        case 'Slumber':
            // Target has Unconscious condition and can't be awakened
            prisonConditions.push('unconscious');
            prisonEffects.push({
                effect: 'imprisonment',
                target: targetName,
                source: casterName,
                prisonType: 'Slumber',
                description: 'Target is unconscious and can\'t be awakened.',
            });
            break;

        default:
            prisonConditions.push('unconscious');
            prisonEffects.push({
                effect: 'imprisonment',
                target: targetName,
                source: casterName,
                prisonType: 'Slumber',
                description: 'Target is imprisoned (Slumber).',
            });
    }

    // Apply conditions
    const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    const conditions = Array.isArray(storedConditions) ? storedConditions : [];
    const filtered = conditions.filter(c => {
        const cl = String(c).toLowerCase();
        // Remove existing Imprisonment conditions of the same type
        if (prisonConditions.includes(cl)) return true; // Keep if it's the one we're replacing
        return true;
    });
    const newConditions = [...new Set([...filtered, ...prisonConditions])];
    setRuntimeValue(targetName, 'activeConditions', newConditions, campaignName);

    // Store condition metadata
    const existingMeta = getRuntimeValue(targetName, 'activeConditionMeta', campaignName) || {};
    const newMeta = { ...existingMeta };
    for (const cond of prisonConditions) {
        newMeta[cond] = {
            ...(newMeta[cond] || {}),
            dc,
            ability: 'wis',
        };
    }
    setRuntimeValue(targetName, 'activeConditionMeta', newMeta, campaignName);

    // Add imprisonment target effect(s)
    const allTargetEffects = [...getRuntimeValue('campaign', 'targetEffects') || []];
    // Remove old imprisonment effects on this target from this caster
    const otherEffects = allTargetEffects.filter(
        te => !(te.target === targetName && te.effect === 'imprisonment' && te.source === casterName)
    );
    setRuntimeValue('campaign', 'targetEffects', [...otherEffects, ...prisonEffects], campaignName);

    // Store imprisonment metadata for trigger tracking
    setRuntimeValue(targetName, 'imprisonmentData', {
        casterName,
        dc,
        prisonType,
        trigger: '',
    }, campaignName);

    // Track for addExpiration
    addExpiration(casterName, targetName, [
        { type: 'condition', condition: 'imprisonment' },
        ...prisonConditions.map(c => ({ type: 'condition', condition: c })),
    ], campaignName);

    const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
    if (casterCreature) {
        addConcentration(cs, casterName, action.name, concentrationDc);
    }

    await addTargetResult(campaignName, {
        targetName,
        saveResult: 'failure',
        roll: saveResult.roll ?? 0,
        total: saveResult.total ?? 0,
        conditions: prisonConditions,
        appliedDamage: 0,
    });

    addEntry(campaignName, {
        type: 'save_result',
        characterName: casterName,
        rollType: 'save-imprisonment',
        targetName,
        saveDc: dc,
        saveType: 'WIS',
        success: false,
        description: `${targetName} failed WIS save against ${action.name} and is imprisoned (${prisonType}).`,
    }).catch((e) => { console.error("[imprisonment] Error:", e); });

    addEntry(campaignName, {
        type: 'condition',
        action: 'applied',
        characterName: targetName,
        condition: 'Imprisoned',
        reason: action.name,
        note: `${targetName} is imprisoned (${prisonType}) by ${action.name}.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[imprisonment] Error:", e); });

    // Log each condition applied
    for (const cond of prisonConditions) {
        addEntry(campaignName, {
            type: 'condition',
            action: 'applied',
            characterName: targetName,
            condition: cond.charAt(0).toUpperCase() + cond.slice(1),
            reason: action.name,
            note: `${targetName} has ${cond.charAt(0).toUpperCase() + cond.slice(1)} from ${action.name} (${prisonType}).`,
            timestamp: Date.now(),
        }).catch((e) => { console.error("[imprisonment] Error:", e); });
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: `${targetName} failed WIS save and is imprisoned (${prisonType}).`,
        },
    };
}

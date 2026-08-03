import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { resolveTarget } from '../../common/targetResolver.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { storeSpellLastAttack, addTargetResult } from '../../common/damageRollback.js';

// Creature types that get permanently banished when the spell lasts 1 minute
const PERMANENT_BANISHMENT_TYPES = new Set([
    'aberration',
    'celestial',
    'elemental',
    'fey',
    'fiend',
]);

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

    storeSpellLastAttack(campaignName, {
        casterName,
        spellName: action.name,
        saveType: 'CHA',
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

    const { promptId, promise } = createSaveListener(campaignName, {
        targetName,
        saveType: 'CHA',
        saveDc: dc,
        dcSuccess: 'none',
        disadvantage: !!action.metaCtx?.metamagicHeighten,
    });

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: action.name,
        description: `${casterName} casts ${action.name} on ${targetName}! ${targetName} must make a CHA save (DC ${dc}) or be banished.`,
        promptId,
    }).catch((e) => { console.error("[banishment] Error:", e); });

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
            rollType: 'save-banishment',
            targetName,
            saveDc: dc,
            saveType: 'CHA',
            success: true,
            description: `${targetName} succeeded on CHA save against ${action.name}.`,
        }).catch((e) => { console.error("[banishment] Error:", e); });

        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: action.name,
                description: `${targetName} succeeded on CHA save against ${action.name}.`,
            },
        };
    }

    // Failed save: apply Incapacitated condition and banishment target effect
    const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    const conditions = Array.isArray(storedConditions) ? storedConditions : [];
    const filtered = conditions.filter(c => String(c).toLowerCase() !== 'incapacitated');
    setRuntimeValue(targetName, 'activeConditions', [...filtered, 'incapacitated'], campaignName);

    // Store condition metadata with DC and ability for recurring CON save
    const existingMeta = getRuntimeValue(targetName, 'activeConditionMeta', campaignName) || {};
    setRuntimeValue(targetName, 'activeConditionMeta', {
        ...existingMeta,
        incapacitated: {
            ...(existingMeta.incapacitated || {}),
            dc,
            ability: 'cha',
        },
    }, campaignName);

    // Check if target is a creature type that gets permanently banished
    const targetCreature = cs.creatures.find(c => c.name === targetName);
    const creatureType = (targetCreature?.type || '').toLowerCase().replace(/\s+/g, '');
    const isPermanentType = PERMANENT_BANISHMENT_TYPES.has(creatureType);
    const permanentNote = isPermanentType
        ? ' (permanent banishment - target will not return)'
        : '';

    // Add banishment target effect to track the spell visually
    const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const existingBanishment = targetEffects.filter(te => te.effect !== 'banishment');
    setRuntimeValue('campaign', 'targetEffects', [
        ...existingBanishment,
        {
            effect: 'banishment',
            target: targetName,
            source: casterName,
            duration: 'Concentration, up to 1 minute',
            permanent: isPermanentType,
        },
    ], campaignName);

    await addTargetResult(campaignName, {
        targetName,
        saveResult: 'failure',
        roll: saveResult.roll ?? 0,
        total: saveResult.total ?? 0,
        conditions: ['incapacitated'],
        appliedDamage: 0,
    });

    addExpiration(casterName, targetName, [
        { type: 'condition', condition: 'incapacitated' },
    ], campaignName);

    addEntry(campaignName, {
        type: 'save_result',
        characterName: casterName,
        rollType: 'save-banishment',
        targetName,
        saveDc: dc,
        saveType: 'CHA',
        success: false,
        description: `${targetName} failed CHA save against ${action.name} and is banished.${permanentNote}`,
    }).catch((e) => { console.error("[banishment] Error:", e); });

    addEntry(campaignName, {
        type: 'condition',
        action: 'applied',
        characterName: targetName,
        condition: 'Incapacitated',
        reason: action.name,
        note: `${targetName} is Incapacitated by ${action.name} (banished to demiplane).${permanentNote}`,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[banishment] Error:", e); });

    const popupDesc = isPermanentType
        ? `${targetName} failed CHA save and is permanently banished to another plane.`
        : `${targetName} failed CHA save and is banished to a demiplane (Incapacitated).`;

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            description: popupDesc,
        },
    };
}

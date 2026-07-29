import { executeHandler } from '../../automation/index.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';

export async function triggerBlessSpell(spell, metaCtx, playerStats, campaignName, mapName) {
    const isBless = (spell.name || '').toLowerCase() === 'bless';
    if (!isBless) return null;

    const slotLevel = metaCtx?.slotLevel || spell.level || 1;
    const auto = spell.automation || {};
    const maxTargets = auto.maxTargets || 3;

    const action = {
        name: 'Bless',
        automation: {
            type: 'bless',
            range: spell.range || '30 feet',
            maxTargets: maxTargets,
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[blessSpell] Failed to execute Bless handler:', e);
        return null;
    }
}

export async function applyBlessEffect(spell, playerStats, campaignName, mapName, targetNames) {
    if (!targetNames || !Array.isArray(targetNames) || targetNames.length === 0) {
        return null;
    }

    const slotLevel = spell.level || 1;
    const casterName = playerStats.name;

    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const effects = Array.isArray(storedEffects) ? [...storedEffects] : [];

    for (const targetName of targetNames) {
        const blessEffect = {
            target: targetName,
            effect: 'bless_bonus',
            source: casterName,
            slotLevel,
            duration: 'concentration',
        };
        const existingIndex = effects.findIndex(
            te => te.target === targetName && te.effect === 'bless_bonus' && te.source === casterName
        );
        if (existingIndex >= 0) {
            effects[existingIndex] = blessEffect;
        } else {
            effects.push(blessEffect);
        }
    }

    setRuntimeValue('campaign', 'targetEffects', effects, campaignName, true);

    addEntry(campaignName, {
        type: 'spell',
        characterName: casterName,
        targetName: targetNames[0],
        targets: targetNames,
        spellName: 'Bless',
        spellLevel: slotLevel,
        castingTime: spell.casting_time || '1 action',
        description: `${casterName} casts Bless on ${targetNames.join(', ')}.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[blessSpell] Error logging cast:', e); });

    addEntry(campaignName, {
        type: 'spell',
        characterName: casterName,
        targetName: targetNames[0],
        targets: targetNames,
        spellName: 'Bless',
        spellLevel: slotLevel,
        castingTime: spell.casting_time || '1 action',
        description: `Bless cast: ${targetNames.length} creature(s) blessed.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[blessSpell] Error logging summary:', e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: 'Bless',
            description: `${targetNames.length} of ${targetNames.length} target(s) blessed by Bless.`,
        },
    };
}

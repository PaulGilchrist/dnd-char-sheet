import { executeHandler } from '../../automation/index.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';

export async function triggerPassWithoutTraceSpell(spell, metaCtx, playerStats, campaignName, mapName) {
    const isPassWithoutTrace = (spell.name || '').toLowerCase() === 'pass without trace';
    if (!isPassWithoutTrace) return null;

    const slotLevel = metaCtx?.slotLevel || spell.level || 1;
    const auto = spell.automation || {};

    const action = {
        name: 'Pass Without Trace',
        automation: {
            type: 'pass_without_trace',
            range: spell.range || 'Self',
            auraRange: auto.auraRange || 30,
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[passWithoutTrace] Failed to execute handler:', e);
        return null;
    }
}

export async function applyPassWithoutTraceEffect(spell, playerStats, campaignName, mapName, targetNames) {
    if (!targetNames || !Array.isArray(targetNames) || targetNames.length === 0) {
        return null;
    }

    const slotLevel = spell.level || 1;
    const casterName = playerStats.name;

    const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const effects = Array.isArray(storedEffects) ? [...storedEffects] : [];

    for (const targetName of targetNames) {
        const pwtEffect = {
            target: targetName,
            effect: 'pass_without_trace_bonus',
            source: casterName,
            slotLevel,
            duration: 'concentration',
            bonusExpression: '+10',
        };
        const existingIndex = effects.findIndex(
            te => te.target === targetName && te.effect === 'pass_without_trace_bonus' && te.source === casterName
        );
        if (existingIndex >= 0) {
            effects[existingIndex] = pwtEffect;
        } else {
            effects.push(pwtEffect);
        }
    }

    setRuntimeValue('campaign', 'targetEffects', effects, campaignName);

    addEntry(campaignName, {
        type: 'spell',
        characterName: casterName,
        targetName: targetNames[0],
        targets: targetNames,
        spellName: 'Pass Without Trace',
        spellLevel: slotLevel,
        castingTime: spell.casting_time || '1 action',
        description: `${casterName} casts Pass Without Trace on ${targetNames.join(', ')}.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[passWithoutTrace] Error logging cast:', e); });

    addEntry(campaignName, {
        type: 'automation',
        characterName: casterName,
        automationType: 'pass_without_trace',
        name: 'Pass Without Trace',
        description: `Pass Without Trace cast: ${targetNames.length} creature(s) affected — ${targetNames.join(', ')}. Each has +10 to Dexterity (Stealth) checks and leaves no tracks.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[passWithoutTrace] Error logging automation:', e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: 'Pass Without Trace',
            description: `Pass Without Trace cast: ${targetNames.length} creature(s) affected — ${targetNames.join(', ')}. Each has +10 to Dexterity (Stealth) checks and leaves no tracks.`,
        },
    };
}

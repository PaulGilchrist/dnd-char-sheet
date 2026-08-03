import { toggleBuff } from '../../common/buffToggle.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

const SPELL_NAME = 'Sanctuary';
const EFFECT_KEY = 'sanctuary';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation || {};
    const playerName = playerStats.name;
    const targetName = action.metaCtx?.targetName || 'Unknown';
    const range = auto.range || '30 feet';
    const duration = auto.duration || '1 minute';

    const { wasActive } = toggleBuff(
        playerName,
        action.name,
        { ...auto, effect: 'sanctuary', targetName, range, duration },
        campaignName
    );

    if (!wasActive) {
        addExpiration(playerName, targetName, [
            { type: 'remove_active_buff', buffName: action.name }
        ], campaignName);

        // Apply sanctuary target effect to campaign targetEffects
        const allTargetEffects = [...getRuntimeValue('campaign', 'targetEffects') || []];
        const existingIndex = allTargetEffects.findIndex(
            te => te.target === targetName && te.effect === EFFECT_KEY && te.source === playerName
        );

        const sanctuaryEffect = {
            target: targetName,
            effect: EFFECT_KEY,
            source: playerName,
            duration: '1 minute',
        };

        if (existingIndex >= 0) {
            allTargetEffects[existingIndex] = sanctuaryEffect;
        } else {
            allTargetEffects.push(sanctuaryEffect);
        }

        setRuntimeValue('campaign', 'targetEffects', allTargetEffects, campaignName);

        // Set concentration tracking for duration (1 minute = 10 rounds default)
        addExpiration(playerName, targetName, [
            { type: 'remove_target_effect', effectKey: EFFECT_KEY, source: playerName },
        ], campaignName);

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerName,
            abilityName: SPELL_NAME,
            description: `${playerName} casts Sanctuary on ${targetName}. Creatures targeting ${targetName} with attacks or damaging spells must succeed on a WIS save or lose the attack/spell.`,
            timestamp: Date.now(),
        }).catch((e) => { console.error("[sanctuary] Error:", e); });
    } else {
        // Deactivate: remove target effect
        const allTargetEffects = [...getRuntimeValue('campaign', 'targetEffects') || []];
        const filtered = allTargetEffects.filter(
            te => !(te.target === targetName && te.effect === EFFECT_KEY && te.source === playerName)
        );
        if (filtered.length !== allTargetEffects.length) {
            setRuntimeValue('campaign', 'targetEffects', filtered, campaignName);
        }

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: playerName,
            abilityName: SPELL_NAME,
            description: `${SPELL_NAME} expired on ${targetName}.`,
            timestamp: Date.now(),
        }).catch((e) => { console.error("[sanctuary] Error:", e); });
    }

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: SPELL_NAME,
            targetName,
            automationType: auto.type,
            description: wasActive
                ? `${SPELL_NAME} expired on ${targetName}`
                : `${SPELL_NAME} activated on ${targetName} — creatures targeting ${targetName} with attacks or damaging spells must succeed on a WIS save or lose the attack/spell. Spell ends if ${targetName} attacks, casts a spell, or deals damage.`,
            automation: auto,
        },
    };
}

export function isSanctuaryActive(targetName, casterName, _campaignName) {
    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    return allTargetEffects.some(
        te => te.target === targetName && te.effect === EFFECT_KEY && te.source === casterName
    );
}

export function endSanctuary(casterName, targetName, campaignName, reason) {
    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const filtered = allTargetEffects.filter(
        te => !(te.target === targetName && te.effect === EFFECT_KEY && te.source === casterName)
    );
    if (filtered.length === allTargetEffects.length) return null;

    setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);

    addEntry(campaignName, {
        type: 'condition',
        action: 'removed',
        characterName: targetName,
        condition: 'Sanctuary',
        reason: 'Sanctuary ended',
        note: reason,
        timestamp: Date.now(),
    }).catch((e) => { console.error("[sanctuary] Error:", e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: SPELL_NAME,
            targetName,
            description: `${targetName} is no longer warded by Sanctuary. ${reason}`,
        },
    };
}

export function getSanctuaryTarget(casterName, _campaignName) {
    const allTargetEffects = getRuntimeValue('campaign', 'targetEffects') || [];
    const sanctuary = allTargetEffects.find(
        te => te.effect === EFFECT_KEY && te.source === casterName
    );
    return sanctuary ? sanctuary.target : null;
}

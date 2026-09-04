import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { isWithinRange } from '../rules/combat/rangeCheck.js';
import { addEntry } from '../ui/logService.js';

export const RESTORE_BALANCE_ARMED_KEY = 'restoreBalanceArmed';
export const RESTORE_BALANCE_RANGE_FT = 60;

function holderConditions(campaignName, combatSummary, holderName) {
    const creature = (combatSummary?.creatures || []).find(c => c.name === holderName);
    return (creature?.conditions || []).map(c => String(c?.key || c).toLowerCase());
}

export function isRestoreBalanceArmed(holderName, campaignName) {
    const raw = getRuntimeValue(holderName, RESTORE_BALANCE_ARMED_KEY, campaignName);
    if (!raw) return false;
    try {
        const parsed = JSON.parse(raw);
        return !!(parsed && typeof parsed === 'object' && parsed.armedAt);
    } catch (_e) {
        return false;
    }
}

export async function armRestoreBalance(holderName, armedAt, campaignName) {
    await setRuntimeValue(holderName, RESTORE_BALANCE_ARMED_KEY, JSON.stringify({ armedAt }), campaignName);
}

// CLA-295 Restore Balance (reaction, 60 ft, must see roller): the first armed
// holder within range of a roller who is about to roll a d20 with Advantage or
// Disadvantage cancels it to a single normal d20. Consumes the armed flag and
// logs; returns the holder name that consumed, or null.
export async function consumeArmedRestoreBalance(campaignName, combatSummary, rollerName, rollName, rollType) {
    if (!rollerName) return null;
    const names = [...new Set([rollerName, ...(combatSummary?.creatures || []).map(c => c.name)])].filter(Boolean);
    for (const holderName of names) {
        if (!isRestoreBalanceArmed(holderName, campaignName)) continue;
        const conditions = holderConditions(campaignName, combatSummary, holderName);
        if (conditions.includes('blinded')) continue;
        const inRange = await isWithinRange(holderName, rollerName, RESTORE_BALANCE_RANGE_FT);
        if (!inRange) continue;
        setRuntimeValue(holderName, RESTORE_BALANCE_ARMED_KEY, null, campaignName);
        addEntry(campaignName, {
            type: 'ability_use',
            characterName: holderName,
            abilityName: 'Restore Balance',
            description: `${holderName} used Restore Balance (Reaction): ${rollerName}'s ${rollName ? rollName + ' ' : ''}${rollType} roll is made without Advantage or Disadvantage.`,
            targetName: rollerName,
            timestamp: Date.now(),
        }).catch((e) => { console.error('[restoreBalance] Consume log error:', e); });
        return holderName;
    }
    return null;
}

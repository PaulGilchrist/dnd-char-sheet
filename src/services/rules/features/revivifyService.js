import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';
import { consumeMaterial } from '../spells/materialComponents.js';

export async function triggerRevivify(spell, metaCtx, playerStats, campaignName, targetName) {
    const consumed = await consumeMaterial(playerStats, 'Diamond (300 gp)', campaignName);
    if (!consumed) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: spell.name,
                automationType: 'revivify',
                description: 'Revivify requires a diamond worth 300+ GP, which the spell consumes.',
            },
        };
    }

    const combatSummary = await (await fetch(`/api/campaigns/${encodeURIComponent(campaignName)}/combat-summary`)).json().catch(() => null);
    const targetCreature = combatSummary?.creatures?.find(c => c.name === targetName);
    const isPlayer = targetCreature?.type === 'player';
    const maxHp = isPlayer ? (targetCreature?.maxHp || 1) : (targetCreature?.maxHp || 1);
    const oldHp = isPlayer ? 0 : (targetCreature?.currentHp || 0);

    // Update target's runtime store (HP/death saves are transient, not persisted to character JSON)
    setRuntimeValue(targetName, 'currentHitPoints', 1, campaignName);
    setRuntimeValue(targetName, 'deathSaves', [false, false, false], campaignName);
    setRuntimeValue(targetName, 'deathFailures', [false, false, false], campaignName);
    setRuntimeValue(targetName, 'isDead', 0, campaignName);

    const actualHeal = 1 - oldHp;

    addEntry(campaignName, {
        type: 'hp_change',
        targetName,
        delta: actualHeal,
        currentHp: 1,
        maxHp,
        isHealing: true,
        sourceName: playerStats.name,
        note: spell.name,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[revivify] Error logging heal:', e); });

    window.dispatchEvent(new CustomEvent('combat-summary-updated'));

    return {
        type: 'popup',
        payload: {
            type: 'heal',
            name: spell.name,
            targetName,
            finalHeal: actualHeal,
            total: 1,
            formula: '1 HP (revived)',
            rolls: [],
            rawTotal: 1,
        },
    };
}

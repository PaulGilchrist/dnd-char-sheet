import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';
import { consumeMaterial } from '../spells/materialComponents.js';
import { applyHealingToTarget } from '../combat/applyHealing.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { isCreatureDead } from '../../shared/hpModifier.js';

function refusalPopup(spell, description) {
    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: spell.name,
            automationType: 'revivify',
            description,
        },
    };
}

export async function triggerRevivify(spell, metaCtx, playerStats, campaignName, targetName) {
    // Canonical combatSummary source (change-data) — the /combat-summary key is
    // never written and always returned {value:null}, so the old fetch saw no creatures.
    const combatSummary = await getCombatContext(campaignName);
    const targetCreature = combatSummary?.creatures?.find(c => c.name === targetName);

    if (!targetCreature) {
        console.error(`[revivify] Target ${targetName} not found in combat summary`);
        return refusalPopup(spell, `${targetName} is not present in combat. Revivify can only target a creature that has died within the last minute.`);
    }

    // Re-validate the dead-target gate BEFORE consuming the diamond or writing HP.
    if (!isCreatureDead(combatSummary, targetName)) {
        console.error(`[revivify] Living target refused: ${targetName}`);
        return refusalPopup(spell, `${targetName} is not dead. Revivify can only target a creature that has died within the last minute.`);
    }

    const consumed = await consumeMaterial(playerStats, 'Diamond (300 gp)', campaignName);
    if (!consumed) {
        return refusalPopup(spell, 'Revivify requires a diamond worth 300+ GP, which the spell consumes.');
    }

    // Canonical heal path: runtime currentHitPoints/isDead/deathSaves for PCs,
    // combatSummary currentHp + persisted summary for monsters.
    const isPlayer = targetCreature.type === 'player';
    const oldHp = isPlayer ? (getRuntimeValue(targetName, 'currentHitPoints') ?? 0) : (targetCreature.currentHp ?? 0);
    const applied = applyHealingToTarget(combatSummary, targetName, 1 - oldHp, campaignName);

    const newHp = applied ? applied.newHp : 1;
    const actualHeal = applied ? applied.actualHeal : 1;
    const maxHp = applied ? applied.maxHp : (targetCreature.maxHp ?? 0);

    addEntry(campaignName, {
        type: 'hp_change',
        targetName,
        delta: actualHeal,
        currentHp: newHp,
        maxHp,
        isHealing: true,
        sourceName: playerStats.name,
        note: spell.name,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[revivify] Error logging heal:', e); });

    // applyHealingToTarget already dispatches 'combat-summary-updated' on a non-zero delta.

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

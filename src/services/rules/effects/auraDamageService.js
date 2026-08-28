import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import utils from '../../ui/utils.js';
import storage from '../../ui/storage.js';
import { isWithinRange } from '../combat/rangeCheck.js';
import { applyDamageToTarget } from '../combat/applyDamage.js';
import { getCombatSummary, loadCombatSummary } from '../../encounters/combatData.js';
import { getAllyList } from '../../../hooks/useAllySelection.js';

export async function applyAuraDamage(activeName, playerStats, campaignName, characters = [], options = {}) {
    const { activeKey, damageValue, range, damageType = 'Radiant', targetFilter, allyFilter } = options;

    const isActive = getRuntimeValue(activeName, activeKey, campaignName);
    if (!isActive) return;

    let combatSummary = getCombatSummary(campaignName);
    if (!combatSummary) {
        combatSummary = await loadCombatSummary(campaignName);
    }
    if (!combatSummary) return;

    const creatures = combatSummary.creatures;
    if (!Array.isArray(creatures)) {
        console.error('expirations: expected creatures to be an array in combatSummary');
        return;
    }

    if (typeof damageValue !== 'number' || isNaN(damageValue) || damageValue <= 0) return;

    const storedAllies = allyFilter ? getAllyList(activeName) : null;
    const allyList = Array.isArray(storedAllies) && storedAllies.length > 0 ? storedAllies : null;

    for (const creature of creatures) {
        const creatureName = utils.getName(creature.name);
        if (creatureName === utils.getName(activeName)) continue;

        if (targetFilter && !targetFilter(creature)) continue;

        if (allyList && allyList.includes(creatureName)) continue;

        const inRange = await isWithinRange(activeName, creatureName, range);
        if (!inRange) continue;

        try {
            applyDamageToTarget(combatSummary, creatureName, damageValue, [damageType], campaignName, characters, false, activeName);
        } catch (error) { console.error(`[auraDamage] Failed to apply damage to ${creatureName}:`, error); }
    }

    storage.set('combatSummary', combatSummary, campaignName);
    window.dispatchEvent(new CustomEvent('combat-summary-updated'));
}

export async function applyHolyNimbusDamage(activeName, characters, campaignName) {
    const combatSummary = getCombatSummary(campaignName);
    if (!combatSummary) {
        const loaded = await loadCombatSummary(campaignName);
        if (!loaded) return;
    }
    const summary = getCombatSummary(campaignName) || await loadCombatSummary(campaignName);
    if (!summary) return;

    for (const character of characters) {
        const charName = utils.getName(character.name);
        const holyNimbusActive = getRuntimeValue(charName, 'holyNimbusActive', campaignName);
        if (!holyNimbusActive) continue;

        const storedAllies = getAllyList(charName);
        const allyList = Array.isArray(storedAllies) && storedAllies.length > 0 ? storedAllies : null;
        if (allyList && allyList.includes(activeName)) continue;

        const chaMod = character.computedStats?.abilities?.find(a => a.name === 'Charisma')?.bonus ?? character.abilities?.find(a => a.name === 'Charisma')?.bonus ?? 0;
        const prof = character.computedStats?.proficiency ?? character.proficiency ?? 0;
        const damageValue = prof + chaMod;
        if (damageValue <= 0) continue;

        const range = 10;
        const inRange = await isWithinRange(charName, activeName, range);
        if (!inRange) continue;

        try {
            applyDamageToTarget(summary, activeName, damageValue, ['Radiant'], campaignName, characters, false, charName);
        } catch (error) { console.error(`[HolyNimbus] Failed to apply radiant damage to ${activeName}:`, error); }
    }

    storage.set('combatSummary', summary, campaignName);
    fetch(`/api/campaigns/${encodeURIComponent(campaignName)}/combatSummary`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary)
    }).catch((e) => { console.error('[HolyNimbus] Failed to sync combatSummary to server:', e); });
    window.dispatchEvent(new CustomEvent('combat-summary-updated'));
}

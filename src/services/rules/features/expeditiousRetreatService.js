import { addEntry } from '../../ui/logService.js';
import { addConcentration } from '../../combat/concentration/concentrationService.js';
import storage from '../../ui/storage.js';
import { getCombatSummary } from '../../encounters/combatData.js';

export async function triggerExpeditiousRetreat(spell, metaCtx, playerStats, campaignName, _mapName) {
    const isExpeditiousRetreat = (spell.name || '').toLowerCase() === 'expeditious retreat';
    if (!isExpeditiousRetreat) return null;

    const targetName = playerStats.name;

    // Add concentration on the caster so the badge shows in the initiative tracker
    const csForConc = getCombatSummary(campaignName);
    if (csForConc) {
        const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
        addConcentration(csForConc, playerStats.name, 'Expeditious Retreat', concentrationDc);
        storage.set('combatSummary', csForConc, campaignName);
        window.dispatchEvent(new CustomEvent('combat-summary-updated'));
    }

    // Log to campaign
    addEntry(campaignName, {
        type: 'spell',
        characterName: playerStats.name,
        targetName,
        spellName: 'Expeditious Retreat',
        spellLevel: 1,
        description: `${playerStats.name} casts Expeditious Retreat on themself. They can take the Dash action as a bonus action on each of their turns until concentration breaks.`,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[expeditiousRetreat] Error logging:', e); });

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: 'Expeditious Retreat',
            automationType: 'expeditious_retreat',
            description: `<b>Expeditious Retreat</b><br/>${targetName} has <b>Concentration</b> — can take the Dash action as a bonus action on each of their turns.`,
        },
    };
}

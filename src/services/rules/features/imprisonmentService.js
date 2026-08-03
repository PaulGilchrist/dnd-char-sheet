import { executeHandler } from '../../automation/index.js';

const IMPRISONMENT_SPELL_NAMES = new Set(['imprisonment']);

export async function triggerImprisonment(spell, metaCtx, playerStats, campaignName, mapName) {
    const spellName = (spell.name || '').toLowerCase();
    if (!IMPRISONMENT_SPELL_NAMES.has(spellName)) return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 9;

    const action = {
        name: spell.name,
        automation: {
            type: 'imprisonment',
            saveDc: spellSaveDc,
            saveType: 'WIS',
            options: ['Burial', 'Chaining', 'Hedged Prison', 'Minimus Containment', 'Slumber'],
        },
        spell,
        spellSlotLevel: slotLevel,
        metaCtx,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[imprisonmentService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}

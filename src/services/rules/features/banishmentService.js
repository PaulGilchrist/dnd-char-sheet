import { executeHandler } from '../../automation/index.js';

const BANISHMENT_SPELL_NAMES = new Set(['banishment']);

export async function triggerBanishment(spell, metaCtx, playerStats, campaignName, mapName) {
    const spellName = (spell.name || '').toLowerCase();
    if (!BANISHMENT_SPELL_NAMES.has(spellName)) return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 4;

    const action = {
        name: spell.name,
        automation: {
            type: 'banishment',
            saveDc: spellSaveDc,
            saveType: 'CHA',
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[banishmentService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}

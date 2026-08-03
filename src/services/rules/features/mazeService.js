import { executeHandler } from '../../automation/index.js';

const MAZE_SPELL_NAMES = new Set(['maze']);

export async function triggerMaze(spell, metaCtx, playerStats, campaignName, mapName) {
    const spellName = (spell.name || '').toLowerCase();
    if (!MAZE_SPELL_NAMES.has(spellName)) return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 8;

    const action = {
        name: spell.name,
        automation: {
            type: 'maze',
            saveDc: spellSaveDc,
            saveType: 'WIS',
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[mazeService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}

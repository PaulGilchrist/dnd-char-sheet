export async function triggerTashasHideousLaughter(spell, metaCtx, playerStats, campaignName, _mapName) {
    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 1;

    return {
        type: 'modal',
        modalName: 'tashasLaughter',
        payload: {
            action: { name: spell.name, automation: { type: 'tashas_laughter' } },
            playerStats,
            campaignName,
            saveType: 'WIS',
            saveDc: spellSaveDc,
            spellSlotLevel: slotLevel,
            metamagicHeighten: metaCtx?.metamagicHeighten,
        },
    };
}

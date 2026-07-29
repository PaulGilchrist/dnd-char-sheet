import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';

export async function triggerCharmMonster(spell, metaCtx, playerStats, campaignName, mapName) {
    const isCharmMonster = (spell.name || '').toLowerCase() === 'charm monster';
    if (!isCharmMonster) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const nonCaster = cs.creatures.find(c => c.name !== playerStats.name);
            if (nonCaster) targetName = nonCaster.name;
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: 'No target selected for Charm Monster.' } };
    }

    // Check if caster/target are in combat to determine if target gets advantage on save
    const cs = await getCombatContext(campaignName);
    const targetInCombat = cs?.creatures?.some(c => c.name === targetName && c.name !== playerStats.name) ?? false;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 4;

    const action = {
        name: 'Charm Monster',
        automation: {
            type: 'charm_monster',
            saveDc: spellSaveDc,
            targetName: targetName,
            advantage: targetInCombat,
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[charmMonsterService] Failed to execute Charm Monster handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Charm Monster', description: `Failed to execute Charm Monster.` } };
    }
}

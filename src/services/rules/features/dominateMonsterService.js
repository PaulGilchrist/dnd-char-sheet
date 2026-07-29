import { executeHandler } from '../../automation/index.js';
import { getCombatContext } from '../combat/damageUtils.js';

export async function triggerDominateMonster(spell, metaCtx, playerStats, campaignName, mapName) {
    const isDominateMonster = (spell.name || '').toLowerCase() === 'dominate monster';
    if (!isDominateMonster) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const nonCaster = cs.creatures.find(c => c.name !== playerStats.name);
            if (nonCaster) targetName = nonCaster.name;
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Monster', description: 'No target selected for Dominate Monster.' } };
    }

    // Check if target is at full health to determine if target gets advantage on save
    const cs = await getCombatContext(campaignName);
    const targetCreature = cs?.creatures?.find(c => c.name === targetName);
    const targetNotFullHealth = targetCreature && targetCreature.currentHp != null && targetCreature.maxHp != null && targetCreature.currentHp >= targetCreature.maxHp ? false : true;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 8;

    const action = {
        name: 'Dominate Monster',
        automation: {
            type: 'dominate_monster',
            saveDc: spellSaveDc,
            targetName: targetName,
            advantage: targetNotFullHealth,
        },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[dominateMonsterService] Failed to execute Dominate Monster handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Dominate Monster', description: `Failed to execute Dominate Monster.` } };
    }
}

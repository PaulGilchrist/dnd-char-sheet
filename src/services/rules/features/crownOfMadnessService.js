import { executeHandler } from '../../automation/index.js';
import { getCombatContext, getTargetFromAttacker } from '../combat/damageUtils.js';
import { getMonsterData } from '../../npcs/monsterUtils.js';

async function isTargetHumanoid(targetName, campaignName) {
    const cs = await getCombatContext(campaignName);
    if (!cs?.creatures) return true;
    const creature = cs.creatures.find(c => c.name === targetName);
    if (!creature) return true;
    if (creature.type === 'player') return true;
    try {
        const monsterData = await getMonsterData(targetName, null);
        if (monsterData?.type) {
            return monsterData.type.toLowerCase() === 'humanoid';
        }
    } catch { /* default to Humanoid */ }
    return true;
}

export async function triggerCrownOfMadness(spell, metaCtx, playerStats, campaignName, mapName) {
    const isCrownOfMadness = (spell.name || '').toLowerCase() === 'crown of madness';
    if (!isCrownOfMadness) return null;

    let targetName = metaCtx?.targetName;
    if (!targetName) {
        const cs = await getCombatContext(campaignName);
        if (cs?.creatures && cs.creatures.length > 0) {
            const attackerTarget = getTargetFromAttacker(cs, playerStats.name);
            if (attackerTarget) targetName = attackerTarget.name;
        }
        if (!targetName) {
            console.error(`[crownOfMadnessService] No target selected for Crown of Madness by ${playerStats.name}. Caster has no target in initiative view.`);
        }
    }
    if (!targetName) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Crown of Madness', description: 'No target selected for Crown of Madness.' } };
    }

    const humanoid = await isTargetHumanoid(targetName, campaignName);
    if (!humanoid) {
        return { type: 'popup', payload: { type: 'automation_info', name: 'Crown of Madness', description: `No effect. ${targetName} is not a Humanoid.` } };
    }

    const cs = await getCombatContext(campaignName);
    const targetInCombat = cs?.creatures?.some(c => c.name === targetName && c.name !== playerStats.name) ?? false;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 2;

    const action = {
        name: 'Crown of Madness',
        automation: { type: 'crown_of_madness', saveDc: spellSaveDc, targetName, advantage: targetInCombat },
        spell,
        spellSlotLevel: slotLevel,
    };

    try {
        const result = await executeHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error('[crownOfMadnessService] Failed to execute Crown of Madness handler:', e);
        return { type: 'popup', payload: { type: 'automation_info', name: 'Crown of Madness', description: `Failed to execute Crown of Madness.` } };
    }
}
